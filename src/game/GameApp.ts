import Phaser from 'phaser';

import { AudioManager } from './managers/AudioManager';
import { entitlementsManager } from './managers/EntitlementsManager';
import { purchasesManager } from './managers/PurchasesManager';
import { remoteConfigManager } from './managers/RemoteConfigManager';
import { saveManager } from './managers/SaveManager';
import { sdkManager } from './managers/SDKManager';
import { localizationManager } from './managers/LocalizationManager';
import { sfxManager } from './managers/SfxManager';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { HutScene } from './scenes/HutScene';
import { MergeScene } from './scenes/MergeScene';
import { PreloadScene } from './scenes/PreloadScene';
import { RaidScene } from './scenes/RaidScene';
import { SettingsScene } from './scenes/SettingsScene';
import { SocialScene } from './scenes/SocialScene';
import { ProgressScene } from './scenes/ProgressScene';

export class GameApp {
  private game: Phaser.Game | null = null;
  private audioManager: AudioManager | null = null;
  private paused = false;

  public async start(): Promise<void> {
    localizationManager.init();
    await sdkManager.init();
    await remoteConfigManager.init();
    await entitlementsManager.load();

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
    purchasesManager.registerNonConsumable('disable_ads', async () => {
      if (entitlementsManager.getState().disableAds) {
        return;
      }
      await entitlementsManager.setDisableAds(true);
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
        ProgressScene,
      ],
    });

    this.bindPauseResume();
  }

  public pauseGame(): void {
    if (!this.game || !this.audioManager) {
      return;
    }

    this.paused = true;
    this.game.loop.sleep();
    this.audioManager.pauseAll();
    sfxManager.onGamePause();
  }

  public resumeGame(): void {
    if (!this.game || !this.audioManager) {
      return;
    }

    this.paused = false;
    this.audioManager.resumeAll();
    sfxManager.onGameResume();
    this.game.loop.wake();
  }

  public getAudioState(): { phaserMutedOrPaused: boolean; audioContextState?: AudioContextState } {
    const contextState = (this.game?.sound as { context?: { state?: AudioContextState } } | undefined)?.context?.state;
    const mutedOrPaused = Boolean(this.game?.sound.mute || this.paused);
    return {
      phaserMutedOrPaused: mutedOrPaused,
      audioContextState: contextState,
    };
  }

  private bindPauseResume(): void {
    if (!this.game) {
      return;
    }

    this.audioManager = new AudioManager(this.game.sound);

    sdkManager.on('game_api_pause', () => {
      this.pauseGame();
    });

    sdkManager.on('game_api_resume', () => {
      this.resumeGame();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseGame();
      } else {
        this.resumeGame();
      }
    });
  }
}
