import { Elysia } from 'elysia';

import { restoreSubscriptionCommand } from '../application/commands/restore-subscription.command';
import { verifySubscriptionCommand } from '../application/commands/verify-subscription.command';
import { subscriptionMapper } from '../application/dto/subscription.mapper';

import {
  verifySubscriptionRequestSchema,
  verifySubscriptionResponseSchema,
  restoreSubscriptionRequestSchema,
  restoreSubscriptionResponseSchema,
} from './subscription.schemas';

import type { SubscriptionRepository } from '../domain/repositories/subscription.repository.interface';
import type { AppleStoreService } from '../infrastructure/services/apple-store.service';
import type { GoogleStoreService } from '../infrastructure/services/google-store.service';
import type { UserRepository } from '@/modules/user/domain/repositories/user.repository';

import { authMiddleware } from '@/shared/middleware';

export interface SubscriptionControllerDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

export function subscriptionController(deps: SubscriptionControllerDeps) {
  return new Elysia()
    .use(authMiddleware)
    .post(
      '/verify',
      async ({ user, body }) => {
        const result = await verifySubscriptionCommand(
          {
            platform: body.platform,
            receipt: body.receipt,
            billingKey: body.billingKey,
            productId: body.productId,
          },
          {
            userId: user.id,
            subscriptionRepository: deps.subscriptionRepository,
            userRepository: deps.userRepository,
            appleStoreService: deps.appleStoreService,
            googleStoreService: deps.googleStoreService,
          },
        );

        return {
          success: true as const,
          user: subscriptionMapper.toUserSubscriptionResponse(result.user),
          subscription: subscriptionMapper.toSubscriptionResponse(result.subscription),
        };
      },
      {
        body: verifySubscriptionRequestSchema,
        response: {
          200: verifySubscriptionResponseSchema,
        },
        detail: {
          summary: 'Verify and activate subscription',
          description:
            'Validates a purchase receipt with Apple/Google and creates or updates the subscription',
          tags: ['Subscriptions'],
        },
      },
    )
    .post(
      '/restore',
      async ({ user, body }) => {
        const result = await restoreSubscriptionCommand(
          {
            platform: body.platform,
            billingKey: body.billingKey,
            receipt: body.receipt,
          },
          {
            userId: user.id,
            subscriptionRepository: deps.subscriptionRepository,
            userRepository: deps.userRepository,
            appleStoreService: deps.appleStoreService,
            googleStoreService: deps.googleStoreService,
          },
        );

        return {
          success: true as const,
          restored: true,
          user: subscriptionMapper.toUserSubscriptionResponse(result.user),
          subscription: subscriptionMapper.toSubscriptionResponse(result.subscription),
        };
      },
      {
        body: restoreSubscriptionRequestSchema,
        response: {
          200: restoreSubscriptionResponseSchema,
        },
        detail: {
          summary: 'Restore subscription',
          description: 'Restores a subscription by billing key and links it to the current user',
          tags: ['Subscriptions'],
        },
      },
    );
}
