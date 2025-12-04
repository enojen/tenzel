import { Elysia } from 'elysia';

import { parseLocaleFromHeader, t } from '../i18n';

import { BaseException } from './base.exception';

export const exceptionHandler = new Elysia({ name: 'exception-handler' })
  .derive(({ headers }) => ({
    locale: parseLocaleFromHeader(headers['accept-language']),
  }))
  .onError(({ error, set, locale }) => {
    if (error instanceof BaseException) {
      const message = t(error.messageKey, error.messageParams, locale);
      set.status = error.statusCode;

      return {
        error: {
          code: error.code,
          message,
          timestamp: error.timestamp.toISOString(),
        },
      };
    }

    set.status = 500;
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: t('errors.internal', undefined, locale),
        timestamp: new Date().toISOString(),
      },
    };
  });
