import type { StoryQuest } from './types';

export class StoryChapters {
  public constructor(private readonly quests: StoryQuest[]) {}

  public getQuestById(questId: string): StoryQuest | undefined {
    return this.quests.find((quest) => quest.id === questId);
  }

  public getChapterQuestIds(chapterId: string): string[] {
    return this.quests.filter((quest) => quest.chapterId === chapterId).map((quest) => quest.id);
  }

  public all(): StoryQuest[] {
    return this.quests;
  }

  public isChapterFinished(chapterId: string, completedQuestIds: string[]): boolean {
    const chapterQuestIds = this.getChapterQuestIds(chapterId);
    if (chapterQuestIds.length === 0) {
      return false;
    }
    return chapterQuestIds.every((questId) => completedQuestIds.includes(questId));
  }
}
