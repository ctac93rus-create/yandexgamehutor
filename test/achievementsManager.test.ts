import { describe, expect, it, vi } from 'vitest';

import { AchievementsManager } from '../src/game/managers/AchievementsManager';
import { QuestEngine } from '../src/game/systems/quests/QuestEngine';

describe('AchievementsManager', () => {
  it('calls setStats only when new unlock stats are missing', async () => {
    const setStats = vi.fn().mockResolvedValue(undefined);
    const manager = new AchievementsManager({
      getPlayer: vi.fn().mockResolvedValue({
        getStats: vi.fn().mockResolvedValue({ achievement_merges_100: 1, achievement_chapter_1: 1 }),
        setStats,
      }),
    });

    const meta = QuestEngine.defaultState();
    meta.stats.merges = 100;

    await manager.process(meta);

    expect(setStats).not.toHaveBeenCalled();
  });
});
