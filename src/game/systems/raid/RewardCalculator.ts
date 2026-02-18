import type { RaidEconomyConfig } from '../merge/types';
import type { RaidResult } from './types';

export interface RaidReward {
  gold: number;
  dust: number;
  itemIds: string[];
}

export class RewardCalculator {
  public constructor(private readonly economy: RaidEconomyConfig) {}

  public calculate(
    result: RaidResult,
    doubled: boolean,
    rewardMultiplier = 1,
    softCapMultiplier = 1,
  ): RaidReward {
    const goldBase = this.economy.baseGold + result.kills * this.economy.goldPerKill;
    const dustBase = this.economy.baseDust + Math.max(0, result.baseHpLeft) * this.economy.dustPerSurvivedHp;
    const multiplier = (doubled ? 2 : 1) * rewardMultiplier * softCapMultiplier;

    return {
      gold: Math.max(0, Math.round(goldBase * multiplier)),
      dust: Math.max(0, Math.round(dustBase * multiplier)),
      itemIds: this.economy.rewardItems,
    };
  }
}
