import { SUBSCRIPTION_STATUSES } from '../../domain/value-objects/subscription-status.vo';
import { WEBHOOK_EVENT_TYPES } from '../../domain/value-objects/webhook-event-type.vo';
import { SubscriptionNotFoundException } from '../../exceptions';

import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import type { WebhookEventType } from '../../domain/value-objects/webhook-event-type.vo';
import type { WebhookPlatform } from '../../domain/value-objects/webhook-platform.vo';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { ACCOUNT_TIERS } from '@/modules/user/domain/value-objects/account-tier.vo';
import { createModuleLogger } from '@/shared/logging';

const logger = createModuleLogger('webhook-event-handler');

export interface ProcessWebhookEventParams {
  eventId: string;
  platform: WebhookPlatform;
  eventType: WebhookEventType;
  billingKey: string;
  payload: string;
  expiresAt?: Date;
}

export interface ProcessWebhookEventDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
}

export interface ProcessWebhookEventResult {
  alreadyProcessed: boolean;
}

export async function processWebhookEvent(
  params: ProcessWebhookEventParams,
  deps: ProcessWebhookEventDeps,
): Promise<ProcessWebhookEventResult> {
  const { eventId, platform, eventType, billingKey, payload, expiresAt } = params;
  const { subscriptionRepository, userRepository } = deps;

  const existingLog = await subscriptionRepository.findWebhookLog(eventId);
  if (existingLog) {
    logger.info({ eventId, platform, eventType }, 'Webhook event already processed (idempotent)');
    return { alreadyProcessed: true };
  }

  const subscription = await subscriptionRepository.findByBillingKey(billingKey);
  if (!subscription) {
    logger.warn({ billingKey, eventType }, 'Subscription not found for webhook event');
    throw new SubscriptionNotFoundException();
  }

  logger.info(
    { eventId, platform, eventType, billingKey, subscriptionId: subscription.id },
    'Processing webhook event',
  );

  switch (eventType) {
    case WEBHOOK_EVENT_TYPES.DID_RENEW:
    case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED:
      if (expiresAt) {
        await subscriptionRepository.update(subscription.id, {
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt,
        });
        await userRepository.update(subscription.userId, {
          accountTier: ACCOUNT_TIERS.PREMIUM,
          subscriptionExpiresAt: expiresAt,
        });
      }
      break;

    case WEBHOOK_EVENT_TYPES.DID_FAIL_TO_RENEW:
    case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_IN_GRACE_PERIOD:
      await subscriptionRepository.update(subscription.id, {
        status: SUBSCRIPTION_STATUSES.GRACE_PERIOD,
      });
      break;

    case WEBHOOK_EVENT_TYPES.DID_CHANGE_RENEWAL_STATUS:
    case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CANCELED:
      await subscriptionRepository.update(subscription.id, {
        status: SUBSCRIPTION_STATUSES.CANCELED,
      });
      break;

    case WEBHOOK_EVENT_TYPES.EXPIRED:
    case WEBHOOK_EVENT_TYPES.GRACE_PERIOD_EXPIRED:
    case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_EXPIRED:
      await subscriptionRepository.update(subscription.id, {
        status: SUBSCRIPTION_STATUSES.EXPIRED,
      });
      await userRepository.update(subscription.userId, {
        accountTier: ACCOUNT_TIERS.FREE,
        subscriptionExpiresAt: null,
      });
      break;

    case WEBHOOK_EVENT_TYPES.REFUND:
      await userRepository.update(subscription.userId, {
        accountTier: ACCOUNT_TIERS.FREE,
        subscriptionExpiresAt: null,
      });
      break;

    case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RECOVERED:
      await subscriptionRepository.update(subscription.id, {
        status: SUBSCRIPTION_STATUSES.ACTIVE,
      });
      if (subscription.expiresAt > new Date()) {
        await userRepository.update(subscription.userId, {
          accountTier: ACCOUNT_TIERS.PREMIUM,
          subscriptionExpiresAt: subscription.expiresAt,
        });
      }
      break;

    case WEBHOOK_EVENT_TYPES.SUBSCRIBED:
    case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PURCHASED:
      if (expiresAt) {
        await subscriptionRepository.update(subscription.id, {
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt,
        });
        await userRepository.update(subscription.userId, {
          accountTier: ACCOUNT_TIERS.PREMIUM,
          subscriptionExpiresAt: expiresAt,
        });
      }
      break;

    default:
      logger.warn({ eventType }, 'Unhandled webhook event type');
  }

  await subscriptionRepository.createWebhookLog({
    eventId,
    platform,
    eventType,
    billingKey,
    payload,
  });

  logger.info({ eventId, eventType }, 'Webhook event processed successfully');

  return { alreadyProcessed: false };
}
