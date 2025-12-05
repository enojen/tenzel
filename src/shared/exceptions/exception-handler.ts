import { Elysia } from 'elysia';

import { config } from '../../config';
import { parseLocaleFromHeader, t } from '../i18n';
import { logger } from '../logging';

import { BaseException } from './base.exception';

export const exceptionHandler = new Elysia({ name: 'exception-handler' })
  .derive({ as: 'global' }, ({ headers }) => ({
    locale: parseLocaleFromHeader(headers['accept-language']),
  }))
  .onError({ as: 'global' }, (context) => {
    const { error, set, locale } = context;
    const requestId = (context as { requestId?: string }).requestId;

    if (error instanceof BaseException) {
      const message = t(error.messageKey, error.messageParams, locale);
      set.status = error.statusCode;

      const logLevel =
        error.statusCode >= 500 ? 'error' : error.statusCode >= 400 ? 'warn' : 'info';
      logger[logLevel](
        {
          requestId,
          code: error.code,
          statusCode: error.statusCode,
          messageKey: error.messageKey,
          details: error.details,
        },
        `Exception: ${message}`,
      );

      return {
        error: {
          code: error.code,
          message,
          timestamp: error.timestamp.toISOString(),
        },
      };
    }

    const errorLog: Record<string, unknown> = {
      requestId,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
    };

    if (config.app.isDevelopment && error instanceof Error && error.stack) {
      errorLog.stack = error.stack;
    }

    logger.error(errorLog, 'Unhandled exception');

    set.status = 500;
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: t('errors.internal', undefined, locale),
        timestamp: new Date().toISOString(),
      },
    };
  });
