import { SUBSCRIPTION_STATUSES } from '../../domain/value-objects/subscription-status.vo';
import { NoActiveSubscriptionException, SubscriptionExpiredException } from '../../exceptions';

import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import type { RestoreSubscriptionInput, RestoreSubscriptionResult } from '../dto/command-types';
import type { SubscriptionValidatorRegistry } from '../validators/subscription-validator.registry';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { ACCOUNT_TIERS } from '@/modules/user/domain/value-objects/account-tier.vo';

export interface RestoreSubscriptionDeps {
  userId: string;
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  validatorRegistry: SubscriptionValidatorRegistry;
}

export async function restoreSubscriptionCommand(
  input: RestoreSubscriptionInput,
  deps: RestoreSubscriptionDeps,
): Promise<RestoreSubscriptionResult> {
  const { userId, subscriptionRepository, userRepository, validatorRegistry } = deps;

  const existingSubscription = await subscriptionRepository.findByBillingKey(input.billingKey);

  if (!existingSubscription) {
    throw new NoActiveSubscriptionException();
  }

  let expiresAt: Date = existingSubscription.expiresAt;
  let isActive = expiresAt > new Date();

  if (input.receipt) {
    try {
      const validator = validatorRegistry.get(input.platform);

      const { expiresAt: validatedExpiresAt } = await validator.validateReceipt({
        receipt: input.receipt,
        billingKey: input.billingKey,
      });

      expiresAt = validatedExpiresAt;
      isActive = expiresAt > new Date();
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
