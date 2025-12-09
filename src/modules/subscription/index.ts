import { Elysia } from 'elysia';

import { subscriptionController } from './api/subscription.controller';

import type { SubscriptionRepository } from './domain/repositories/subscription.repository.interface';
import type { AppleStoreService } from './infrastructure/services/apple-store.service';
import type { GoogleStoreService } from './infrastructure/services/google-store.service';
import type { UserRepository } from '../user/domain/repositories/user.repository';

export interface SubscriptionModuleDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService: AppleStoreService;
  googleStoreService: GoogleStoreService;
}

export function createSubscriptionModule(deps: SubscriptionModuleDeps) {
  return new Elysia({ prefix: '/subscriptions', tags: ['Subscriptions'] }).use(
    subscriptionController({
      subscriptionRepository: deps.subscriptionRepository,
      userRepository: deps.userRepository,
      appleStoreService: deps.appleStoreService,
      googleStoreService: deps.googleStoreService,
    }),
  );
}

export { Subscription, type SubscriptionProps } from './domain/entities/subscription.entity';
export { WebhookLog, type WebhookLogProps } from './domain/entities/webhook-log.entity';
export {
  SUBSCRIPTION_PLATFORMS,
  type SubscriptionPlatform,
} from './domain/value-objects/subscription-platform.vo';
export {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from './domain/value-objects/subscription-status.vo';
export {
  WEBHOOK_PLATFORMS,
  type WebhookPlatform,
} from './domain/value-objects/webhook-platform.vo';
export {
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
} from './domain/value-objects/webhook-event-type.vo';

export type {
  SubscriptionRepository,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreateWebhookLogDto,
} from './domain/repositories/subscription.repository.interface';

export {
  SubscriptionRepository as DrizzleSubscriptionRepository,
  AppleStoreService,
  GoogleStoreService,
  type GoogleNotification,
} from './infrastructure';

export * from './api/subscription.schemas';
export {
  subscriptionController,
  type SubscriptionControllerDeps,
} from './api/subscription.controller';
export { InvalidReceiptException, SubscriptionNotFoundException } from './exceptions';
