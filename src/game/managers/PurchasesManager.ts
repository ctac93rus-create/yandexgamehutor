import { sdkManager } from './SDKManager';

export interface CatalogProduct {
  id: string;
  title?: string;
  description?: string;
  price?: string;
}

interface PurchaseRecord {
  id: string;
  purchaseToken: string;
}

type GrantHandler = (purchase: PurchaseRecord) => Promise<void>;

export class PurchasesManager {
  private handlers = new Map<string, GrantHandler>();

  public registerConsumable(productId: string, onGrant: GrantHandler): void {
    this.handlers.set(productId, onGrant);
  }

  public async getCatalog(): Promise<CatalogProduct[]> {
    const payments = await sdkManager.getPayments();
    if (!payments) {
      return [];
    }

    const catalog = await payments.getCatalog();
    return catalog.products.map((product) => ({
      id: String(product.id ?? ''),
      title: typeof product.title === 'string' ? product.title : undefined,
      description: typeof product.description === 'string' ? product.description : undefined,
      price: typeof product.price === 'string' ? product.price : undefined,
    }));
  }

  public async purchase(productId: string): Promise<boolean> {
    const payments = await sdkManager.getPayments();
    if (!payments) {
      return false;
    }

    const purchase = await payments.purchase({ id: productId });
    const handler = this.handlers.get(purchase.id);
    if (!handler) {
      return false;
    }

    await handler(purchase);
    await payments.consumePurchase(purchase.purchaseToken);
    return true;
  }

  public async processPendingPurchases(): Promise<number> {
    const payments = await sdkManager.getPayments();
    if (!payments) {
      return 0;
    }

    const pending = await payments.getPurchases();
    let processed = 0;

    for (let i = 0; i < pending.length; i += 1) {
      const purchase = pending[i];
      const handler = this.handlers.get(purchase.id);
      if (!handler) {
        continue;
      }
      await handler(purchase);
      await payments.consumePurchase(purchase.purchaseToken);
      processed += 1;
    }

    return processed;
  }
}

export const purchasesManager = new PurchasesManager();
