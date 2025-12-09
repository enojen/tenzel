import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';

import { MockAppleStoreService, MockGoogleStoreService } from '../../../mocks/store-services.mock';
import { InMemorySubscriptionRepository } from '../../../mocks/subscription.repository.mock';
import { InMemoryUserRepository } from '../../../mocks/user.repository.mock';

import type {
  VerifySubscriptionResponse,
  RestoreSubscriptionResponse,
} from '@/modules/subscription/api/subscription.schemas';
import type { User } from '@/modules/user/domain/entities/user.entity';
import type { AuthenticatedUser } from '@/shared/types/context';

import { subscriptionController } from '@/modules/subscription/api/subscription.controller';
import {
  SubscriptionValidatorRegistry,
  AppleSubscriptionValidator,
  GoogleSubscriptionValidator,
} from '@/modules/subscription/application/validators';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';
import { UnauthorizedException } from '@/shared/exceptions';
import { BaseException } from '@/shared/exceptions/base.exception';
import { jwtService } from '@/shared/infrastructure/jwt';

function createMockAuthMiddleware(userRepo: InMemoryUserRepository) {
  return (app: Elysia) =>
    app.derive(async ({ request }): Promise<{ user: AuthenticatedUser }> => {
      const authHeader = request.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('errors.unauthorized');
      }

      const token = authHeader.slice(7);
      const payload = await jwtService.verify(token);

      if (!payload) {
        throw new UnauthorizedException('errors.invalid_token');
      }

      const user = await userRepo.findById(payload.userId);

      if (!user || user.isDeleted) {
        throw new UnauthorizedException('errors.invalid_token');
      }

      return {
        user: {
          id: String(user.id),
          deviceId: payload.deviceId,
          accountTier: user.accountTier,
          subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
        },
      };
    });
}

function createTestApp(
  subscriptionRepo: InMemorySubscriptionRepository,
  userRepo: InMemoryUserRepository,
  appleService: MockAppleStoreService,
  googleService: MockGoogleStoreService,
) {
  const mockAuth = createMockAuthMiddleware(userRepo);

  const validatorRegistry = new SubscriptionValidatorRegistry();
  validatorRegistry.register(
    new AppleSubscriptionValidator(
      appleService as unknown as import('@/modules/subscription/infrastructure/services/apple-store.service').AppleStoreService,
    ),
  );
  validatorRegistry.register(
    new GoogleSubscriptionValidator(
      googleService as unknown as import('@/modules/subscription/infrastructure/services/google-store.service').GoogleStoreService,
    ),
  );

  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof BaseException) {
        set.status = error.statusCode;
        return {
          error: {
            code: error.code,
            message: error.messageKey,
            timestamp: error.timestamp.toISOString(),
          },
        };
      }

      set.status = 500;
      return {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
      };
    })
    .group('/api/subscriptions', (group) =>
      group.use(mockAuth).use(
        subscriptionController({
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        }),
      ),
    );
}

async function getAuthHeader(userId: string | number, deviceId: string) {
  const token = await jwtService.sign({ userId: String(userId), deviceId });
  return `Bearer ${token}`;
}

