import { envSchema } from './schema';

type AppConfig = ReturnType<typeof buildConfig>;

let cachedConfig: AppConfig | null = null;

function buildConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'unknown',
      message: issue.message,
      expected: 'expected' in issue ? issue.expected : undefined,
      received: 'received' in issue ? issue.received : undefined,
    }));

    console.error('\n❌ Environment validation failed:\n');
    errors.forEach(({ path, message, expected, received }) => {
      console.error(`  ${path}:`);
      console.error(`    └─ ${message}`);
      if (expected) console.error(`       Expected: ${expected}`);
      if (received !== undefined) console.error(`       Received: ${received}`);
    });
    console.error('\n📋 Check .env.example for required variables\n');

    throw new Error(`Environment validation failed: ${errors.length} error(s)`);
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
        max: env.DATABASE_POOL_MAX,
        idleTimeout: env.DATABASE_IDLE_TIMEOUT,
        connectTimeout: env.DATABASE_CONNECT_TIMEOUT,
        maxLifetime: 60 * 30,
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

    subscription: {
      apple: {
        keyPath: env.APPLE_KEY_PATH,
        keyId: env.APPLE_KEY_ID,
        issuerId: env.APPLE_ISSUER_ID,
        bundleId: env.APPLE_BUNDLE_ID,
        rootCAG3Path: env.APPLE_ROOT_CA_G3_PATH,
        rootCAG2Path: env.APPLE_ROOT_CA_G2_PATH,
        appId: env.APPLE_APP_ID,
      },
      google: {
        packageName: env.GOOGLE_PACKAGE_NAME,
        serviceAccountKeyPath: env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      },
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
