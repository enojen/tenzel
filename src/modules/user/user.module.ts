import { Elysia } from 'elysia';

/**
 * User Module Factory
 *
 * Creates an Elysia instance with all user-related routes.
 * Will be registered in app.ts under /api/v1/users
 */
export function createUserModule() {
  return new Elysia({ prefix: '/users', tags: ['Users'] });
}
