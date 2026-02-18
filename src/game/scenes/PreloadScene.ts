import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  public constructor() {
    super('PreloadScene');
  }

  public preload(): void {
    const g = this.add.graphics();
    g.fillStyle(0x4ade80, 1);
    g.fillRoundedRect(0, 0, 220, 64, 12);
    g.generateTexture('btn-primary', 220, 64);
    g.clear();
    g.fillStyle(0x111827, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture('pixel', 8, 8);
    g.destroy();
  }

  public create(): void {
    this.time.delayedCall(250, () => {
      this.scene.start('MenuScene');
    });
  }
}
