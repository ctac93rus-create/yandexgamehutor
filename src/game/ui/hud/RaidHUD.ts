import Phaser from 'phaser';

interface RaidHudState {
  timeLeftSec: number;
  baseHp: number;
  spellCooldown: number;
}

export class RaidHUD {
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly spellText: Phaser.GameObjects.Text;
  private readonly spellButton: Phaser.GameObjects.Text;

  public constructor(scene: Phaser.Scene, onSpell: () => void) {
    this.timeText = scene.add.text(20, 18, '', { color: '#f8fafc', fontSize: '24px' });
    this.hpText = scene.add.text(220, 18, '', { color: '#fecaca', fontSize: '24px' });
    this.spellText = scene.add.text(430, 18, '', { color: '#bfdbfe', fontSize: '24px' });

    this.spellButton = scene.add
      .text(1060, 20, 'Freeze', {
        color: '#e0f2fe',
        fontSize: '24px',
        backgroundColor: '#1d4ed8',
        padding: { x: 10, y: 6 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', onSpell);
  }

  public render(state: RaidHudState): void {
    this.timeText.setText(`Время: ${Math.ceil(state.timeLeftSec)}с`);
    this.hpText.setText(`База HP: ${state.baseHp}`);
    this.spellText.setText(`КД: ${Math.ceil(state.spellCooldown)}с`);
    this.spellButton.setAlpha(state.spellCooldown > 0 ? 0.5 : 1);
  }
}
