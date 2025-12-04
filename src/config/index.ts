import { envSchema } from './schema';

type AppConfig = ReturnType<typeof buildConfig>;

let cachedConfig: AppConfig | null = null;

function buildConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error);
    throw new Error('Environment validation failed');
  }

  const env = parsed.data;

  return {
    app: {
      nodeEnv: env.NODE_ENV,
      isProduction: env.NODE_ENV === 'production',
      isDevelopment: env.NODE_ENV === 'development',
      port: env.PORT,
    },

    database: {
      url: env.DATABASE_URL,
      pool: {
        max: 10,
      },
    },

    security: {
      jwtSecret: env.JWT_SECRET,
    },

    logging: {
      level: env.LOG_LEVEL,
    },

    observability: {
      otelEnabled: env.OTEL_ENABLED,
      otelEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317',
    },

    i18n: {
      defaultLocale: env.DEFAULT_LOCALE,
    },
  };
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }
  return cachedConfig;
}

export function _resetConfigForTesting(): void {
  cachedConfig = null;
}

export const config: AppConfig = getConfig();
