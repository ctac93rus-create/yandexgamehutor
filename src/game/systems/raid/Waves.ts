import { z } from 'zod';

import type { WaveSpawn, WavesConfig } from './types';

const waveSpawnSchema = z.object({
  atSec: z.number().nonnegative(),
  lane: z.number().int().min(0).max(2),
  enemyId: z.string().min(1),
});

const wavesConfigSchema = z.object({
  durationSec: z.number().positive(),
  baseHp: z.number().int().positive(),
  timeline: z.array(waveSpawnSchema).min(1),
});

export class Waves {
  public static parse(raw: unknown): WavesConfig {
    const parsed = wavesConfigSchema.parse(raw);
    const sorted = parsed.timeline.slice().sort((a, b) => a.atSec - b.atSec);
    return {
      durationSec: parsed.durationSec,
      baseHp: parsed.baseHp,
      timeline: sorted,
    };
  }

  public static nextBatch(timeline: WaveSpawn[], elapsedSec: number, cursor: number): number {
    let nextCursor = cursor;
    while (nextCursor < timeline.length && timeline[nextCursor].atSec <= elapsedSec) {
      nextCursor += 1;
    }
    return nextCursor;
  }
}
