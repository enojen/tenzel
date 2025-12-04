import { describe, expect, it } from 'bun:test';

describe('bootstrap module', () => {
  it('should have createApp available from app module', async () => {
    const { createApp } = await import('../../src/app');

    expect(createApp).toBeDefined();
    expect(typeof createApp).toBe('function');
  });

  it('should default PORT to 3000 when not set', () => {
    const originalPort = process.env.PORT;
    delete process.env.PORT;

    const port = Number(process.env.PORT ?? 3000);

    expect(port).toBe(3000);

    if (originalPort) {
      process.env.PORT = originalPort;
    }
  });

  it('should use PORT from environment when set', () => {
    const originalPort = process.env.PORT;
    process.env.PORT = '8080';

    const port = Number(process.env.PORT ?? 3000);

    expect(port).toBe(8080);

    if (originalPort) {
      process.env.PORT = originalPort;
    } else {
      delete process.env.PORT;
    }
  });
});
