import { DailyQuests } from './DailyQuests';
import { StoryChapters } from './StoryChapters';
import type {
  DailyQuest,
  MetaProgressState,
  QuestReward,
  QuestSnapshot,
  StoryQuest,
} from './types';

const EMPTY_REWARD: QuestReward = { gold: 0, dust: 0 };

export class QuestEngine {
  private readonly stories: StoryChapters;
  private readonly dailies: DailyQuests;

  public constructor(
    private readonly state: MetaProgressState,
    storyQuests: StoryQuest[],
    dailyQuests: DailyQuest[],
  ) {
    this.stories = new StoryChapters(storyQuests);
    this.dailies = new DailyQuests(dailyQuests);
    this.refreshDailyIfNeeded();
    this.ensureStoryActivation();
  }

  public static defaultState(): MetaProgressState {
    return {
      unlockedFlags: [],
      purchasedUpgradeIds: [],
      stats: {
        merges: 0,
        generatorSpawns: 0,
        raidsCompleted: 0,
        raidWins: 0,
        hutUpgrades: 0,
      },
      quests: {
        activeStoryQuestIds: [],
        storyCompletedIds: [],
        storyStepProgress: {},
        claimedStoryRewardIds: [],
        activeDailyQuestIds: [],
        dailyCompletedIds: [],
        dailyClaimedIds: [],
        dailyProgress: {},
        dailyLastRefreshDay: '',
        unlockedChapters: ['chapter_1'],
      },
    };
  }

  public onEvent(event: string, amount = 1): void {
    this.refreshDailyIfNeeded();

    const stats = this.state.stats;
    if (event === 'merge_done') {
      stats.merges += amount;
    }
    if (event === 'generator_spawn') {
      stats.generatorSpawns += amount;
    }
    if (event === 'raid_complete') {
      stats.raidsCompleted += amount;
    }
    if (event === 'raid_win') {
      stats.raidWins += amount;
    }
    if (event === 'hut_upgrade') {
      stats.hutUpgrades += amount;
    }

    for (let i = 0; i < this.state.quests.activeStoryQuestIds.length; i += 1) {
      const questId = this.state.quests.activeStoryQuestIds[i];
      const quest = this.stories.getQuestById(questId);
      if (!quest || this.state.quests.storyCompletedIds.includes(questId)) {
        continue;
      }
      const key = this.storyStepKey(questId, this.currentStepIndex(quest));
      const step = quest.steps[this.currentStepIndex(quest)];
      if (!step || step.objective.event !== event) {
        continue;
      }
      const prev = this.state.quests.storyStepProgress[key] ?? 0;
      const next = Math.min(step.objective.target, prev + amount);
      this.state.quests.storyStepProgress[key] = next;

      if (next >= step.objective.target) {
        const nextIndex = this.currentStepIndex(quest) + 1;
        if (nextIndex >= quest.steps.length) {
          if (!this.state.quests.storyCompletedIds.includes(quest.id)) {
            this.state.quests.storyCompletedIds.push(quest.id);
            this.tryUnlockNextChapter(quest.chapterId);
          }
        }
      }
    }

    for (let i = 0; i < this.state.quests.activeDailyQuestIds.length; i += 1) {
      const questId = this.state.quests.activeDailyQuestIds[i];
      const quest = this.dailies.getQuestById(questId);
      if (!quest || this.state.quests.dailyCompletedIds.includes(questId)) {
        continue;
      }
      if (quest.objective.event !== event) {
        continue;
      }
      const prev = this.state.quests.dailyProgress[quest.id] ?? 0;
      const next = Math.min(quest.objective.target, prev + amount);
      this.state.quests.dailyProgress[quest.id] = next;
      if (next >= quest.objective.target && !this.state.quests.dailyCompletedIds.includes(quest.id)) {
        this.state.quests.dailyCompletedIds.push(quest.id);
      }
    }

    this.ensureStoryActivation();
  }

  public claimStoryReward(questId: string): QuestReward {
    if (!this.state.quests.storyCompletedIds.includes(questId)) {
      return EMPTY_REWARD;
    }
    if (this.state.quests.claimedStoryRewardIds.includes(questId)) {
      return EMPTY_REWARD;
    }
    const quest = this.stories.getQuestById(questId);
    if (!quest) {
      return EMPTY_REWARD;
    }
    this.state.quests.claimedStoryRewardIds.push(questId);
    return { ...quest.rewards };
  }

