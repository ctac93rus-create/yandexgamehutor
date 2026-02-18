import { describe, expect, it, vi } from 'vitest';

import { LeaderboardsManager } from '../src/game/managers/LeaderboardsManager';

describe('LeaderboardsManager', () => {
  it('submits score only when score improves', async () => {
    const setLeaderboardScore = vi.fn().mockResolvedValue(undefined);
    const manager = new LeaderboardsManager({
      getLeaderboards: vi.fn().mockResolvedValue({
        setLeaderboardScore,
        getLeaderboardPlayerEntry: vi.fn(),
        getLeaderboardEntries: vi.fn(),
      }),
    });

    await manager.submitBestRaidKills(10);
    await manager.submitBestRaidKills(10);
    await manager.submitBestRaidKills(9);
    await manager.submitBestRaidKills(11);

    expect(setLeaderboardScore).toHaveBeenCalledTimes(2);
    expect(setLeaderboardScore).toHaveBeenNthCalledWith(1, 'bestRaidKills', 10);
    expect(setLeaderboardScore).toHaveBeenNthCalledWith(2, 'bestRaidKills', 11);
  });

  it('does not throw when sdk errors occur', async () => {
    const manager = new LeaderboardsManager({
      getLeaderboards: vi.fn().mockRejectedValue(new Error('sdk down')),
    });

    await expect(manager.submitBestRaidKills(42)).resolves.toBeUndefined();
    await expect(manager.fetchTopAndPlayer('bestRaidKills')).resolves.toEqual({ entries: [] });
  });
});
