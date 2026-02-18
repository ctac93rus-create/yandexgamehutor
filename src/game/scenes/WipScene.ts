import Phaser from 'phaser';

export class WipScene extends Phaser.Scene {
  public constructor(private readonly sceneKey: string, private readonly label: string) {
    super(sceneKey);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.add.text(this.scale.width * 0.5, this.scale.height * 0.5, `${this.label}\nWIP`, {
      color: '#f8fafc',
      align: 'center',
      fontSize: '42px',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
