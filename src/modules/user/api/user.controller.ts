import { Elysia } from 'elysia';

import { addTrackedAssetCommand } from '../application/commands/add-tracked-asset.command';
import { deleteUserCommand } from '../application/commands/delete-user.command';
import { removeTrackedAssetCommand } from '../application/commands/remove-tracked-asset.command';
import { userMapper } from '../application/dto/user.mapper';
import { getCurrentUserQuery } from '../application/queries/get-current-user.query';
import { getTrackedAssetsQuery } from '../application/queries/get-tracked-assets.query';

import {
  addTrackedAssetRequestSchema,
  addTrackedAssetResponseSchema,
  deleteUserResponseSchema,
  removeTrackedAssetQuerySchema,
  removeTrackedAssetResponseSchema,
  trackedAssetsResponseSchema,
  userResponseSchema,
} from './user.schemas';

import type { UserRepository } from '../domain/repositories/user.repository';
import type { AssetType } from '../domain/value-objects/asset-type.vo';

import { authMiddleware } from '@/shared/middleware';

export interface UserControllerDeps {
  userRepository: UserRepository;
}

export function userController(deps: UserControllerDeps) {
  return new Elysia()
    .use(authMiddleware)
    .get(
      '/me',
      async ({ user }) => {
        const result = await getCurrentUserQuery(user.id, {
          userRepository: deps.userRepository,
        });

        return { user: userMapper.toUserResponse(result) };
      },
      {
        response: {
          200: userResponseSchema,
        },
        detail: {
          summary: 'Get current user',
          description: 'Returns the authenticated user profile',
          tags: ['Users'],
        },
      },
    )
    .delete(
      '/me',
      async ({ user }) => {
        await deleteUserCommand(user.id, {
          userRepository: deps.userRepository,
        });

        return { success: true as const };
      },
      {
        response: {
          200: deleteUserResponseSchema,
        },
        detail: {
          summary: 'Delete current user',
          description:
            'Deletes the authenticated user. Free users are hard deleted, premium users are soft deleted (preserved for 90 days).',
          tags: ['Users'],
        },
      },
    )
    .get(
      '/me/tracked',
      async ({ user }) => {
        const assets = await getTrackedAssetsQuery(user.id, {
          userRepository: deps.userRepository,
        });

        return { assets: userMapper.toTrackedAssetsResponse(assets) };
      },
      {
        response: {
          200: trackedAssetsResponseSchema,
        },
        detail: {
          summary: 'Get tracked assets',
          description: "Returns the user's list of tracked assets",
          tags: ['Users'],
        },
      },
    )
    .post(
      '/me/tracked',
      async ({ user, body }) => {
        const assets = await addTrackedAssetCommand(
          user.id,
          {
            assetType: body.assetType as AssetType,
            assetCode: body.assetCode,
          },
          { userRepository: deps.userRepository },
        );

        return {
          success: true as const,
          assets: userMapper.toTrackedAssetsResponse(assets),
        };
      },
      {
        body: addTrackedAssetRequestSchema,
        response: {
          200: addTrackedAssetResponseSchema,
        },
        detail: {
          summary: 'Add tracked asset',
          description: 'Adds an asset to the user tracking list. Operation is idempotent.',
          tags: ['Users'],
        },
      },
    )
    .delete(
      '/me/tracked/:assetCode',
      async ({ user, params, query }) => {
        const assets = await removeTrackedAssetCommand(user.id, params.assetCode, query.type, {
          userRepository: deps.userRepository,
        });

        return {
          success: true as const,
          assets: userMapper.toTrackedAssetsResponse(assets),
        };
      },
      {
        query: removeTrackedAssetQuerySchema,
        response: {
          200: removeTrackedAssetResponseSchema,
        },
        detail: {
          summary: 'Remove tracked asset',
          description:
            'Removes an asset from the user tracking list. Operation is idempotent. The type query parameter is required to distinguish assets with the same code.',
          tags: ['Users'],
        },
      },
    );
}
