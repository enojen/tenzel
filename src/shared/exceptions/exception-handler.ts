import { Elysia } from 'elysia';

import { config } from '../../config';
import { parseLocaleFromHeader, t } from '../i18n';
import { logger } from '../logging';

import { BaseException } from './base.exception';
import { BadRequestException, NotFoundException } from './http.exception';

function mapElysiaError(code: string | number): BaseException | null {
  if (typeof code !== 'string') return null;
  switch (code) {
    case 'NOT_FOUND':
      return new NotFoundException();
    case 'VALIDATION':
      return new BadRequestException('errors.validation');
    default:
      return null;
  }
}

export const exceptionHandler = new Elysia({ name: 'exception-handler' })
  .derive({ as: 'global' }, ({ headers }) => ({
    locale: parseLocaleFromHeader(headers['accept-language']),
  }))
  .onError({ as: 'global' }, (context) => {
    const { error, set, locale, code } = context;
    const requestId = (context as { requestId?: string }).requestId;

    let handledError = error;
    if (!(error instanceof BaseException)) {
      const mapped = mapElysiaError(code);
      if (mapped) handledError = mapped;
    }

    if (handledError instanceof BaseException) {
      const message = t(handledError.messageKey, handledError.messageParams, locale);
      set.status = handledError.statusCode;

      const logLevel =
        handledError.statusCode >= 500 ? 'error' : handledError.statusCode >= 400 ? 'warn' : 'info';
      logger[logLevel](
        {
          requestId,
          code: handledError.code,
          statusCode: handledError.statusCode,
          messageKey: handledError.messageKey,
          details: handledError.details,
        },
        `Exception: ${message}`,
      );

      return {
        error: {
          code: handledError.code,
          message,
          timestamp: handledError.timestamp.toISOString(),
        },
      };
    }

    const errorLog: Record<string, unknown> = {
      requestId,
      errorName: handledError instanceof Error ? handledError.name : 'Unknown',
      errorMessage: handledError instanceof Error ? handledError.message : String(handledError),
    };

    if (config.app.isDevelopment && handledError instanceof Error && handledError.stack) {
      errorLog.stack = handledError.stack;
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
