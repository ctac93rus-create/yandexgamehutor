export interface StoryQuestStep {
  id: string;
  description: string;
  objective: {
    event: string;
    target: number;
  };
}

export interface StoryQuest {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  rewards: {
    gold: number;
    dust: number;
  };
  steps: StoryQuestStep[];
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  objective: {
    event: string;
    target: number;
  };
  rewards: {
    gold: number;
    dust: number;
  };
}

export interface HutUpgradeDefinition {
  id: string;
  title: string;
  description: string;
  costGold: number;
  costDust: number;
  unlockFlag?: string;
  unlockChapterId?: string;
}

export interface QuestProgressState {
  activeStoryQuestIds: string[];
  storyCompletedIds: string[];
  storyStepProgress: Record<string, number>;
  claimedStoryRewardIds: string[];
  activeDailyQuestIds: string[];
  dailyCompletedIds: string[];
  dailyClaimedIds: string[];
  dailyProgress: Record<string, number>;
  dailyLastRefreshDay: string;
  unlockedChapters: string[];
}

export interface MetaStats {
  merges: number;
  generatorSpawns: number;
  raidsCompleted: number;
  raidWins: number;
  hutUpgrades: number;
}

export interface MetaProgressState {
  unlockedFlags: string[];
  purchasedUpgradeIds: string[];
  stats: MetaStats;
  quests: QuestProgressState;
}

export interface QuestSnapshot {
  story: Array<{ id: string; title: string; description: string; completed: boolean; rewardClaimed: boolean; stepCurrent: number; stepTarget: number }>;
  daily: Array<{ id: string; title: string; description: string; completed: boolean; rewardClaimed: boolean; current: number; target: number }>;
}

export interface QuestReward {
  gold: number;
  dust: number;
}