  public claimDailyReward(questId: string): QuestReward {
    if (!this.state.quests.dailyCompletedIds.includes(questId)) {
      return EMPTY_REWARD;
    }
    if (this.state.quests.dailyClaimedIds.includes(questId)) {
      return EMPTY_REWARD;
    }
    const quest = this.dailies.getQuestById(questId);
    if (!quest) {
      return EMPTY_REWARD;
    }
    this.state.quests.dailyClaimedIds.push(questId);
    return { ...quest.rewards };
  }

  public snapshot(): QuestSnapshot {
    this.refreshDailyIfNeeded();
    this.ensureStoryActivation();

    return {
      story: this.state.quests.activeStoryQuestIds
        .map((id) => this.stories.getQuestById(id))
        .filter((quest): quest is StoryQuest => Boolean(quest))
        .map((quest) => {
          const idx = this.currentStepIndex(quest);
          const step = quest.steps[idx] ?? quest.steps[quest.steps.length - 1];
          const progress = this.state.quests.storyStepProgress[this.storyStepKey(quest.id, idx)] ?? 0;
          return {
            id: quest.id,
            title: quest.title,
            description: `${quest.description} — ${step.description}`,
            completed: this.state.quests.storyCompletedIds.includes(quest.id),
            rewardClaimed: this.state.quests.claimedStoryRewardIds.includes(quest.id),
            stepCurrent: progress,
            stepTarget: step.objective.target,
          };
        }),
      daily: this.state.quests.activeDailyQuestIds
        .map((id) => this.dailies.getQuestById(id))
        .filter((quest): quest is DailyQuest => Boolean(quest))
        .map((quest) => ({
          id: quest.id,
          title: quest.title,
          description: quest.description,
          completed: this.state.quests.dailyCompletedIds.includes(quest.id),
          rewardClaimed: this.state.quests.dailyClaimedIds.includes(quest.id),
          current: this.state.quests.dailyProgress[quest.id] ?? 0,
          target: quest.objective.target,
        })),
    };
  }

  public getState(): MetaProgressState {
    return this.state;
  }

  private refreshDailyIfNeeded(): void {
    const day = this.dayToken();
    if (this.state.quests.dailyLastRefreshDay === day) {
      return;
    }
    this.state.quests.dailyLastRefreshDay = day;
    this.state.quests.activeDailyQuestIds = this.dailies.rollForDay(day);
    this.state.quests.dailyCompletedIds = [];
    this.state.quests.dailyClaimedIds = [];
    this.state.quests.dailyProgress = {};
  }

  private ensureStoryActivation(): void {
    const active = new Set(this.state.quests.activeStoryQuestIds);
    const completed = this.state.quests.storyCompletedIds;

    for (let i = 0; i < this.stories.all().length; i += 1) {
      const quest = this.stories.all()[i];
      const chapterUnlocked = this.state.quests.unlockedChapters.includes(quest.chapterId);
      if (!chapterUnlocked || completed.includes(quest.id)) {
        continue;
      }
      if (!active.has(quest.id)) {
        this.state.quests.activeStoryQuestIds.push(quest.id);
        active.add(quest.id);
      }
    }
  }

  private currentStepIndex(quest: StoryQuest): number {
    for (let idx = 0; idx < quest.steps.length; idx += 1) {
      const step = quest.steps[idx];
      const progress = this.state.quests.storyStepProgress[this.storyStepKey(quest.id, idx)] ?? 0;
      if (progress < step.objective.target) {
        return idx;
      }
    }
    return Math.max(0, quest.steps.length - 1);
  }

  private storyStepKey(questId: string, stepIndex: number): string {
    return `${questId}:${stepIndex}`;
  }

  private tryUnlockNextChapter(chapterId: string): void {
    const matched = /^chapter_(\d+)$/u.exec(chapterId);
    if (!matched) {
      return;
    }
    const nextChapter = `chapter_${Number(matched[1]) + 1}`;
    if (!this.state.quests.unlockedChapters.includes(nextChapter)) {
      this.state.quests.unlockedChapters.push(nextChapter);
    }
  }

  private dayToken(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
