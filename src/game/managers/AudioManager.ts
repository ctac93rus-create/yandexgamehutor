import type Phaser from 'phaser';

export class AudioManager {
  private muted = false;
  private mutedBeforePause = false;

  public constructor(private readonly sound: Phaser.Sound.BaseSoundManager) {}

  public setMuted(value: boolean): void {
    this.muted = value;
    this.sound.mute = value;
  }

  public pauseAll(): void {
    this.mutedBeforePause = this.muted;
    this.sound.pauseAll();
    this.sound.mute = true;
  }

  public resumeAll(): void {
    this.sound.resumeAll();
    this.sound.mute = this.mutedBeforePause;
    this.muted = this.mutedBeforePause;
  }
}
