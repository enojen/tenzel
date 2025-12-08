import { and, eq, isNull, lt, sql } from 'drizzle-orm';

import { TrackedAsset } from '../../domain/entities/tracked-asset.entity';
import { User } from '../../domain/entities/user.entity';
import { trackedAssetsTable, type DbTrackedAsset } from '../database/tables/tracked-assets.table';
import { usersTable, type DbUser } from '../database/tables/users.table';

import type {
  IUserRepository,
  CreateUserDto,
  UpdateUserDto,
  AddTrackedAssetDto,
} from '../../domain/repositories/user.repository.interface';
import type { AssetType } from '../../domain/value-objects/asset-type.vo';

import { db } from '@/shared/infrastructure/database/drizzle';

export class UserRepository implements IUserRepository {
  constructor(private readonly database: typeof db = db) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.database
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByDeviceId(deviceId: string): Promise<User | null> {
    const result = await this.database
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.deviceId, deviceId), isNull(usersTable.deletedAt)))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const [created] = await this.database
      .insert(usersTable)
      .values({
        deviceId: data.deviceId,
        accountTier: data.accountTier ?? 'free',
        subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create user');
    }

    return this.toDomain(created);
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.accountTier !== undefined) {
      updateData.accountTier = data.accountTier;
    }
    if (data.subscriptionExpiresAt !== undefined) {
      updateData.subscriptionExpiresAt = data.subscriptionExpiresAt;
    }

    const [updated] = await this.database
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();

    if (!updated) {
      throw new Error('Failed to update user');
    }

    return this.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    await this.database
      .update(usersTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, id));
  }

  async hardDelete(id: string): Promise<void> {
    await this.database.delete(usersTable).where(eq(usersTable.id, id));
  }

  async getTrackedAssets(userId: string): Promise<TrackedAsset[]> {
    const result = await this.database
      .select()
      .from(trackedAssetsTable)
      .where(eq(trackedAssetsTable.userId, userId));

    return result.map((row) => this.toTrackedAssetDomain(row));
  }

  async addTrackedAsset(userId: string, asset: AddTrackedAssetDto): Promise<TrackedAsset[]> {
    await this.database
      .insert(trackedAssetsTable)
      .values({
        userId,
        assetType: asset.assetType,
        assetCode: asset.assetCode,
      })
      .onConflictDoNothing();

    return this.getTrackedAssets(userId);
  }

  async removeTrackedAsset(
    userId: string,
    assetCode: string,
    assetType: AssetType,
  ): Promise<TrackedAsset[]> {
    await this.database
      .delete(trackedAssetsTable)
      .where(
        and(
          eq(trackedAssetsTable.userId, userId),
          eq(trackedAssetsTable.assetCode, assetCode),
          eq(trackedAssetsTable.assetType, assetType),
        ),
      );

    return this.getTrackedAssets(userId);
  }

  async findExpiredSoftDeleted(days: number): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.database
      .select()
      .from(usersTable)
      .where(and(sql`${usersTable.deletedAt} IS NOT NULL`, lt(usersTable.deletedAt, cutoffDate)));

    return result.map((row) => this.toDomain(row));
  }

  private toDomain(dbUser: DbUser): User {
    return User.create({
      id: dbUser.id,
      deviceId: dbUser.deviceId,
      accountTier: dbUser.accountTier,
      subscriptionExpiresAt: dbUser.subscriptionExpiresAt,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      deletedAt: dbUser.deletedAt,
    });
  }

  private toTrackedAssetDomain(dbAsset: DbTrackedAsset): TrackedAsset {
    return TrackedAsset.create({
      userId: dbAsset.userId,
      assetType: dbAsset.assetType,
      assetCode: dbAsset.assetCode,
      addedAt: dbAsset.addedAt,
    });
  }
}
