import { sdkManager } from './SDKManager';
import type { SDKManager } from './SDKManager';

interface EntitlementsState {
  disableAds: boolean;
}

const ENTITLEMENTS_KEY = 'ygh_entitlements_v1';

export class EntitlementsManager {
  private state: EntitlementsState = { disableAds: false };

  public constructor(private readonly sdk: Pick<SDKManager, 'getPlayer'> = sdkManager) {}

  public async load(): Promise<EntitlementsState> {
    const local = this.loadFromLocalStorage();
    const cloud = await this.loadFromCloudStorage();
    this.state = {
      disableAds: Boolean(local?.disableAds) || Boolean(cloud?.disableAds),
    };
    this.saveToLocalStorage(this.state);
    return this.getState();
  }

  public getState(): EntitlementsState {
    return { ...this.state };
  }

  public async setDisableAds(value: boolean): Promise<void> {
    this.state = { ...this.state, disableAds: value };
    this.saveToLocalStorage(this.state);
    await this.saveToCloudStorage(this.state);
  }

  private loadFromLocalStorage(): EntitlementsState | null {
    const raw = localStorage.getItem(ENTITLEMENTS_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<EntitlementsState>;
      return {
        disableAds: Boolean(parsed.disableAds),
      };
    } catch {
      return null;
    }
  }

  private async loadFromCloudStorage(): Promise<EntitlementsState | null> {
    try {
      const player = await this.sdk.getPlayer();
      if (!player) {
        return null;
      }
      const data = await player.getData();
      const raw = data[ENTITLEMENTS_KEY];
      if (!raw || typeof raw !== 'object') {
        return null;
      }

      const parsed = raw as Partial<EntitlementsState>;
      return {
        disableAds: Boolean(parsed.disableAds),
      };
    } catch {
      return null;
    }
  }

  private saveToLocalStorage(state: EntitlementsState): void {
    localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(state));
  }

  private async saveToCloudStorage(state: EntitlementsState): Promise<void> {
    try {
      const player = await this.sdk.getPlayer();
      if (!player) {
        return;
      }
      const current = await player.getData();
      await player.setData({
        ...current,
        [ENTITLEMENTS_KEY]: state,
      });
    } catch {
      // no-op fallback for local/mock environments
    }
  }
}

export const entitlementsManager = new EntitlementsManager();
