import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { MockAppleStoreService, MockGoogleStoreService } from '../../../mocks/store-services.mock';
import { InMemorySubscriptionRepository } from '../../../mocks/subscription.repository.mock';
import { InMemoryUserRepository } from '../../../mocks/user.repository.mock';

import type { User } from '@/modules/user/domain/entities/user.entity';

import { restoreSubscriptionCommand } from '@/modules/subscription/application/commands/restore-subscription.command';
import {
  SubscriptionValidatorRegistry,
  AppleSubscriptionValidator,
  GoogleSubscriptionValidator,
} from '@/modules/subscription/application/validators';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';
import {
  NoActiveSubscriptionException,
  SubscriptionExpiredException,
} from '@/modules/subscription/exceptions';

describe('restoreSubscriptionCommand', () => {
  let subscriptionRepo: InMemorySubscriptionRepository;
  let userRepo: InMemoryUserRepository;
  let appleService: MockAppleStoreService;
  let googleService: MockGoogleStoreService;
  let validatorRegistry: SubscriptionValidatorRegistry;
  let testUser: User;
  let otherUser: User;

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

    otherUser = await userRepo.create({
      deviceId: 'other-device',
      accountTier: 'premium',
    });
  });

  afterEach(() => {
    subscriptionRepo.clear();
    userRepo.clear();
    appleService.clear();
    googleService.clear();
  });

  describe('restore without receipt validation', () => {
    it('should restore active subscription', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'ios-billing-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt,
      });

      const result = await restoreSubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          billingKey: 'ios-billing-key',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.restored).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(result.user.accountTier).toBe('premium');
    });

    it('should throw NoActiveSubscriptionException if subscription not found', async () => {
      await expect(
        restoreSubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.IOS,
            billingKey: 'non-existent-key',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry,
          },
        ),
      ).rejects.toThrow(NoActiveSubscriptionException);
    });

    it('should throw SubscriptionExpiredException for expired subscription without receipt', async () => {
      const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'expired-billing-key',
        status: SUBSCRIPTION_STATUSES.EXPIRED,
        expiresAt: expiredDate,
      });

      await expect(
        restoreSubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.IOS,
            billingKey: 'expired-billing-key',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry,
          },
        ),
      ).rejects.toThrow(SubscriptionExpiredException);
    });
  });

  describe('restore with iOS receipt validation', () => {
    it('should restore and update expiration from receipt', async () => {
      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
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

      const result = await restoreSubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          billingKey: 'ios-billing-key',
          receipt: 'ios-receipt-token',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.restored).toBe(true);
      expect(result.subscription.expiresAt.getTime()).toBe(newExpiresAt.getTime());
      expect(result.subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
    });

    it('should throw SubscriptionExpiredException if receipt validation shows expired', async () => {
      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'ios-billing-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: oldExpiresAt,
      });

      const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      appleService.setMockTransaction('expired-receipt', {
        expiresDate: expiredDate.getTime(),
        originalTransactionId: 'original-tx-123',
        transactionId: 'tx-123',
      } as import('@apple/app-store-server-library').JWSTransactionDecodedPayload);

      await expect(
        restoreSubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.IOS,
            billingKey: 'ios-billing-key',
            receipt: 'expired-receipt',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry,
          },
        ),
      ).rejects.toThrow(SubscriptionExpiredException);
    });

    it('should handle receipt validation failure gracefully', async () => {
      const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'ios-billing-key',
        status: SUBSCRIPTION_STATUSES.EXPIRED,
        expiresAt: expiredDate,
      });

      appleService.setShouldFail(true);

      await expect(
        restoreSubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.IOS,
            billingKey: 'ios-billing-key',
            receipt: 'invalid-receipt',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry,
          },
        ),
      ).rejects.toThrow(SubscriptionExpiredException);
    });
  });

  describe('restore with Android receipt validation', () => {
    it('should restore and update expiration from Android subscription', async () => {
      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'android-purchase-token',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
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

      const result = await restoreSubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.ANDROID,
          billingKey: 'android-purchase-token',
          receipt: 'android-receipt',
        },
        {
          userId: String(testUser.id),
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
          validatorRegistry,
        },
      );

      expect(result.restored).toBe(true);
      expect(result.subscription.expiresAt.getTime()).toBe(newExpiresAt.getTime());
      expect(result.subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
    });

    it('should throw SubscriptionExpiredException if Google subscription expired', async () => {
      const oldExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'android-purchase-token',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: oldExpiresAt,
      });

      const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      googleService.setMockSubscription('android-purchase-token', {
        lineItems: [
          {
            expiryTime: expiredDate.toISOString(),
            productId: 'premium_subscription',
          },
        ],
      } as import('@googleapis/androidpublisher').androidpublisher_v3.Schema$SubscriptionPurchaseV2);

      await expect(
        restoreSubscriptionCommand(
          {
            platform: SUBSCRIPTION_PLATFORMS.ANDROID,
            billingKey: 'android-purchase-token',
            receipt: 'android-receipt',
          },
          {
            userId: String(testUser.id),
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
            validatorRegistry,
          },
        ),
      ).rejects.toThrow(SubscriptionExpiredException);
    });
  });

  describe('user tier update', () => {
    it('should upgrade user to premium when restoring', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.create({
        userId: String(otherUser.id),
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'ios-billing-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt,
      });

      const result = await restoreSubscriptionCommand(
        {
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          billingKey: 'ios-billing-key',
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
    });
  });
});
