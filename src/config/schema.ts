import { z } from 'zod';

import { DEFAULT_LOCALE, LOCALES } from '../shared/types';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_IDLE_TIMEOUT: z.coerce.number().default(20),
  DATABASE_CONNECT_TIMEOUT: z.coerce.number().default(10),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  DEFAULT_LOCALE: z.enum(LOCALES).default(DEFAULT_LOCALE),
});

export type EnvSchema = z.infer<typeof envSchema>;
