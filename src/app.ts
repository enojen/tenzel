import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { z } from 'zod';

import { CreateUserRequest, UserResponse } from './shared/openapi/example';

export function createApp() {
  const app = new Elysia()
    /**
     *  Global request log
     *  (TASK-016)
     */
    .onRequest(({ request }) => {
      const url = new URL(request.url);
      console.log(`[REQUEST] ${request.method} ${url.pathname}`);
    })

    /**
     * Global error handler
     * TASK-018–021
     */
    .onError(({ error, set }) => {
      console.error('[ERROR]', error);

      if (!set.status || set.status === 200) {
        set.status = 500;
      }

      return {
        error: {
          message: error instanceof Error ? error.message : 'Unexpected error',
          timestamp: new Date().toISOString(),
        },
      };
    })

    /**
     * OpenAPI / Swagger UI
     * Maps Zod v4 schemas to JSON Schema for OpenAPI generation
     */
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

    /**
     * Health check
     */
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

    /**
     * API v1 group
     * .use(createUserModule(deps)) vs.
     */
    .group('/api/v1', (api) =>
      api
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
        .post(
          '/users',
          ({ body }) => ({
            id: crypto.randomUUID(),
            name: body.name,
            email: body.email,
            createdAt: new Date().toISOString(),
          }),
          {
            body: CreateUserRequest,
            response: UserResponse,
            detail: {
              summary: 'Create user',
              description: 'Example endpoint demonstrating Zod-to-OpenAPI schema mapping',
              tags: ['Users'],
            },
          },
        ),
    );

  return app;
}
