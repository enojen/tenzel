import { describe, expect, it } from 'bun:test';

import { User } from '@/modules/user/domain/entities/user.entity';

interface TestUserProps {
  id?: string;
  deviceId: string;
  accountTier: 'free' | 'premium';
  subscriptionExpiresAt: Date | null;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const createUserProps = (overrides: Partial<TestUserProps> = {}): TestUserProps => ({
  id: 'user-1',
  deviceId: 'device-123',
  accountTier: 'free',
  subscriptionExpiresAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('User Entity', () => {
  describe('create', () => {
    it('should create a user with provided props', () => {
      const props = createUserProps();
      const user = User.create(props);

      expect(user.id).toBe(props.id!);
      expect(user.deviceId).toBe(props.deviceId);
      expect(user.accountTier).toBe(props.accountTier);
      expect(user.subscriptionExpiresAt).toBe(props.subscriptionExpiresAt);
      expect(user.deletedAt).toBe(props.deletedAt);
    });

    it('should set createdAt and updatedAt if not provided', () => {
      const before = new Date();
      const user = User.create({
        deviceId: 'device-123',
        accountTier: 'free',
        subscriptionExpiresAt: null,
        deletedAt: null,
      });
      const after = new Date();

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should generate id if not provided', () => {
      const user = User.create({
        deviceId: 'device-123',
        accountTier: 'free',
        subscriptionExpiresAt: null,
        deletedAt: null,
      });

      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('string');
    });
  });

  describe('isPremium', () => {
    it('should return false for free tier', () => {
      const user = User.create(createUserProps({ accountTier: 'free' }));
      expect(user.isPremium).toBe(false);
    });

    it('should return false for premium tier without expiration date', () => {
      const user = User.create(
        createUserProps({
          accountTier: 'premium',
          subscriptionExpiresAt: null,
        }),
      );
      expect(user.isPremium).toBe(false);
    });

    it('should return false for premium tier with expired subscription', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const user = User.create(
        createUserProps({
          accountTier: 'premium',
          subscriptionExpiresAt: pastDate,
        }),
      );
      expect(user.isPremium).toBe(false);
    });

    it('should return true for premium tier with active subscription', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const user = User.create(
        createUserProps({
          accountTier: 'premium',
          subscriptionExpiresAt: futureDate,
        }),
      );
      expect(user.isPremium).toBe(true);
    });
  });

  describe('isDeleted', () => {
    it('should return false when deletedAt is null', () => {
      const user = User.create(createUserProps({ deletedAt: null }));
      expect(user.isDeleted).toBe(false);
    });

    it('should return true when deletedAt is set', () => {
      const user = User.create(createUserProps({ deletedAt: new Date() }));
      expect(user.isDeleted).toBe(true);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp', () => {
      const user = User.create(createUserProps({ deletedAt: null }));
      const before = new Date();

      user.softDelete();

      expect(user.deletedAt).not.toBeNull();
      expect(user.deletedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.isDeleted).toBe(true);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const user = User.create(createUserProps({ updatedAt: oldDate }));

      const before = new Date();
      user.softDelete();

      expect(user.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('restore', () => {
    it('should clear deletedAt timestamp', () => {
      const user = User.create(createUserProps({ deletedAt: new Date() }));

      user.restore();

      expect(user.deletedAt).toBeNull();
      expect(user.isDeleted).toBe(false);
    });
  });

  describe('upgradeToPremium', () => {
    it('should set accountTier to premium and expiresAt', () => {
      const user = User.create(createUserProps({ accountTier: 'free' }));
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      user.upgradeToPremium(expiresAt);

      expect(user.accountTier).toBe('premium');
      expect(user.subscriptionExpiresAt).toEqual(expiresAt);
    });
  });

  describe('downgradeToFree', () => {
    it('should set accountTier to free and clear expiresAt', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const user = User.create(
        createUserProps({
          accountTier: 'premium',
          subscriptionExpiresAt: futureDate,
        }),
      );

      user.downgradeToFree();

      expect(user.accountTier).toBe('free');
      expect(user.subscriptionExpiresAt).toBeNull();
    });
  });

  describe('extendSubscription', () => {
    it('should update subscriptionExpiresAt', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const newExpiresAt = new Date();
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 2);

      const user = User.create(
        createUserProps({
          accountTier: 'premium',
          subscriptionExpiresAt: futureDate,
        }),
      );

      user.extendSubscription(newExpiresAt);

      expect(user.subscriptionExpiresAt).toEqual(newExpiresAt);
    });
  });
});
