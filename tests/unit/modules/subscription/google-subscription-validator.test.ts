import { describe, it, expect, mock, beforeEach } from 'bun:test';

import type { GoogleStoreService } from '@/modules/subscription/infrastructure/services/google-store.service';

import { GoogleSubscriptionValidator } from '@/modules/subscription/application/validators/google-subscription-validator';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { InvalidReceiptException } from '@/modules/subscription/exceptions';

describe('GoogleSubscriptionValidator', () => {
  let mockGoogleStoreService: GoogleStoreService;
  let validator: GoogleSubscriptionValidator;

  beforeEach(() => {
    mockGoogleStoreService = {
      validateReceipt: mock(),
      verifyWebhookNotification: mock(),
    } as unknown as GoogleStoreService;

    validator = new GoogleSubscriptionValidator(mockGoogleStoreService);
  });

  describe('getPlatform', () => {
    it('should return ANDROID platform', () => {
      expect(validator.getPlatform()).toBe(SUBSCRIPTION_PLATFORMS.ANDROID);
    });
  });

  describe('validateReceipt', () => {
    it('should validate receipt successfully and return expiration date', async () => {
      const mockExpiryTime = '2025-12-31T23:59:59Z';
      const mockSubscriptionData = {
        lineItems: [
          {
            expiryTime: mockExpiryTime,
            productId: 'premium_monthly',
          },
        ],
      };

      (mockGoogleStoreService.validateReceipt as ReturnType<typeof mock>).mockResolvedValue(
        mockSubscriptionData,
      );

      const result = await validator.validateReceipt({
        receipt: 'test-receipt',
        billingKey: 'test-billing-key',
        productId: 'premium_monthly',
      });

      expect(result).toEqual({
        expiresAt: new Date(mockExpiryTime),
        billingKey: 'test-billing-key',
      });
      expect(mockGoogleStoreService.validateReceipt).toHaveBeenCalledWith('test-billing-key');
    });

    it('should throw InvalidReceiptException when expiryTime is missing', async () => {
      const mockSubscriptionData = {
        lineItems: [
          {
            productId: 'premium_monthly',
          },
        ],
      };

      (mockGoogleStoreService.validateReceipt as ReturnType<typeof mock>).mockResolvedValue(
        mockSubscriptionData,
      );

      await expect(
        validator.validateReceipt({
          receipt: 'test-receipt',
          billingKey: 'test-billing-key',
        }),
      ).rejects.toThrow(InvalidReceiptException);
    });

    it('should throw InvalidReceiptException when lineItems is empty', async () => {
      const mockSubscriptionData = {
        lineItems: [],
      };

      (mockGoogleStoreService.validateReceipt as ReturnType<typeof mock>).mockResolvedValue(
        mockSubscriptionData,
      );

      await expect(
        validator.validateReceipt({
          receipt: 'test-receipt',
          billingKey: 'test-billing-key',
        }),
      ).rejects.toThrow(InvalidReceiptException);
    });

    it('should throw InvalidReceiptException when service throws error', async () => {
      (mockGoogleStoreService.validateReceipt as ReturnType<typeof mock>).mockRejectedValue(
        new Error('Google service error'),
      );

      await expect(
        validator.validateReceipt({
          receipt: 'test-receipt',
          billingKey: 'test-billing-key',
        }),
      ).rejects.toThrow(InvalidReceiptException);
    });

    it('should throw InvalidReceiptException for network errors', async () => {
      (mockGoogleStoreService.validateReceipt as ReturnType<typeof mock>).mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        validator.validateReceipt({
          receipt: 'test-receipt',
          billingKey: 'test-billing-key',
        }),
      ).rejects.toThrow(InvalidReceiptException);
    });
  });
});