describe('Subscription Controller E2E', () => {
  let app: ReturnType<typeof createTestApp>;
  let subscriptionRepo: InMemorySubscriptionRepository;
  let userRepo: InMemoryUserRepository;
  let appleService: MockAppleStoreService;
  let googleService: MockGoogleStoreService;
  let testUser: User;

  beforeEach(async () => {
    subscriptionRepo = new InMemorySubscriptionRepository();
    userRepo = new InMemoryUserRepository();
    appleService = new MockAppleStoreService();
    googleService = new MockGoogleStoreService();

    testUser = await userRepo.create({
      deviceId: 'test-device',
      accountTier: 'free',
    });

    app = createTestApp(subscriptionRepo, userRepo, appleService, googleService);
  });

  afterEach(() => {
    subscriptionRepo.clear();
    userRepo.clear();
    appleService.clear();
    googleService.clear();
  });

  describe('POST /api/subscriptions/verify', () => {
    it('should verify iOS subscription successfully', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('ios-receipt', {
        expiresDate: expiresAt.getTime(),
        originalTransactionId: 'tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/verify', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            receipt: 'ios-receipt',
            billingKey: 'ios-billing-key',
            productId: 'com.app.premium',
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as VerifySubscriptionResponse;
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.accountTier).toBe('premium');
      expect(body.subscription).toBeDefined();
      expect(body.subscription.platform).toBe('ios');
      expect(body.subscription.status).toBe('active');
    });

    it('should verify Android subscription successfully', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      googleService.setMockSubscription('android-token', {
        lineItems: [
          {
            expiryTime: expiresAt.toISOString(),
            productId: 'premium',
          },
        ],
      } as import('@googleapis/androidpublisher').androidpublisher_v3.Schema$SubscriptionPurchaseV2);

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/verify', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'android',
            receipt: 'android-receipt',
            billingKey: 'android-token',
            productId: 'premium',
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as VerifySubscriptionResponse;
      expect(body.success).toBe(true);
      expect(body.subscription.platform).toBe('android');
    });

    it('should return 400 for invalid receipt', async () => {
      appleService.setShouldFail(true);

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/verify', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            receipt: 'invalid-receipt',
            billingKey: 'billing-key',
            productId: 'com.app.premium',
          }),
        }),
      );

      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: { code: string; message: string; timestamp: string };
      };
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 401 without authorization', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            receipt: 'receipt',
            billingKey: 'key',
            productId: 'product',
          }),
        }),
      );

      expect(response.status).toBe(401);
    });

    it('should update existing subscription', async () => {
      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(testUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'ios-billing-key',
        status: SUBSCRIPTION_STATUSES.EXPIRED,
        expiresAt: oldExpiresAt,
      });

      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('ios-receipt', {
        expiresDate: newExpiresAt.getTime(),
        originalTransactionId: 'tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/verify', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            receipt: 'ios-receipt',
            billingKey: 'ios-billing-key',
            productId: 'com.app.premium',
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as VerifySubscriptionResponse;
      expect(body.subscription.status).toBe('active');
    });
  });

  describe('POST /api/subscriptions/restore', () => {
    it('should restore subscription successfully', async () => {
      const otherUser = await userRepo.create({
        deviceId: 'other-device',
        accountTier: 'premium',
      });

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'restore-billing-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt,
      });

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/restore', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            billingKey: 'restore-billing-key',
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as RestoreSubscriptionResponse;
      expect(body.success).toBe(true);
      expect(body.restored).toBe(true);
      expect(body.user.accountTier).toBe('premium');
      expect(body.subscription).toBeDefined();
    });

    it('should restore with receipt validation', async () => {
      const otherUser = await userRepo.create({
        deviceId: 'other-device',
        accountTier: 'premium',
      });

      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'restore-billing-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: oldExpiresAt,
      });

      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('ios-receipt', {
        expiresDate: newExpiresAt.getTime(),
        originalTransactionId: 'tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/restore', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            billingKey: 'restore-billing-key',
            receipt: 'ios-receipt',
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as RestoreSubscriptionResponse;
      expect(body.restored).toBe(true);
    });

    it('should return 404 for non-existent subscription', async () => {
      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/restore', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            billingKey: 'non-existent-key',
          }),
        }),
      );

      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        error: { code: string; message: string; timestamp: string };
      };
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for expired subscription without receipt', async () => {
      const otherUser = await userRepo.create({
        deviceId: 'other-device',
        accountTier: 'free',
      });

      const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'expired-billing-key',
        status: SUBSCRIPTION_STATUSES.EXPIRED,
        expiresAt: expiredDate,
      });

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/restore', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            billingKey: 'expired-billing-key',
          }),
        }),
      );

      expect(response.status).toBe(400);
    });

    it('should return 401 without authorization', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            billingKey: 'billing-key',
          }),
        }),
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Response format', () => {
    it('should return ISO 8601 formatted dates', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('ios-receipt', {
        expiresDate: expiresAt.getTime(),
        originalTransactionId: 'tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      const authHeader = await getAuthHeader(testUser.id, testUser.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/subscriptions/verify', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platform: 'ios',
            receipt: 'ios-receipt',
            billingKey: 'ios-billing-key',
            productId: 'com.app.premium',
          }),
        }),
      );

      const body = (await response.json()) as VerifySubscriptionResponse;

      expect(body.subscription.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(body.subscription.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(body.subscription.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });
});
