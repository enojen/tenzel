import { config } from '../../config';

import en from './locales/en.json';
import tr from './locales/tr.json';

import type { Locale } from '../types';

export type { Locale };

const locales = {
  en,
  tr,
} as const;

export type TranslationKey = keyof typeof en;

export function parseLocaleFromHeader(acceptLanguage?: string): Locale {
  const headerLang = acceptLanguage?.split(',')[0]?.split('-')[0]?.toLowerCase();
  if (headerLang === 'tr') return 'tr';
  return config.i18n.defaultLocale;
}

export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale?: Locale,
): string {
  const loc = locale ?? config.i18n.defaultLocale;
  const dict = locales[loc] ?? locales[config.i18n.defaultLocale];

  let template: string = dict[key] ?? locales.en[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      template = template.replaceAll(`{${k}}`, String(v));
    }
  }

  return template;
}
