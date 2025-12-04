import { Elysia } from 'elysia';

import { userController, type UserControllerDeps } from './api/user.controller';

export function createUserModule(deps: UserControllerDeps) {
  return new Elysia({ prefix: '/users', tags: ['Users'] }).use(userController(deps));
}
