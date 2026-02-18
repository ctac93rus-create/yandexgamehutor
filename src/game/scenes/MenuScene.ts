import Phaser from 'phaser';

import { adsManager } from '../managers/AdsManager';
import { sdkManager } from '../managers/SDKManager';
import { localizationManager } from '../managers/LocalizationManager';
import type { Locale } from '../managers/SettingsManager';

interface MenuItem {
  titleKey: string;
  target: string;
  data?: Record<string, unknown>;
}

const MENU_ITEMS: MenuItem[] = [
  { titleKey: 'menu.playMerge', target: 'MergeScene' },
  { titleKey: 'menu.hut', target: 'HutScene' },
  { titleKey: 'menu.raid', target: 'RaidScene' },
  { titleKey: 'menu.leaderboard', target: 'SocialScene', data: { tab: 'leaderboard' } },
  { titleKey: 'menu.achievements', target: 'SocialScene', data: { tab: 'achievements' } },
  { titleKey: 'menu.settings', target: 'SettingsScene' },
];

const TITLE_BY_LOCALE: Record<Locale, string> = {
  ru: 'Yandex Game Hutor',
  en: 'Yandex Game Hutor',
};

export class MenuScene extends Phaser.Scene {
  public constructor() {
    super('MenuScene');
  }

  public create(): void {
    void adsManager.onScreenShown();
    this.cameras.main.setBackgroundColor('#020617');

    this.add.rectangle(this.scale.width * 0.5, 92, 560, 120, 0x1e293b, 0.92).setStrokeStyle(2, 0x334155);
    this.add
      .text(this.scale.width * 0.5, 92, TITLE_BY_LOCALE[localizationManager.getLocale()], {
        color: '#f8fafc',
        fontFamily: 'Arial',
        fontSize: '48px',
      })
      .setOrigin(0.5);

    MENU_ITEMS.forEach((item, index) => {
      const y = 190 + index * 84;
      const button = this.add
        .rectangle(this.scale.width * 0.5, y, 460, 80, 0x14532d, 0.98)
        .setStrokeStyle(2, 0x86efac)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(button.x, y, localizationManager.t(item.titleKey), {
          color: '#ecfeff',
          fontFamily: 'Arial',
          fontSize: '34px',
        })
        .setOrigin(0.5);

      button.on('pointerup', () => {
        this.scene.start(item.target, item.data);
      });
    });

    this.time.delayedCall(0, () => {
      sdkManager.loadingReadyOnce();
    });
  }
}
