import type { MetaProgressState } from '../quests/types';

export type AchievementId =
  | 'first_raid'
  | 'merges_100'
  | 'chapter_1'
  | 'raid_winner_1'
  | 'generator_50'
  | 'upgrader_3';

export interface AchievementDefinition {
  id: AchievementId;
  titleKey: string;
  descriptionKey: string;
  isUnlocked(meta: MetaProgressState): boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_raid',
    titleKey: 'achievements.list.first_raid.title',
    descriptionKey: 'achievements.list.first_raid.description',
    isUnlocked: (meta) => meta.stats.raidsCompleted >= 1,
  },
  {
    id: 'merges_100',
    titleKey: 'achievements.list.merges_100.title',
    descriptionKey: 'achievements.list.merges_100.description',
    isUnlocked: (meta) => meta.stats.merges >= 100,
  },
  {
    id: 'chapter_1',
    titleKey: 'achievements.list.chapter_1.title',
    descriptionKey: 'achievements.list.chapter_1.description',
    isUnlocked: (meta) => meta.quests.unlockedChapters.includes('chapter_1'),
  },
  {
    id: 'raid_winner_1',
    titleKey: 'achievements.list.raid_winner_1.title',
    descriptionKey: 'achievements.list.raid_winner_1.description',
    isUnlocked: (meta) => meta.stats.raidWins >= 1,
  },
  {
    id: 'generator_50',
    titleKey: 'achievements.list.generator_50.title',
    descriptionKey: 'achievements.list.generator_50.description',
    isUnlocked: (meta) => meta.stats.generatorSpawns >= 50,
  },
  {
    id: 'upgrader_3',
    titleKey: 'achievements.list.upgrader_3.title',
    descriptionKey: 'achievements.list.upgrader_3.description',
    isUnlocked: (meta) => meta.stats.hutUpgrades >= 3,
  },
];

export const ensureAchievementsState = (meta: MetaProgressState): void => {
  if (!Array.isArray(meta.achievementsUnlocked)) {
    meta.achievementsUnlocked = [];
  }
};

export const unlockAchievements = (meta: MetaProgressState): AchievementId[] => {
  ensureAchievementsState(meta);

  const newlyUnlocked: AchievementId[] = [];
  const unlockedSet = new Set(meta.achievementsUnlocked);

  for (let i = 0; i < ACHIEVEMENTS.length; i += 1) {
    const achievement = ACHIEVEMENTS[i];
    if (unlockedSet.has(achievement.id)) {
      continue;
    }
    if (!achievement.isUnlocked(meta)) {
      continue;
    }
    unlockedSet.add(achievement.id);
    newlyUnlocked.push(achievement.id);
  }

  meta.achievementsUnlocked = [...unlockedSet];
  return newlyUnlocked;
};

export const isAchievementUnlocked = (meta: MetaProgressState, id: AchievementId): boolean => {
  ensureAchievementsState(meta);
  const unlocked = meta.achievementsUnlocked ?? [];
  return unlocked.includes(id);
};
