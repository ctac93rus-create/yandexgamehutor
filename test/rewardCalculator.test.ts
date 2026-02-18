import { describe, expect, it } from 'vitest';

import { RewardCalculator } from '../src/game/systems/raid/RewardCalculator';

describe('RewardCalculator', () => {
  const calculator = new RewardCalculator({
    baseGold: 25,
    goldPerKill: 2,
    baseDust: 4,
    dustPerSurvivedHp: 1,
    rewardItems: ['twig', 'branch'],
  });

  it('calculates base reward', () => {
    const reward = calculator.calculate(
      { win: true, kills: 8, baseHpLeft: 6, durationSec: 41 },
      false,
    );

    expect(reward.gold).toBe(41);
    expect(reward.dust).toBe(10);
    expect(reward.itemIds).toEqual(['twig', 'branch']);
  });

  it('doubles reward for rewarded flow', () => {
    const reward = calculator.calculate(
      { win: false, kills: 3, baseHpLeft: 0, durationSec: 22 },
      true,
    );

    expect(reward.gold).toBe(62);
    expect(reward.dust).toBe(8);
  });
});
