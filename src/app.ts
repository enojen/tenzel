import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { z } from 'zod';

import { createUserModule, DrizzleUserRepository } from './modules/user';
import { exceptionHandler } from './shared/exceptions';
import { db, passwordHasher } from './shared/infrastructure';
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
    .get('/favicon.ico', () => {
      return Bun.file('src/public/favicon.ico');
    })
    .get(
      '/health',
      () => ({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
      {
        detail: {
          summary: 'Health check',
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
