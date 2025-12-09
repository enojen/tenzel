import { SUBSCRIPTION_PLATFORMS } from '../../domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '../../domain/value-objects/subscription-status.vo';
import { NoActiveSubscriptionException, SubscriptionExpiredException } from '../../exceptions';

import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import type { AppleStoreService } from '../../infrastructure/services/apple-store.service';
import type { GoogleStoreService } from '../../infrastructure/services/google-store.service';
import type { RestoreSubscriptionInput, RestoreSubscriptionResult } from '../dto/command-types';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { ACCOUNT_TIERS } from '@/modules/user/domain/value-objects/account-tier.vo';

export interface RestoreSubscriptionDeps {
  userId: string;
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

export async function restoreSubscriptionCommand(
  input: RestoreSubscriptionInput,
  deps: RestoreSubscriptionDeps,
): Promise<RestoreSubscriptionResult> {
  const { userId, subscriptionRepository, userRepository, appleStoreService, googleStoreService } =
    deps;

  const existingSubscription = await subscriptionRepository.findByBillingKey(input.billingKey);

  if (!existingSubscription) {
    throw new NoActiveSubscriptionException();
  }

  let expiresAt: Date = existingSubscription.expiresAt;
  let isActive = expiresAt > new Date();

  if (input.receipt) {
    try {
      if (input.platform === SUBSCRIPTION_PLATFORMS.IOS) {
        if (!appleStoreService) {
          throw new Error('Apple Store integration is not configured');
        }

        const transactionInfo = await appleStoreService.validateReceipt(input.receipt);
        if (transactionInfo.expiresDate) {
          expiresAt = new Date(transactionInfo.expiresDate);
          isActive = expiresAt > new Date();
        }
      } else {
        if (!googleStoreService) {
          throw new Error('Google Play integration is not configured');
        }

        const subscriptionData = await googleStoreService.validateReceipt(input.billingKey);
        const lineItem = subscriptionData.lineItems?.[0];
        if (lineItem?.expiryTime) {
          expiresAt = new Date(lineItem.expiryTime);
          isActive = expiresAt > new Date();
        }
      }
    } catch (_error) {
      isActive = false;
    }
  }

  if (!isActive) {
    throw new SubscriptionExpiredException();
  }

  const subscription = await subscriptionRepository.update(existingSubscription.id, {
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    expiresAt,
  });

  const user = await userRepository.update(userId, {
    accountTier: ACCOUNT_TIERS.PREMIUM,
    subscriptionExpiresAt: expiresAt,
  });

  return { restored: true, user, subscription };
}
