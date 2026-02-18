import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ECONOMY_TUNING,
  applyDustAmount,
  applyUpgradeCost,
  getEconomyTuning,
  getTunedUpgradeCost,
  getRaidSoftCapMultiplier,
  normalizeEconomyTuning,
} from '../src/game/systems/economy/EconomyTuning';
import { remoteConfigManager } from '../src/game/managers/RemoteConfigManager';

describe('EconomyTuning', () => {
  it('normalizes and clamps invalid values', () => {
    const normalized = normalizeEconomyTuning({
      raidRewardMultiplier: 99,
      raidScoreMultiplier: -10,
      mergeDustMultiplier: 0,
      generatorRechargeMultiplier: 99,
      hutUpgradeCostMultiplier: 0,
      adsInterstitialMinIntervalSec: 1,
      rewardedCooldownSec: -1,
      raidSoftCapDailyFullRewards: 0,
      raidSoftCapDecay: 0,
      raidSoftCapMinMultiplier: 2,
    });

    expect(normalized).toEqual({
      raidRewardMultiplier: 5,
      raidScoreMultiplier: 0.25,
      mergeDustMultiplier: 0.1,
      generatorRechargeMultiplier: 3,
      hutUpgradeCostMultiplier: 0.5,
      adsInterstitialMinIntervalSec: 5,
      rewardedCooldownSec: 0,
      raidSoftCapDailyFullRewards: 1,
      raidSoftCapDecay: 0.05,
      raidSoftCapMinMultiplier: 1,
    });
  });

  it('uses defaults when remote config is absent', () => {
    const tuning = getEconomyTuning(remoteConfigManager.defaults);

    expect(tuning).toEqual(DEFAULT_ECONOMY_TUNING);
  });

  it('applies multipliers for dust and upgrade costs', () => {
    const tuning = normalizeEconomyTuning({
      mergeDustMultiplier: 1.5,
      hutUpgradeCostMultiplier: 0.75,
    });

    expect(applyDustAmount(4, tuning)).toBe(6);
    expect(applyUpgradeCost(80, tuning)).toBe(60);
  });


  it('uses a single rounded helper for hut UI and purchase costs', () => {
    const tuning = normalizeEconomyTuning({
      hutUpgradeCostMultiplier: 0.67,
    });

    const tuned = getTunedUpgradeCost(45, 31, tuning);

    expect(tuned).toEqual({
      gold: applyUpgradeCost(45, tuning),
      dust: applyUpgradeCost(31, tuning),
    });
  });

  it('calculates raid soft-cap curve after N raids', () => {
    const tuning = normalizeEconomyTuning({
      raidSoftCapDailyFullRewards: 3,
      raidSoftCapDecay: 0.5,
      raidSoftCapMinMultiplier: 0.2,
    });

    expect(getRaidSoftCapMultiplier(1, tuning)).toBe(1);
    expect(getRaidSoftCapMultiplier(3, tuning)).toBe(1);
    expect(getRaidSoftCapMultiplier(4, tuning)).toBeLessThan(1);
    expect(getRaidSoftCapMultiplier(20, tuning)).toBeGreaterThanOrEqual(0.2);
  });
});
