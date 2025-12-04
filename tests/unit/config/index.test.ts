import { beforeAll, describe, expect, it } from 'bun:test';

describe('config module', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: 'postgres://localhost:5432/test_db',
      JWT_SECRET: 'test-secret-key-that-is-at-least-32-chars',
      LOG_LEVEL: 'debug',
      OTEL_ENABLED: 'true',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel:4317',
      DEFAULT_LOCALE: 'tr',
    };
  });

  it('should export config with correct structure', async () => {
    const { config } = await import('../../../src/config/index');

    expect(config).toBeDefined();
    expect(config.app).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.security).toBeDefined();
    expect(config.logging).toBeDefined();
    expect(config.observability).toBeDefined();
    expect(config.i18n).toBeDefined();
  });

  it('should have correct app config values', async () => {
    const { config } = await import('../../../src/config/index');

    expect(config.app.nodeEnv).toBe('test');
    expect(config.app.port).toBe(4000);
    expect(config.app.isProduction).toBe(false);
    expect(config.app.isDevelopment).toBe(false);
  });

  it('should have correct database config', async () => {
    const { config } = await import('../../../src/config/index');

    expect(config.database.url).toBe('postgres://localhost:5432/test_db');
    expect(config.database.pool.max).toBe(10);
  });

  it('should have correct security config', async () => {
    const { config } = await import('../../../src/config/index');

    expect(config.security.jwtSecret).toBe('test-secret-key-that-is-at-least-32-chars');
  });

  it('should have correct logging config', async () => {
    const { config } = await import('../../../src/config/index');

    expect(config.logging.level).toBe('debug');
  });

  it('should have correct observability config', async () => {
    const { config } = await import('../../../src/config/index');

    expect(config.observability.otelEnabled).toBe(true);
    expect(config.observability.otelEndpoint).toBe('http://otel:4317');
  });

  it('should have correct i18n config', async () => {
    const { config } = await import('../../../src/config/index');

    expect(config.i18n.defaultLocale).toBe('tr');
  });
});
