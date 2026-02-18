import { sdkManager } from './SDKManager';
import type { SDKManager } from './SDKManager';
import { type AchievementId, unlockAchievements } from '../systems/meta/achievements';
import type { MetaProgressState } from '../systems/quests/types';

export class AchievementsManager {
  public constructor(private readonly sdk: Pick<SDKManager, 'getPlayer'> = sdkManager) {}

  public async process(meta: MetaProgressState): Promise<AchievementId[]> {
    const newlyUnlocked = unlockAchievements(meta);
    if (newlyUnlocked.length === 0) {
      return newlyUnlocked;
    }

    try {
      const player = await this.sdk.getPlayer();
      if (!player) {
        return newlyUnlocked;
      }

      const current = await player.getStats();
      const next = { ...current };
      let hasUpdates = false;
      for (let i = 0; i < newlyUnlocked.length; i += 1) {
        const key = `achievement_${newlyUnlocked[i]}`;
        if (next[key] !== 1) {
          next[key] = 1;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        await player.setStats(next);
      }
    } catch {
      // best-effort cloud sync
    }

    return newlyUnlocked;
  }
}

export const achievementsManager = new AchievementsManager();
