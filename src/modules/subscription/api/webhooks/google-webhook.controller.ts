import { Elysia, t } from 'elysia';

import { processWebhookEvent } from '../../application/handlers/webhook-event.handler';
import {
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
} from '../../domain/value-objects/webhook-event-type.vo';
import { WEBHOOK_PLATFORMS } from '../../domain/value-objects/webhook-platform.vo';

import type { SubscriptionRepository } from '../../domain/repositories/subscription.repository.interface';
import type { GoogleStoreService } from '../../infrastructure/services/google-store.service';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { createModuleLogger } from '@/shared/logging';

const logger = createModuleLogger('google-webhook-controller');

export interface GoogleWebhookControllerDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  googleStoreService: GoogleStoreService;
}

const GOOGLE_NOTIFICATION_TYPE_MAP: Record<number, WebhookEventType> = {
  1: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RECOVERED,
  2: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED,
  3: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CANCELED,
  4: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PURCHASED,
  6: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_IN_GRACE_PERIOD,
  7: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_ON_HOLD,
  12: WEBHOOK_EVENT_TYPES.SUBSCRIPTION_EXPIRED,
};

export function googleWebhookController(deps: GoogleWebhookControllerDeps) {
  return new Elysia().post(
    '/',
    async ({ body, set }) => {
      try {
        if (!body.message?.data) {
          logger.warn('Missing message data in Google Pub/Sub webhook');
          set.status = 200;
          return { received: true };
        }

        const notification = deps.googleStoreService.decodePubSubMessage(body.message.data);

        if (notification.testNotification) {
          logger.info('Received Google test notification');
          set.status = 200;
          return { received: true };
        }

        const subscriptionNotification = notification.subscriptionNotification;
        if (!subscriptionNotification) {
          logger.warn('Missing subscription notification in Google webhook');
          set.status = 200;
          return { received: true };
        }

        const notificationType = subscriptionNotification.notificationType;
        const eventType = GOOGLE_NOTIFICATION_TYPE_MAP[notificationType];

        if (!eventType) {
          logger.warn({ notificationType }, 'Unknown Google notification type');
          set.status = 200;
          return { received: true };
        }

        const eventId = body.message.messageId || crypto.randomUUID();
        const billingKey = subscriptionNotification.purchaseToken;

        let expiresAt: Date | undefined;
        if (notificationType === 2 || notificationType === 4) {
          try {
            const subscriptionData = await deps.googleStoreService.validateReceipt(billingKey);
            const lineItem = subscriptionData.lineItems?.[0];
            if (lineItem?.expiryTime) {
              expiresAt = new Date(lineItem.expiryTime);
            }
          } catch (error) {
            logger.warn({ error }, 'Failed to fetch expiry time from Google Play');
          }
        }

        await processWebhookEvent(
          {
            eventId,
            platform: WEBHOOK_PLATFORMS.GOOGLE,
            eventType,
            billingKey,
            payload: JSON.stringify(notification),
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
        logger.error({ error }, 'Error processing Google webhook');
        set.status = 200;
        return { received: true };
      }
    },
    {
      body: t.Object({
        message: t.Object({
          data: t.String(),
          messageId: t.Optional(t.String()),
        }),
      }),
      detail: {
        summary: 'Google Play webhook',
        description: 'Receives Google Play Real-time Developer Notifications via Pub/Sub',
        tags: ['Webhooks'],
      },
    },
  );
}
