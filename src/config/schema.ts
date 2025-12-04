import { z } from '@/shared/openapi/zod-openapi';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  OTEL_ENABLED: z.coerce.boolean().default(false),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),

  DEFAULT_LOCALE: z.enum(['en', 'tr']).default('en'),
});

export type EnvSchema = z.infer<typeof envSchema>;
