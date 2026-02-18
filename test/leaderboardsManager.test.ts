import { describe, expect, it, vi } from 'vitest';

import { LeaderboardsManager } from '../src/game/managers/LeaderboardsManager';

describe('LeaderboardsManager', () => {
  it('submits score only when score improves', async () => {
    const setLeaderboardScore = vi.fn().mockResolvedValue(undefined);
    const manager = new LeaderboardsManager({
      getLeaderboardsService: vi.fn().mockResolvedValue({
        setLeaderboardScore,
        getLeaderboardPlayerEntry: vi.fn(),
        getLeaderboardEntries: vi.fn(),
      }),
      getPlayer: vi.fn().mockResolvedValue({ getStats: vi.fn().mockResolvedValue({}) }),
      isAvailable: vi.fn().mockResolvedValue(true),
    });

    await manager.submitBestRaidKills(10);
    await manager.submitBestRaidKills(10);
    await manager.submitBestRaidKills(9);
    await manager.submitBestRaidKills(11);

    expect(setLeaderboardScore).toHaveBeenCalledTimes(2);
    expect(setLeaderboardScore).toHaveBeenNthCalledWith(1, 'bestRaidKills', 10);
    expect(setLeaderboardScore).toHaveBeenNthCalledWith(2, 'bestRaidKills', 11);
  });

  it('skips NaN and negative score submit', async () => {
    const setLeaderboardScore = vi.fn().mockResolvedValue(undefined);
    const manager = new LeaderboardsManager({
      getLeaderboardsService: vi.fn().mockResolvedValue({
        setLeaderboardScore,
        getLeaderboardPlayerEntry: vi.fn(),
        getLeaderboardEntries: vi.fn(),
      }),
      getPlayer: vi.fn().mockResolvedValue({ getStats: vi.fn().mockResolvedValue({}) }),
      isAvailable: vi.fn().mockResolvedValue(true),
    });

    await manager.submitBestRaidKills(Number.NaN);
    await manager.submitBestRaidKills(-10);

    expect(setLeaderboardScore).not.toHaveBeenCalled();
  });

  it('does not throw when leaderboard service is unavailable', async () => {
    const manager = new LeaderboardsManager({
      getLeaderboardsService: vi.fn().mockResolvedValue(null),
      getPlayer: vi.fn().mockResolvedValue(null),
      isAvailable: vi.fn().mockResolvedValue(true),
    });

    await expect(manager.submitBestRaidKills(42)).resolves.toBe('unavailable');
    await expect(manager.fetchTopAndPlayer('bestRaidKills')).resolves.toEqual({ entries: [], status: 'unavailable' });
  });
});
