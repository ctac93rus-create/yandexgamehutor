import Phaser from 'phaser';

import { localizationManager } from '../managers/LocalizationManager';
import { leaderboardsManager, RAID_BEST_KILLS_LEADERBOARD } from '../managers/LeaderboardsManager';
import { saveManager } from '../managers/SaveManager';
import { ACHIEVEMENTS, isAchievementUnlocked, unlockAchievements } from '../systems/meta/achievements';
import { QuestEngine } from '../systems/quests/QuestEngine';
import { sdkManager } from '../managers/SDKManager';
import { sfxManager } from '../managers/SfxManager';

interface SocialSceneData {
  tab?: 'leaderboard' | 'achievements';
}

export class SocialScene extends Phaser.Scene {
  private activeTab: 'leaderboard' | 'achievements' = 'leaderboard';
  private content!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private authButton?: Phaser.GameObjects.Rectangle;
  private authLabel?: Phaser.GameObjects.Text;

  public constructor() {
    super('SocialScene');
  }

  public init(data: SocialSceneData): void {
    this.activeTab = data.tab ?? 'leaderboard';
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.add.rectangle(this.scale.width * 0.5, 58, this.scale.width - 60, 88, 0x1e293b, 0.95).setStrokeStyle(2, 0x334155);
    this.add.text(48, 28, localizationManager.t('social.title'), { color: '#f8fafc', fontSize: '36px' });

    this.makeButton(150, 120, localizationManager.t('social.leaderboardTab'), () => {
      this.activeTab = 'leaderboard';
      void this.renderActiveTab();
    }, 240);
    this.makeButton(420, 120, localizationManager.t('social.achievementsTab'), () => {
      this.activeTab = 'achievements';
      void this.renderActiveTab();
    }, 260);
    this.makeButton(1100, 120, localizationManager.t('common.backToMenu'), () => {
      sfxManager.playClick();
      this.scene.start('MenuScene');
    }, 220);

    this.statusText = this.add.text(50, 170, '', { color: '#94a3b8', fontSize: '24px' });
    this.content = this.add.container(0, 0);

    void this.renderActiveTab();
  }

  private async renderActiveTab(): Promise<void> {
    this.content.removeAll(true);
    this.statusText.setText('');
    this.hideAuthButton();

    if (this.activeTab === 'leaderboard') {
      await this.renderLeaderboard();
      return;
    }

    await this.renderAchievements();
  }

  private async renderLeaderboard(): Promise<void> {
    const save = await saveManager.load();
    const bestScore = save?.meta?.stats.bestRaidKills ?? 0;
    const leaderboard = await leaderboardsManager.fetchTopAndPlayer(RAID_BEST_KILLS_LEADERBOARD);

    if (leaderboard.status === 'auth_required') {
      this.statusText.setText(localizationManager.t('social.authRequired'));
      this.showAuthButton();
    } else if (leaderboard.status === 'unavailable') {
      this.statusText.setText(localizationManager.t('social.leaderboardUnavailable'));
    }

    this.content.add(this.add.text(50, 220, localizationManager.t('social.bestScore', { value: bestScore }), { color: '#f8fafc', fontSize: '28px' }));
    this.content.add(
      this.add.text(
        50,
        260,
        leaderboard.player
          ? localizationManager.t('social.playerRank', {
              rank: leaderboard.player.rank,
              score: leaderboard.player.score,
            })
          : localizationManager.t('social.playerRankMissing'),
        { color: '#cbd5e1', fontSize: '24px' },
      ),
    );

    this.content.add(this.add.text(50, 310, localizationManager.t('social.top10'), { color: '#f8fafc', fontSize: '26px' }));

    for (let i = 0; i < Math.min(10, leaderboard.entries.length); i += 1) {
      const entry = leaderboard.entries[i];
      const name = entry.player?.publicName ?? localizationManager.t('social.anonymous');
      this.content.add(
        this.add.text(60, 350 + i * 34, `${entry.rank}. ${name} — ${entry.score}`, {
          color: '#e2e8f0',
          fontSize: '22px',
        }),
      );
    }

    const refreshButton = this.add
      .rectangle(1040, 220, 220, 56, 0x14532d, 0.98)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });
    const refreshLabel = this.add.text(1040, 220, localizationManager.t('social.refresh'), { color: '#ecfeff', fontSize: '22px' }).setOrigin(0.5);
    refreshButton.on('pointerup', () => {
      sfxManager.playClick();
      void this.renderActiveTab();
    });
    this.content.add([refreshButton, refreshLabel]);
  }

  private async renderAchievements(): Promise<void> {
    const save = await saveManager.load();
    const meta = save?.meta ?? QuestEngine.defaultState();
    unlockAchievements(meta);

    for (let i = 0; i < ACHIEVEMENTS.length; i += 1) {
      const achievement = ACHIEVEMENTS[i];
      const unlocked = isAchievementUnlocked(meta, achievement.id);
      const y = 210 + i * 78;
      this.content.add(
        this.add.rectangle(640, y, 1160, 62, unlocked ? 0x14532d : 0x1f2937, 0.92).setStrokeStyle(2, unlocked ? 0x86efac : 0x475569),
      );
      this.content.add(
        this.add.text(70, y - 16, localizationManager.t(achievement.titleKey), {
          color: unlocked ? '#dcfce7' : '#cbd5e1',
          fontSize: '24px',
        }),
      );
      this.content.add(
        this.add.text(70, y + 10, localizationManager.t(achievement.descriptionKey), {
          color: '#94a3b8',
          fontSize: '18px',
        }),
      );
      this.content.add(
        this.add.text(1150, y, localizationManager.t(unlocked ? 'social.unlocked' : 'social.locked'), {
          color: unlocked ? '#86efac' : '#fca5a5',
          fontSize: '20px',
        }).setOrigin(1, 0.5),
      );
    }
  }

  private showAuthButton(): void {
    if (this.authButton && this.authLabel) {
      this.authButton.setVisible(true).setActive(true);
      this.authLabel.setVisible(true).setActive(true);
      return;
    }

    this.authButton = this.add
      .rectangle(1040, 290, 220, 56, 0x0f766e, 0.98)
      .setStrokeStyle(2, 0x5eead4)
      .setInteractive({ useHandCursor: true });
    this.authLabel = this.add.text(1040, 290, localizationManager.t('social.signIn'), { color: '#ecfeff', fontSize: '22px' }).setOrigin(0.5);

    this.authButton.on('pointerup', () => {
      void this.handleAuthClick();
    });

    this.content.add([this.authButton, this.authLabel]);
  }

  private hideAuthButton(): void {
    this.authButton?.setVisible(false).setActive(false);
    this.authLabel?.setVisible(false).setActive(false);
  }

  private async handleAuthClick(): Promise<void> {
    const authorized = await sdkManager.openAuthDialog();
    if (authorized) {
      sfxManager.playSuccess();
      void this.renderActiveTab();
      return;
    }
    sfxManager.playError();
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void, width = 220): void {
    const button = this.add.rectangle(x, y, width, 54, 0x14532d, 0.98).setStrokeStyle(2, 0x86efac).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { color: '#ecfeff', fontSize: '24px' }).setOrigin(0.5);
    button.on('pointerup', () => {
      sfxManager.playClick();
      onClick();
    });
  }
}
