import { SUBSCRIPTION_PLATFORMS } from '../../domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '../../domain/value-objects/subscription-status.vo';
import { InvalidReceiptException } from '../../exceptions';

import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import type { AppleStoreService } from '../../infrastructure/services/apple-store.service';
import type { GoogleStoreService } from '../../infrastructure/services/google-store.service';
import type { VerifySubscriptionInput, VerifySubscriptionResult } from '../dto/command-types';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { ACCOUNT_TIERS } from '@/modules/user/domain/value-objects/account-tier.vo';

export interface VerifySubscriptionDeps {
  userId: string;
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService: AppleStoreService;
  googleStoreService: GoogleStoreService;
}

export async function verifySubscriptionCommand(
  input: VerifySubscriptionInput,
  deps: VerifySubscriptionDeps,
): Promise<VerifySubscriptionResult> {
  const { userId, subscriptionRepository, userRepository, appleStoreService, googleStoreService } =
    deps;

  let expiresAt: Date;

  try {
    if (input.platform === SUBSCRIPTION_PLATFORMS.IOS) {
      const transactionInfo = await appleStoreService.validateReceipt(input.receipt);

      if (!transactionInfo.expiresDate) {
        throw new Error('No expiration date in transaction');
      }

      expiresAt = new Date(transactionInfo.expiresDate);
    } else {
      const subscriptionData = await googleStoreService.validateReceipt(input.billingKey);

      const lineItem = subscriptionData.lineItems?.[0];
      if (!lineItem?.expiryTime) {
        throw new Error('No expiration time in subscription data');
      }

      expiresAt = new Date(lineItem.expiryTime);
    }
  } catch (_error) {
    throw new InvalidReceiptException();
  }

  const existingSubscription = await subscriptionRepository.findByBillingKey(input.billingKey);

  let subscription;
  if (existingSubscription) {
    subscription = await subscriptionRepository.update(existingSubscription.id, {
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      expiresAt,
    });
  } else {
    subscription = await subscriptionRepository.create({
      userId,
      platform: input.platform,
      billingKey: input.billingKey,
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      expiresAt,
    });
  }

  const user = await userRepository.update(userId, {
    accountTier: ACCOUNT_TIERS.PREMIUM,
    subscriptionExpiresAt: expiresAt,
  });

  return { user, subscription };
}
