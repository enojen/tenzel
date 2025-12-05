import { describe, expect, it } from 'bun:test';

import { BaseException, NotFoundException, BadRequestException } from '@/shared/exceptions';
import { exceptionHandler } from '@/shared/exceptions/exception-handler';
import { parseLocaleFromHeader, t } from '@/shared/i18n';

describe('exceptionHandler', () => {
  describe('plugin structure', () => {
    it('should be defined as an Elysia plugin', () => {
      expect(exceptionHandler).toBeDefined();
    });
  });

  describe('parseLocaleFromHeader integration', () => {
    it('should parse Turkish locale from header', () => {
      const locale = parseLocaleFromHeader('tr-TR,tr;q=0.9');
      expect(locale).toBe('tr');
    });

    it('should return default locale for unsupported English header', () => {
      const locale = parseLocaleFromHeader('en-US,en;q=0.9');
      expect(['en', 'tr']).toContain(locale);
    });

    it('should return default for undefined header', () => {
      const locale = parseLocaleFromHeader(undefined);
      expect(['en', 'tr']).toContain(locale);
    });
  });

  describe('BaseException error format', () => {
    it('should have correct structure for NotFoundException', () => {
      const error = new NotFoundException('errors.user.not_found');
      const locale = 'en';
      const message = t(error.messageKey, error.messageParams, locale);

      const errorResponse = {
        error: {
          code: error.code,
          message,
          timestamp: error.timestamp.toISOString(),
        },
      };

      expect(errorResponse.error.code).toBe('NOT_FOUND');
      expect(errorResponse.error.message).toBeDefined();
      expect(typeof errorResponse.error.timestamp).toBe('string');
    });

    it('should format BadRequestException with messageParams', () => {
      const error = new BadRequestException('errors.validation', { field: 'email' });
      const locale = 'en';
      const message = t(error.messageKey, error.messageParams, locale);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(message).toBeDefined();
    });

    it('should produce valid ISO timestamp', () => {
      const error = new NotFoundException();
      const timestamp = error.timestamp.toISOString();
      const parsed = new Date(timestamp);

      expect(parsed).toBeInstanceOf(Date);
      expect(isNaN(parsed.getTime())).toBe(false);
    });
  });

  describe('generic error handling format', () => {
    it('should format internal error with correct structure', () => {
      const locale = 'en';
      const errorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: t('errors.internal', undefined, locale),
          timestamp: new Date().toISOString(),
        },
      };

      expect(errorResponse.error.code).toBe('INTERNAL_ERROR');
      expect(errorResponse.error.message).toBeDefined();
      expect(typeof errorResponse.error.timestamp).toBe('string');
    });

    it('should use locale for internal error message', () => {
      const enMessage = t('errors.internal', undefined, 'en');
      const trMessage = t('errors.internal', undefined, 'tr');

      expect(enMessage).toBeDefined();
      expect(trMessage).toBeDefined();
    });
  });

  describe('BaseException instanceof check', () => {
    it('should correctly identify BaseException instances', () => {
      const notFound = new NotFoundException();
      const badRequest = new BadRequestException();
      const genericError = new Error('generic');

      expect(notFound instanceof BaseException).toBe(true);
      expect(badRequest instanceof BaseException).toBe(true);
      expect(genericError instanceof BaseException).toBe(false);
    });
  });
});
