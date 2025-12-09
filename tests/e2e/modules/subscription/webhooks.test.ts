import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';

import { MockAppleStoreService, MockGoogleStoreService } from '../../../mocks/store-services.mock';
import { InMemorySubscriptionRepository } from '../../../mocks/subscription.repository.mock';
import { InMemoryUserRepository } from '../../../mocks/user.repository.mock';

import type { Subscription } from '@/modules/subscription/domain/entities/subscription.entity';
import type { User } from '@/modules/user/domain/entities/user.entity';

import { appleWebhookController } from '@/modules/subscription/api/webhooks/apple-webhook.controller';
import { googleWebhookController } from '@/modules/subscription/api/webhooks/google-webhook.controller';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';

function createTestApp(
  subscriptionRepo: InMemorySubscriptionRepository,
  userRepo: InMemoryUserRepository,
  appleService: MockAppleStoreService,
  googleService: MockGoogleStoreService,
) {
  return new Elysia().group('/api/webhooks', (group) =>
    group
      .group('/apple', (apple) =>
        apple.use(
          appleWebhookController({
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            appleStoreService:
              appleService as unknown as import('@/modules/subscription/infrastructure/services/apple-store.service').AppleStoreService,
          }),
        ),
      )
      .group('/google', (google) =>
        google.use(
          googleWebhookController({
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            googleStoreService:
              googleService as unknown as import('@/modules/subscription/infrastructure/services/google-store.service').GoogleStoreService,
          }),
        ),
      ),
  );
}

