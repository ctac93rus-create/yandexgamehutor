import Phaser from 'phaser';

import { AudioManager } from './managers/AudioManager';
import { purchasesManager } from './managers/PurchasesManager';
import { remoteConfigManager } from './managers/RemoteConfigManager';
import { saveManager } from './managers/SaveManager';
import { sdkManager } from './managers/SDKManager';
import { localizationManager } from './managers/LocalizationManager';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { HutScene } from './scenes/HutScene';
import { MergeScene } from './scenes/MergeScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RaidScene } from './scenes/RaidScene';
import { SettingsScene } from './scenes/SettingsScene';
import { SocialScene } from './scenes/SocialScene';

export class GameApp {
  private game: Phaser.Game | null = null;

  public async start(): Promise<void> {
    localizationManager.init();
    await sdkManager.init();
    await remoteConfigManager.init();

    purchasesManager.registerConsumable('pack_gold_small', async () => {
      const save = await saveManager.load();
      if (!save) {
        return;
      }
      await saveManager.save({ ...save, gold: save.gold + 250 });
    });
    purchasesManager.registerConsumable('pack_dust_small', async () => {
      const save = await saveManager.load();
      if (!save) {
        return;
      }
      await saveManager.save({ ...save, dust: save.dust + 125 });
    });
    await purchasesManager.processPendingPurchases();

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
        HutScene,
        RaidScene,
        SettingsScene,
        SocialScene,
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
