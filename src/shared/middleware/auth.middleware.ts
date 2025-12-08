import { Elysia } from 'elysia';

import { UnauthorizedException } from '../exceptions';
import { db } from '../infrastructure';
import { jwtService } from '../infrastructure/jwt';

import type { AuthenticatedUser } from '../types/context';

async function getUserById(userId: string): Promise<AuthenticatedUser | null> {
  const result = await db.execute<{
    id: number;
    deleted_at: Date | null;
  }>(`SELECT id, deleted_at FROM users WHERE id = ${userId} LIMIT 1`);

  const user = result[0];
  if (!user || user.deleted_at !== null) {
    return null;
  }

  return {
    id: String(user.id),
    deviceId: '',
    accountTier: 'free',
    subscriptionExpiresAt: null,
  };
}

export const authMiddleware = new Elysia({ name: 'auth' }).derive(
  { as: 'global' },
  async ({ request }): Promise<{ user: AuthenticatedUser }> => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('errors.unauthorized');
    }

    const token = authHeader.slice(7);
    const payload = await jwtService.verify(token);

    if (!payload) {
      throw new UnauthorizedException('errors.invalid_token');
    }

    const user = await getUserById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('errors.invalid_token');
    }

    user.deviceId = payload.deviceId;

    return { user };
  },
);
