import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SaveManager } from '../src/game/managers/SaveManager';
import type { SaveState } from '../src/game/systems/merge/types';
import type { YandexPlayer } from '../src/game/types/yandexSdk';

const SAVE_KEY = 'ygh_merge_save_v1';

const baseState: SaveState = {
  gold: 100,
  dust: 50,
  occupiedCells: [],
  generators: {},
};

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

const createManager = (cloudData: Record<string, unknown> = {}): SaveManager => {
  const player: Pick<YandexPlayer, 'getData' | 'setData'> = {
    getData: vi.fn().mockResolvedValue(cloudData),
    setData: vi.fn().mockResolvedValue(undefined),
  };

  const sdk = {
    getPlayer: vi.fn().mockResolvedValue(player),
  };

  return new SaveManager(sdk);
};

describe('SaveManager cloud/local conflict resolution', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: createLocalStorageMock(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cloud save when cloud exists and local is missing', async () => {
    const cloudState: SaveState = { ...baseState, updatedAt: 10 };
    const manager = createManager({ [SAVE_KEY]: cloudState });

    await expect(manager.load()).resolves.toEqual(cloudState);
  });

  it('returns local save when local exists and cloud is missing', async () => {
    const localState: SaveState = { ...baseState, updatedAt: 20 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(localState));
    const manager = createManager({});

    await expect(manager.load()).resolves.toEqual(localState);
  });

  it('prefers local save when both exist and local updatedAt is newer', async () => {
    const localState: SaveState = { ...baseState, updatedAt: 30 };
    const cloudState: SaveState = { ...baseState, gold: 10, updatedAt: 20 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(localState));
    const manager = createManager({ [SAVE_KEY]: cloudState });

    await expect(manager.load()).resolves.toEqual(localState);
  });

  it('prefers cloud save when both exist and cloud updatedAt is newer, then syncs local', async () => {
    const localState: SaveState = { ...baseState, updatedAt: 10 };
    const cloudState: SaveState = { ...baseState, dust: 999, updatedAt: 40 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(localState));
    const manager = createManager({ [SAVE_KEY]: cloudState });

    await expect(manager.load()).resolves.toEqual(cloudState);
    expect(localStorage.getItem(SAVE_KEY)).toBe(JSON.stringify(cloudState));
  });

  it('stamps updatedAt during save', async () => {
    const manager = createManager({});
    const now = vi.spyOn(Date, 'now').mockReturnValue(123456);

    await manager.save(baseState);

    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as SaveState | null;
    expect(saved?.updatedAt).toBe(123456);

    now.mockRestore();
  });
});
