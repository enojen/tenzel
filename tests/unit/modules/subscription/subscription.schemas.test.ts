import { describe, expect, it } from 'bun:test';

import {
  subscriptionPlatformSchema,
  subscriptionStatusSchema,
  verifySubscriptionRequestSchema,
  restoreSubscriptionRequestSchema,
  subscriptionResponseSchema,
  verifySubscriptionResponseSchema,
  restoreSubscriptionResponseSchema,
} from '@/modules/subscription/api/subscription.schemas';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '@/modules/subscription/domain/value-objects/subscription-status.vo';

describe('Subscription Schemas', () => {
  describe('subscriptionPlatformSchema', () => {
    it('should accept valid ios platform', () => {
      const result = subscriptionPlatformSchema.safeParse(SUBSCRIPTION_PLATFORMS.IOS);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('ios');
      }
    });

    it('should accept valid android platform', () => {
      const result = subscriptionPlatformSchema.safeParse(SUBSCRIPTION_PLATFORMS.ANDROID);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('android');
      }
    });

    it('should reject invalid platform', () => {
      const result = subscriptionPlatformSchema.safeParse('windows');
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionStatusSchema', () => {
    it('should accept all valid statuses', () => {
      const statuses = [
        SUBSCRIPTION_STATUSES.ACTIVE,
        SUBSCRIPTION_STATUSES.EXPIRED,
        SUBSCRIPTION_STATUSES.CANCELED,
        SUBSCRIPTION_STATUSES.GRACE_PERIOD,
      ];

      for (const status of statuses) {
        const result = subscriptionStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = subscriptionStatusSchema.safeParse('pending');
      expect(result.success).toBe(false);
    });
  });

  describe('verifySubscriptionRequestSchema', () => {
    it('should accept valid iOS verification request', () => {
      const request = {
        platform: 'ios',
        receipt: 'apple-receipt-token',
        billingKey: 'billing-key-123',
        productId: 'com.app.premium',
      };

      const result = verifySubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platform).toBe('ios');
        expect(result.data.receipt).toBe('apple-receipt-token');
        expect(result.data.billingKey).toBe('billing-key-123');
        expect(result.data.productId).toBe('com.app.premium');
      }
    });

    it('should accept valid Android verification request', () => {
      const request = {
        platform: 'android',
        receipt: 'google-purchase-token',
        billingKey: 'purchase-token-456',
        productId: 'premium_subscription',
      };

      const result = verifySubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject request with empty receipt', () => {
      const request = {
        platform: 'ios',
        receipt: '',
        billingKey: 'billing-key-123',
        productId: 'com.app.premium',
      };

      const result = verifySubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject request with empty billingKey', () => {
      const request = {
        platform: 'ios',
        receipt: 'receipt-token',
        billingKey: '',
        productId: 'com.app.premium',
      };

      const result = verifySubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject request with empty productId', () => {
      const request = {
        platform: 'ios',
        receipt: 'receipt-token',
        billingKey: 'billing-key',
        productId: '',
      };

      const result = verifySubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject request missing required fields', () => {
      const request = {
        platform: 'ios',
        receipt: 'receipt-token',
      };

      const result = verifySubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('restoreSubscriptionRequestSchema', () => {
    it('should accept valid restore request with receipt', () => {
      const request = {
        platform: 'ios',
        billingKey: 'billing-key-123',
        receipt: 'receipt-token',
      };

      const result = restoreSubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platform).toBe('ios');
        expect(result.data.billingKey).toBe('billing-key-123');
        expect(result.data.receipt).toBe('receipt-token');
      }
    });

    it('should accept valid restore request without receipt', () => {
      const request = {
        platform: 'android',
        billingKey: 'billing-key-456',
      };

      const result = restoreSubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.receipt).toBeUndefined();
      }
    });

    it('should reject request with empty billingKey', () => {
      const request = {
        platform: 'ios',
        billingKey: '',
      };

      const result = restoreSubscriptionRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionResponseSchema', () => {
    it('should accept valid subscription response', () => {
      const response = {
        id: 'sub-123',
        platform: 'ios',
        billingKey: 'billing-key-123',
        status: 'active',
        expiresAt: '2025-01-01T00:00:00.000Z',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };

      const result = subscriptionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject response missing required fields', () => {
      const response = {
        id: 'sub-123',
        platform: 'ios',
      };

      const result = subscriptionResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('verifySubscriptionResponseSchema', () => {
    it('should accept valid verify response', () => {
      const response = {
        success: true,
        user: {
          id: 'user-123',
          accountTier: 'premium',
          subscriptionExpiresAt: '2025-01-01T00:00:00.000Z',
        },
        subscription: {
          id: 'sub-123',
          platform: 'ios',
          billingKey: 'billing-key-123',
          status: 'active',
          expiresAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2024-12-01T00:00:00.000Z',
          updatedAt: '2024-12-01T00:00:00.000Z',
        },
      };

      const result = verifySubscriptionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject response with success false', () => {
      const response = {
        success: false,
        user: {
          id: 'user-123',
          accountTier: 'premium',
          subscriptionExpiresAt: '2025-01-01T00:00:00.000Z',
        },
        subscription: {
          id: 'sub-123',
          platform: 'ios',
          billingKey: 'billing-key-123',
          status: 'active',
          expiresAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2024-12-01T00:00:00.000Z',
          updatedAt: '2024-12-01T00:00:00.000Z',
        },
      };

      const result = verifySubscriptionResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('restoreSubscriptionResponseSchema', () => {
    it('should accept valid restore response', () => {
      const response = {
        success: true,
        restored: true,
        user: {
          id: 'user-123',
          accountTier: 'premium',
          subscriptionExpiresAt: '2025-01-01T00:00:00.000Z',
        },
        subscription: {
          id: 'sub-123',
          platform: 'ios',
          billingKey: 'billing-key-123',
          status: 'active',
          expiresAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2024-12-01T00:00:00.000Z',
          updatedAt: '2024-12-01T00:00:00.000Z',
        },
      };

      const result = restoreSubscriptionResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should require restored field to be true', () => {
      const response = {
        success: true,
        restored: false,
        user: {
          id: 'user-123',
          accountTier: 'premium',
          subscriptionExpiresAt: '2025-01-01T00:00:00.000Z',
        },
        subscription: {
          id: 'sub-123',
          platform: 'ios',
          billingKey: 'billing-key-123',
          status: 'active',
          expiresAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2024-12-01T00:00:00.000Z',
          updatedAt: '2024-12-01T00:00:00.000Z',
        },
      };

      const result = restoreSubscriptionResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});
