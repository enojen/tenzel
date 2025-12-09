import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';

export interface ValidateReceiptInput {
  receipt: string;
  billingKey: string;
  productId?: string;
}

export interface ValidationResult {
  expiresAt: Date;
  billingKey: string;
}

export interface SubscriptionValidator {
  validateReceipt(input: ValidateReceiptInput): Promise<ValidationResult>;
  getPlatform(): SubscriptionPlatform;
}
