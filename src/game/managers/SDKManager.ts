import type {
  AdvCallbacks,
  YandexEvent,
  LeaderboardsService,
  YandexPayments,
  YandexPlayer,
  YandexSDK,
} from '../types/yandexSdk';

export class SDKManager {
  private ysdk: YandexSDK | null = null;
  private initialized = false;
  private loadingReadySent = false;
  private readonly debugCounters = {
    loadingReadyCalls: 0,
    fullscreenShown: 0,
    rewardedShown: 0,
  };
  private mockRewardedOutcome: 'success' | 'cancel' = 'success';
  private mockEventListeners = new Map<YandexEvent, Set<() => void>>();

  public async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const yaGames = (globalThis as unknown as { YaGames?: Window['YaGames'] }).YaGames;
    try {
      this.ysdk = yaGames ? await yaGames.init() : await this.createMockSdk();
    } catch {
      this.ysdk = await this.createMockSdk();
    }
    this.initialized = true;
  }

  public async getPlayer(): Promise<YandexPlayer | null> {
    if (!this.ysdk) {
      return null;
    }

    return this.ysdk.getPlayer();
  }


  public async getLeaderboardsService(): Promise<LeaderboardsService | null> {
    if (!this.ysdk) {
      return null;
    }

    if (this.ysdk.leaderboards) {
      return this.ysdk.leaderboards;
    }

    if (this.ysdk.getLeaderboards) {
      return this.ysdk.getLeaderboards();
    }

    return null;
  }

  public async getLeaderboards(): Promise<LeaderboardsService | null> {
    return this.getLeaderboardsService();
  }

  public async isAvailable(methodName: string): Promise<boolean> {
    if (!this.ysdk?.isAvailableMethod) {
      return true;
    }

    return this.ysdk.isAvailableMethod(methodName);
  }

  public async openAuthDialog(): Promise<boolean> {
    if (!this.ysdk?.auth?.openAuthDialog) {
      return false;
    }

    try {
      await this.ysdk.auth.openAuthDialog();
      return true;
    } catch {
      return false;
    }
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

    this.debugCounters.fullscreenShown += 1;
    this.ysdk.adv.showFullscreenAdv({ callbacks });
    return Promise.resolve();
  }

  public showRewardedVideo(callbacks?: AdvCallbacks): Promise<void> {
    if (!this.ysdk) {
      return Promise.resolve();
    }

    this.debugCounters.rewardedShown += 1;
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

    if (!this.mockEventListeners.has(event)) {
      this.mockEventListeners.set(event, new Set());
    }
    this.mockEventListeners.get(event)?.add(callback);
    this.ysdk.on(event, callback);
  }

  public off(event: YandexEvent, callback: () => void): void {
    if (!this.ysdk) {
      return;
    }

    this.mockEventListeners.get(event)?.delete(callback);
    this.ysdk.off(event, callback);
  }

  public loadingReadyOnce(): void {
    if (!this.ysdk || this.loadingReadySent) {
      return;
    }

    this.loadingReadySent = true;
    this.debugCounters.loadingReadyCalls += 1;
    this.ysdk.features.LoadingAPI.ready();
  }

  public getDebugCounts(): { loadingReadyCalls: number; fullscreenShown: number; rewardedShown: number } {
    return { ...this.debugCounters };
  }

  public emitDebugEvent(event: YandexEvent): void {
    this.mockEventListeners.get(event)?.forEach((callback) => callback());
  }

  public setMockRewardedOutcome(outcome: 'success' | 'cancel'): void {
    this.mockRewardedOutcome = outcome;
  }

  private async createMockSdk(): Promise<YandexSDK> {
    const listeners = this.mockEventListeners;
    const playerData: Record<string, unknown> = {};
    const playerStats: Record<string, number> = {};

    const leaderboardsService: LeaderboardsService = {
      setLeaderboardScore: async () => undefined,
      getLeaderboardPlayerEntry: async () => null,
      getLeaderboardEntries: async () => ({ entries: [] }),
    };

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
          if (this.mockRewardedOutcome === 'success') {
            callbacks?.onRewarded?.();
          }
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
        getCatalog: async () => [],
        purchase: async ({ id }) => ({ id, productID: id, purchaseToken: Date.now().toString() }),
        getPurchases: async () => [],
        consumePurchase: async () => undefined,
      }),
      leaderboards: leaderboardsService,
      getLeaderboards: async () => leaderboardsService,
      auth: {
        openAuthDialog: async () => undefined,
      },
      isAvailableMethod: () => true,
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
