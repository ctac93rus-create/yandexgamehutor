import Phaser from 'phaser';

import { localizationManager } from '../../managers/LocalizationManager';

export class RaidHUD {
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly spellText: Phaser.GameObjects.Text;
  private readonly spellButton: Phaser.GameObjects.Text;

  private lastTime = -1;
  private lastHp = -1;
  private lastCooldown = -1;

  public constructor(scene: Phaser.Scene, onSpell: () => void) {
    this.timeText = scene.add.text(20, 18, '', { color: '#f8fafc', fontSize: '30px' });
    this.hpText = scene.add.text(300, 18, '', { color: '#fecaca', fontSize: '30px' });
    this.spellText = scene.add.text(560, 18, '', { color: '#bfdbfe', fontSize: '30px' });

    this.spellButton = scene.add
      .text(1030, 16, localizationManager.t('raid.freeze'), {
        color: '#e0f2fe',
        fontSize: '30px',
        backgroundColor: '#1d4ed8',
        padding: { x: 16, y: 10 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onSpell);
  }

  public render(timeLeftSec: number, baseHp: number, spellCooldown: number): void {
    const roundedTime = Math.ceil(timeLeftSec);
    const roundedCooldown = Math.ceil(spellCooldown);

    if (roundedTime !== this.lastTime) {
      this.timeText.setText(localizationManager.t('raid.time', { value: roundedTime }));
      this.lastTime = roundedTime;
    }
    if (baseHp !== this.lastHp) {
      this.hpText.setText(localizationManager.t('raid.baseHp', { value: baseHp }));
      this.lastHp = baseHp;
    }
    if (roundedCooldown !== this.lastCooldown) {
      this.spellText.setText(localizationManager.t('raid.cooldown', { value: roundedCooldown }));
      this.lastCooldown = roundedCooldown;
    }

    this.spellButton.setAlpha(spellCooldown > 0 ? 0.5 : 1);
  }
}
