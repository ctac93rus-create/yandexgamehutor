import Phaser from 'phaser';

import { AudioManager } from './managers/AudioManager';
import { sdkManager } from './managers/SDKManager';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { MergeScene } from './scenes/MergeScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RaidScene } from './scenes/RaidScene';
import { WipScene } from './scenes/WipScene';

export class GameApp {
  private game: Phaser.Game | null = null;

  public async start(): Promise<void> {
    await sdkManager.init();

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'app',
      width: 1280,
      height: 720,
      backgroundColor: '#020617',
      fps: {
        target: 60,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [
        BootScene,
        PreloadScene,
        MenuScene,
        MergeScene,
        new WipScene('HutScene', 'Хутор'),
        RaidScene,
        new WipScene('SettingsScene', 'Настройки'),
      ],
    });

    this.bindPauseResume();
  }

  private bindPauseResume(): void {
    if (!this.game) {
      return;
    }

    const audioManager = new AudioManager(this.game.sound);

    sdkManager.on('game_api_pause', () => {
      this.game?.loop.sleep();
      audioManager.pauseAll();
    });

    sdkManager.on('game_api_resume', () => {
      audioManager.resumeAll();
      this.game?.loop.wake();
    });
  }
}
