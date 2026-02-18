export type YandexEvent = 'game_api_pause' | 'game_api_resume';

export interface YandexPlayer {
  getData(): Promise<Record<string, unknown>>;
  setData(data: Record<string, unknown>): Promise<void>;
  getStats(): Promise<Record<string, number>>;
  setStats(data: Record<string, number>): Promise<void>;
  incrementStats(data: Record<string, number>): Promise<Record<string, number>>;
}

export interface YandexPayments {
  getCatalog(): Promise<{ products: Array<Record<string, unknown>> }>;
  purchase(input: { id: string }): Promise<{ id: string; purchaseToken: string }>;
  getPurchases(): Promise<Array<{ id: string; purchaseToken: string }>>;
  consumePurchase(token: string): Promise<void>;
}

export interface AdvCallbacks {
  onOpen?(): void;
  onClose?(wasShown?: boolean): void;
  onRewarded?(): void;
  onError?(error?: unknown): void;
}

export interface YandexSDK {
  features: {
    LoadingAPI: {
      ready(): void;
    };
  };
  adv: {
    showFullscreenAdv(input?: { callbacks?: AdvCallbacks }): void;
    showRewardedVideo(input?: { callbacks?: AdvCallbacks }): void;
  };
  getFlags(input: { defaultFlags: Record<string, unknown> }): Promise<Record<string, unknown>>;
  getPlayer(): Promise<YandexPlayer>;
  getPayments(): Promise<YandexPayments>;
  on(event: YandexEvent, callback: () => void): void;
  off(event: YandexEvent, callback: () => void): void;
}

declare global {
  interface Window {
    YaGames?: {
      init(): Promise<YandexSDK>;
    };
  }
}

export {};
