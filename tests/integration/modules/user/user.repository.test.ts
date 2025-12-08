import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { InMemoryUserRepository } from '../../../mocks/user.repository.mock';

import { User } from '@/modules/user/domain/entities/user.entity';

describe('UserRepository (InMemory)', () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  afterEach(() => {
    repository.clear();
  });

  describe('create', () => {
    it('should create a new user with generated id', async () => {
      const created = await repository.create({
        deviceId: 'device-123',
        accountTier: 'free',
      });

      expect(created.id).toBe('1');
      expect(created.deviceId).toBe('device-123');
      expect(created.accountTier).toBe('free');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const created = await repository.create({ deviceId: 'device-123' });
      const after = new Date();

      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
      expect(created.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should auto-increment ids for multiple users', async () => {
      const user1 = await repository.create({ deviceId: 'device-1' });
      const user2 = await repository.create({ deviceId: 'device-2' });
      const user3 = await repository.create({ deviceId: 'device-3' });

      expect(user1.id).toBe('1');
      expect(user2.id).toBe('2');
      expect(user3.id).toBe('3');
    });

    it('should create premium user with subscription expiration', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const created = await repository.create({
        deviceId: 'device-123',
        accountTier: 'premium',
        subscriptionExpiresAt: expiresAt,
      });

      expect(created.accountTier).toBe('premium');
      expect(created.subscriptionExpiresAt).toEqual(expiresAt);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const created = await repository.create({ deviceId: 'device-123' });
      const found = await repository.findById(String(created.id));

      expect(found).not.toBeNull();
      expect(String(found!.id)).toBe(String(created.id));
      expect(found!.deviceId).toBe('device-123');
    });

    it('should return null when user not found', async () => {
      const found = await repository.findById('999');
      expect(found).toBeNull();
    });
  });

  describe('findByDeviceId', () => {
    it('should return user when device id matches', async () => {
      await repository.create({ deviceId: 'unique-device' });
      const found = await repository.findByDeviceId('unique-device');

      expect(found).not.toBeNull();
      expect(found!.deviceId).toBe('unique-device');
    });

    it('should return null when device id not found', async () => {
      const found = await repository.findByDeviceId('nonexistent');
      expect(found).toBeNull();
    });

    it('should not return soft deleted users', async () => {
      const created = await repository.create({ deviceId: 'device-to-delete' });
      await repository.softDelete(String(created.id));

      const found = await repository.findByDeviceId('device-to-delete');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update existing user', async () => {
      const created = await repository.create({ deviceId: 'device-123', accountTier: 'free' });

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const updated = await repository.update(String(created.id), {
        accountTier: 'premium',
        subscriptionExpiresAt: expiresAt,
      });

      expect(updated.accountTier).toBe('premium');
      expect(updated.subscriptionExpiresAt).toEqual(expiresAt);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repository.create({ deviceId: 'device-123' });
      const originalUpdatedAt = created.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.update(String(created.id), { accountTier: 'premium' });

      expect(updated.updatedAt!.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
    });

    it('should throw error when updating non-existent user', async () => {
      expect(repository.update('999', { accountTier: 'premium' })).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('softDelete', () => {
    it('should mark user as deleted', async () => {
      const created = await repository.create({ deviceId: 'device-123' });

      await repository.softDelete(String(created.id));

      const found = await repository.findById(String(created.id));
      expect(found).not.toBeNull();
      expect(found!.isDeleted).toBe(true);
    });
  });

  describe('hardDelete', () => {
    it('should permanently remove user', async () => {
      const created = await repository.create({ deviceId: 'device-123' });

      await repository.hardDelete(String(created.id));

      const found = await repository.findById(String(created.id));
      expect(found).toBeNull();
    });

    it('should remove associated tracked assets', async () => {
      const created = await repository.create({ deviceId: 'device-123' });
      await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'USD',
      });

      await repository.hardDelete(String(created.id));

      const assets = await repository.getTrackedAssets(String(created.id));
      expect(assets).toHaveLength(0);
    });
  });

  describe('getTrackedAssets', () => {
    it('should return empty array for user with no tracked assets', async () => {
      const created = await repository.create({ deviceId: 'device-123' });

      const assets = await repository.getTrackedAssets(String(created.id));

      expect(assets).toHaveLength(0);
    });

    it('should return tracked assets for user', async () => {
      const created = await repository.create({ deviceId: 'device-123' });
      await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'USD',
      });
      await repository.addTrackedAsset(String(created.id), {
        assetType: 'commodity',
        assetCode: 'GRAM_GOLD',
      });

      const assets = await repository.getTrackedAssets(String(created.id));

      expect(assets).toHaveLength(2);
    });
  });

  describe('addTrackedAsset', () => {
    it('should add asset to user tracking list', async () => {
      const created = await repository.create({ deviceId: 'device-123' });

      const assets = await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'USD',
      });

      expect(assets).toHaveLength(1);
      expect(assets[0]!.assetCode).toBe('USD');
      expect(assets[0]!.assetType).toBe('currency');
    });

    it('should be idempotent - adding same asset twice', async () => {
      const created = await repository.create({ deviceId: 'device-123' });

      await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'USD',
      });
      const assets = await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'USD',
      });

      expect(assets).toHaveLength(1);
    });

    it('should allow same code with different types', async () => {
      const created = await repository.create({ deviceId: 'device-123' });

      await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'TEST',
      });
      const assets = await repository.addTrackedAsset(String(created.id), {
        assetType: 'commodity',
        assetCode: 'TEST',
      });

      expect(assets).toHaveLength(2);
    });
  });

  describe('removeTrackedAsset', () => {
    it('should remove asset from user tracking list', async () => {
      const created = await repository.create({ deviceId: 'device-123' });
      await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'USD',
      });

      const assets = await repository.removeTrackedAsset(String(created.id), 'USD', 'currency');

      expect(assets).toHaveLength(0);
    });

    it('should be idempotent - removing non-existing asset', async () => {
      const created = await repository.create({ deviceId: 'device-123' });

      const assets = await repository.removeTrackedAsset(String(created.id), 'USD', 'currency');

      expect(assets).toHaveLength(0);
    });

    it('should only remove matching type', async () => {
      const created = await repository.create({ deviceId: 'device-123' });
      await repository.addTrackedAsset(String(created.id), {
        assetType: 'currency',
        assetCode: 'TEST',
      });
      await repository.addTrackedAsset(String(created.id), {
        assetType: 'commodity',
        assetCode: 'TEST',
      });

      const assets = await repository.removeTrackedAsset(String(created.id), 'TEST', 'currency');

      expect(assets).toHaveLength(1);
      expect(assets[0]!.assetType).toBe('commodity');
    });
  });

  describe('findExpiredSoftDeleted', () => {
    it('should return users soft deleted more than specified days ago', async () => {
      const user = await repository.create({ deviceId: 'device-123' });

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const foundUser = await repository.findById(String(user.id));
      if (foundUser) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (foundUser as any).props.deletedAt = oldDate;
      }

      const expired = await repository.findExpiredSoftDeleted(90);

      expect(expired).toHaveLength(1);
    });

    it('should not return recently soft deleted users', async () => {
      const user = await repository.create({ deviceId: 'device-123' });
      await repository.softDelete(String(user.id));

      const expired = await repository.findExpiredSoftDeleted(90);

      expect(expired).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all users', async () => {
      await repository.create({ deviceId: 'device-1' });
      await repository.create({ deviceId: 'device-2' });

      repository.clear();

      const user1 = await repository.findById('1');
      const user2 = await repository.findById('2');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
    });

    it('should reset id counter', async () => {
      await repository.create({ deviceId: 'device-1' });
      repository.clear();

      const newUser = await repository.create({ deviceId: 'device-2' });
      expect(newUser.id).toBe('1');
    });
  });

  describe('seed', () => {
    it('should seed repository with predefined users', async () => {
      const users = [
        User.create({
          id: '10',
          deviceId: 'seeded-device-1',
          accountTier: 'free',
          subscriptionExpiresAt: null,
          deletedAt: null,
        }),
        User.create({
          id: '20',
          deviceId: 'seeded-device-2',
          accountTier: 'premium',
          subscriptionExpiresAt: new Date(),
          deletedAt: null,
        }),
      ];

      repository.seed(users);

      const found1 = await repository.findById('10');
      const found2 = await repository.findById('20');

      expect(found1).not.toBeNull();
      expect(found2).not.toBeNull();
    });

    it('should update id counter based on seeded data', async () => {
      repository.seed([
        User.create({
          id: '50',
          deviceId: 'seeded-device',
          accountTier: 'free',
          subscriptionExpiresAt: null,
          deletedAt: null,
        }),
      ]);

      const newUser = await repository.create({ deviceId: 'new-device' });
      expect(newUser.id).toBe('51');
    });
  });
});
