import Phaser from 'phaser';

import { localizationManager } from '../managers/LocalizationManager';
import { remoteConfigManager } from '../managers/RemoteConfigManager';
import { settingsManager } from '../managers/SettingsManager';
import { getEconomyTuning } from '../systems/economy/EconomyTuning';

export class SettingsScene extends Phaser.Scene {
  private toastText!: Phaser.GameObjects.Text;

  public constructor() {
    super('SettingsScene');
  }

  public create(): void {
    const settings = settingsManager.getState();

    this.cameras.main.setBackgroundColor('#0b1220');

    this.add.rectangle(this.scale.width * 0.5, 100, 520, 110, 0x1e293b, 0.95).setStrokeStyle(2, 0x334155);
    this.add
      .text(this.scale.width * 0.5, 88, localizationManager.t('settings.title'), {
        color: '#f8fafc',
        fontSize: '42px',
      })
      .setOrigin(0.5);

    this.toastText = this.add
      .text(this.scale.width * 0.5, 210, '', {
        color: '#e2e8f0',
        backgroundColor: '#334155',
        fontSize: '24px',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.add.text(300, 300, localizationManager.t('settings.languageLabel'), { color: '#cbd5e1', fontSize: '30px' });

    this.makeButton(760, 300, 'RU', () => {
      localizationManager.setLocale('ru');
      this.scene.restart();
    }, localizationManager.getLocale() === 'ru');
    this.makeButton(940, 300, 'EN', () => {
      localizationManager.setLocale('en');
      this.scene.restart();
    }, localizationManager.getLocale() === 'en');

    const sfxValue = settings.sfxEnabled ? localizationManager.t('common.on') : localizationManager.t('common.off');
    this.makeButton(640, 420, `${localizationManager.t('settings.sfxLabel')}: ${sfxValue}`, () => {
      settingsManager.setSfxEnabled(!settingsManager.getState().sfxEnabled);
      this.scene.restart();
    });

    this.makeButton(640, 520, localizationManager.t('settings.tutorialReset'), () => {
      settingsManager.resetTutorial();
      this.showToast(localizationManager.t('settings.tutorialResetDone'));
    });

    this.makeButton(640, 640, localizationManager.t('common.backToMenu'), () => {
      this.scene.start('MenuScene');
    });

    if (this.shouldShowTuningDebug()) {
      const tuning = getEconomyTuning(remoteConfigManager.getFlags());
      const debugRows = [
        `raidRewardMultiplier: ${tuning.raidRewardMultiplier}`,
        `raidScoreMultiplier: ${tuning.raidScoreMultiplier}`,
        `mergeDustMultiplier: ${tuning.mergeDustMultiplier}`,
        `generatorRechargeMultiplier: ${tuning.generatorRechargeMultiplier}`,
        `hutUpgradeCostMultiplier: ${tuning.hutUpgradeCostMultiplier}`,
        `adsInterstitialMinIntervalSec: ${tuning.adsInterstitialMinIntervalSec}`,
        `rewardedCooldownSec: ${tuning.rewardedCooldownSec}`,
        `raidSoftCapDailyFullRewards: ${tuning.raidSoftCapDailyFullRewards}`,
        `raidSoftCapDecay: ${tuning.raidSoftCapDecay}`,
        `raidSoftCapMinMultiplier: ${tuning.raidSoftCapMinMultiplier}`,
      ];

      this.add.rectangle(980, 430, 520, 380, 0x0f172a, 0.88).setStrokeStyle(2, 0x334155);
      this.add.text(760, 260, 'Economy tuning (debug)', { color: '#93c5fd', fontSize: '20px' });
      this.add.text(760, 290, debugRows.join('\n'), {
        color: '#cbd5e1',
        fontSize: '16px',
        lineSpacing: 6,
      });
    }
  }

  private shouldShowTuningDebug(): boolean {
    const flags = remoteConfigManager.getFlags();
    const hostname = globalThis.location?.hostname ?? '';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    return isLocal || flags.showTuningDebugPanel;
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void, active = false): void {
    const fill = active ? 0x0f766e : 0x14532d;
    const stroke = active ? 0x5eead4 : 0x86efac;

    const bg = this.add
      .rectangle(x, y, 280, 72, fill, 0.95)
      .setStrokeStyle(2, stroke)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        color: '#ecfeff',
        fontSize: '28px',
      })
      .setOrigin(0.5);

    bg.on('pointerup', onClick);
  }

  private showToast(text: string): void {
    this.toastText.setText(text).setVisible(true);
    this.time.delayedCall(1200, () => this.toastText.setVisible(false));
  }
}
