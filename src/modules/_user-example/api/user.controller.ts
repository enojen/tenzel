import { Elysia, t } from 'elysia';

import { createUserHandler, type CreateUserDeps } from '../application/commands';
import { getUserByIdQuery, type GetUserByIdDeps } from '../application/queries';

import { createUserRequestSchema, userResponseSchema } from './user.schemas';

import { ErrorResponseSchema } from '@/shared/openapi';

export type UserControllerDeps = CreateUserDeps & GetUserByIdDeps;

export function userController(deps: UserControllerDeps) {
  return new Elysia()
    .post(
      '/',
      async ({ body, set }) => {
        const validated = createUserRequestSchema.parse(body);
        const result = await createUserHandler(validated, deps);
        set.status = 201;
        return result;
      },
      {
        body: createUserRequestSchema,
        response: {
          201: userResponseSchema,
          409: ErrorResponseSchema,
        },
        detail: {
          summary: 'Create user',
          description: 'Create a new user account',
          tags: ['Users'],
        },
      },
    )
    .get(
      '/:id',
      async ({ params }) => {
        return getUserByIdQuery(Number(params.id), deps);
      },
      {
        params: t.Object({ id: t.String() }),
        response: {
          200: userResponseSchema,
          404: ErrorResponseSchema,
        },
        detail: {
          summary: 'Get user by ID',
          description: 'Retrieve a user by their unique identifier',
          tags: ['Users'],
        },
      },
    );
}
