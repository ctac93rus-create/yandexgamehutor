import { sdkManager } from './SDKManager';

export interface MonetizationFlags {
  disableAds: boolean;
  allowRewardedWhenAdsDisabled: boolean;
  interstitialRaidEvery: number;
  interstitialScreenEvery: number;
  adsInterstitialMinIntervalSec: number;
  rewardedCooldownSec: number;
  rewardedMergeGeneratorCharges: number;
  rewardedHutBoosterGold: number;
  rewardedHutBoosterDust: number;
  raidRewardMultiplier: number;
  raidScoreMultiplier: number;
  mergeDustMultiplier: number;
  generatorRechargeMultiplier: number;
  hutUpgradeCostMultiplier: number;
  raidSoftCapDailyFullRewards: number;
  raidSoftCapDecay: number;
  raidSoftCapMinMultiplier: number;
  showTuningDebugPanel: boolean;
}

const DEFAULT_FLAGS: MonetizationFlags = {
  disableAds: false,
  allowRewardedWhenAdsDisabled: true,
  interstitialRaidEvery: 2,
  interstitialScreenEvery: 3,
  adsInterstitialMinIntervalSec: 45,
  rewardedCooldownSec: 30,
  rewardedMergeGeneratorCharges: 1,
  rewardedHutBoosterGold: 30,
  rewardedHutBoosterDust: 10,
  raidRewardMultiplier: 1,
  raidScoreMultiplier: 1,
  mergeDustMultiplier: 1,
  generatorRechargeMultiplier: 1,
  hutUpgradeCostMultiplier: 1,
  raidSoftCapDailyFullRewards: 8,
  raidSoftCapDecay: 0.35,
  raidSoftCapMinMultiplier: 0.2,
  showTuningDebugPanel: false,
};

export class RemoteConfigManager {
  private flags: MonetizationFlags = { ...DEFAULT_FLAGS };
  private initialized = false;

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const rawFlags = await sdkManager.getFlags({ ...DEFAULT_FLAGS });
      this.flags = {
        disableAds: this.toBoolean(rawFlags.disableAds, DEFAULT_FLAGS.disableAds),
        allowRewardedWhenAdsDisabled: this.toBoolean(
          rawFlags.allowRewardedWhenAdsDisabled,
          DEFAULT_FLAGS.allowRewardedWhenAdsDisabled,
        ),
        interstitialRaidEvery: this.toPositiveInt(rawFlags.interstitialRaidEvery, DEFAULT_FLAGS.interstitialRaidEvery),
        interstitialScreenEvery: this.toPositiveInt(rawFlags.interstitialScreenEvery, DEFAULT_FLAGS.interstitialScreenEvery),
        adsInterstitialMinIntervalSec: this.toIntInRange(
          rawFlags.adsInterstitialMinIntervalSec,
          DEFAULT_FLAGS.adsInterstitialMinIntervalSec,
          5,
          3600,
        ),
        rewardedCooldownSec: this.toIntInRange(rawFlags.rewardedCooldownSec, DEFAULT_FLAGS.rewardedCooldownSec, 0, 3600),
        rewardedMergeGeneratorCharges: this.toIntInRange(
          rawFlags.rewardedMergeGeneratorCharges,
          DEFAULT_FLAGS.rewardedMergeGeneratorCharges,
          1,
          10,
        ),
        rewardedHutBoosterGold: this.toIntInRange(rawFlags.rewardedHutBoosterGold, DEFAULT_FLAGS.rewardedHutBoosterGold, 0, 9999),
        rewardedHutBoosterDust: this.toIntInRange(rawFlags.rewardedHutBoosterDust, DEFAULT_FLAGS.rewardedHutBoosterDust, 0, 9999),
        raidRewardMultiplier: this.toNumberInRange(rawFlags.raidRewardMultiplier, DEFAULT_FLAGS.raidRewardMultiplier, 0.25, 5),
        raidScoreMultiplier: this.toNumberInRange(rawFlags.raidScoreMultiplier, DEFAULT_FLAGS.raidScoreMultiplier, 0.25, 5),
        mergeDustMultiplier: this.toNumberInRange(rawFlags.mergeDustMultiplier, DEFAULT_FLAGS.mergeDustMultiplier, 0.1, 5),
        generatorRechargeMultiplier: this.toNumberInRange(
          rawFlags.generatorRechargeMultiplier,
          DEFAULT_FLAGS.generatorRechargeMultiplier,
          0.5,
          3,
        ),
        hutUpgradeCostMultiplier: this.toNumberInRange(
          rawFlags.hutUpgradeCostMultiplier,
          DEFAULT_FLAGS.hutUpgradeCostMultiplier,
          0.5,
          3,
        ),
        raidSoftCapDailyFullRewards: this.toIntInRange(
          rawFlags.raidSoftCapDailyFullRewards,
          DEFAULT_FLAGS.raidSoftCapDailyFullRewards,
          1,
          100,
        ),
        raidSoftCapDecay: this.toNumberInRange(rawFlags.raidSoftCapDecay, DEFAULT_FLAGS.raidSoftCapDecay, 0.05, 2),
        raidSoftCapMinMultiplier: this.toNumberInRange(
          rawFlags.raidSoftCapMinMultiplier,
          DEFAULT_FLAGS.raidSoftCapMinMultiplier,
          0.05,
          1,
        ),
        showTuningDebugPanel: this.toBoolean(rawFlags.showTuningDebugPanel, DEFAULT_FLAGS.showTuningDebugPanel),
      };
    } catch {
      this.flags = { ...DEFAULT_FLAGS };
    }
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

  private toIntInRange(value: unknown, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.floor(value)));
  }

  private toNumberInRange(value: unknown, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, value));
  }
}

export const remoteConfigManager = new RemoteConfigManager();
