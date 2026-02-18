import { sdkManager } from './SDKManager';

export interface MonetizationFlags {
  disableAds: boolean;
  allowRewardedWhenAdsDisabled: boolean;
  interstitialRaidEvery: number;
  interstitialScreenEvery: number;
  rewardedMergeGeneratorCharges: number;
  rewardedHutBoosterGold: number;
  rewardedHutBoosterDust: number;
}

const DEFAULT_FLAGS: MonetizationFlags = {
  disableAds: false,
  allowRewardedWhenAdsDisabled: true,
  interstitialRaidEvery: 2,
  interstitialScreenEvery: 3,
  rewardedMergeGeneratorCharges: 1,
  rewardedHutBoosterGold: 30,
  rewardedHutBoosterDust: 10,
};

export class RemoteConfigManager {
  private flags: MonetizationFlags = { ...DEFAULT_FLAGS };
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const rawFlags = await sdkManager.getFlags({ ...DEFAULT_FLAGS });
    this.flags = {
      disableAds: this.toBoolean(rawFlags.disableAds, DEFAULT_FLAGS.disableAds),
      allowRewardedWhenAdsDisabled: this.toBoolean(
        rawFlags.allowRewardedWhenAdsDisabled,
        DEFAULT_FLAGS.allowRewardedWhenAdsDisabled,
      ),
      interstitialRaidEvery: this.toPositiveInt(rawFlags.interstitialRaidEvery, DEFAULT_FLAGS.interstitialRaidEvery),
      interstitialScreenEvery: this.toPositiveInt(rawFlags.interstitialScreenEvery, DEFAULT_FLAGS.interstitialScreenEvery),
      rewardedMergeGeneratorCharges: this.toPositiveInt(
        rawFlags.rewardedMergeGeneratorCharges,
        DEFAULT_FLAGS.rewardedMergeGeneratorCharges,
      ),
      rewardedHutBoosterGold: this.toPositiveInt(rawFlags.rewardedHutBoosterGold, DEFAULT_FLAGS.rewardedHutBoosterGold),
      rewardedHutBoosterDust: this.toPositiveInt(rawFlags.rewardedHutBoosterDust, DEFAULT_FLAGS.rewardedHutBoosterDust),
    };
    this.initialized = true;
  }

  public getFlags(): MonetizationFlags {
    return { ...this.flags };
  }

  public get defaults(): MonetizationFlags {
    return { ...DEFAULT_FLAGS };
  }

  private toBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private toPositiveInt(value: unknown, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.max(1, Math.floor(value));
  }
}

export const remoteConfigManager = new RemoteConfigManager();
