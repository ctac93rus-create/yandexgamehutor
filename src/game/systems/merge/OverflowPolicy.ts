import type { EconomyConfig } from './types';

export interface OverflowResult {
  grantedDust: number;
  reason: string;
}

export class OverflowPolicy {
  public constructor(private readonly economy: EconomyConfig) {}

  public resolveNoSpace(itemsCount = 1): OverflowResult {
    return {
      grantedDust: this.economy.overflowDustPerItem * itemsCount,
      reason: 'board_overflow',
    };
  }
}
