import { z } from 'zod';

import { ACCOUNT_TIERS } from '../domain/value-objects/account-tier.vo';
import { ASSET_TYPES } from '../domain/value-objects/asset-type.vo';

export const accountTierSchema = z.enum([ACCOUNT_TIERS.FREE, ACCOUNT_TIERS.PREMIUM]);

export const userResponseSchema = z.object({
  user: z.object({
    id: z.string().describe('User ID'),
    deviceId: z.string().describe('Device ID'),
    accountTier: accountTierSchema.describe('Account tier'),
    subscriptionExpiresAt: z.string().nullable().describe('Subscription expiration date'),
    createdAt: z.string().describe('Creation timestamp'),
    updatedAt: z.string().describe('Last update timestamp'),
  }),
});

export const deleteUserResponseSchema = z.object({
  success: z.literal(true),
});

export const assetTypeSchema = z.enum([ASSET_TYPES.CURRENCY, ASSET_TYPES.COMMODITY]);

export const trackedAssetSchema = z.object({
  assetType: assetTypeSchema.describe('Asset type'),
  assetCode: z.string().describe('Asset code'),
  addedAt: z.string().describe('Date when asset was added'),
});

export const trackedAssetsResponseSchema = z.object({
  assets: z.array(trackedAssetSchema).describe('List of tracked assets'),
});

export const addTrackedAssetRequestSchema = z.object({
  assetType: assetTypeSchema.describe('Asset type'),
  assetCode: z.string().min(1).describe('Asset code'),
});

export const addTrackedAssetResponseSchema = z.object({
  success: z.literal(true),
  assets: z.array(trackedAssetSchema).describe('Updated list of tracked assets'),
});

export const removeTrackedAssetResponseSchema = z.object({
  success: z.literal(true),
  assets: z.array(trackedAssetSchema).describe('Updated list of tracked assets'),
});

export const removeTrackedAssetQuerySchema = z.object({
  type: assetTypeSchema.describe('Asset type (required to distinguish same-code assets)'),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
export type DeleteUserResponse = z.infer<typeof deleteUserResponseSchema>;
export type TrackedAssetResponse = z.infer<typeof trackedAssetSchema>;
export type TrackedAssetsResponse = z.infer<typeof trackedAssetsResponseSchema>;
export type AddTrackedAssetRequest = z.infer<typeof addTrackedAssetRequestSchema>;
export type AddTrackedAssetResponse = z.infer<typeof addTrackedAssetResponseSchema>;
export type RemoveTrackedAssetResponse = z.infer<typeof removeTrackedAssetResponseSchema>;
