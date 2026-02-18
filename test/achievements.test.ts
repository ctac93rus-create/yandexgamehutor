import { describe, expect, it } from 'vitest';

import { unlockAchievements } from '../src/game/systems/meta/achievements';
import { QuestEngine } from '../src/game/systems/quests/QuestEngine';

describe('achievements', () => {
  it('unlocks merges_100 when merges reach 100', () => {
    const meta = QuestEngine.defaultState();
    meta.stats.merges = 100;

    const unlocked = unlockAchievements(meta);

    expect(unlocked).toContain('merges_100');
    expect(meta.achievementsUnlocked).toContain('merges_100');
  });

  it('unlocks first_raid and chapter_1 based on meta progress', () => {
    const meta = QuestEngine.defaultState();
    meta.stats.raidsCompleted = 1;

    const unlocked = unlockAchievements(meta);

    expect(unlocked).toContain('first_raid');
    expect(unlocked).toContain('chapter_1');
  });
});
