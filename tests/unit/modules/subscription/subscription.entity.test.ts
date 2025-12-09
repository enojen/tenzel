import { describe, expect, it } from 'bun:test';

import { Subscription } from '@/modules/subscription/domain/entities/subscription.entity';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';

const createSubscriptionProps = (overrides = {}) => ({
  id: 'sub-1',
  userId: 'user-1',
  platform: SUBSCRIPTION_PLATFORMS.IOS,
  billingKey: 'billing-key-123',
  status: SUBSCRIPTION_STATUSES.ACTIVE,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Subscription Entity', () => {
  describe('create', () => {
    it('should create a subscription with provided props', () => {
      const props = createSubscriptionProps();
      const subscription = Subscription.create(props);

      expect(subscription.id).toBe(props.id);
      expect(subscription.userId).toBe(props.userId);
      expect(subscription.platform).toBe(props.platform);
      expect(subscription.billingKey).toBe(props.billingKey);
      expect(subscription.status).toBe(props.status);
      expect(subscription.expiresAt).toEqual(props.expiresAt);
    });

    it('should generate id if not provided', () => {
      const subscription = Subscription.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: new Date(),
      });

      expect(subscription.id).toBeDefined();
      expect(typeof subscription.id).toBe('string');
    });

    it('should set createdAt and updatedAt if not provided', () => {
      const before = new Date();
      const subscription = Subscription.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: new Date(),
      });
      const after = new Date();

      expect(subscription.createdAt).toBeDefined();
      expect(subscription.updatedAt).toBeDefined();
      expect(subscription.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(subscription.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('isActive', () => {
    it('should return true for active subscription with future expiration', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt: futureDate,
        }),
      );

      expect(subscription.isActive).toBe(true);
    });

    it('should return false for active subscription with past expiration', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt: pastDate,
        }),
      );

      expect(subscription.isActive).toBe(false);
    });

    it('should return false for expired subscription', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.EXPIRED,
        }),
      );

      expect(subscription.isActive).toBe(false);
    });

    it('should return false for canceled subscription', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.CANCELED,
        }),
      );

      expect(subscription.isActive).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return true for expired status', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.EXPIRED,
        }),
      );

      expect(subscription.isExpired).toBe(true);
    });

    it('should return true for past expiration date', () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt: pastDate,
        }),
      );

      expect(subscription.isExpired).toBe(true);
    });

    it('should return false for active with future expiration', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt: futureDate,
        }),
      );

      expect(subscription.isExpired).toBe(false);
    });
  });

  describe('isInGracePeriod', () => {
    it('should return true for grace period status', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.GRACE_PERIOD,
        }),
      );

      expect(subscription.isInGracePeriod).toBe(true);
    });

    it('should return false for other statuses', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
        }),
      );

      expect(subscription.isInGracePeriod).toBe(false);
    });
  });

  describe('isCanceled', () => {
    it('should return true for canceled status', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.CANCELED,
        }),
      );

      expect(subscription.isCanceled).toBe(true);
    });

    it('should return false for other statuses', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
        }),
      );

      expect(subscription.isCanceled).toBe(false);
    });
  });

  describe('activate', () => {
    it('should set status to active', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.EXPIRED,
        }),
      );

      subscription.activate();

      expect(subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
    });

    it('should update expiresAt if provided', () => {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const subscription = Subscription.create(createSubscriptionProps());

      subscription.activate(newExpiresAt);

      expect(subscription.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(subscription.expiresAt).toEqual(newExpiresAt);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const subscription = Subscription.create(createSubscriptionProps({ updatedAt: oldDate }));

      const before = new Date();
      subscription.activate();

      expect(subscription.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('cancel', () => {
    it('should set status to canceled', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
        }),
      );

      subscription.cancel();

      expect(subscription.status).toBe(SUBSCRIPTION_STATUSES.CANCELED);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const subscription = Subscription.create(createSubscriptionProps({ updatedAt: oldDate }));

      const before = new Date();
      subscription.cancel();

      expect(subscription.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('expire', () => {
    it('should set status to expired', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
        }),
      );

      subscription.expire();

      expect(subscription.status).toBe(SUBSCRIPTION_STATUSES.EXPIRED);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const subscription = Subscription.create(createSubscriptionProps({ updatedAt: oldDate }));

      const before = new Date();
      subscription.expire();

      expect(subscription.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('enterGracePeriod', () => {
    it('should set status to grace period', () => {
      const subscription = Subscription.create(
        createSubscriptionProps({
          status: SUBSCRIPTION_STATUSES.ACTIVE,
        }),
      );

      subscription.enterGracePeriod();

      expect(subscription.status).toBe(SUBSCRIPTION_STATUSES.GRACE_PERIOD);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const subscription = Subscription.create(createSubscriptionProps({ updatedAt: oldDate }));

      const before = new Date();
      subscription.enterGracePeriod();

      expect(subscription.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('extendExpiration', () => {
    it('should update expiresAt', () => {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      const subscription = Subscription.create(createSubscriptionProps());

      subscription.extendExpiration(newExpiresAt);

      expect(subscription.expiresAt).toEqual(newExpiresAt);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const subscription = Subscription.create(createSubscriptionProps({ updatedAt: oldDate }));

      const before = new Date();
      subscription.extendExpiration(new Date());

      expect(subscription.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