describe('Webhooks E2E', () => {
  let app: ReturnType<typeof createTestApp>;
  let subscriptionRepo: InMemorySubscriptionRepository;
  let userRepo: InMemoryUserRepository;
  let appleService: MockAppleStoreService;
  let googleService: MockGoogleStoreService;
  let testUser: User;
  let testSubscription: Subscription;

  beforeEach(async () => {
    subscriptionRepo = new InMemorySubscriptionRepository();
    userRepo = new InMemoryUserRepository();
    appleService = new MockAppleStoreService();
    googleService = new MockGoogleStoreService();

    testUser = await userRepo.create({
      deviceId: 'test-device',
      accountTier: 'premium',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    testSubscription = await subscriptionRepo.create({
      userId: String(testUser.id),
      platform: SUBSCRIPTION_PLATFORMS.IOS,
      billingKey: 'test-billing-key',
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    app = createTestApp(subscriptionRepo, userRepo, appleService, googleService);
  });

  afterEach(() => {
    subscriptionRepo.clear();
    userRepo.clear();
    appleService.clear();
    googleService.clear();
  });

  describe('POST /api/webhooks/apple', () => {
    it('should process DID_RENEW event', async () => {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const payload = JSON.stringify({
        notificationUUID: 'event-123',
        notificationType: 'DID_RENEW',
        data: {
          signedTransactionInfo: 'test-billing-key',
          signedRenewalInfo: newExpiresAt.toISOString(),
        },
      });

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);

      const log = await subscriptionRepo.findWebhookLog('event-123');
      expect(log).not.toBeNull();
    });

    it('should process EXPIRED event', async () => {
      const payload = JSON.stringify({
        notificationUUID: 'expire-event-123',
        notificationType: 'EXPIRED',
        data: {
          signedTransactionInfo: 'test-billing-key',
        },
      });

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response.status).toBe(200);

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.EXPIRED);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('free');
    });

    it('should handle idempotent webhook calls', async () => {
      const payload = JSON.stringify({
        notificationUUID: 'duplicate-event',
        notificationType: 'DID_RENEW',
        data: {
          signedTransactionInfo: 'test-billing-key',
        },
      });

      const response1 = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response1.status).toBe(200);

      const response2 = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response2.status).toBe(200);
    });

    it('should handle webhook with missing notification type', async () => {
      const payload = JSON.stringify({
        notificationUUID: 'missing-type-event',
        data: {
          signedTransactionInfo: 'test-billing-key',
        },
      });

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);
    });

    it('should handle webhook with unknown notification type', async () => {
      const payload = JSON.stringify({
        notificationUUID: 'unknown-type-event',
        notificationType: 'UNKNOWN_TYPE',
        data: {
          signedTransactionInfo: 'test-billing-key',
        },
      });

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);
    });

    it('should process DID_FAIL_TO_RENEW event', async () => {
      const payload = JSON.stringify({
        notificationUUID: 'fail-renew-event',
        notificationType: 'DID_FAIL_TO_RENEW',
        data: {
          signedTransactionInfo: 'test-billing-key',
        },
      });

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response.status).toBe(200);

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.GRACE_PERIOD);
    });

    it('should process DID_CHANGE_RENEWAL_STATUS event', async () => {
      const payload = JSON.stringify({
        notificationUUID: 'change-renewal-event',
        notificationType: 'DID_CHANGE_RENEWAL_STATUS',
        data: {
          signedTransactionInfo: 'test-billing-key',
        },
      });

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/apple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedPayload: payload,
          }),
        }),
      );

      expect(response.status).toBe(200);

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.CANCELED);
    });
  });

  describe('POST /api/webhooks/google', () => {
    beforeEach(async () => {
      testSubscription = await subscriptionRepo.create({
        userId: String(testUser.id),
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'android-purchase-token',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    });

    it('should process SUBSCRIPTION_RENEWED event', async () => {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      googleService.setMockSubscription('android-purchase-token', {
        lineItems: [
          {
            expiryTime: newExpiresAt.toISOString(),
            productId: 'premium',
          },
        ],
      } as import('@googleapis/androidpublisher').androidpublisher_v3.Schema$SubscriptionPurchaseV2);

      const notification = {
        version: '1.0',
        packageName: 'com.app.test',
        eventTimeMillis: String(Date.now()),
        subscriptionNotification: {
          version: '1.0',
          notificationType: 2,
          purchaseToken: 'android-purchase-token',
        },
      };

      const encodedData = Buffer.from(JSON.stringify(notification)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              data: encodedData,
              messageId: 'google-msg-123',
            },
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);

      const log = await subscriptionRepo.findWebhookLog('google-msg-123');
      expect(log).not.toBeNull();
    });

    it('should process SUBSCRIPTION_EXPIRED event', async () => {
      const notification = {
        version: '1.0',
        packageName: 'com.app.test',
        eventTimeMillis: String(Date.now()),
        subscriptionNotification: {
          version: '1.0',
          notificationType: 12,
          purchaseToken: 'android-purchase-token',
        },
      };

      const encodedData = Buffer.from(JSON.stringify(notification)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              data: encodedData,
              messageId: 'google-expire-123',
            },
          }),
        }),
      );

      expect(response.status).toBe(200);

      const subscription = await subscriptionRepo.findByBillingKey('android-purchase-token');
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.EXPIRED);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('free');
    });

    it('should handle test notification', async () => {
      const notification = {
        version: '1.0',
        packageName: 'com.app.test',
        testNotification: {
          version: '1.0',
        },
      };

      const encodedData = Buffer.from(JSON.stringify(notification)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              data: encodedData,
            },
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);
    });

    it('should handle webhook with missing data', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {},
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);
    });

    it('should handle webhook with missing subscription notification', async () => {
      const notification = {
        version: '1.0',
        packageName: 'com.app.test',
        eventTimeMillis: String(Date.now()),
      };

      const encodedData = Buffer.from(JSON.stringify(notification)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              data: encodedData,
            },
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);
    });

    it('should handle unknown notification type', async () => {
      const notification = {
        version: '1.0',
        packageName: 'com.app.test',
        eventTimeMillis: String(Date.now()),
        subscriptionNotification: {
          version: '1.0',
          notificationType: 999,
          purchaseToken: 'android-purchase-token',
        },
      };

      const encodedData = Buffer.from(JSON.stringify(notification)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              data: encodedData,
              messageId: 'unknown-type-msg',
            },
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as { received: boolean };
      expect(body.received).toBe(true);
    });

    it('should process SUBSCRIPTION_CANCELED event', async () => {
      const notification = {
        version: '1.0',
        packageName: 'com.app.test',
        eventTimeMillis: String(Date.now()),
        subscriptionNotification: {
          version: '1.0',
          notificationType: 3,
          purchaseToken: 'android-purchase-token',
        },
      };

      const encodedData = Buffer.from(JSON.stringify(notification)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              data: encodedData,
              messageId: 'cancel-msg',
            },
          }),
        }),
      );

      expect(response.status).toBe(200);

      const subscription = await subscriptionRepo.findByBillingKey('android-purchase-token');
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.CANCELED);
    });

    it('should process SUBSCRIPTION_IN_GRACE_PERIOD event', async () => {
      const notification = {
        version: '1.0',
        packageName: 'com.app.test',
        eventTimeMillis: String(Date.now()),
        subscriptionNotification: {
          version: '1.0',
          notificationType: 6,
          purchaseToken: 'android-purchase-token',
        },
      };

      const encodedData = Buffer.from(JSON.stringify(notification)).toString('base64');

      const response = await app.handle(
        new Request('http://localhost/api/webhooks/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              data: encodedData,
              messageId: 'grace-msg',
            },
          }),
        }),
      );

      expect(response.status).toBe(200);

      const subscription = await subscriptionRepo.findByBillingKey('android-purchase-token');
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.GRACE_PERIOD);
    });
  });
});
