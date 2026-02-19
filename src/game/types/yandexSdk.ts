export type YandexEvent = 'game_api_pause' | 'game_api_resume';

export interface YandexPlayer {
  getData(): Promise<Record<string, unknown>>;
  setData(data: Record<string, unknown>): Promise<void>;
  getStats(): Promise<Record<string, number>>;
  setStats(data: Record<string, number>): Promise<void>;
  incrementStats(data: Record<string, number>): Promise<Record<string, number>>;
}

export interface YandexPaymentProduct extends Record<string, unknown> {
  id?: string;
  productID?: string;
  title?: string;
  description?: string;
  price?: string;
}

export interface YandexPaymentPurchase extends Record<string, unknown> {
  id?: string;
  productID?: string;
  purchaseToken: string;
}

export interface YandexPayments {
  getCatalog(): Promise<YandexPaymentProduct[] | { products: YandexPaymentProduct[] }>;
  purchase(input: { id: string }): Promise<YandexPaymentPurchase>;
  getPurchases(): Promise<YandexPaymentPurchase[]>;
  consumePurchase(token: string): Promise<void>;
}

export interface LeaderboardEntry {
  rank: number;
  score: number;
  player?: {
    publicName?: string;
    uniqueID?: string;
  };
}

export interface LeaderboardEntriesResponse {
  entries: LeaderboardEntry[];
}

export interface LeaderboardsService {
  setLeaderboardScore(leaderboardName: string, score: number): Promise<void>;
  getLeaderboardPlayerEntry(leaderboardName: string): Promise<LeaderboardEntry | null>;
  getLeaderboardEntries(
    leaderboardName: string,
    options?: { quantityTop?: number; includeUser?: boolean; quantityAround?: number },
  ): Promise<LeaderboardEntriesResponse>;
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
  leaderboards?: LeaderboardsService;
  /** @deprecated Use ysdk.leaderboards when available. */
  getLeaderboards?(): Promise<LeaderboardsService>;
  auth?: {
    openAuthDialog(): Promise<void>;
  };
  isAvailableMethod?(methodName: string): boolean;
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
