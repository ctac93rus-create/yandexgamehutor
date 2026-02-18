import Phaser from 'phaser';

import { adsManager } from '../managers/AdsManager';
import { sdkManager } from '../managers/SDKManager';
import { localizationManager } from '../managers/LocalizationManager';
import { sfxManager } from '../managers/SfxManager';
import { createMenuButton, type MenuIconType } from '../ui/menu/MenuButtonFactory';

interface MenuItem {
  titleKey: string;
  target: string;
  icon: MenuIconType;
  data?: Record<string, unknown>;
}

const MENU_ITEMS: MenuItem[] = [
  { titleKey: 'menu.playMerge', target: 'MergeScene', icon: 'merge' },
  { titleKey: 'menu.hut', target: 'HutScene', icon: 'hut' },
  { titleKey: 'menu.raid', target: 'RaidScene', icon: 'raid' },
  { titleKey: 'menu.progress', target: 'ProgressScene', icon: 'progress' },
  { titleKey: 'menu.leaderboard', target: 'SocialScene', icon: 'leaderboard', data: { tab: 'leaderboard' } },
  { titleKey: 'menu.achievements', target: 'SocialScene', icon: 'achievements', data: { tab: 'achievements' } },
  { titleKey: 'menu.settings', target: 'SettingsScene', icon: 'settings' },
];

export class MenuScene extends Phaser.Scene {
  public constructor() {
    super('MenuScene');
  }

  public create(): void {
    void adsManager.onScreenShown();
    this.cameras.main.setBackgroundColor('#020617');

    const safeX = Math.max(24, Math.round(this.scale.width * 0.04));
    const safeY = Math.max(24, Math.round(this.scale.height * 0.04));
    const headerWidth = Math.min(760, this.scale.width - safeX * 2);

    this.add
      .rectangle(this.scale.width * 0.5, safeY + 54, headerWidth, 108, 0x1e293b, 0.92)
      .setStrokeStyle(2, 0x334155);
    this.add
      .text(this.scale.width * 0.5, safeY + 54, localizationManager.t('menu.title'), {
        color: '#f8fafc',
        fontFamily: 'Arial',
        fontSize: this.scale.width < 700 ? '36px' : '48px',
      })
      .setOrigin(0.5);

    const cols = this.scale.width < 900 ? 1 : 2;
    const buttonWidth = cols === 1 ? Math.min(560, this.scale.width - safeX * 2) : Math.min(540, (this.scale.width - safeX * 3) / 2);
    const buttonHeight = 78;
    const gapX = cols === 1 ? 0 : 28;
    const gapY = 18;
    const startY = safeY + 138;

    MENU_ITEMS.forEach((item, index) => {
      const col = cols === 1 ? 0 : index % cols;
      const row = cols === 1 ? index : Math.floor(index / cols);
      const totalWidth = cols === 1 ? buttonWidth : buttonWidth * 2 + gapX;
      const startX = this.scale.width * 0.5 - totalWidth * 0.5 + buttonWidth * 0.5;
      const x = startX + col * (buttonWidth + gapX);
      const y = startY + row * (buttonHeight + gapY) + buttonHeight * 0.5;
      createMenuButton({
        scene: this,
        x,
        y,
        width: buttonWidth,
        height: buttonHeight,
        label: localizationManager.t(item.titleKey),
        icon: item.icon,
        onClick: () => {
          sfxManager.playClick();
          this.scene.start(item.target, item.data);
        },
      });
    });

    this.time.delayedCall(0, () => {
      sdkManager.loadingReadyOnce();
    });
  }
}
