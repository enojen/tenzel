import { Elysia } from 'elysia';

import { ForbiddenException, UnauthorizedException } from '../exceptions';

import type { AuthenticatedUser } from '../types/context';

export const premiumGuard = (app: Elysia) =>
  app.derive((ctx) => {
    const user = (ctx as unknown as { user?: AuthenticatedUser }).user;
    if (!user) {
      throw new UnauthorizedException('errors.unauthorized');
    }
    if (user.accountTier !== 'premium') {
      throw new ForbiddenException('errors.premium_required');
    }
    return {};
  });
