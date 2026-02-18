import type {
  AdvCallbacks,
  YandexEvent,
  YandexPayments,
  YandexPlayer,
  YandexSDK,
} from '../types/yandexSdk';

export class SDKManager {
  private ysdk: YandexSDK | null = null;
  private initialized = false;
  private loadingReadySent = false;

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.ysdk = window.YaGames ? await window.YaGames.init() : await this.createMockSdk();
    this.initialized = true;
  }

  public async getPlayer(): Promise<YandexPlayer | null> {
    if (!this.ysdk) {
      return null;
    }

    return this.ysdk.getPlayer();
  }

  public async getPayments(): Promise<YandexPayments | null> {
    if (!this.ysdk) {
      return null;
    }

    return this.ysdk.getPayments();
  }

  public showFullscreenAdv(callbacks?: AdvCallbacks): Promise<void> {
    if (!this.ysdk) {
      return Promise.resolve();
    }

    this.ysdk.adv.showFullscreenAdv({ callbacks });
    return Promise.resolve();
  }

  public showRewardedVideo(callbacks?: AdvCallbacks): Promise<void> {
    if (!this.ysdk) {
      return Promise.resolve();
    }

    this.ysdk.adv.showRewardedVideo({ callbacks });
    return Promise.resolve();
  }

  public async getFlags(defaultFlags: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.ysdk) {
      return defaultFlags;
    }

    return this.ysdk.getFlags({ defaultFlags });
  }

  public on(event: YandexEvent, callback: () => void): void {
    if (!this.ysdk) {
      return;
    }

    this.ysdk.on(event, callback);
  }

  public off(event: YandexEvent, callback: () => void): void {
    if (!this.ysdk) {
      return;
    }

    this.ysdk.off(event, callback);
  }

  public loadingReadyOnce(): void {
    if (!this.ysdk || this.loadingReadySent) {
      return;
    }

    this.loadingReadySent = true;
    this.ysdk.features.LoadingAPI.ready();
  }

  private async createMockSdk(): Promise<YandexSDK> {
    const listeners = new Map<YandexEvent, Set<() => void>>();
    const playerData: Record<string, unknown> = {};
    const playerStats: Record<string, number> = {};

    return {
      features: {
        LoadingAPI: {
          ready: () => undefined,
        },
      },
      adv: {
        showFullscreenAdv: ({ callbacks } = {}) => {
          callbacks?.onOpen?.();
          callbacks?.onClose?.(true);
        },
        showRewardedVideo: ({ callbacks } = {}) => {
          callbacks?.onOpen?.();
          callbacks?.onRewarded?.();
          callbacks?.onClose?.(true);
        },
      },
      getFlags: async ({ defaultFlags }) => defaultFlags,
      getPlayer: async () => ({
        getData: async () => ({ ...playerData }),
        setData: async (data) => {
          Object.assign(playerData, data);
        },
        getStats: async () => ({ ...playerStats }),
        setStats: async (data) => {
          Object.assign(playerStats, data);
        },
        incrementStats: async (data) => {
          Object.entries(data).forEach(([key, value]) => {
            playerStats[key] = (playerStats[key] ?? 0) + value;
          });
          return { ...playerStats };
        },
      }),
      getPayments: async () => ({
        getCatalog: async () => ({ products: [] }),
        purchase: async ({ id }) => ({ id, purchaseToken: Date.now().toString() }),
        getPurchases: async () => [],
        consumePurchase: async () => undefined,
      }),
      on: (event, callback) => {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event)?.add(callback);
      },
      off: (event, callback) => {
        listeners.get(event)?.delete(callback);
      },
    };
  }
}

export const sdkManager = new SDKManager();
