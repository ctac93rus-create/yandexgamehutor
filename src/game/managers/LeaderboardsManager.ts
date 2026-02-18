import { sdkManager } from './SDKManager';
import type { SDKManager } from './SDKManager';
import type { LeaderboardEntry } from '../types/yandexSdk';

export const RAID_BEST_KILLS_LEADERBOARD = 'bestRaidKills';

export interface LeaderboardSnapshot {
  player?: LeaderboardEntry;
  entries: LeaderboardEntry[];
}

export class LeaderboardsManager {
  private bestSubmittedScore = 0;

  public constructor(private readonly sdk: Pick<SDKManager, 'getLeaderboards'> = sdkManager) {}

  public async submitBestRaidKills(score: number): Promise<void> {
    if (score <= this.bestSubmittedScore) {
      return;
    }

    try {
      const leaderboards = await this.sdk.getLeaderboards();
      if (!leaderboards) {
        return;
      }
      await leaderboards.setLeaderboardScore(RAID_BEST_KILLS_LEADERBOARD, Math.floor(score));
      this.bestSubmittedScore = Math.floor(score);
    } catch {
      // best-effort submission only
    }
  }

  public async fetchTopAndPlayer(leaderboardName: string): Promise<LeaderboardSnapshot> {
    try {
      const leaderboards = await this.sdk.getLeaderboards();
      if (!leaderboards) {
        return { entries: [] };
      }

      const [playerEntry, topEntries] = await Promise.all([
        leaderboards.getLeaderboardPlayerEntry(leaderboardName),
        leaderboards.getLeaderboardEntries(leaderboardName, { quantityTop: 10 }),
      ]);

      return {
        player: playerEntry ?? undefined,
        entries: topEntries.entries ?? [],
      };
    } catch {
      return { entries: [] };
    }
  }
}

export const leaderboardsManager = new LeaderboardsManager();
