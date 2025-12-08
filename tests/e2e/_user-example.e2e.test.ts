import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';

import { InMemoryUserRepository } from '../mocks/in-memory-_user-example.repository';
import { mockPasswordHasher } from '../mocks/mock-password-hasher';

import type { UserResponse } from '@/modules/_user-example/api/user.schemas';
import type { ErrorResponse } from '@/shared/openapi/error.schema';

import { createUserModule } from '@/modules/_user-example';
import { BaseException } from '@/shared/exceptions/base.exception';

function createTestApp(userRepo: InMemoryUserRepository) {
  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof BaseException) {
        set.status = error.statusCode;
        return {
          error: {
            code: error.code,
            message: error.messageKey,
            timestamp: error.timestamp.toISOString(),
          },
        };
      }
    })
    .group('/api/v1', (api) => {
      return api.use(createUserModule({ userRepo, passwordHasher: mockPasswordHasher }));
    });
}

describe('User API E2E', () => {
  let app: ReturnType<typeof createTestApp>;
  let userRepo: InMemoryUserRepository;

  const validUserPayload = {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
  };

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    app = createTestApp(userRepo);
  });

  afterEach(() => {
    userRepo.clear();
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user and return 201', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserPayload),
        }),
      );

      expect(response.status).toBe(201);

      const body = (await response.json()) as UserResponse;
      expect(body.id).toBe(1);
      expect(body.email).toBe('test@example.com');
      expect(body.name).toBe('Test User');
      expect(body.role).toBe('user');
      expect(body.status).toBe('inactive');
      expect(body.isEmailVerified).toBe(false);
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
      expect(body).not.toHaveProperty('password');
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('should return 409 for duplicate email', async () => {
      await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserPayload),
        }),
      );

      const response = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserPayload),
        }),
      );

      expect(response.status).toBe(409);

      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe('CONFLICT');
    });

    it('should return 422 for invalid email format', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validUserPayload,
            email: 'invalid-email',
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it('should return 422 for short password', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validUserPayload,
            password: 'short',
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it('should return 422 for missing required fields', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );

      expect(response.status).toBe(422);
    });

    it('should accept optional role parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validUserPayload,
            role: 'admin',
          }),
        }),
      );

      expect(response.status).toBe(201);

      const body = (await response.json()) as UserResponse;
      expect(body.role).toBe('admin');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user by id with 200', async () => {
      const createResponse = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserPayload),
        }),
      );
      const created = (await createResponse.json()) as UserResponse;

      const response = await app.handle(
        new Request(`http://localhost/api/v1/users/${created.id}`, {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as UserResponse;
      expect(body.id).toBe(created.id);
      expect(body.email).toBe('test@example.com');
      expect(body.name).toBe('Test User');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/v1/users/999', {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(404);

      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should not expose passwordHash in response', async () => {
      const createResponse = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserPayload),
        }),
      );
      const created = (await createResponse.json()) as UserResponse;

      const response = await app.handle(
        new Request(`http://localhost/api/v1/users/${created.id}`, {
          method: 'GET',
        }),
      );

      const body = (await response.json()) as UserResponse;
      expect(body).not.toHaveProperty('passwordHash');
      expect(body).not.toHaveProperty('password');
    });
  });

  describe('Response format', () => {
    it('should return ISO 8601 formatted dates', async () => {
      const createResponse = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserPayload),
        }),
      );

      const body = (await createResponse.json()) as UserResponse;

      expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should return integer id', async () => {
      const createResponse = await app.handle(
        new Request('http://localhost/api/v1/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validUserPayload),
        }),
      );

      const body = (await createResponse.json()) as UserResponse;

      expect(Number.isInteger(body.id)).toBe(true);
    });
  });
});
