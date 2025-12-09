import type {
  AddTrackedAssetDto,
  CreateUserDto,
  UserRepository,
  UpdateUserDto,
} from '@/modules/user/domain/repositories/user.repository';
import type { AssetType } from '@/modules/user/domain/value-objects/asset-type.vo';

import { TrackedAsset } from '@/modules/user/domain/entities/tracked-asset.entity';
import { User } from '@/modules/user/domain/entities/user.entity';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private trackedAssets: Map<string, TrackedAsset[]> = new Map();
  private idCounter = 1;

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByDeviceId(deviceId: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.deviceId === deviceId && !user.isDeleted) {
        return user;
      }
    }
    return null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const id = String(this.idCounter++);
    const now = new Date();

    const user = User.create({
      id,
      deviceId: data.deviceId,
      accountTier: data.accountTier ?? 'free',
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    this.users.set(id, user);
    this.trackedAssets.set(id, []);
    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error('User not found');
    }

    const updated = User.create({
      id: String(existing.id),
      deviceId: existing.deviceId,
      accountTier: data.accountTier ?? existing.accountTier,
      subscriptionExpiresAt: existing.subscriptionExpiresAt,
      deletedAt: existing.deletedAt,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.users.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.users.get(id);
    if (existing) {
      existing.softDelete();
    }
  }

  async hardDelete(id: string): Promise<void> {
    this.users.delete(id);
    this.trackedAssets.delete(id);
  }

  async getTrackedAssets(userId: string): Promise<TrackedAsset[]> {
    return this.trackedAssets.get(userId) ?? [];
  }

  async addTrackedAsset(userId: string, asset: AddTrackedAssetDto): Promise<TrackedAsset[]> {
    const assets = this.trackedAssets.get(userId) ?? [];

    const exists = assets.some(
      (a) => a.assetCode === asset.assetCode && a.assetType === asset.assetType,
    );

    if (!exists) {
      const newAsset = TrackedAsset.create({
        userId,
        assetType: asset.assetType,
        assetCode: asset.assetCode,
      });
      assets.push(newAsset);
      this.trackedAssets.set(userId, assets);
    }

    return assets;
  }

  async removeTrackedAsset(
    userId: string,
    assetCode: string,
    assetType: AssetType,
  ): Promise<TrackedAsset[]> {
    const assets = this.trackedAssets.get(userId) ?? [];
    const filtered = assets.filter(
      (a) => !(a.assetCode === assetCode && a.assetType === assetType),
    );
    this.trackedAssets.set(userId, filtered);
    return filtered;
  }

  async findExpiredSoftDeleted(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result: User[] = [];
    for (const user of this.users.values()) {
      if (user.deletedAt && user.deletedAt < cutoffDate) {
        result.push(user);
      }
    }
    return result;
  }

  clear(): void {
    this.users.clear();
    this.trackedAssets.clear();
    this.idCounter = 1;
  }

  seed(users: User[]): void {
    for (const user of users) {
      const id = String(user.id);
      this.users.set(id, user);
      this.trackedAssets.set(id, []);
      const numId = parseInt(id, 10);
      if (!isNaN(numId) && numId >= this.idCounter) {
        this.idCounter = numId + 1;
      }
    }
  }
}
