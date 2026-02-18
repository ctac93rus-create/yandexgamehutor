import { sdkManager } from './SDKManager';
import { remoteConfigManager } from './RemoteConfigManager';

export type RewardedPlacement = 'raid_double_reward' | 'merge_generator_charge' | 'hut_booster';

export class AdsManager {
  private raidCounter = 0;
  private screenCounter = 0;

  public async showRewarded(_placement: RewardedPlacement, onRewarded: () => void): Promise<boolean> {
    const flags = remoteConfigManager.getFlags();
    if (flags.disableAds && !flags.allowRewardedWhenAdsDisabled) {
      return false;
    }

    let rewarded = false;
    await sdkManager.showRewardedVideo({
      onRewarded: () => {
        rewarded = true;
        onRewarded();
      },
    });

    return rewarded;
  }

  public async onRaidFinished(): Promise<boolean> {
    this.raidCounter += 1;
    return this.showInterstitialIfNeeded('raid');
  }

  public async onScreenShown(): Promise<boolean> {
    this.screenCounter += 1;
    return this.showInterstitialIfNeeded('screen');
  }

  public resetCounters(): void {
    this.raidCounter = 0;
    this.screenCounter = 0;
  }

  private async showInterstitialIfNeeded(reason: 'raid' | 'screen'): Promise<boolean> {
    const flags = remoteConfigManager.getFlags();
    if (flags.disableAds) {
      return false;
    }

    const shouldShow =
      reason === 'raid'
        ? this.raidCounter % flags.interstitialRaidEvery === 0
        : this.screenCounter % flags.interstitialScreenEvery === 0;

    if (!shouldShow) {
      return false;
    }

    await sdkManager.showFullscreenAdv();
    return true;
  }
}

export const adsManager = new AdsManager();
