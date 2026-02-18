import { sdkManager } from './SDKManager';
import { remoteConfigManager } from './RemoteConfigManager';
import { getEconomyTuning } from '../systems/economy/EconomyTuning';

export type RewardedPlacement = 'raid_double_reward' | 'merge_generator_charge' | 'hut_booster';

export class AdsManager {
  private raidCounter = 0;
  private screenCounter = 0;
  private lastInterstitialAtMs = 0;
  private lastRewardedAtMs = 0;

  public async showRewarded(_placement: RewardedPlacement, onRewarded: () => void): Promise<boolean> {
    const flags = remoteConfigManager.getFlags();
    const tuning = getEconomyTuning(flags);
    if (flags.disableAds && !flags.allowRewardedWhenAdsDisabled) {
      return false;
    }
    const now = Date.now();
    if (now - this.lastRewardedAtMs < tuning.rewardedCooldownSec * 1000) {
      return false;
    }

    let rewarded = false;
    await sdkManager.showRewardedVideo({
      onRewarded: () => {
        rewarded = true;
        this.lastRewardedAtMs = Date.now();
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
    const tuning = getEconomyTuning(flags);
    if (flags.disableAds) {
      return false;
    }
    const now = Date.now();
    if (now - this.lastInterstitialAtMs < tuning.adsInterstitialMinIntervalSec * 1000) {
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
    this.lastInterstitialAtMs = Date.now();
    return true;
  }
}

export const adsManager = new AdsManager();
