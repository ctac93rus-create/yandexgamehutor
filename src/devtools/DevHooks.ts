import { GameApp } from '../game/GameApp';
import { adsManager } from '../game/managers/AdsManager';
import { entitlementsManager } from '../game/managers/EntitlementsManager';
import { purchasesManager } from '../game/managers/PurchasesManager';
import { saveManager } from '../game/managers/SaveManager';
import { sdkManager } from '../game/managers/SDKManager';

interface DevApi {
  ping(): string;
  getBuildInfo(): { mode: string; commit?: string };
  getCounts(): { loadingReadyCalls: number; fullscreenShown: number; rewardedShown: number };
  emitPause(): void;
  emitResume(): void;
  getAudioState(): { phaserMutedOrPaused: boolean; audioContextState?: AudioContextState };
  showRewardedSuccess(): Promise<{ rewarded: boolean }>;
  showRewardedCancel(): Promise<{ rewarded: boolean }>;
  showInterstitial(): Promise<{ shown: boolean }>;
  buy(productId: string): Promise<{ ok: boolean; error?: string }>;
  processPendingPurchases(): Promise<void>;
  getEntitlements(): { disableAds: boolean };
  getSaveSnapshot(): Promise<{ gold?: number; dust?: number; updatedAt?: number }>;
  resetLocalProgress(): void;
}

declare global {
  interface Window {
    __YGH_DEV__?: DevApi;
  }
}

async function ensureSaveExists(): Promise<void> {
  const save = await saveManager.load();
  if (save) {
    return;
  }

  await saveManager.save({
    gold: 0,
    dust: 0,
    occupiedCells: [],
    generators: {},
  });
}

async function showRewardedWithOutcome(outcome: 'success' | 'cancel'): Promise<{ rewarded: boolean }> {
  sdkManager.setMockRewardedOutcome(outcome);
  let rewarded = false;
  await sdkManager.showRewardedVideo({
    onRewarded: () => {
      rewarded = true;
    },
  });
  sdkManager.setMockRewardedOutcome('success');
  return { rewarded };
}

export function installDevHooks(app: GameApp): void {
  window.__YGH_DEV__ = {
    ping: () => 'pong',
    getBuildInfo: () => ({
      mode: import.meta.env.MODE,
      commit: (import.meta.env as ImportMetaEnv & { VITE_COMMIT?: string }).VITE_COMMIT,
    }),
    getCounts: () => sdkManager.getDebugCounts(),
    emitPause: () => {
      sdkManager.emitDebugEvent('game_api_pause');
    },
    emitResume: () => {
      sdkManager.emitDebugEvent('game_api_resume');
    },
    getAudioState: () => app.getAudioState(),
    showRewardedSuccess: async () => showRewardedWithOutcome('success'),
    showRewardedCancel: async () => showRewardedWithOutcome('cancel'),
    showInterstitial: async () => {
      adsManager.resetCounters();
      await adsManager.onRaidFinished();
      const shown = await adsManager.onRaidFinished();
      return { shown };
    },
    buy: async (productId: string) => {
      try {
        await ensureSaveExists();
        const ok = await purchasesManager.purchase(productId);
        return ok ? { ok } : { ok, error: `Purchase handler not found for ${productId}` };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    processPendingPurchases: async () => {
      await purchasesManager.processPendingPurchases();
    },
    getEntitlements: () => entitlementsManager.getState(),
    getSaveSnapshot: async () => {
      const save = await saveManager.load();
      return {
        gold: save?.gold,
        dust: save?.dust,
        updatedAt: save?.updatedAt,
      };
    },
    resetLocalProgress: () => {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('ygh_')) {
          localStorage.removeItem(key);
        }
      });
      window.location.reload();
    },
  };
}
