import { sdkManager } from './SDKManager';
import type { SaveState } from '../systems/merge/types';

const KEY = 'ygh_merge_save_v1';

export class SaveManager {
  public async load(): Promise<SaveState | null> {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SaveState;
    } catch {
      return null;
    }
  }

  public async save(state: SaveState): Promise<void> {
    localStorage.setItem(KEY, JSON.stringify(state));

    const player = await sdkManager.getPlayer();
    if (!player) {
      return;
    }

    const current = await player.getData();
    const next = {
      ...current,
      [KEY]: state,
    };
    await player.setData(next);
  }
}

export const saveManager = new SaveManager();
