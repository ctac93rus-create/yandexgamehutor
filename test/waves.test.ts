import { describe, expect, it } from 'vitest';

import { Waves } from '../src/game/systems/raid/Waves';

describe('Waves parser', () => {
  it('sorts timeline and validates lanes', () => {
    const parsed = Waves.parse({
      durationSec: 30,
      baseHp: 10,
      timeline: [
        { atSec: 5, lane: 2, enemyId: 'boar' },
        { atSec: 1, lane: 0, enemyId: 'rat' },
      ],
    });

    expect(parsed.timeline.map((it) => it.atSec)).toEqual([1, 5]);
  });

  it('returns cursor for batch spawns', () => {
    const parsed = Waves.parse({
      durationSec: 20,
      baseHp: 5,
      timeline: [
        { atSec: 1, lane: 0, enemyId: 'rat' },
        { atSec: 3, lane: 1, enemyId: 'rat' },
      ],
    });

    const cursor = Waves.nextBatch(parsed.timeline, 2.5, 0);
    expect(cursor).toBe(1);
  });
});
