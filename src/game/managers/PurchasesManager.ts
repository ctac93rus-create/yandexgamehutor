import { sdkManager } from './SDKManager';

export interface CatalogProduct {
  id: string;
  title?: string;
  description?: string;
  price?: string;
}

interface PurchaseRecord {
  id?: string;
  productID?: string;
  purchaseToken: string;
}

type GrantHandler = (purchase: PurchaseRecord) => Promise<void>;

type ProductKind = 'consumable' | 'nonConsumable';

interface RegisteredProduct {
  kind: ProductKind;
  onGrant: GrantHandler;
}

export class PurchasesManager {
  private handlers = new Map<string, RegisteredProduct>();

  public registerProduct(
    productId: string,
    input: { kind: ProductKind; onGrant: GrantHandler },
  ): void {
    this.handlers.set(productId, input);
  }

  public registerConsumable(productId: string, onGrant: GrantHandler): void {
    this.registerProduct(productId, { kind: 'consumable', onGrant });
  }

  public registerNonConsumable(productId: string, onGrant: GrantHandler): void {
    this.registerProduct(productId, { kind: 'nonConsumable', onGrant });
  }

  public async getCatalog(): Promise<CatalogProduct[]> {
    const payments = await sdkManager.getPayments();
    if (!payments) {
      return [];
    }

    const catalog = await payments.getCatalog();
    const products = this.extractCatalogProducts(catalog);

    return products.map((product) => ({
      id: String(product.productID ?? product.id ?? ''),
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
    const registration = this.handlers.get(this.getPurchaseProductId(purchase));
    if (!registration) {
      return false;
    }

    await registration.onGrant(purchase);
    if (registration.kind === 'consumable') {
      await payments.consumePurchase(purchase.purchaseToken);
    }
    return true;
  }



  private extractCatalogProducts(catalog: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(catalog)) {
      return catalog;
    }

    if (catalog && typeof catalog === 'object' && Array.isArray((catalog as { products?: unknown }).products)) {
      return (catalog as { products: Array<Record<string, unknown>> }).products;
    }

    return [];
  }

  private getPurchaseProductId(purchase: { productID?: unknown; id?: unknown }): string {
    return String(purchase.productID ?? purchase.id ?? '');
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
      const registration = this.handlers.get(this.getPurchaseProductId(purchase));
      if (!registration) {
        continue;
      }
      await registration.onGrant(purchase);
      if (registration.kind === 'consumable') {
        await payments.consumePurchase(purchase.purchaseToken);
      }
      processed += 1;
    }

    return processed;
  }
}

export const purchasesManager = new PurchasesManager();
