import { describe, expect, it, vi } from 'vitest';

import { SDKManager } from '../src/game/managers/SDKManager';

describe('SDKManager', () => {
  it('initializes with fallback mock when YaGames is absent', async () => {
    (globalThis as unknown as { window: Window }).window = {} as Window;
    const manager = new SDKManager();

    await expect(manager.init()).resolves.toBeUndefined();
    await expect(manager.getFlags({ hardMode: false })).resolves.toEqual({ hardMode: false });
  });

  it('calls LoadingAPI.ready only once', async () => {
    const ready = vi.fn();
    (globalThis as unknown as { window: Window }).window = {
      YaGames: {
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
          on: () => undefined,
          off: () => undefined,
        }),
      },
    } as Window;

    const manager = new SDKManager();
    await manager.init();
    manager.loadingReadyOnce();
    manager.loadingReadyOnce();

    expect(ready).toHaveBeenCalledTimes(1);
  });
});
