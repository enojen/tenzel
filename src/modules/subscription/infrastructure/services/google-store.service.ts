import { androidpublisher, androidpublisher_v3 } from '@googleapis/androidpublisher';
import { JWT } from 'google-auth-library';

import { config } from '@/config';
import { createModuleLogger } from '@/shared/logging';

const logger = createModuleLogger('google-store-service');

export interface GoogleNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
  };
  testNotification?: {
    version: string;
  };
}

export class GoogleStoreService {
  private client: androidpublisher_v3.Androidpublisher;
  private packageName: string;

  constructor() {
    const { packageName, serviceAccountKeyPath } = config.subscription.google;

    if (!packageName || !serviceAccountKeyPath) {
      throw new Error(
        'Google Play integration is not configured. Please set GOOGLE_PACKAGE_NAME and GOOGLE_SERVICE_ACCOUNT_KEY_PATH in your environment variables.',
      );
    }

    this.packageName = packageName;

    const auth = new JWT({
      keyFile: serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    this.client = androidpublisher({ version: 'v3', auth });

    logger.info({ packageName }, 'GoogleStoreService initialized');
  }

  async validateReceipt(
    purchaseToken: string,
  ): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2> {
    logger.debug({ purchaseToken: purchaseToken.substring(0, 10) + '...' }, 'Validating receipt');

    const response = await this.client.purchases.subscriptionsv2.get({
      packageName: this.packageName,
      token: purchaseToken,
    });

    if (!response.data) {
      throw new Error('No subscription data returned from Google Play');
    }

    return response.data;
  }

  decodePubSubMessage(data: string): GoogleNotification {
    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }
}
