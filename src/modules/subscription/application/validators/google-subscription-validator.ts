import { SUBSCRIPTION_PLATFORMS } from '../../domain/value-objects/subscription-platform.vo';
import { InvalidReceiptException } from '../../exceptions';

import type {
  SubscriptionValidator,
  ValidateReceiptInput,
  ValidationResult,
} from './subscription-validator.interface';
import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';
import type { GoogleStoreService } from '../../infrastructure/services/google-store.service';

export class GoogleSubscriptionValidator implements SubscriptionValidator {
  constructor(private readonly service: GoogleStoreService) {}

  async validateReceipt(input: ValidateReceiptInput): Promise<ValidationResult> {
    try {
      const subscriptionData = await this.service.validateReceipt(input.billingKey);

      const lineItem = subscriptionData.lineItems?.[0];
      if (!lineItem?.expiryTime) {
        throw new Error('No expiration time in subscription data');
      }

      return {
        expiresAt: new Date(lineItem.expiryTime),
        billingKey: input.billingKey,
      };
    } catch (_error) {
      throw new InvalidReceiptException();
    }
  }

  getPlatform(): SubscriptionPlatform {
    return SUBSCRIPTION_PLATFORMS.ANDROID;
  }
}
