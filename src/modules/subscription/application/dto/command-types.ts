import type { Subscription } from '../../domain/entities/subscription.entity';
import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';
import type { User } from '@/modules/user/domain/entities/user.entity';

export interface VerifySubscriptionInput {
  platform: SubscriptionPlatform;
  receipt: string;
  billingKey: string;
  productId: string;
}

export interface VerifySubscriptionResult {
  user: User;
  subscription: Subscription;
}

export interface RestoreSubscriptionInput {
  platform: SubscriptionPlatform;
  billingKey: string;
  receipt?: string;
}

export interface RestoreSubscriptionResult {
  restored: true;
  user: User;
  subscription: Subscription;
}
