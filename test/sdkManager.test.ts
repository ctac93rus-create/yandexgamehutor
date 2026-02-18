import { afterEach, describe, expect, it, vi } from 'vitest';

import { SDKManager } from '../src/game/managers/SDKManager';

describe('SDKManager', () => {
  afterEach(() => {
    delete (globalThis as unknown as { YaGames?: Window['YaGames'] }).YaGames;
  });

  it('initializes with fallback mock when YaGames is absent', async () => {
    delete (globalThis as unknown as { YaGames?: Window['YaGames'] }).YaGames;
    const manager = new SDKManager();

    await expect(manager.init()).resolves.toBeUndefined();
    await expect(manager.getFlags({ hardMode: false })).resolves.toEqual({ hardMode: false });
  });

  it('calls LoadingAPI.ready only once', async () => {
    const ready = vi.fn();
    (globalThis as unknown as { YaGames?: Window['YaGames'] }).YaGames = {
      init: async () => ({
        features: { LoadingAPI: { ready } },
        adv: {
          showFullscreenAdv: () => undefined,
          showRewardedVideo: () => undefined,
        },
        getFlags: async ({ defaultFlags }) => defaultFlags,
        getPlayer: async () => ({
          getData: async () => ({}),
          setData: async () => undefined,
          getStats: async () => ({}),
          setStats: async () => undefined,
          incrementStats: async () => ({}),
        }),
        getPayments: async () => ({
          getCatalog: async () => ({ products: [] }),
          purchase: async () => ({ id: 'x', purchaseToken: 't' }),
          getPurchases: async () => [],
          consumePurchase: async () => undefined,
        }),
        leaderboards: {
          setLeaderboardScore: async () => undefined,
          getLeaderboardPlayerEntry: async () => null,
          getLeaderboardEntries: async () => ({ entries: [] }),
        },
        on: () => undefined,
        off: () => undefined,
      }),
    };

    const manager = new SDKManager();
    await manager.init();
    manager.loadingReadyOnce();
    manager.loadingReadyOnce();

    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('getLeaderboardsService uses ysdk.leaderboards when present', async () => {
    const leaderboards = {
      setLeaderboardScore: vi.fn(),
      getLeaderboardPlayerEntry: vi.fn(),
      getLeaderboardEntries: vi.fn(),
    };

    (globalThis as unknown as { YaGames?: Window['YaGames'] }).YaGames = {
      init: async () => ({
        features: { LoadingAPI: { ready: vi.fn() } },
        adv: { showFullscreenAdv: vi.fn(), showRewardedVideo: vi.fn() },
        getFlags: async ({ defaultFlags }) => defaultFlags,
        getPlayer: async () => ({
          getData: async () => ({}),
          setData: async () => undefined,
          getStats: async () => ({}),
          setStats: async () => undefined,
          incrementStats: async () => ({}),
        }),
        getPayments: async () => ({
          getCatalog: async () => ({ products: [] }),
          purchase: async () => ({ id: 'x', purchaseToken: 't' }),
          getPurchases: async () => [],
          consumePurchase: async () => undefined,
        }),
        leaderboards,
        getLeaderboards: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      }),
    };

    const manager = new SDKManager();
    await manager.init();

    await expect(manager.getLeaderboardsService()).resolves.toBe(leaderboards);
  });

  it('getLeaderboardsService uses getLeaderboards fallback', async () => {
    const leaderboards = {
      setLeaderboardScore: vi.fn(),
      getLeaderboardPlayerEntry: vi.fn(),
      getLeaderboardEntries: vi.fn(),
    };
    const getLeaderboards = vi.fn().mockResolvedValue(leaderboards);

    (globalThis as unknown as { YaGames?: Window['YaGames'] }).YaGames = {
      init: async () => ({
        features: { LoadingAPI: { ready: vi.fn() } },
        adv: { showFullscreenAdv: vi.fn(), showRewardedVideo: vi.fn() },
        getFlags: async ({ defaultFlags }) => defaultFlags,
        getPlayer: async () => ({
          getData: async () => ({}),
          setData: async () => undefined,
          getStats: async () => ({}),
          setStats: async () => undefined,
          incrementStats: async () => ({}),
        }),
        getPayments: async () => ({
          getCatalog: async () => ({ products: [] }),
          purchase: async () => ({ id: 'x', purchaseToken: 't' }),
          getPurchases: async () => [],
          consumePurchase: async () => undefined,
        }),
        getLeaderboards,
        on: vi.fn(),
        off: vi.fn(),
      }),
    };

    const manager = new SDKManager();
    await manager.init();

    await expect(manager.getLeaderboardsService()).resolves.toBe(leaderboards);
    expect(getLeaderboards).toHaveBeenCalledTimes(1);
  });

  it('getLeaderboardsService returns null when API is unavailable', async () => {
    (globalThis as unknown as { YaGames?: Window['YaGames'] }).YaGames = {
      init: async () => ({
        features: { LoadingAPI: { ready: vi.fn() } },
        adv: { showFullscreenAdv: vi.fn(), showRewardedVideo: vi.fn() },
        getFlags: async ({ defaultFlags }) => defaultFlags,
        getPlayer: async () => ({
          getData: async () => ({}),
          setData: async () => undefined,
          getStats: async () => ({}),
          setStats: async () => undefined,
          incrementStats: async () => ({}),
        }),
        getPayments: async () => ({
          getCatalog: async () => ({ products: [] }),
          purchase: async () => ({ id: 'x', purchaseToken: 't' }),
          getPurchases: async () => [],
          consumePurchase: async () => undefined,
        }),
        on: vi.fn(),
        off: vi.fn(),
      }),
    };

    const manager = new SDKManager();
    await manager.init();

    await expect(manager.getLeaderboardsService()).resolves.toBeNull();
  });
});
