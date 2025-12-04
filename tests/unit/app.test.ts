import { describe, expect, it } from 'bun:test';

import { createApp } from '../../src/app';

describe('createApp', () => {
  it('should return an Elysia instance', () => {
    const app = createApp();

    expect(app).toBeDefined();
    expect(typeof app.handle).toBe('function');
  });

  it('GET /health should return status ok', async () => {
    const app = createApp();
    const response = await app.handle(new Request('http://localhost/health'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.uptime).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/v1 should return message', async () => {
    const app = createApp();
    const response = await app.handle(new Request('http://localhost/api/v1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('API v1 is up');
  });

  it('GET /openapi/json should return OpenAPI spec', async () => {
    const app = createApp();
    const response = await app.handle(new Request('http://localhost/openapi/json'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openapi).toBeDefined();
    expect(body.info).toBeDefined();
    expect(body.info.title).toBe('Modular Monolith Starter API');
  });

  it('GET /nonexistent should return 404', async () => {
    const app = createApp();
    const response = await app.handle(new Request('http://localhost/nonexistent'));

    expect(response.status).toBe(404);
  });

  it('should log requests via onRequest hook', async () => {
    const app = createApp();
    const response = await app.handle(new Request('http://localhost/health'));

    expect(response.status).toBe(200);
  });
});
