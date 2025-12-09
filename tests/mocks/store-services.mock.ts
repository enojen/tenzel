import type { JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import type { androidpublisher_v3 } from '@googleapis/androidpublisher';

export class MockAppleStoreService {
  // These properties exist to match the real AppleStoreService interface
  // @ts-expect-error - unused but required for type compatibility
  private client: unknown = null;
  // @ts-expect-error - unused but required for type compatibility
  private verifier: unknown = null;
  // @ts-expect-error - unused but required for type compatibility
  private receiptUtil: unknown = null;

  private mockTransactions: Map<string, JWSTransactionDecodedPayload> = new Map();
  private shouldFail = false;

  setMockTransaction(receipt: string, transaction: JWSTransactionDecodedPayload): void {
    this.mockTransactions.set(receipt, transaction);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  async validateReceipt(receipt: string): Promise<JWSTransactionDecodedPayload> {
    if (this.shouldFail) {
      throw new Error('Invalid receipt');
    }

    const transaction = this.mockTransactions.get(receipt);
    if (!transaction) {
      throw new Error('Receipt not found');
    }

    return transaction;
  }

  async verifyWebhookNotification(signedPayload: string): Promise<unknown> {
    if (this.shouldFail) {
      throw new Error('Invalid webhook signature');
    }

    return JSON.parse(signedPayload);
  }

  async getSubscriptionStatus(): Promise<unknown> {
    throw new Error('Not implemented in mock');
  }

  clear(): void {
    this.mockTransactions.clear();
    this.shouldFail = false;
  }
}

export class MockGoogleStoreService {
  // This property exists to match the real GoogleStoreService interface
  // @ts-expect-error - unused but required for type compatibility
  private client: unknown = null;
  packageName: string = 'com.test.package';

  private mockSubscriptions: Map<string, androidpublisher_v3.Schema$SubscriptionPurchaseV2> =
    new Map();
  private shouldFail = false;

  setMockSubscription(
    purchaseToken: string,
    subscription: androidpublisher_v3.Schema$SubscriptionPurchaseV2,
  ): void {
    this.mockSubscriptions.set(purchaseToken, subscription);
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  async validateReceipt(
    purchaseToken: string,
  ): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2> {
    if (this.shouldFail) {
      throw new Error('Invalid purchase token');
    }

    const subscription = this.mockSubscriptions.get(purchaseToken);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return subscription;
  }

  decodePubSubMessage(data: string): unknown {
    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  clear(): void {
    this.mockSubscriptions.clear();
    this.shouldFail = false;
  }
}
