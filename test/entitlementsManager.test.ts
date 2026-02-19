import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EntitlementsManager } from '../src/game/managers/EntitlementsManager';
import type { YandexPlayer } from '../src/game/types/yandexSdk';

interface StorageMock {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

const createLocalStorageMock = (): StorageMock => {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
  };
};

describe('EntitlementsManager', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: createLocalStorageMock(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges cloud payload and preserves save data when syncing entitlements', async () => {
    const getData = vi.fn(async () => ({
      ygh_merge_save_v1: { gold: 42 },
    }));
    const setData = vi.fn(async () => undefined);

    const player: YandexPlayer = {
      getData,
      setData,
      getStats: vi.fn(async () => ({})),
      setStats: vi.fn(async () => undefined),
      incrementStats: vi.fn(async () => ({})),
    };

    const manager = new EntitlementsManager({
      getPlayer: vi.fn(async () => player),
    });

    await manager.setDisableAds(true);

    expect(setData).toHaveBeenCalledWith({
      ygh_merge_save_v1: { gold: 42 },
      ygh_entitlements_v1: { disableAds: true },
    });
  });
});
