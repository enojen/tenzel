import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';

import { InMemoryUserRepository } from '../../../mocks/user.repository.mock';

import type {
  AddTrackedAssetResponse,
  RemoveTrackedAssetResponse,
  TrackedAssetsResponse,
  UserResponse,
} from '@/modules/user/api/user.schemas';
import type { ErrorResponse } from '@/shared/openapi/error.schema';
import type { AuthenticatedUser } from '@/shared/types/context';

import { userController } from '@/modules/user';
import { UnauthorizedException } from '@/shared/exceptions';
import { BaseException } from '@/shared/exceptions/base.exception';
import { jwtService } from '@/shared/infrastructure/jwt';

function createMockAuthMiddleware(userRepo: InMemoryUserRepository) {
  return (app: Elysia) =>
    app.derive(async ({ request }): Promise<{ user: AuthenticatedUser }> => {
      const authHeader = request.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('errors.unauthorized');
      }

      const token = authHeader.slice(7);
      const payload = await jwtService.verify(token);

      if (!payload) {
        throw new UnauthorizedException('errors.invalid_token');
      }

      const user = await userRepo.findById(payload.userId);

      if (!user || user.isDeleted) {
        throw new UnauthorizedException('errors.invalid_token');
      }

      return {
        user: {
          id: String(user.id),
          deviceId: payload.deviceId,
          accountTier: user.accountTier,
          subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
        },
      };
    });
}

function createTestApp(userRepo: InMemoryUserRepository) {
  const mockAuth = createMockAuthMiddleware(userRepo);

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
    .group('/api/users', (api) => {
      return api.use(mockAuth).use(userController({ userRepository: userRepo }));
    });
}

async function createTestUser(repo: InMemoryUserRepository, options?: { isPremium?: boolean }) {
  const expiresAt = options?.isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

  return repo.create({
    deviceId: 'test-device-123',
    accountTier: options?.isPremium ? 'premium' : 'free',
    subscriptionExpiresAt: expiresAt,
  });
}

async function getAuthHeader(userId: string | number, deviceId: string) {
  const token = await jwtService.sign({ userId: String(userId), deviceId });
  return `Bearer ${token}`;
}

describe('User API E2E', () => {
  let app: ReturnType<typeof createTestApp>;
  let userRepo: InMemoryUserRepository;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    app = createTestApp(userRepo);
  });

  afterEach(() => {
    userRepo.clear();
  });

  describe('GET /api/users/me', () => {
    it('should return current user info with 200', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'GET',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as UserResponse;
      expect(body.user.id).toBe(String(user.id));
      expect(body.user.deviceId).toBe('test-device-123');
      expect(body.user.accountTier).toBe('free');
      expect(body.user.subscriptionExpiresAt).toBeNull();
      expect(body.user.createdAt).toBeDefined();
      expect(body.user.updatedAt).toBeDefined();
    });

    it('should return premium user info', async () => {
      const user = await createTestUser(userRepo, { isPremium: true });
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'GET',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as UserResponse;
      expect(body.user.accountTier).toBe('premium');
      expect(body.user.subscriptionExpiresAt).not.toBeNull();
    });

    it('should return 401 without authorization header', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'GET',
        }),
      );

      expect(response.status).toBe(401);

      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'GET',
          headers: { Authorization: 'Bearer invalid-token' },
        }),
      );

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/users/me', () => {
    it('should hard delete free user', async () => {
      const user = await createTestUser(userRepo, { isPremium: false });
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as { success: true };
      expect(body.success).toBe(true);

      const deletedUser = await userRepo.findById(String(user.id));
      expect(deletedUser).toBeNull();
    });

    it('should soft delete premium user', async () => {
      const user = await createTestUser(userRepo, { isPremium: true });
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as { success: true };
      expect(body.success).toBe(true);

      const deletedUser = await userRepo.findById(String(user.id));
      expect(deletedUser).not.toBeNull();
      expect(deletedUser!.isDeleted).toBe(true);
    });

    it('should return 401 without authorization', async () => {
      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'DELETE',
        }),
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/me/tracked', () => {
    it('should return empty list for user with no tracked assets', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked', {
          method: 'GET',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as TrackedAssetsResponse;
      expect(body.assets).toHaveLength(0);
    });

    it('should return tracked assets', async () => {
      const user = await createTestUser(userRepo);
      await userRepo.addTrackedAsset(String(user.id), { assetType: 'currency', assetCode: 'USD' });
      await userRepo.addTrackedAsset(String(user.id), {
        assetType: 'commodity',
        assetCode: 'GRAM_GOLD',
      });

      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked', {
          method: 'GET',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as TrackedAssetsResponse;
      expect(body.assets).toHaveLength(2);
    });
  });

  describe('POST /api/users/me/tracked', () => {
    it('should add tracked asset', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetType: 'currency',
            assetCode: 'USD',
          }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as AddTrackedAssetResponse;
      expect(body.success).toBe(true);
      expect(body.assets).toHaveLength(1);
      expect(body.assets[0]!.assetCode).toBe('USD');
    });

    it('should be idempotent - adding same asset twice', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      await app.handle(
        new Request('http://localhost/api/users/me/tracked', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assetType: 'currency', assetCode: 'USD' }),
        }),
      );

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assetType: 'currency', assetCode: 'USD' }),
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as AddTrackedAssetResponse;
      expect(body.assets).toHaveLength(1);
    });

    it('should return 404 for invalid asset', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetType: 'currency',
            assetCode: 'INVALID_ASSET',
          }),
        }),
      );

      expect(response.status).toBe(404);

      const body = (await response.json()) as ErrorResponse;
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/users/me/tracked/:assetCode', () => {
    it('should remove tracked asset', async () => {
      const user = await createTestUser(userRepo);
      await userRepo.addTrackedAsset(String(user.id), { assetType: 'currency', assetCode: 'USD' });

      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked/USD?type=currency', {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as RemoveTrackedAssetResponse;
      expect(body.success).toBe(true);
      expect(body.assets).toHaveLength(0);
    });

    it('should be idempotent - removing non-existing asset', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked/USD?type=currency', {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as RemoveTrackedAssetResponse;
      expect(body.success).toBe(true);
    });

    it('should require type query parameter', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked/USD', {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(422);
    });

    it('should only remove matching type', async () => {
      const user = await createTestUser(userRepo);
      await userRepo.addTrackedAsset(String(user.id), { assetType: 'currency', assetCode: 'TEST' });
      await userRepo.addTrackedAsset(String(user.id), {
        assetType: 'commodity',
        assetCode: 'TEST',
      });

      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me/tracked/TEST?type=currency', {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        }),
      );

      expect(response.status).toBe(200);

      const body = (await response.json()) as RemoveTrackedAssetResponse;
      expect(body.assets).toHaveLength(1);
      expect(body.assets[0]!.assetType).toBe('commodity');
    });
  });

  describe('Response format', () => {
    it('should return ISO 8601 formatted dates', async () => {
      const user = await createTestUser(userRepo);
      const authHeader = await getAuthHeader(user.id, user.deviceId);

      const response = await app.handle(
        new Request('http://localhost/api/users/me', {
          method: 'GET',
          headers: { Authorization: authHeader },
        }),
      );

      const body = (await response.json()) as UserResponse;

      expect(body.user.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(body.user.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });
});
