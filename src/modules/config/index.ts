import { Elysia } from 'elysia';

import { configController } from './api/config.controller';

export function createConfigModule() {
  return new Elysia({ prefix: '/config', tags: ['Config'] }).use(configController());
}

export { subscriptionResponseSchema, defaultAssetsResponseSchema } from './api/config.schemas';
export type { SubscriptionResponse, DefaultAssetsResponse } from './api/config.schemas';
