import { describe, expect, it } from 'vitest';

import { OverflowPolicy } from '../src/game/systems/merge/OverflowPolicy';

describe('OverflowPolicy', () => {
  it('returns dust compensation when no free cell exists', () => {
    const policy = new OverflowPolicy({
      overflowDustPerItem: 3,
      startGold: 0,
      startDust: 0,
    });

    expect(policy.resolveNoSpace(2)).toEqual({
      grantedDust: 6,
      reason: 'board_overflow',
    });
  });
});
