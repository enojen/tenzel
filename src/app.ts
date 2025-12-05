import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { z } from 'zod';

import { createUserModule, DrizzleUserRepository } from './modules/user';
import { exceptionHandler } from './shared/exceptions';
import { checkDatabaseHealth, db, passwordHasher } from './shared/infrastructure';
import { logger } from './shared/logging';

export function createApp() {
  const app = new Elysia()
    .use(exceptionHandler)
    .onRequest(({ request }) => {
      const url = new URL(request.url);
      logger.info({ method: request.method, path: url.pathname }, 'Request received');
    })
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
          ],
        },
      }),
    )
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

    .group('/api/v1', (api) => {
      const userRepo = new DrizzleUserRepository(db);
      const userDeps = { userRepo, passwordHasher };

      return api
        .get(
          '/',
          () => ({
            message: 'API v1 is up',
          }),
          {
            detail: {
              summary: 'API v1 root',
              tags: ['System'],
            },
          },
        )
        .use(createUserModule(userDeps));
    });

  return app;
}
