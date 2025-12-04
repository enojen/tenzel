import { describe, expect, it } from 'bun:test';

import { config } from '@/config';
import { parseLocaleFromHeader, t } from '@/shared/i18n';

const defaultLocale = config.i18n.defaultLocale;

describe('i18n', () => {
  describe('parseLocaleFromHeader', () => {
    it('should return "tr" for Turkish locale header', () => {
      expect(parseLocaleFromHeader('tr-TR,en;q=0.9')).toBe('tr');
    });

    it('should return "tr" for simple tr header', () => {
      expect(parseLocaleFromHeader('tr')).toBe('tr');
    });

    it('should return default locale for English header', () => {
      expect(parseLocaleFromHeader('en-US')).toBe(defaultLocale);
    });

    it('should return default locale for undefined header', () => {
      expect(parseLocaleFromHeader(undefined)).toBe(defaultLocale);
    });

    it('should return default locale for unsupported locale', () => {
      expect(parseLocaleFromHeader('fr-FR')).toBe(defaultLocale);
    });

    it('should return default locale for empty string', () => {
      expect(parseLocaleFromHeader('')).toBe(defaultLocale);
    });
  });

  describe('t', () => {
    it('should return English translation when locale is en', () => {
      expect(t('errors.not_found', undefined, 'en')).toBe('Resource not found');
    });

    it('should return Turkish translation when locale is tr', () => {
      expect(t('errors.not_found', undefined, 'tr')).toBe('Kaynak bulunamadi');
    });

    it('should interpolate params in English translation', () => {
      const result = t('errors.user.already_exists', { email: 'test@example.com' }, 'en');
      expect(result).toBe('User with email test@example.com already exists');
    });

    it('should interpolate params in Turkish translation', () => {
      const result = t('errors.user.already_exists', { email: 'test@example.com' }, 'tr');
      expect(result).toBe('test@example.com adresine sahip kullanici zaten mevcut');
    });

    it('should handle numeric params', () => {
      const result = t('errors.user.already_exists', { email: 123 }, 'en');
      expect(result).toBe('User with email 123 already exists');
    });

    it('should return all standard English translations', () => {
      expect(t('errors.bad_request', undefined, 'en')).toBe('Invalid request');
      expect(t('errors.unauthorized', undefined, 'en')).toBe('Authentication required');
      expect(t('errors.forbidden', undefined, 'en')).toBe('Access denied');
      expect(t('errors.conflict', undefined, 'en')).toBe('Resource already exists');
      expect(t('errors.validation', undefined, 'en')).toBe('Validation failed');
      expect(t('errors.internal', undefined, 'en')).toBe('An unexpected error occurred');
    });

    it('should return all standard Turkish translations', () => {
      expect(t('errors.bad_request', undefined, 'tr')).toBe('Gecersiz istek');
      expect(t('errors.unauthorized', undefined, 'tr')).toBe('Kimlik dogrulamasi gerekli');
      expect(t('errors.forbidden', undefined, 'tr')).toBe('Erisim engellendi');
      expect(t('errors.conflict', undefined, 'tr')).toBe('Kaynak zaten mevcut');
      expect(t('errors.validation', undefined, 'tr')).toBe('Dogrulama hatasi');
      expect(t('errors.internal', undefined, 'tr')).toBe('Beklenmedik bir hata olustu');
    });
  });
});
