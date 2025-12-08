import type { TrackedAsset } from '../entities/tracked-asset.entity';
import type { User } from '../entities/user.entity';
import type { AccountTier } from '../value-objects/account-tier.vo';
import type { AssetType } from '../value-objects/asset-type.vo';

export interface CreateUserDto {
  deviceId: string;
  accountTier?: AccountTier;
  subscriptionExpiresAt?: Date | null;
}

export interface UpdateUserDto {
  accountTier?: AccountTier;
  subscriptionExpiresAt?: Date | null;
}

export interface AddTrackedAssetDto {
  assetType: AssetType;
  assetCode: string;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByDeviceId(deviceId: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;

  getTrackedAssets(userId: string): Promise<TrackedAsset[]>;
  addTrackedAsset(userId: string, asset: AddTrackedAssetDto): Promise<TrackedAsset[]>;
  removeTrackedAsset(
    userId: string,
    assetCode: string,
    assetType: AssetType,
  ): Promise<TrackedAsset[]>;

  findExpiredSoftDeleted(days: number): Promise<User[]>;
}
