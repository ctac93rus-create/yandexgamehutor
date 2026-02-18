import Phaser from 'phaser';

import { adsManager } from '../managers/AdsManager';
import { sdkManager } from '../managers/SDKManager';

const MENU_ITEMS = [
  { title: 'Играть (Merge)', target: 'MergeScene' },
  { title: 'Хутор', target: 'HutScene' },
  { title: 'Рейд', target: 'RaidScene' },
  { title: 'Настройки', target: 'SettingsScene' },
] as const;

export class MenuScene extends Phaser.Scene {
  public constructor() {
    super('MenuScene');
  }

  public create(): void {
    void adsManager.onScreenShown();
    this.cameras.main.setBackgroundColor('#020617');

    this.add
      .text(this.scale.width * 0.5, 80, 'Yandex Game Hutor', {
        color: '#f8fafc',
        fontFamily: 'Arial',
        fontSize: '46px',
      })
      .setOrigin(0.5);

    MENU_ITEMS.forEach((item, index) => {
      const y = 180 + index * 92;
      const button = this.add
        .image(this.scale.width * 0.5, y, 'btn-primary')
        .setInteractive({ useHandCursor: true });

      this.add
        .text(button.x, y, item.title, {
          color: '#052e16',
          fontFamily: 'Arial',
          fontSize: '28px',
        })
        .setOrigin(0.5);

      button.on('pointerup', () => {
        this.scene.start(item.target);
      });
    });

    this.time.delayedCall(0, () => {
      sdkManager.loadingReadyOnce();
    });
  }
}
