import { describe, expect, it } from 'bun:test';

import { WebhookLog } from '@/modules/subscription/domain/entities/webhook-log.entity';
import { WEBHOOK_EVENT_TYPES } from '@/modules/subscription/domain/value-objects/webhook-event-type.vo';
import { WEBHOOK_PLATFORMS } from '@/modules/subscription/domain/value-objects/webhook-platform.vo';

const createWebhookLogProps = (overrides = {}) => ({
  id: 'log-1',
  eventId: 'event-123',
  platform: WEBHOOK_PLATFORMS.APPLE,
  eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
  billingKey: 'billing-key-123',
  processedAt: new Date(),
  payload: JSON.stringify({ test: 'data' }),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('WebhookLog Entity', () => {
  describe('create', () => {
    it('should create a webhook log with provided props', () => {
      const props = createWebhookLogProps();
      const log = WebhookLog.create(props);

      expect(log.id).toBe(props.id);
      expect(log.eventId).toBe(props.eventId);
      expect(log.platform).toBe(props.platform);
      expect(log.eventType).toBe(props.eventType);
      expect(log.billingKey).toBe(props.billingKey);
      expect(log.processedAt).toEqual(props.processedAt);
      expect(log.payload).toBe(props.payload);
    });

    it('should generate id if not provided', () => {
      const log = WebhookLog.create({
        eventId: 'event-123',
        platform: WEBHOOK_PLATFORMS.APPLE,
        eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
        billingKey: 'billing-key-123',
        processedAt: new Date(),
        payload: JSON.stringify({ test: 'data' }),
      });

      expect(log.id).toBeDefined();
      expect(typeof log.id).toBe('string');
    });

    it('should set createdAt and updatedAt if not provided', () => {
      const before = new Date();
      const log = WebhookLog.create({
        eventId: 'event-123',
        platform: WEBHOOK_PLATFORMS.APPLE,
        eventType: WEBHOOK_EVENT_TYPES.DID_RENEW,
        billingKey: 'billing-key-123',
        processedAt: new Date(),
        payload: JSON.stringify({ test: 'data' }),
      });
      const after = new Date();

      expect(log.createdAt).toBeDefined();
      expect(log.updatedAt).toBeDefined();
      expect(log.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getters', () => {
    it('should return correct eventId', () => {
      const log = WebhookLog.create(createWebhookLogProps());
      expect(log.eventId).toBe('event-123');
    });

    it('should return correct platform', () => {
      const log = WebhookLog.create(createWebhookLogProps({ platform: WEBHOOK_PLATFORMS.GOOGLE }));
      expect(log.platform).toBe(WEBHOOK_PLATFORMS.GOOGLE);
    });

    it('should return correct eventType', () => {
      const log = WebhookLog.create(
        createWebhookLogProps({ eventType: WEBHOOK_EVENT_TYPES.EXPIRED }),
      );
      expect(log.eventType).toBe(WEBHOOK_EVENT_TYPES.EXPIRED);
    });

    it('should return correct billingKey', () => {
      const log = WebhookLog.create(createWebhookLogProps());
      expect(log.billingKey).toBe('billing-key-123');
    });

    it('should return correct processedAt', () => {
      const processedAt = new Date('2024-01-01');
      const log = WebhookLog.create(createWebhookLogProps({ processedAt }));
      expect(log.processedAt).toEqual(processedAt);
    });

    it('should return correct payload', () => {
      const payload = JSON.stringify({ custom: 'payload', nested: { value: 123 } });
      const log = WebhookLog.create(createWebhookLogProps({ payload }));
      expect(log.payload).toBe(payload);
    });
  });

  describe('payload handling', () => {
    it('should store complex JSON payload', () => {
      const complexPayload = JSON.stringify({
        notificationType: 'DID_RENEW',
        data: {
          signedTransactionInfo: 'token',
          signedRenewalInfo: 'renewal-token',
        },
        timestamp: new Date().toISOString(),
      });

      const log = WebhookLog.create(
        createWebhookLogProps({
          payload: complexPayload,
        }),
      );

      expect(log.payload).toBe(complexPayload);
      const parsed = JSON.parse(log.payload);
      expect(parsed.notificationType).toBe('DID_RENEW');
      expect(parsed.data.signedTransactionInfo).toBe('token');
    });
  });
});
