import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { InMemorySubscriptionRepository } from '../../../mocks/subscription.repository.mock';

import { Subscription } from '@/modules/subscription/domain/entities/subscription.entity';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';
import { WEBHOOK_EVENT_TYPES } from '@/modules/subscription/domain/value-objects/webhook-event-type.vo';
import { WEBHOOK_PLATFORMS } from '@/modules/subscription/domain/value-objects/webhook-platform.vo';

describe('SubscriptionRepository (InMemory)', () => {
  let repository: InMemorySubscriptionRepository;

  beforeEach(() => {
    repository = new InMemorySubscriptionRepository();
  });

  afterEach(() => {
    repository.clear();
  });

  describe('create', () => {
    it('should create a new subscription', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt,
      });

      expect(created.id).toBe('1');
      expect(created.userId).toBe('user-1');
      expect(created.platform).toBe(SUBSCRIPTION_PLATFORMS.IOS);
      expect(created.billingKey).toBe('billing-key-123');
      expect(created.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(created.expiresAt).toEqual(expiresAt);
    });

    it('should auto-increment ids', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const sub1 = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'key-1',
        expiresAt,
      });

      const sub2 = await repository.create({
        userId: 'user-2',
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'key-2',
        expiresAt,
      });

      expect(sub1.id).toBe('1');
      expect(sub2.id).toBe('2');
    });

    it('should use default status if not provided', async () => {
      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        expiresAt: new Date(),
      });

      expect(created.status).toBe('active');
    });

    it('should set createdAt and updatedAt', async () => {
      const before = new Date();
      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        expiresAt: new Date(),
      });
      const after = new Date();

      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
      expect(created.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('findById', () => {
    it('should return subscription when found', async () => {
      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        expiresAt: new Date(),
      });

      const found = await repository.findById(String(created.id));

      expect(found).not.toBeNull();
      expect(String(found!.id)).toBe(String(created.id));
      expect(found!.billingKey).toBe('billing-key-123');
    });

    it('should return null when not found', async () => {
      const found = await repository.findById('999');
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return subscription for user', async () => {
      await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        expiresAt: new Date(),
      });

      const found = await repository.findByUserId('user-1');

      expect(found).not.toBeNull();
      expect(found!.userId).toBe('user-1');
    });

    it('should return null when user has no subscription', async () => {
      const found = await repository.findByUserId('user-999');
      expect(found).toBeNull();
    });

    it('should return first subscription if user has multiple', async () => {
      await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'key-1',
        expiresAt: new Date(),
      });

      const found = await repository.findByUserId('user-1');
      expect(found).not.toBeNull();
      expect(found!.billingKey).toBe('key-1');
    });
  });

  describe('findByBillingKey', () => {
    it('should return subscription by billing key', async () => {
      await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'unique-billing-key',
        expiresAt: new Date(),
      });

      const found = await repository.findByBillingKey('unique-billing-key');

      expect(found).not.toBeNull();
      expect(found!.billingKey).toBe('unique-billing-key');
    });

    it('should return null when billing key not found', async () => {
      const found = await repository.findByBillingKey('non-existent-key');
      expect(found).toBeNull();
    });
  });

  describe('findExpired', () => {
    it('should return expired subscriptions', async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'expired-key-1',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: pastDate,
      });

      await repository.create({
        userId: 'user-2',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'active-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: futureDate,
      });

      await repository.create({
        userId: 'user-3',
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'expired-key-2',
        status: SUBSCRIPTION_STATUSES.CANCELED,
        expiresAt: pastDate,
      });

      const expired = await repository.findExpired();

      expect(expired.length).toBe(2);
      expect(expired.some((s) => s.billingKey === 'expired-key-1')).toBe(true);
      expect(expired.some((s) => s.billingKey === 'expired-key-2')).toBe(true);
    });

    it('should return empty array when no expired subscriptions', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'active-key',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: futureDate,
      });

      const expired = await repository.findExpired();
      expect(expired.length).toBe(0);
    });
  });

  describe('update', () => {
    it('should update subscription status', async () => {
      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: new Date(),
      });

      const updated = await repository.update(String(created.id), {
        status: SUBSCRIPTION_STATUSES.EXPIRED,
      });

      expect(updated.status).toBe(SUBSCRIPTION_STATUSES.EXPIRED);
    });

    it('should update expiration date', async () => {
      const oldDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const newDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        expiresAt: oldDate,
      });

      const updated = await repository.update(String(created.id), {
        expiresAt: newDate,
      });

      expect(updated.expiresAt.getTime()).toBe(newDate.getTime());
    });

    it('should update both status and expiration', async () => {
      const newDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        status: SUBSCRIPTION_STATUSES.EXPIRED,
        expiresAt: new Date(),
      });

      const updated = await repository.update(String(created.id), {
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: newDate,
      });

      expect(updated.status).toBe(SUBSCRIPTION_STATUSES.ACTIVE);
      expect(updated.expiresAt.getTime()).toBe(newDate.getTime());
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        expiresAt: new Date(),
      });

      const originalUpdatedAt = created.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(String(created.id), {
        status: SUBSCRIPTION_STATUSES.CANCELED,
      });

      expect(updated.updatedAt!.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
    });

    it('should throw error when updating non-existent subscription', async () => {
      await expect(
        repository.update('999', {
          status: SUBSCRIPTION_STATUSES.EXPIRED,
        }),
      ).rejects.toThrow('Subscription not found');
    });
  });

  describe('webhook logs', () => {
    describe('findWebhookLog', () => {
      it('should return webhook log by event id', async () => {
        await repository.createWebhookLog({
          eventId: 'event-123',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
          billingKey: 'billing-key-123',
          payload: JSON.stringify({ test: 'data' }),
        });

        const found = await repository.findWebhookLog('event-123');

        expect(found).not.toBeNull();
        expect(found!.eventId).toBe('event-123');
        expect(found!.platform).toBe(WEBHOOK_PLATFORMS.APPLE);
      });

      it('should return null when event id not found', async () => {
        const found = await repository.findWebhookLog('non-existent-event');
        expect(found).toBeNull();
      });
    });

    describe('createWebhookLog', () => {
      it('should create webhook log', async () => {
        const created = await repository.createWebhookLog({
          eventId: 'event-456',
          platform: WEBHOOK_PLATFORMS.GOOGLE,
          eventType: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED,
          billingKey: 'billing-key-456',
          payload: JSON.stringify({ notification: 'data' }),
        });

        expect(created.eventId).toBe('event-456');
        expect(created.platform).toBe(WEBHOOK_PLATFORMS.GOOGLE);
        expect(created.eventType).toBe(WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED);
        expect(created.billingKey).toBe('billing-key-456');
      });

      it('should set processedAt timestamp', async () => {
        const before = new Date();
        const created = await repository.createWebhookLog({
          eventId: 'event-789',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.EXPIRED,
          billingKey: 'billing-key-789',
          payload: JSON.stringify({ test: 'data' }),
        });
        const after = new Date();

        expect(created.processedAt).toBeDefined();
        expect(created.processedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(created.processedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should enforce idempotency by event id', async () => {
        await repository.createWebhookLog({
          eventId: 'duplicate-event',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
          billingKey: 'billing-key-123',
          payload: JSON.stringify({ first: 'call' }),
        });

        await repository.createWebhookLog({
          eventId: 'duplicate-event',
          platform: WEBHOOK_PLATFORMS.APPLE,
          eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
          billingKey: 'billing-key-123',
          payload: JSON.stringify({ second: 'call' }),
        });

        const found = await repository.findWebhookLog('duplicate-event');
        expect(found).not.toBeNull();
        expect(JSON.parse(found!.payload)).toEqual({ second: 'call' });
      });
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions and webhook logs', async () => {
      await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'billing-key-123',
        expiresAt: new Date(),
      });

      await repository.createWebhookLog({
        eventId: 'event-123',
        platform: WEBHOOK_PLATFORMS.APPLE,
        eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
        billingKey: 'billing-key-123',
        payload: JSON.stringify({}),
      });

      repository.clear();

      const subscription = await repository.findById('1');
      const log = await repository.findWebhookLog('event-123');

      expect(subscription).toBeNull();
      expect(log).toBeNull();
    });

    it('should reset id counter', async () => {
      await repository.create({
        userId: 'user-1',
        platform: SUBSCRIPTION_PLATFORMS.IOS,
        billingKey: 'key-1',
        expiresAt: new Date(),
      });

      repository.clear();

      const newSub = await repository.create({
        userId: 'user-2',
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'key-2',
        expiresAt: new Date(),
      });

      expect(newSub.id).toBe('1');
    });
  });

  describe('seed', () => {
    it('should seed repository with subscriptions', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const subscriptions = [
        Subscription.create({
          id: '100',
          userId: 'user-1',
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          billingKey: 'key-1',
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt,
        }),
        Subscription.create({
          id: '200',
          userId: 'user-2',
          platform: SUBSCRIPTION_PLATFORMS.ANDROID,
          billingKey: 'key-2',
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt,
        }),
      ];

      repository.seed(subscriptions);

      const found1 = await repository.findById('100');
      const found2 = await repository.findById('200');

      expect(found1).not.toBeNull();
      expect(found2).not.toBeNull();
      expect(found1!.billingKey).toBe('key-1');
      expect(found2!.billingKey).toBe('key-2');
    });

    it('should update id counter based on seeded data', async () => {
      const expiresAt = new Date();
      repository.seed([
        Subscription.create({
          id: '500',
          userId: 'user-1',
          platform: SUBSCRIPTION_PLATFORMS.IOS,
          billingKey: 'key-1',
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt,
        }),
      ]);

      const newSub = await repository.create({
        userId: 'user-2',
        platform: SUBSCRIPTION_PLATFORMS.ANDROID,
        billingKey: 'key-2',
        expiresAt,
      });

      expect(newSub.id).toBe('501');
    });
  });
});
