import { Elysia, t } from 'elysia';

import { processWebhookEvent } from '../../application/handlers/webhook-event.handler';
import {
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
} from '../../domain/value-objects/webhook-event-type.vo';
import { WEBHOOK_PLATFORMS } from '../../domain/value-objects/webhook-platform.vo';

import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import type { AppleStoreService } from '../../infrastructure/services/apple-store.service';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { createModuleLogger } from '@/shared/logging';

const logger = createModuleLogger('apple-webhook-controller');

export interface AppleWebhookControllerDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService: AppleStoreService;
}

const APPLE_NOTIFICATION_TYPE_MAP: Record<string, WebhookEventType> = {
  DID_RENEW: WEBHOOK_EVENT_TYPES.DID_RENEW,
  DID_FAIL_TO_RENEW: WEBHOOK_EVENT_TYPES.DID_FAIL_TO_RENEW,
  DID_CHANGE_RENEWAL_STATUS: WEBHOOK_EVENT_TYPES.DID_CHANGE_RENEWAL_STATUS,
  SUBSCRIBED: WEBHOOK_EVENT_TYPES.SUBSCRIBED,
  EXPIRED: WEBHOOK_EVENT_TYPES.EXPIRED,
  GRACE_PERIOD_EXPIRED: WEBHOOK_EVENT_TYPES.GRACE_PERIOD_EXPIRED,
  REFUND: WEBHOOK_EVENT_TYPES.REFUND,
};

export function appleWebhookController(deps: AppleWebhookControllerDeps) {
  return new Elysia().post(
    '/',
    async ({ body, set }) => {
      try {
        const decodedPayload = await deps.appleStoreService.verifyWebhookNotification(
          body.signedPayload,
        );

        const notificationType = decodedPayload.notificationType;
        const transactionInfo = decodedPayload.data?.signedTransactionInfo;

        if (!notificationType || !transactionInfo) {
          logger.warn('Missing notification type or transaction info in Apple webhook');
          set.status = 200;
          return { received: true };
        }

        const eventType = APPLE_NOTIFICATION_TYPE_MAP[notificationType];
        if (!eventType) {
          logger.warn({ notificationType }, 'Unknown Apple notification type');
          set.status = 200;
          return { received: true };
        }

        const eventId = decodedPayload.notificationUUID || crypto.randomUUID();
        const billingKey = transactionInfo;
        const expiresAt = decodedPayload.data?.signedRenewalInfo
          ? new Date(decodedPayload.data.signedRenewalInfo)
          : undefined;

        await processWebhookEvent(
          {
            eventId,
            platform: WEBHOOK_PLATFORMS.APPLE,
            eventType,
            billingKey,
            payload: JSON.stringify(decodedPayload),
            expiresAt,
          },
          {
            subscriptionRepository: deps.subscriptionRepository,
            userRepository: deps.userRepository,
          },
        );

        set.status = 200;
        return { received: true };
      } catch (error) {
        logger.error({ error }, 'Error processing Apple webhook');
        set.status = 200;
        return { received: true };
      }
    },
    {
      body: t.Object({
        signedPayload: t.String(),
      }),
      detail: {
        summary: 'Apple App Store webhook',
        description: 'Receives Apple App Store Server Notifications',
        tags: ['Webhooks'],
      },
    },
  );
}
