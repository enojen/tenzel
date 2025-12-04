import { describe, expect, it } from 'bun:test';

describe('config module', () => {
  it('should export config with correct structure', async () => {
    const { getConfig } = await import('../../../src/config/index');
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.app).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.security).toBeDefined();
    expect(config.logging).toBeDefined();
    expect(config.observability).toBeDefined();
    expect(config.i18n).toBeDefined();
  });

  it('should have correct app config values', async () => {
    const { getConfig } = await import('../../../src/config/index');
    const config = getConfig();

    expect(config.app.nodeEnv).toBe('test');
    expect(config.app.port).toBe(4000);
    expect(config.app.isProduction).toBe(false);
    expect(config.app.isDevelopment).toBe(false);
  });

  it('should have correct database config', async () => {
    const { getConfig } = await import('../../../src/config/index');
    const config = getConfig();

    expect(config.database.url).toBe('postgres://localhost:5432/test_db');
    expect(config.database.pool.max).toBe(10);
  });

  it('should have correct security config', async () => {
    const { getConfig } = await import('../../../src/config/index');
    const config = getConfig();

    expect(config.security.jwtSecret).toBe('test-secret-key-that-is-at-least-32-chars');
  });

  it('should have correct logging config', async () => {
    const { getConfig } = await import('../../../src/config/index');
    const config = getConfig();

    expect(config.logging.level).toBe('debug');
  });

  it('should have correct observability config', async () => {
    const { getConfig } = await import('../../../src/config/index');
    const config = getConfig();

    expect(config.observability.otelEnabled).toBe(true);
    expect(config.observability.otelEndpoint).toBe('http://otel:4317');
  });

  it('should have correct i18n config', async () => {
    const { getConfig } = await import('../../../src/config/index');
    const config = getConfig();

    expect(config.i18n.defaultLocale).toBe('tr');
  });
});
