import Phaser from 'phaser';

import dailyJson from '../data/quests_daily.json';
import storyJson from '../data/quests_story.json';
import economyJson from '../data/economy.json';
import { saveManager } from '../managers/SaveManager';
import { economySchema } from '../systems/merge/schema';
import type { EconomyConfig, SaveState } from '../systems/merge/types';
import { QuestEngine } from '../systems/quests/QuestEngine';
import type { HutUpgradeDefinition, MetaProgressState } from '../systems/quests/types';
import { HutUpgradesPanel } from '../ui/hut/HutUpgradesPanel';
import { QuestPanel } from '../ui/hut/QuestPanel';

export class HutScene extends Phaser.Scene {
  private saveState!: SaveState;
  private meta!: MetaProgressState;
  private questEngine!: QuestEngine;
  private upgrades: HutUpgradeDefinition[] = [];

  private goldText!: Phaser.GameObjects.Text;
  private dustText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  public constructor() {
    super('HutScene');
  }

  public async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#0b1220');
    this.add.text(30, 20, 'Хутор / Meta', { color: '#f8fafc', fontSize: '30px' });

    await this.restoreState();
    this.renderScene();
  }

  private async restoreState(): Promise<void> {
    const economy = economySchema.parse(economyJson) as EconomyConfig;
    this.upgrades = economy.hutUpgrades ?? [];

    const existing = await saveManager.load();
    this.saveState =
      existing ?? {
        gold: economy.startGold,
        dust: economy.startDust,
        occupiedCells: [],
        generators: {},
      };

    this.meta = this.saveState.meta ?? QuestEngine.defaultState();
    this.saveState.meta = this.meta;

    this.questEngine = new QuestEngine(this.meta, storyJson, dailyJson);
    await this.persist();
  }

  private renderScene(): void {
    this.goldText = this.add.text(330, 22, '', { color: '#fbbf24', fontSize: '24px' });
    this.dustText = this.add.text(510, 22, '', { color: '#a78bfa', fontSize: '24px' });
    this.toastText = this.add
      .text(this.scale.width / 2, 80, '', {
        color: '#f8fafc',
        backgroundColor: '#1e293b',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    const questPanel = new QuestPanel(this, {
      onClaimStory: (id) => {
        const reward = this.questEngine.claimStoryReward(id);
        this.saveState.gold += reward.gold;
        this.saveState.dust += reward.dust;
        void this.persist('Сюжетная награда получена');
      },
      onClaimDaily: (id) => {
        const reward = this.questEngine.claimDailyReward(id);
        this.saveState.gold += reward.gold;
        this.saveState.dust += reward.dust;
        void this.persist('Ежедневка получена');
      },
    });

    const upgradesPanel = new HutUpgradesPanel(this, {
      onBuy: (id) => {
        void this.buyUpgrade(id);
      },
    });

    questPanel.render(this.questEngine.snapshot());
    upgradesPanel.render(this.upgrades, this.meta.purchasedUpgradeIds);

    const navStyle = { color: '#d1fae5', fontSize: '20px', backgroundColor: '#064e3b', padding: { x: 8, y: 4 } };
    this.add
      .text(60, 678, 'В merge', navStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('MergeScene'));
    this.add
      .text(190, 678, 'В рейд', navStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('RaidScene'));
    this.add
      .text(300, 678, 'В меню', navStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('MenuScene'));

    this.refreshHud();
  }

  private async buyUpgrade(id: string): Promise<void> {
    const upgrade = this.upgrades.find((it) => it.id === id);
    if (!upgrade) {
      return;
    }
    if (this.meta.purchasedUpgradeIds.includes(id)) {
      this.showToast('Уже куплено');
      return;
    }
    if (this.saveState.gold < upgrade.costGold || this.saveState.dust < upgrade.costDust) {
      this.showToast('Недостаточно ресурсов');
      return;
    }

    this.saveState.gold -= upgrade.costGold;
    this.saveState.dust -= upgrade.costDust;
    this.meta.purchasedUpgradeIds.push(upgrade.id);
    if (upgrade.unlockFlag && !this.meta.unlockedFlags.includes(upgrade.unlockFlag)) {
      this.meta.unlockedFlags.push(upgrade.unlockFlag);
    }
    if (upgrade.unlockChapterId && !this.meta.quests.unlockedChapters.includes(upgrade.unlockChapterId)) {
      this.meta.quests.unlockedChapters.push(upgrade.unlockChapterId);
    }

    this.questEngine.onEvent('hut_upgrade', 1);
    await this.persist(`Куплен апгрейд: ${upgrade.title}`);
    this.scene.restart();
  }

  private async persist(toast?: string): Promise<void> {
    this.saveState.meta = this.questEngine.getState();
    await saveManager.save(this.saveState);
    if (toast) {
      this.showToast(toast);
    }
    this.refreshHud();
  }

  private refreshHud(): void {
    if (!this.goldText || !this.dustText) {
      return;
    }
    this.goldText.setText(`Золото: ${this.saveState.gold}`);
    this.dustText.setText(`Пыль: ${this.saveState.dust}`);
  }

  private showToast(text: string): void {
    this.toastText.setText(text).setVisible(true);
    this.time.delayedCall(1200, () => this.toastText.setVisible(false));
  }
}
