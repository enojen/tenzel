import { SUBSCRIPTION_PLATFORMS } from '../../domain/value-objects/subscription-platform.vo';
import { InvalidReceiptException } from '../../exceptions';

import type {
  SubscriptionValidator,
  ValidateReceiptInput,
  ValidationResult,
} from './subscription-validator.interface';
import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';
import type { AppleStoreService } from '../../infrastructure/services/apple-store.service';

export class AppleSubscriptionValidator implements SubscriptionValidator {
  constructor(private readonly service: AppleStoreService) {}

  async validateReceipt(input: ValidateReceiptInput): Promise<ValidationResult> {
    try {
      const transactionInfo = await this.service.validateReceipt(input.receipt);

      if (!transactionInfo.expiresDate) {
        throw new Error('No expiration date in transaction');
      }

      return {
        expiresAt: new Date(transactionInfo.expiresDate),
        billingKey: input.billingKey,
      };
    } catch (_error) {
      throw new InvalidReceiptException();
    }
  }

  getPlatform(): SubscriptionPlatform {
    return SUBSCRIPTION_PLATFORMS.IOS;
  }
}
