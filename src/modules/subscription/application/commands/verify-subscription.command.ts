import { SUBSCRIPTION_STATUSES } from '../../domain/value-objects/subscription-status.vo';

import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import type { VerifySubscriptionInput, VerifySubscriptionResult } from '../dto/command-types';
import type { SubscriptionValidatorRegistry } from '../validators/subscription-validator.registry';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { ACCOUNT_TIERS } from '@/modules/user/domain/value-objects/account-tier.vo';

export interface VerifySubscriptionDeps {
  userId: string;
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  validatorRegistry: SubscriptionValidatorRegistry;
}

export async function verifySubscriptionCommand(
  input: VerifySubscriptionInput,
  deps: VerifySubscriptionDeps,
): Promise<VerifySubscriptionResult> {
  const { userId, subscriptionRepository, userRepository, validatorRegistry } = deps;

  const validator = validatorRegistry.get(input.platform);

  const { expiresAt } = await validator.validateReceipt({
    receipt: input.receipt,
    billingKey: input.billingKey,
    productId: input.productId,
  });

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
