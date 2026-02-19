import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PurchasesManager } from '../src/game/managers/PurchasesManager';
import { sdkManager } from '../src/game/managers/SDKManager';
import type { YandexPayments } from '../src/game/types/yandexSdk';

describe('PurchasesManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('processes pending consumable purchases and consumes known tokens', async () => {
    const manager = new PurchasesManager();
    const grant = vi.fn(async () => undefined);
    manager.registerConsumable('pack_gold_small', grant);

    const consumePurchase = vi.fn(async () => undefined);
    const payments: YandexPayments = {
      getCatalog: async () => ({ products: [] }),
      purchase: async ({ id }) => ({ id, purchaseToken: 'new-token' }),
      getPurchases: async () => [
        { id: 'pack_gold_small', purchaseToken: 'pending-1' },
        { id: 'unknown_sku', purchaseToken: 'pending-2' },
      ],
      consumePurchase,
    };

    vi.spyOn(sdkManager, 'getPayments').mockResolvedValue(payments);

    await expect(manager.processPendingPurchases()).resolves.toBe(1);
    expect(grant).toHaveBeenCalledTimes(1);
    expect(consumePurchase).toHaveBeenCalledTimes(1);
    expect(consumePurchase).toHaveBeenCalledWith('pending-1');
  });

  it('does not consume non-consumable purchases', async () => {
    const manager = new PurchasesManager();
    const grant = vi.fn(async () => undefined);
    manager.registerNonConsumable('disable_ads', grant);

    const consumePurchase = vi.fn(async () => undefined);
    const payments: YandexPayments = {
      getCatalog: async () => ({ products: [] }),
      purchase: async ({ id }) => ({ id, purchaseToken: 'new-token' }),
      getPurchases: async () => [],
      consumePurchase,
    };

    vi.spyOn(sdkManager, 'getPayments').mockResolvedValue(payments);

    await expect(manager.purchase('disable_ads')).resolves.toBe(true);
    expect(grant).toHaveBeenCalledTimes(1);
    expect(consumePurchase).not.toHaveBeenCalled();
  });

  it('processes pending non-consumable without consume and keeps grant idempotent', async () => {
    const manager = new PurchasesManager();
    let disableAds = false;
    let grantsApplied = 0;

    manager.registerNonConsumable('disable_ads', async () => {
      if (disableAds) {
        return;
      }
      disableAds = true;
      grantsApplied += 1;
    });

    const consumePurchase = vi.fn(async () => undefined);
    const payments: YandexPayments = {
      getCatalog: async () => ({ products: [] }),
      purchase: async ({ id }) => ({ id, purchaseToken: `${id}-token` }),
      getPurchases: async () => [
        { id: 'disable_ads', purchaseToken: 'pending-a' },
        { id: 'disable_ads', purchaseToken: 'pending-b' },
      ],
      consumePurchase,
    };

    vi.spyOn(sdkManager, 'getPayments').mockResolvedValue(payments);

    await expect(manager.processPendingPurchases()).resolves.toBe(2);
    expect(disableAds).toBe(true);
    expect(grantsApplied).toBe(1);
    expect(consumePurchase).not.toHaveBeenCalled();
  });
});
