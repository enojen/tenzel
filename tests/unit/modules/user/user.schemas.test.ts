import { describe, expect, it } from 'bun:test';

import {
  userResponseSchema,
  deleteUserResponseSchema,
  trackedAssetSchema,
  trackedAssetsResponseSchema,
  addTrackedAssetRequestSchema,
  addTrackedAssetResponseSchema,
  removeTrackedAssetQuerySchema,
} from '@/modules/user/api/user.schemas';

describe('User Schemas', () => {
  describe('userResponseSchema', () => {
    it('should validate correct user response', () => {
      const validData = {
        user: {
          id: 'user-123',
          deviceId: 'device-456',
          accountTier: 'free',
          subscriptionExpiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      const result = userResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate premium user with expiration date', () => {
      const validData = {
        user: {
          id: 'user-123',
          deviceId: 'device-456',
          accountTier: 'premium',
          subscriptionExpiresAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      const result = userResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid account tier', () => {
      const invalidData = {
        user: {
          id: 'user-123',
          deviceId: 'device-456',
          accountTier: 'invalid',
          subscriptionExpiresAt: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };

      const result = userResponseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        user: {
          id: 'user-123',
        },
      };

      const result = userResponseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('deleteUserResponseSchema', () => {
    it('should validate success response', () => {
      const validData = { success: true };

      const result = deleteUserResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject false success', () => {
      const invalidData = { success: false };

      const result = deleteUserResponseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('trackedAssetSchema', () => {
    it('should validate currency asset', () => {
      const validData = {
        assetType: 'currency',
        assetCode: 'USD',
        addedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = trackedAssetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate commodity asset', () => {
      const validData = {
        assetType: 'commodity',
        assetCode: 'GRAM_GOLD',
        addedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = trackedAssetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid asset type', () => {
      const invalidData = {
        assetType: 'stock',
        assetCode: 'AAPL',
        addedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = trackedAssetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('trackedAssetsResponseSchema', () => {
    it('should validate empty assets list', () => {
      const validData = { assets: [] };

      const result = trackedAssetsResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate multiple assets', () => {
      const validData = {
        assets: [
          { assetType: 'currency', assetCode: 'USD', addedAt: '2024-01-01T00:00:00.000Z' },
          { assetType: 'commodity', assetCode: 'GRAM_GOLD', addedAt: '2024-01-02T00:00:00.000Z' },
        ],
      };

      const result = trackedAssetsResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('addTrackedAssetRequestSchema', () => {
    it('should validate currency request', () => {
      const validData = {
        assetType: 'currency',
        assetCode: 'EUR',
      };

      const result = addTrackedAssetRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate commodity request', () => {
      const validData = {
        assetType: 'commodity',
        assetCode: 'SILVER',
      };

      const result = addTrackedAssetRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty asset code', () => {
      const invalidData = {
        assetType: 'currency',
        assetCode: '',
      };

      const result = addTrackedAssetRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing asset type', () => {
      const invalidData = {
        assetCode: 'USD',
      };

      const result = addTrackedAssetRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('addTrackedAssetResponseSchema', () => {
    it('should validate success response with assets', () => {
      const validData = {
        success: true,
        assets: [{ assetType: 'currency', assetCode: 'USD', addedAt: '2024-01-01T00:00:00.000Z' }],
      };

      const result = addTrackedAssetResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('removeTrackedAssetQuerySchema', () => {
    it('should validate currency type', () => {
      const validData = { type: 'currency' };

      const result = removeTrackedAssetQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate commodity type', () => {
      const validData = { type: 'commodity' };

      const result = removeTrackedAssetQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const invalidData = { type: 'stock' };

      const result = removeTrackedAssetQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing type', () => {
      const invalidData = {};

      const result = removeTrackedAssetQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
