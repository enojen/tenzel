import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { MockAppleStoreService, MockGoogleStoreService } from '../../../mocks/store-services.mock';
import { InMemorySubscriptionRepository } from '../../../mocks/subscription.repository.mock';
import { InMemoryUserRepository } from '../../../mocks/user.repository.mock';

import type { User } from '@/modules/user/domain/entities/user.entity';

import { verifySubscriptionCommand } from '@/modules/subscription/application/commands/verify-subscription.command';
import {
  SubscriptionValidatorRegistry,
  AppleSubscriptionValidator,
  GoogleSubscriptionValidator,
} from '@/modules/subscription/application/validators';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';
import {
  InvalidReceiptException,
  PlatformNotSupportedException,
} from '@/modules/subscription/exceptions';

describe('verifySubscriptionCommand', () => {
  let subscriptionRepo: InMemorySubscriptionRepository;
  let userRepo: InMemoryUserRepository;
  let appleService: MockAppleStoreService;
  let googleService: MockGoogleStoreService;
  let validatorRegistry: SubscriptionValidatorRegistry;
  let testUser: User;

  beforeEach(async () => {
    subscriptionRepo = new InMemorySubscriptionRepository();
    userRepo = new InMemoryUserRepository();
    appleService = new MockAppleStoreService();
    googleService = new MockGoogleStoreService();

    validatorRegistry = new SubscriptionValidatorRegistry();
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

    testUser = await userRepo.create({
      deviceId: 'test-device',
      accountTier: 'free',
    });
  });

  afterEach(() => {
    subscriptionRepo.clear();
    userRepo.clear();
    appleService.clear();
    googleService.clear();
  });

  describe('iOS verification', () => {
    it('should verify iOS subscription and create new subscription', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('ios-receipt-token', {
        expiresDate: expiresAt.getTime(),
        originalTransactionId: 'original-tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      const result = await verifySubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          receipt: 'ios-receipt-token',
          billingKey: 'ios-billing-key',
          productId: 'com.app.premium',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.subscription).toBeDefined();
      expect(result.subscription.platform).toBe(SUBSCRIPTION_PLATFORMS.IOS);
      expect(result.subscription.billingKey).toBe('ios-billing-key');
      expect(result.subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(result.user).toBeDefined();
      expect(result.user.accountTier).toBe('premium');
    });

    it('should update existing iOS subscription', async () => {
      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(testUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'ios-billing-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: oldExpiresAt,
      });

      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('ios-receipt-token', {
        expiresDate: newExpiresAt.getTime(),
        originalTransactionId: 'original-tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      const result = await verifySubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          receipt: 'ios-receipt-token',
          billingKey: 'ios-billing-key',
          productId: 'com.app.premium',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.subscription.expiresAt.getTime()).toBe(newExpiresAt.getTime());
      expect(result.subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
    });

    it('should throw InvalidReceiptException for invalid iOS receipt', async () => {
      appleService.setShouldFail(true);

      await expect(
        verifySubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.IOS,
            receipt: 'invalid-receipt',
            billingKey: 'ios-billing-key',
            productId: 'com.app.premium',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry,
          },
        ),
      ).rejects.toThrow(InvalidReceiptException);
    });

    it('should throw PlatformNotSupportedException if iOS platform not configured', async () => {
      const registryWithoutIOS = new SubscriptionValidatorRegistry();
      registryWithoutIOS.register(
        new GoogleSubscriptionValidator(
          googleService as unknown as import('@/modules/subscription/infrastructure/services/google-store.service').GoogleStoreService,
        ),
      );

      await expect(
        verifySubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.IOS,
            receipt: 'ios-receipt-token',
            billingKey: 'ios-billing-key',
            productId: 'com.app.premium',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry: registryWithoutIOS,
          },
        ),
      ).rejects.toThrow(PlatformNotSupportedException);
    });
  });

  describe('Android verification', () => {
    it('should verify Android subscription and create new subscription', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      googleService.setMockSubscription('android-purchase-token', {
        lineItems: [
          {
            expiryTime: expiresAt.toISOString(),
            productId: 'premium_subscription',
          },
        ],
      } as import('@googleapis/androidpublisher').androidpublisher_v3.Schema$SubscriptionPurchaseV2);

      const result = await verifySubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.ANDROID,
          receipt: 'android-receipt',
          billingKey: 'android-purchase-token',
          productId: 'premium_subscription',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.subscription).toBeDefined();
      expect(result.subscription.platform).toBe(SUBSCRIPTION_PLATFORMS.ANDROID);
      expect(result.subscription.billingKey).toBe('android-purchase-token');
      expect(result.subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(result.user.accountTier).toBe('premium');
    });

    it('should update existing Android subscription', async () => {
      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(testUser.id),
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'android-purchase-token',
        status: SUBSCRIPTION_STATUSES.EXPIRED,
        expiresAt: oldExpiresAt,
      });

      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      googleService.setMockSubscription('android-purchase-token', {
        lineItems: [
          {
            expiryTime: newExpiresAt.toISOString(),
            productId: 'premium_subscription',
          },
        ],
      } as import('@googleapis/androidpublisher').androidpublisher_v3.Schema$SubscriptionPurchaseV2);

      const result = await verifySubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.ANDROID,
          receipt: 'android-receipt',
          billingKey: 'android-purchase-token',
          productId: 'premium_subscription',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.subscription.expiresAt.getTime()).toBe(newExpiresAt.getTime());
      expect(result.subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
    });

    it('should throw InvalidReceiptException for invalid Android purchase token', async () => {
      googleService.setShouldFail(true);

      await expect(
        verifySubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.ANDROID,
            receipt: 'android-receipt',
            billingKey: 'invalid-token',
            productId: 'premium_subscription',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry,
          },
        ),
      ).rejects.toThrow(InvalidReceiptException);
    });

    it('should throw PlatformNotSupportedException if Android platform not configured', async () => {
      const registryWithoutAndroid = new SubscriptionValidatorRegistry();
      registryWithoutAndroid.register(
        new AppleSubscriptionValidator(
          appleService as unknown as import('@/modules/subscription/infrastructure/services/apple-store.service').AppleStoreService,
        ),
      );

      await expect(
        verifySubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.ANDROID,
            receipt: 'android-receipt',
            billingKey: 'android-purchase-token',
            productId: 'premium_subscription',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry: registryWithoutAndroid,
          },
        ),
      ).rejects.toThrow(PlatformNotSupportedException);
    });
  });

  describe('user tier update', () => {
    it('should upgrade user to premium tier', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('ios-receipt-token', {
        expiresDate: expiresAt.getTime(),
        originalTransactionId: 'original-tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      const result = await verifySubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          receipt: 'ios-receipt-token',
          billingKey: 'ios-billing-key',
          productId: 'com.app.premium',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.user.accountTier).toBe('premium');
      expect(result.user.subscriptionExpiresAt).toBeDefined();
      expect(result.user.subscriptionExpiresAt?.getTime()).toBe(expiresAt.getTime());
    });
  });
});
