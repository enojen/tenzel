import type { SubscriptionResponse } from '../../api/subscription.schemas';
import type { Subscription } from '../../domain/entities/subscription.entity';
import type { User } from '@/modules/user/domain/entities/user.entity';

export interface UserSubscriptionResponse {
  id: string;
  accountTier: string;
  subscriptionExpiresAt: string;
}

export const subscriptionMapper = {
  toSubscriptionResponse(subscription: Subscription): SubscriptionResponse {
    return {
      id: subscription.id,
      platform: subscription.platform,
      billingKey: subscription.billingKey,
      status: subscription.status,
      expiresAt: subscription.expiresAt.toISOString(),
      createdAt: subscription.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: subscription.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  },

  toUserSubscriptionResponse(user: User): UserSubscriptionResponse {
    return {
      id: String(user.id),
      accountTier: user.accountTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? '',
    };
  },
};
