import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PurchasesManager } from '../src/game/managers/PurchasesManager';
import { sdkManager } from '../src/game/managers/SDKManager';
import type { YandexPayments } from '../src/game/types/yandexSdk';

describe('PurchasesManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('processes pending purchases and consumes only handled tokens', async () => {
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
});
