import { Elysia } from 'elysia';

import { subscriptionController } from './api/subscription.controller';
import { appleWebhookController } from './api/webhooks/apple-webhook.controller';
import { googleWebhookController } from './api/webhooks/google-webhook.controller';
import {
  SubscriptionValidatorRegistry,
  AppleSubscriptionValidator,
  GoogleSubscriptionValidator,
} from './application/validators';

import type { SubscriptionRepository } from './domain/repositories/subscription.repository.interface';
import type { AppleStoreService } from './infrastructure/services/apple-store.service';
import type { GoogleStoreService } from './infrastructure/services/google-store.service';
import type { UserRepository } from '../user/domain/repositories/user.repository';

import { authMiddleware } from '@/shared/middleware';

export interface SubscriptionModuleDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

export function createSubscriptionModule(deps: SubscriptionModuleDeps) {
  const validatorRegistry = new SubscriptionValidatorRegistry();

  if (deps.appleStoreService) {
    validatorRegistry.register(new AppleSubscriptionValidator(deps.appleStoreService));
  }

  if (deps.googleStoreService) {
    validatorRegistry.register(new GoogleSubscriptionValidator(deps.googleStoreService));
  }

  if (validatorRegistry.getSupportedPlatforms().length === 0) {
    throw new Error(
      'No subscription platforms configured. Please configure at least one store service (Apple or Google).',
    );
  }

  return new Elysia({ prefix: '/subscriptions', tags: ['Subscriptions'] }).use(authMiddleware).use(
    subscriptionController({
      subscriptionRepository: deps.subscriptionRepository,
      userRepository: deps.userRepository,
      validatorRegistry,
    }),
  );
}

export interface WebhooksModuleDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

export function createWebhooksModule(deps: WebhooksModuleDeps) {
  const app = new Elysia({ prefix: '/webhooks', tags: ['Webhooks'] });

  if (deps.appleStoreService) {
    const appleService = deps.appleStoreService;
    app.group('/apple', (group) =>
      group.use(
        appleWebhookController({
          subscriptionRepository: deps.subscriptionRepository,
          userRepository: deps.userRepository,
          appleStoreService: appleService,
        }),
      ),
    );
  }

  if (deps.googleStoreService) {
    const googleService = deps.googleStoreService;
    app.group('/google', (group) =>
      group.use(
        googleWebhookController({
          subscriptionRepository: deps.subscriptionRepository,
          userRepository: deps.userRepository,
          googleStoreService: googleService,
        }),
      ),
    );
  }

  return app;
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
