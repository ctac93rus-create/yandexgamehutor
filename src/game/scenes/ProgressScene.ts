import Phaser from 'phaser';

import { localizationManager } from '../managers/LocalizationManager';
import { saveManager } from '../managers/SaveManager';
import { sfxManager } from '../managers/SfxManager';
import { getLocalDayKey } from '../systems/economy/EconomyTuning';
import { QuestEngine } from '../systems/quests/QuestEngine';

type ProgressTab = 'progress' | 'stats' | 'economy';

export class ProgressScene extends Phaser.Scene {
  private activeTab: ProgressTab = 'progress';
  private content!: Phaser.GameObjects.Container;

  public constructor() {
    super('ProgressScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#0b1220');

    this.add.rectangle(this.scale.width * 0.5, 58, this.scale.width - 60, 88, 0x1e293b, 0.95).setStrokeStyle(2, 0x334155);
    this.add.text(42, 28, localizationManager.t('progress.title'), { color: '#f8fafc', fontSize: '36px' });

    this.makeTab(170, localizationManager.t('progress.tabs.progress'), 'progress');
    this.makeTab(420, localizationManager.t('progress.tabs.stats'), 'stats');
    this.makeTab(650, localizationManager.t('progress.tabs.economy'), 'economy');
    this.makeButton(this.scale.width - 140, 120, localizationManager.t('common.backToMenu'), () => {
      sfxManager.playClick();
      this.scene.start('MenuScene');
    }, 220);

    this.content = this.add.container(0, 0);
    void this.renderTab();
  }

  private async renderTab(): Promise<void> {
    this.content.removeAll(true);

    const save = await saveManager.load();
    const meta = save?.meta ?? QuestEngine.defaultState();
    const chapter = this.detectCurrentChapter(meta.quests.unlockedChapters);
    const storyDone = meta.quests.storyCompletedIds?.length ?? 0;
    const dailyDone = meta.quests.dailyCompletedIds?.length ?? 0;
    const dailyToday = meta.quests.dailyLastRefreshDay === this.dayToken() ? dailyDone : 0;

    if (this.activeTab === 'progress') {
      this.addRows([
        localizationManager.t('progress.currentChapter', { value: chapter }),
        localizationManager.t('progress.storyDone', { value: storyDone }),
        localizationManager.t('progress.dailyDoneToday', { value: dailyToday }),
      ]);
      return;
    }

    if (this.activeTab === 'stats') {
      const raidToday = meta.liveops?.raidRewardDayKey === getLocalDayKey() ? (meta.liveops?.raidRewardsClaimedToday ?? 0) : 0;
      this.addRows([
        localizationManager.t('progress.totalMerges', { value: meta.stats.merges ?? 0 }),
        localizationManager.t('progress.bestRaidScore', { value: meta.stats.bestRaidKills ?? 0 }),
        localizationManager.t('progress.raidsToday', { value: raidToday }),
        localizationManager.t('progress.hutUpgradesBought', { value: meta.stats.hutUpgrades ?? meta.purchasedUpgradeIds?.length ?? 0 }),
      ]);
      return;
    }

    this.addRows([
      localizationManager.t('progress.gold', { value: save?.gold ?? 0 }),
      localizationManager.t('progress.dust', { value: save?.dust ?? 0 }),
      localizationManager.t('progress.cloudHint'),
    ]);
  }

  private addRows(rows: string[]): void {
    const panel = this.add.rectangle(this.scale.width * 0.5, this.scale.height * 0.5 + 10, this.scale.width - 120, 420, 0x111827, 0.9).setStrokeStyle(2, 0x334155);
    this.content.add(panel);

    rows.forEach((text, index) => {
      const color = index === rows.length - 1 && this.activeTab === 'economy' ? '#94a3b8' : '#e2e8f0';
      const size = index === rows.length - 1 && this.activeTab === 'economy' ? '22px' : '30px';
      this.content.add(this.add.text(90, 230 + index * 80, text, { color, fontSize: size, wordWrap: { width: this.scale.width - 180 } }));
    });
  }

  private makeTab(x: number, label: string, tab: ProgressTab): void {
    this.makeButton(x, 120, label, () => {
      this.activeTab = tab;
      sfxManager.playClick();
      void this.renderTab();
    }, 210);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void, width = 200): void {
    const button = this.add.rectangle(x, y, width, 54, 0x14532d, 0.98).setStrokeStyle(2, 0x86efac).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { color: '#ecfeff', fontSize: '24px' }).setOrigin(0.5);
    button.on('pointerup', onClick);
  }

  private detectCurrentChapter(chapters: string[] | undefined): string {
    if (!chapters || chapters.length === 0) {
      return '—';
    }
    const values = chapters
      .map((id) => {
        const match = /^chapter_(\d+)$/u.exec(id);
        return match ? Number(match[1]) : 0;
      })
      .filter((value) => value > 0);

    if (values.length === 0) {
      return '—';
    }

    return String(Math.max(...values));
  }

  private dayToken(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
