import type { DailyQuest } from './types';

const DAILY_SLOTS = 3;

export class DailyQuests {
  public constructor(private readonly quests: DailyQuest[]) {}

  public getQuestById(id: string): DailyQuest | undefined {
    return this.quests.find((quest) => quest.id === id);
  }

  public rollForDay(dayToken: string): string[] {
    if (this.quests.length <= DAILY_SLOTS) {
      return this.quests.map((quest) => quest.id);
    }

    const seed = this.hash(dayToken);
    const pool = [...this.quests];
    const selected: string[] = [];

    let cursor = seed;
    while (selected.length < DAILY_SLOTS && pool.length > 0) {
      cursor = (cursor * 1664525 + 1013904223) >>> 0;
      const index = cursor % pool.length;
      selected.push(pool[index].id);
      pool.splice(index, 1);
    }

    return selected;
  }

  private hash(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
}
