import { sdkManager } from './SDKManager';
import type { SDKManager } from './SDKManager';
import type { SaveState } from '../systems/merge/types';

const SAVE_KEY = 'ygh_merge_save_v1';

export class SaveManager {
  public constructor(private readonly sdk: Pick<SDKManager, 'getPlayer'> = sdkManager) {}

  private normalizeUpdatedAt(state: SaveState): SaveState {
    return {
      ...state,
      updatedAt: typeof state.updatedAt === 'number' ? state.updatedAt : 0,
    };
  }

  private pickNewest(local: SaveState | null, cloud: SaveState | null): SaveState | null {
    if (!local && !cloud) {
      return null;
    }

    if (!local) {
      return cloud;
    }

    if (!cloud) {
      return local;
    }

    return cloud.updatedAt! > local.updatedAt! ? cloud : local;
  }

  private async loadFromCloudStorage(): Promise<SaveState | null> {
    try {
      const player = await this.sdk.getPlayer();
      if (!player) {
        return null;
      }

      const data = await player.getData();
      const raw = data[SAVE_KEY];
      if (!raw) {
        return null;
      }

      if (typeof raw === 'string') {
        return JSON.parse(raw) as SaveState;
      }

      if (typeof raw === 'object') {
        return raw as SaveState;
      }

      return null;
    } catch {
      return null;
    }
  }

  public async load(): Promise<SaveState | null> {
    let local: SaveState | null = null;
    const localRaw = localStorage.getItem(SAVE_KEY);
    if (localRaw) {
      try {
        local = JSON.parse(localRaw) as SaveState;
      } catch {
        local = null;
      }
    }

    const cloud = await this.loadFromCloudStorage();
    const normalizedLocal = local ? this.normalizeUpdatedAt(local) : null;
    const normalizedCloud = cloud ? this.normalizeUpdatedAt(cloud) : null;
    const newest = this.pickNewest(normalizedLocal, normalizedCloud);

    if (
      newest &&
      normalizedCloud &&
      (!normalizedLocal || normalizedCloud.updatedAt! > normalizedLocal.updatedAt!)
    ) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(newest));
    }

    return newest;
  }

  public async save(state: SaveState): Promise<void> {
    const stateToSave = {
      ...state,
      updatedAt: Date.now(),
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));

    const player = await this.sdk.getPlayer();
    if (!player) {
      return;
    }

    const current = await player.getData();
    const next = {
      ...current,
      [SAVE_KEY]: stateToSave,
    };
    await player.setData(next);
  }
}

export const saveManager = new SaveManager();
