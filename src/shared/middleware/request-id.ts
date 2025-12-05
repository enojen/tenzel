import { Elysia } from 'elysia';
import { nanoid } from 'nanoid';

import { logger } from '../logging';

type RequestTracing = {
  requestId: string;
  startTime: number;
};

export const requestIdMiddleware = (app: Elysia) =>
  app
    .derive<RequestTracing>(({ request, set }) => {
      const requestId = request.headers.get('x-request-id') || nanoid();
      const startTime = performance.now();

      set.headers['x-request-id'] = requestId;

      const url = new URL(request.url);
      logger.info({ method: request.method, path: url.pathname, requestId }, 'Request received');

      return { requestId, startTime };
    })
    .onAfterResponse(({ request, set, requestId, startTime }) => {
      const duration = performance.now() - startTime;
      const url = new URL(request.url);
      const status = typeof set.status === 'number' ? set.status : 200;

      const logLevel: 'info' | 'warn' | 'error' =
        status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

      logger[logLevel](
        {
          method: request.method,
          path: url.pathname,
          requestId,
          status,
          durationMs: Math.round(duration * 100) / 100,
        },
        'Request completed',
      );
    });
