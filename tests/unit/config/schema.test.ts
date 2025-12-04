import { describe, expect, it } from 'bun:test';

import { envSchema } from '../../../src/config/schema';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: 'postgres://localhost:5432/test',
  JWT_SECRET: 'a'.repeat(32),
  LOG_LEVEL: 'info',
  OTEL_ENABLED: 'false',
  DEFAULT_LOCALE: 'en',
};

describe('envSchema', () => {
  it('should parse valid environment variables', () => {
    const result = envSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.PORT).toBe(3000);
      expect(result.data.DATABASE_URL).toBe('postgres://localhost:5432/test');
    }
  });

  it('should fail when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _databaseUrl, ...envWithoutDb } = validEnv;
    const result = envSchema.safeParse(envWithoutDb);

    expect(result.success).toBe(false);
  });

  it('should fail when JWT_SECRET is missing', () => {
    const { JWT_SECRET: _jwtSecret, ...envWithoutJwt } = validEnv;
    const result = envSchema.safeParse(envWithoutJwt);

    expect(result.success).toBe(false);
  });

  it('should fail when JWT_SECRET is less than 32 characters', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      JWT_SECRET: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('should use default values when optional fields are missing', () => {
    const minimalEnv = {
      DATABASE_URL: 'postgres://localhost:5432/test',
      JWT_SECRET: 'a'.repeat(32),
    };

    const result = envSchema.safeParse(minimalEnv);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.PORT).toBe(3000);
      expect(result.data.LOG_LEVEL).toBe('info');
      expect(result.data.OTEL_ENABLED).toBe(false);
      expect(result.data.DEFAULT_LOCALE).toBe('en');
    }
  });

  it('should coerce PORT from string to number', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      PORT: '8080',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(8080);
      expect(typeof result.data.PORT).toBe('number');
    }
  });

  it('should transform OTEL_ENABLED to boolean', () => {
    const resultTrue = envSchema.safeParse({
      ...validEnv,
      OTEL_ENABLED: 'true',
    });

    const resultFalse = envSchema.safeParse({
      ...validEnv,
      OTEL_ENABLED: 'false',
    });

    expect(resultTrue.success).toBe(true);
    expect(resultFalse.success).toBe(true);
    if (resultTrue.success && resultFalse.success) {
      expect(resultTrue.data.OTEL_ENABLED).toBe(true);
      expect(resultFalse.data.OTEL_ENABLED).toBe(false);
    }
  });

  it('should fail for invalid NODE_ENV', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('should fail for invalid LOG_LEVEL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      LOG_LEVEL: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('should fail for invalid DEFAULT_LOCALE', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DEFAULT_LOCALE: 'fr',
    });

    expect(result.success).toBe(false);
  });

  it('should accept production NODE_ENV', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'production',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('production');
    }
  });

  it('should accept optional OTEL_EXPORTER_OTLP_ENDPOINT', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://localhost:4317');
    }
  });
});
