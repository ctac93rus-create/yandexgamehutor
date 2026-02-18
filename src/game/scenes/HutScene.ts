import Phaser from 'phaser';

import dailyJson from '../data/quests_daily.json';
import storyJson from '../data/quests_story.json';
import economyJson from '../data/economy.json';
import { adsManager } from '../managers/AdsManager';
import { purchasesManager } from '../managers/PurchasesManager';
import { localizationManager } from '../managers/LocalizationManager';
import { remoteConfigManager } from '../managers/RemoteConfigManager';
import { saveManager } from '../managers/SaveManager';
import { economySchema } from '../systems/merge/schema';
import { computeBonuses } from '../systems/meta/bonuses';
import { applyUpgradeCost, getEconomyTuning } from '../systems/economy/EconomyTuning';
import type { EconomyConfig, SaveState } from '../systems/merge/types';
import { QuestEngine } from '../systems/quests/QuestEngine';
import type {
  HutUpgradeDefinition,
  MetaProgressState,
} from '../systems/quests/types';
import { HutUpgradesPanel } from '../ui/hut/HutUpgradesPanel';
import { QuestPanel } from '../ui/hut/QuestPanel';

export class HutScene extends Phaser.Scene {
  private saveState!: SaveState;
  private meta!: MetaProgressState;
  private questEngine!: QuestEngine;
  private upgrades: HutUpgradeDefinition[] = [];
  private saveEconomy!: EconomyConfig;
  private tuning = getEconomyTuning(remoteConfigManager.getFlags());

  private goldText!: Phaser.GameObjects.Text;
  private dustText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  public constructor() {
    super('HutScene');
  }

  public async create(): Promise<void> {
    this.cameras.main.setBackgroundColor('#0b1220');
    this.add
      .rectangle(
        this.scale.width * 0.5,
        56,
        this.scale.width - 60,
        84,
        0x1e293b,
        0.95,
      )
      .setStrokeStyle(2, 0x334155);
    this.add.text(40, 30, localizationManager.t('hut.title'), {
      color: '#f8fafc',
      fontSize: '34px',
    });

    await this.restoreState();
    this.renderScene();
    await adsManager.onScreenShown();
  }

  private async restoreState(): Promise<void> {
    const economy = economySchema.parse(economyJson) as EconomyConfig;
    this.tuning = getEconomyTuning(remoteConfigManager.getFlags());
    this.saveEconomy = economy;
    this.upgrades = economy.hutUpgrades ?? [];

    const existing = await saveManager.load();
    this.saveState = existing ?? {
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
    this.goldText = this.add.text(330, 22, '', {
      color: '#fbbf24',
      fontSize: '24px',
    });
    this.dustText = this.add.text(510, 22, '', {
      color: '#a78bfa',
      fontSize: '24px',
    });
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
        void this.persist(localizationManager.t('hut.storyClaimed'));
      },
      onClaimDaily: (id) => {
        const reward = this.questEngine.claimDailyReward(id);
        this.saveState.gold += reward.gold;
        this.saveState.dust += reward.dust;
        void this.persist(localizationManager.t('hut.dailyClaimed'));
      },
    });

    const upgradesPanel = new HutUpgradesPanel(this, {
      onBuy: (id) => {
        void this.buyUpgrade(id);
      },
    });

    questPanel.render(this.questEngine.snapshot());
    const tunedUpgrades = this.upgrades.map((upgrade) => ({
      ...upgrade,
      costGold: applyUpgradeCost(upgrade.costGold, this.tuning),
      costDust: applyUpgradeCost(upgrade.costDust, this.tuning),
    }));
    upgradesPanel.render(tunedUpgrades, this.meta.purchasedUpgradeIds);

    const navStyle = {
      color: '#d1fae5',
      fontSize: '20px',
      backgroundColor: '#064e3b',
      padding: { x: 8, y: 4 },
    };
    this.add
      .text(60, 678, localizationManager.t('common.toMerge'), navStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('MergeScene'));
    this.add
      .text(190, 678, localizationManager.t('common.toRaid'), navStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () =>
        this.scene.start('RaidScene', {
          bonuses: computeBonuses(this.meta, this.saveEconomy),
        }),
      );
    this.add
      .text(320, 678, localizationManager.t('common.backToMenu'), navStyle)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('MenuScene'));
    this.add
      .text(470, 678, localizationManager.t('hut.booster'), {
        ...navStyle,
        backgroundColor: '#4c1d95',
        color: '#e9d5ff',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        void adsManager.showRewarded('hut_booster', () => {
          void this.claimRewardedBooster();
        });
      });
    this.add
      .text(760, 678, localizationManager.t('hut.buyGold'), {
        ...navStyle,
        backgroundColor: '#7c2d12',
        color: '#ffedd5',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        void this.buyGoldPack();
      });

    this.refreshHud();
  }

  private async claimRewardedBooster(): Promise<void> {
    const flags = remoteConfigManager.getFlags();
    this.saveState.gold += flags.rewardedHutBoosterGold;
    this.saveState.dust += flags.rewardedHutBoosterDust;
    await this.persist(
      `Rewarded: +${flags.rewardedHutBoosterGold} золота, +${flags.rewardedHutBoosterDust} пыли`,
    );
  }

  private async buyGoldPack(): Promise<void> {
    const success = await purchasesManager.purchase('pack_gold_small');
    if (!success) {
      this.showToast(localizationManager.t('hut.purchaseUnavailable'));
      return;
    }
    const latest = await saveManager.load();
    if (latest) {
      this.saveState = latest;
    }
    this.showToast(localizationManager.t('hut.purchaseApplied'));
    this.refreshHud();
  }

  private async buyUpgrade(id: string): Promise<void> {
    const upgrade = this.upgrades.find((it) => it.id === id);
    if (!upgrade) {
      return;
    }
    if (this.meta.purchasedUpgradeIds.includes(id)) {
      this.showToast(localizationManager.t('hut.alreadyBought'));
      return;
    }
    const tunedCostGold = applyUpgradeCost(upgrade.costGold, this.tuning);
    const tunedCostDust = applyUpgradeCost(upgrade.costDust, this.tuning);
    if (this.saveState.gold < tunedCostGold || this.saveState.dust < tunedCostDust) {
      this.showToast(localizationManager.t('hut.notEnough'));
      return;
    }

    this.saveState.gold -= tunedCostGold;
    this.saveState.dust -= tunedCostDust;
    this.meta.purchasedUpgradeIds.push(upgrade.id);
    if (
      upgrade.unlockFlag &&
      !this.meta.unlockedFlags.includes(upgrade.unlockFlag)
    ) {
      this.meta.unlockedFlags.push(upgrade.unlockFlag);
    }
    if (
      upgrade.unlockChapterId &&
      !this.meta.quests.unlockedChapters.includes(upgrade.unlockChapterId)
    ) {
      this.meta.quests.unlockedChapters.push(upgrade.unlockChapterId);
    }

    this.questEngine.onEvent('hut_upgrade', 1);
    await this.persist(
      localizationManager.t('hut.upgradeBought', { title: upgrade.title }),
    );
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
    this.goldText.setText(
      localizationManager.t('merge.gold', { value: this.saveState.gold }),
    );
    this.dustText.setText(
      localizationManager.t('merge.dust', { value: this.saveState.dust }),
    );
  }

  private showToast(text: string): void {
    this.toastText.setText(text).setVisible(true);
    this.time.delayedCall(1200, () => this.toastText.setVisible(false));
  }
}
