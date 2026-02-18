import { describe, expect, it } from 'vitest';

import dailyJson from '../src/game/data/quests_daily.json';
import storyJson from '../src/game/data/quests_story.json';
import { QuestEngine } from '../src/game/systems/quests/QuestEngine';

describe('QuestEngine', () => {
  it('completes and claims story quests only once', () => {
    const state = QuestEngine.defaultState();
    const engine = new QuestEngine(state, storyJson, dailyJson);

    engine.onEvent('merge_done', 1);
    const firstReward = engine.claimStoryReward('story_01');
    const secondReward = engine.claimStoryReward('story_01');

    expect(firstReward.gold).toBeGreaterThan(0);
    expect(secondReward.gold).toBe(0);
  });

  it('keeps three active daily quests per day', () => {
    const state = QuestEngine.defaultState();
    const engine = new QuestEngine(state, storyJson, dailyJson);

    expect(engine.snapshot().daily).toHaveLength(3);
  });
});
