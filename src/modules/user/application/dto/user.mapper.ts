import type { TrackedAsset } from '../../domain/entities/tracked-asset.entity';
import type { User } from '../../domain/entities/user.entity';
import type { AccountTier } from '../../domain/value-objects/account-tier.vo';
import type { AssetType } from '../../domain/value-objects/asset-type.vo';

export interface UserResponseDto {
  id: string;
  deviceId: string;
  accountTier: AccountTier;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackedAssetResponseDto {
  assetType: AssetType;
  assetCode: string;
  addedAt: string;
}

export const userMapper = {
  toUserResponse(user: User): UserResponseDto {
    return {
      id: String(user.id),
      deviceId: user.deviceId,
      accountTier: user.accountTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      createdAt: user.createdAt!.toISOString(),
      updatedAt: user.updatedAt!.toISOString(),
    };
  },

  toTrackedAssetResponse(asset: TrackedAsset): TrackedAssetResponseDto {
    return {
      assetType: asset.assetType,
      assetCode: asset.assetCode,
      addedAt: asset.addedAt.toISOString(),
    };
  },

  toTrackedAssetsResponse(assets: TrackedAsset[]): TrackedAssetResponseDto[] {
    return assets.map((asset) => this.toTrackedAssetResponse(asset));
  },
};
