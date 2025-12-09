import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { InMemorySubscriptionRepository } from '../../../mocks/subscription.repository.mock';
import { InMemoryUserRepository } from '../../../mocks/user.repository.mock';

import type { Subscription } from '@/modules/subscription/domain/entities/subscription.entity';
import type { User } from '@/modules/user/domain/entities/user.entity';

import { processWebhookEvent } from '@/modules/subscription/application/handlers/webhook-event.handler';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';
import { WEBHOOK_EVENT_TYPES } from '@/modules/subscription/domain/value-objects/webhook-event-type.vo';
import { WEBHOOK_PLATFORMS } from '@/modules/subscription/domain/value-objects/webhook-platform.vo';
import { SubscriptionNotFoundException } from '@/modules/subscription/exceptions';

describe('processWebhookEvent', () => {
  let subscriptionRepo: InMemorySubscriptionRepository;
  let userRepo: InMemoryUserRepository;
  let testUser: User;
  let testSubscription: Subscription;

  beforeEach(async () => {
    subscriptionRepo = new InMemorySubscriptionRepository();
    userRepo = new InMemoryUserRepository();

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
  });

  afterEach(() => {
    subscriptionRepo.clear();
    userRepo.clear();
  });

  describe('idempotency', () => {
    it('should process event only once', async () => {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const result1 = await processWebhookEvent(
        {
          eventId: 'event-123',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
          expiresAt: newExpiresAt,
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      expect(result1.alreadyProcessed).toBe(false);

      const result2 = await processWebhookEvent(
        {
          eventId: 'event-123',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
          expiresAt: newExpiresAt,
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      expect(result2.alreadyProcessed).toBe(true);
    });

    it('should create webhook log for processed event', async () => {
      await processWebhookEvent(
        {
          eventId: 'event-456',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const log = await subscriptionRepo.findWebhookLog('event-456');
      expect(log).not.toBeNull();
      expect(log!.eventId).toBe('event-456');
      expect(log!.platform).toBe(WEBHOOK_PLATFORMS.GOOGLE);
    });
  });

  describe('subscription not found', () => {
    it('should throw SubscriptionNotFoundException', async () => {
      await expect(
        processWebhookEvent(
          {
            eventId: 'event-789',
            platform: WEBHOOK_PLATFORMS.APPLE,
            eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
            billingKey: 'non-existent-key',
            payload: JSON.stringify({ test: 'data' }),
          },
          {
            subscriptionRepository: subscriptionRepo,
            userRepository: userRepo,
          },
        ),
      ).rejects.toThrow(SubscriptionNotFoundException);
    });
  });

  describe('DID_RENEW event', () => {
    it('should activate subscription and update expiration', async () => {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      await processWebhookEvent(
        {
          eventId: 'renew-event-1',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
          expiresAt: newExpiresAt,
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(subscription!.expiresAt.getTime()).toBe(newExpiresAt.getTime());

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('premium');
    });
  });

  describe('SUBSCRIPTION_RENEWED event', () => {
    it('should activate subscription and update user tier', async () => {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      await processWebhookEvent(
        {
          eventId: 'google-renew-1',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
          expiresAt: newExpiresAt,
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('premium');
      expect(user!.subscriptionExpiresAt?.getTime()).toBe(newExpiresAt.getTime());
    });
  });

  describe('DID_FAIL_TO_RENEW event', () => {
    it('should set subscription to grace period', async () => {
      await processWebhookEvent(
        {
          eventId: 'fail-renew-1',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_FAIL_TO_RENEW,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.GRACE_PERIOD);
    });
  });

  describe('SUBSCRIPTION_IN_GRACE_PERIOD event', () => {
    it('should set subscription to grace period', async () => {
      await processWebhookEvent(
        {
          eventId: 'grace-period-1',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_IN_GRACE_PERIOD,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.GRACE_PERIOD);
    });
  });

  describe('DID_CHANGE_RENEWAL_STATUS event', () => {
    it('should cancel subscription', async () => {
      await processWebhookEvent(
        {
          eventId: 'change-renewal-1',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_CHANGE_RENEWAL_STATUS,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.CANCELED);
    });
  });

  describe('SUBSCRIPTION_CANCELED event', () => {
    it('should cancel subscription', async () => {
      await processWebhookEvent(
        {
          eventId: 'cancel-1',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CANCELED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.CANCELED);
    });
  });

  describe('EXPIRED event', () => {
    it('should expire subscription and downgrade user', async () => {
      await processWebhookEvent(
        {
          eventId: 'expire-1',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.EXPIRED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.EXPIRED);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('free');
      expect(user!.subscriptionExpiresAt).toBeNull();
    });
  });

  describe('SUBSCRIPTION_EXPIRED event', () => {
    it('should expire subscription and downgrade user', async () => {
      await processWebhookEvent(
        {
          eventId: 'google-expire-1',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_EXPIRED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.EXPIRED);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('free');
      expect(user!.subscriptionExpiresAt).toBeNull();
    });
  });

  describe('GRACE_PERIOD_EXPIRED event', () => {
    it('should expire subscription and downgrade user', async () => {
      await processWebhookEvent(
        {
          eventId: 'grace-expire-1',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.GRACE_PERIOD_EXPIRED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.EXPIRED);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('free');
    });
  });

  describe('REFUND event', () => {
    it('should downgrade user to free', async () => {
      await processWebhookEvent(
        {
          eventId: 'refund-1',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.REFUND,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('free');
      expect(user!.subscriptionExpiresAt).toBeNull();
    });
  });

  describe('SUBSCRIPTION_RECOVERED event', () => {
    it('should activate subscription if not expired', async () => {
      await processWebhookEvent(
        {
          eventId: 'recover-1',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RECOVERED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('premium');
    });

    it('should not upgrade user if subscription expired', async () => {
      const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      await subscriptionRepo.update(testSubscription.id, {
        expiresAt: expiredDate,
      });
      await userRepo.update(String(testUser.id), {
        accountTier: 'free',
        subscriptionExpiresAt: null,
      });

      await processWebhookEvent(
        {
          eventId: 'recover-expired-1',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RECOVERED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('free');
    });
  });

  describe('SUBSCRIBED event', () => {
    it('should activate subscription with expiration', async () => {
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await processWebhookEvent(
        {
          eventId: 'subscribed-1',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIBED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ test: 'data' }),
          expiresAt: newExpiresAt,
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(subscription!.expiresAt.getTime()).toBe(newExpiresAt.getTime());

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('premium');
    });
  });

  describe('SUBSCRIPTION_PURCHASED event', () => {
    it('should activate subscription with expiration', async () => {
      const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await processWebhookEvent(
        {
          eventId: 'purchased-1',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PURCHASED,
          billingKey: 'test-billing-key',
          payload: JSON.stringify({ notification: 'data' }),
          expiresAt: newExpiresAt,
        },
        {
          subscriptionRepository: subscriptionRepo,
          userRepository: userRepo,
        },
      );

      const subscription = await subscriptionRepo.findById(testSubscription.id);
      expect(subscription!.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);

      const user = await userRepo.findById(String(testUser.id));
      expect(user!.accountTier).toBe('premium');
      expect(user!.subscriptionExpiresAt?.getTime()).toBe(newExpiresAt.getTime());
    });
  });
});
