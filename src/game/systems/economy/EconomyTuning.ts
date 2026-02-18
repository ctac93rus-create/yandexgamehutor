import type { MonetizationFlags } from '../../managers/RemoteConfigManager';

export interface EconomyTuning {
  raidRewardMultiplier: number;
  raidScoreMultiplier: number;
  mergeDustMultiplier: number;
  generatorRechargeMultiplier: number;
  hutUpgradeCostMultiplier: number;
  adsInterstitialMinIntervalSec: number;
  rewardedCooldownSec: number;
  raidSoftCapDailyFullRewards: number;
  raidSoftCapDecay: number;
  raidSoftCapMinMultiplier: number;
}

export const DEFAULT_ECONOMY_TUNING: EconomyTuning = {
  raidRewardMultiplier: 1,
  raidScoreMultiplier: 1,
  mergeDustMultiplier: 1,
  generatorRechargeMultiplier: 1,
  hutUpgradeCostMultiplier: 1,
  adsInterstitialMinIntervalSec: 45,
  rewardedCooldownSec: 30,
  raidSoftCapDailyFullRewards: 8,
  raidSoftCapDecay: 0.35,
  raidSoftCapMinMultiplier: 0.2,
};

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  return Math.floor(clamp(value, fallback, min, max));
}

export function normalizeEconomyTuning(
  source: Partial<Record<keyof EconomyTuning, unknown>>,
): EconomyTuning {
  return {
    raidRewardMultiplier: clamp(source.raidRewardMultiplier, DEFAULT_ECONOMY_TUNING.raidRewardMultiplier, 0.25, 5),
    raidScoreMultiplier: clamp(source.raidScoreMultiplier, DEFAULT_ECONOMY_TUNING.raidScoreMultiplier, 0.25, 5),
    mergeDustMultiplier: clamp(source.mergeDustMultiplier, DEFAULT_ECONOMY_TUNING.mergeDustMultiplier, 0.1, 5),
    generatorRechargeMultiplier: clamp(
      source.generatorRechargeMultiplier,
      DEFAULT_ECONOMY_TUNING.generatorRechargeMultiplier,
      0.5,
      3,
    ),
    hutUpgradeCostMultiplier: clamp(source.hutUpgradeCostMultiplier, DEFAULT_ECONOMY_TUNING.hutUpgradeCostMultiplier, 0.5, 3),
    adsInterstitialMinIntervalSec: clampInt(
      source.adsInterstitialMinIntervalSec,
      DEFAULT_ECONOMY_TUNING.adsInterstitialMinIntervalSec,
      5,
      3600,
    ),
    rewardedCooldownSec: clampInt(source.rewardedCooldownSec, DEFAULT_ECONOMY_TUNING.rewardedCooldownSec, 0, 3600),
    raidSoftCapDailyFullRewards: clampInt(
      source.raidSoftCapDailyFullRewards,
      DEFAULT_ECONOMY_TUNING.raidSoftCapDailyFullRewards,
      1,
      100,
    ),
    raidSoftCapDecay: clamp(source.raidSoftCapDecay, DEFAULT_ECONOMY_TUNING.raidSoftCapDecay, 0.05, 2),
    raidSoftCapMinMultiplier: clamp(
      source.raidSoftCapMinMultiplier,
      DEFAULT_ECONOMY_TUNING.raidSoftCapMinMultiplier,
      0.05,
      1,
    ),
  };
}

export function getEconomyTuning(flags: MonetizationFlags): EconomyTuning {
  return normalizeEconomyTuning(flags);
}

export function getLocalDayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRaidSoftCapMultiplier(raidNumberToday: number, tuning: EconomyTuning): number {
  if (raidNumberToday <= tuning.raidSoftCapDailyFullRewards) {
    return 1;
  }

  const extraRaids = raidNumberToday - tuning.raidSoftCapDailyFullRewards;
  const decayed = Math.exp(-extraRaids * tuning.raidSoftCapDecay);
  return Math.max(tuning.raidSoftCapMinMultiplier, decayed);
}

export function applyDustAmount(base: number, tuning: EconomyTuning): number {
  return Math.max(0, Math.round(base * tuning.mergeDustMultiplier));
}

export function applyUpgradeCost(base: number, tuning: EconomyTuning): number {
  return Math.max(0, Math.round(base * tuning.hutUpgradeCostMultiplier));
}

export interface TunedUpgradeCost {
  gold: number;
  dust: number;
}

export function getTunedUpgradeCost(
  costGold: number,
  costDust: number,
  tuning: EconomyTuning,
): TunedUpgradeCost {
  return {
    gold: applyUpgradeCost(costGold, tuning),
    dust: applyUpgradeCost(costDust, tuning),
  };
}
