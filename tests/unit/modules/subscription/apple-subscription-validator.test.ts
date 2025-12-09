import { describe, it, expect, mock, beforeEach } from 'bun:test';

import type { AppleStoreService } from '@/modules/subscription/infrastructure/services/apple-store.service';

import { AppleSubscriptionValidator } from '@/modules/subscription/application/validators/apple-subscription-validator';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { InvalidReceiptException } from '@/modules/subscription/exceptions';

describe('AppleSubscriptionValidator', () => {
  let mockAppleStoreService: AppleStoreService;
  let validator: AppleSubscriptionValidator;

  beforeEach(() => {
    mockAppleStoreService = {
      validateReceipt: mock(),
      verifyWebhookNotification: mock(),
    } as unknown as AppleStoreService;

    validator = new AppleSubscriptionValidator(mockAppleStoreService);
  });

  describe('getPlatform', () => {
    it('should return IOS platform', () => {
      expect(validator.getPlatform()).toBe(SUBSCRIPTION_PLATFORMS.IOS);
    });
  });

  describe('validateReceipt', () => {
    it('should validate receipt successfully and return expiration date', async () => {
      const mockExpiresDate = '2025-12-31T23:59:59Z';
      const mockTransactionInfo = {
        expiresDate: mockExpiresDate,
        productId: 'com.app.premium',
      };

      (mockAppleStoreService.validateReceipt as ReturnType<typeof mock>).mockResolvedValue(
        mockTransactionInfo,
      );

      const result = await validator.validateReceipt({
        receipt: 'test-receipt',
        billingKey: 'test-billing-key',
        productId: 'com.app.premium',
      });

      expect(result).toEqual({
        expiresAt: new Date(mockExpiresDate),
        billingKey: 'test-billing-key',
      });
      expect(mockAppleStoreService.validateReceipt).toHaveBeenCalledWith('test-receipt');
    });

    it('should throw InvalidReceiptException when expiresDate is missing', async () => {
      const mockTransactionInfo = {
        productId: 'com.app.premium',
      };

      (mockAppleStoreService.validateReceipt as ReturnType<typeof mock>).mockResolvedValue(
        mockTransactionInfo,
      );

      await expect(
        validator.validateReceipt({
          receipt: 'test-receipt',
          billingKey: 'test-billing-key',
        }),
      ).rejects.toThrow(InvalidReceiptException);
    });

    it('should throw InvalidReceiptException when service throws error', async () => {
      (mockAppleStoreService.validateReceipt as ReturnType<typeof mock>).mockRejectedValue(
        new Error('Apple service error'),
      );

      await expect(
        validator.validateReceipt({
          receipt: 'test-receipt',
          billingKey: 'test-billing-key',
        }),
      ).rejects.toThrow(InvalidReceiptException);
    });

    it('should throw InvalidReceiptException for invalid receipt format', async () => {
      (mockAppleStoreService.validateReceipt as ReturnType<typeof mock>).mockRejectedValue(
        new Error('Invalid receipt format'),
      );

      await expect(
        validator.validateReceipt({
          receipt: 'invalid-receipt',
          billingKey: 'test-billing-key',
        }),
      ).rejects.toThrow(InvalidReceiptException);
    });
  });
});
