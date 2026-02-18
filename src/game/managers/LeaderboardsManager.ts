import { sdkManager } from './SDKManager';
import type { LeaderboardEntry, LeaderboardsService } from '../types/yandexSdk';

export const RAID_BEST_KILLS_LEADERBOARD = 'bestRaidKills';

export type LeaderboardStatus = 'ok' | 'unavailable' | 'auth_required';

export interface LeaderboardSnapshot {
  player?: LeaderboardEntry;
  entries: LeaderboardEntry[];
  status: LeaderboardStatus;
}

interface LeaderboardsSdkBridge {
  getLeaderboardsService(): Promise<LeaderboardsService | null>;
  isAvailable(methodName: string): Promise<boolean>;
  getPlayer(): Promise<{ getStats(): Promise<Record<string, number>> } | null>;
}

export class LeaderboardsManager {
  private bestSubmittedScore = 0;

  public constructor(private readonly sdk: LeaderboardsSdkBridge = sdkManager) {}

  public async submitBestRaidKills(score: number): Promise<LeaderboardStatus> {
    const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : Number.NaN;
    if (!Number.isFinite(normalizedScore)) {
      return 'unavailable';
    }

    if (normalizedScore <= this.bestSubmittedScore) {
      return 'ok';
    }

    try {
      const leaderboards = await this.sdk.getLeaderboardsService();
      if (!leaderboards) {
        return 'unavailable';
      }

      const player = await this.sdk.getPlayer();
      if (!player) {
        const authAvailable = await this.sdk.isAvailable('auth.openAuthDialog');
        return authAvailable ? 'auth_required' : 'unavailable';
      }

      await leaderboards.setLeaderboardScore(RAID_BEST_KILLS_LEADERBOARD, normalizedScore);
      this.bestSubmittedScore = normalizedScore;
      return 'ok';
    } catch {
      return 'unavailable';
    }
  }

  public async fetchTopAndPlayer(leaderboardName: string): Promise<LeaderboardSnapshot> {
    try {
      const leaderboards = await this.sdk.getLeaderboardsService();
      if (!leaderboards) {
        return { entries: [], status: 'unavailable' };
      }

      const [player, playerEntry, topEntries] = await Promise.all([
        this.sdk.getPlayer(),
        leaderboards.getLeaderboardPlayerEntry(leaderboardName),
        leaderboards.getLeaderboardEntries(leaderboardName, { quantityTop: 10 }),
      ]);

      if (!player) {
        const authAvailable = await this.sdk.isAvailable('auth.openAuthDialog');
        return {
          player: playerEntry ?? undefined,
          entries: topEntries.entries ?? [],
          status: authAvailable ? 'auth_required' : 'unavailable',
        };
      }

      return {
        player: playerEntry ?? undefined,
        entries: topEntries.entries ?? [],
        status: 'ok',
      };
    } catch {
      return { entries: [], status: 'unavailable' };
    }
  }
}

export const leaderboardsManager = new LeaderboardsManager();
