import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { z } from 'zod';

import { config } from './config';
import {
  AppleStoreService,
  createWebhooksModule,
  DrizzleSubscriptionRepository,
  GoogleStoreService,
} from './modules/subscription';
import { DrizzleUserRepository } from './modules/user';
import { exceptionHandler } from './shared/exceptions';
import { checkDatabaseHealth } from './shared/infrastructure';
import { requestIdMiddleware } from './shared/middleware';

export function createApp() {
  const app = new Elysia()
    .use(requestIdMiddleware)
    .use(
      openapi({
        path: '/openapi',
        mapJsonSchema: {
          zod: z.toJSONSchema,
        },
        documentation: {
          info: {
            title: 'Modular Monolith Starter API',
            version: '1.0.0',
            description: 'Backend Modular Monolith starter built with Bun, Elysia, Drizzle & Zod.',
          },
          tags: [
            { name: 'Health', description: 'Health & readiness checks' },
            { name: 'System', description: 'System-level endpoints' },
            { name: 'Webhooks', description: 'Webhook endpoints for external services' },
          ],
        },
      }),
    )
    .use(exceptionHandler)
    .get('/favicon.ico', ({ redirect }) => {
      return redirect(
        'https://icons.iconarchive.com/icons/tribalmarkings/colorflow/32/umbrella-corp-icon.png',
      );
    })
    .get(
      '/health',
      async () => {
        const dbHealthy = await checkDatabaseHealth();
        return {
          status: dbHealthy ? 'ok' : 'degraded',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          checks: {
            database: dbHealthy ? 'healthy' : 'unhealthy',
          },
        };
      },
      {
        detail: {
          summary: 'Health check',
          tags: ['Health'],
        },
      },
    )
    .get(
      '/api/v1',
      () => {
        return { message: 'API v1 is up' };
      },
      {
        detail: {
          summary: 'API v1 info',
          tags: ['System'],
        },
      },
    )
    .get(
      '/ready',
      async ({ set }) => {
        const dbHealthy = await checkDatabaseHealth();
        if (!dbHealthy) {
          set.status = 503;
          return { ready: false, reason: 'Database unavailable' };
        }
        return { ready: true };
      },
      {
        detail: {
          summary: 'Readiness check',
          tags: ['Health'],
        },
      },
    )
    .group('/api', (api) => {
      const subscriptionRepository = new DrizzleSubscriptionRepository();
      const userRepository = new DrizzleUserRepository();

      const appleConfig = config.subscription.apple;
      const googleConfig = config.subscription.google;

      const hasAppleConfig = !!(
        appleConfig.keyPath &&
        appleConfig.keyId &&
        appleConfig.issuerId &&
        appleConfig.bundleId
      );
      const hasGoogleConfig = !!(googleConfig.packageName && googleConfig.serviceAccountKeyPath);

      const appleStoreService = hasAppleConfig ? new AppleStoreService() : undefined;
      const googleStoreService = hasGoogleConfig ? new GoogleStoreService() : undefined;

      // Only register webhooks module if at least one service is configured
      if (appleStoreService || googleStoreService) {
        return api.use(
          createWebhooksModule({
            subscriptionRepository,
            userRepository,
            appleStoreService,
            googleStoreService,
          }),
        );
      }

      return api;
    });

  return app;
}
