import { describe, expect, it } from 'bun:test';

import { User, type UserProps } from '@/modules/user/domain/entities/user.entity';

const createUserProps = (overrides: Partial<UserProps> = {}): UserProps => ({
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  status: 'active',
  isEmailVerified: false,
  passwordHash: 'hashed_password',
  ...overrides,
});

describe('User Entity', () => {
  describe('create', () => {
    it('should create a user with provided props', () => {
      const props = createUserProps();
      const user = User.create(props);

      expect(user.id).toBe(props.id);
      expect(user.email).toBe(props.email);
      expect(user.name).toBe(props.name);
      expect(user.role).toBe(props.role);
      expect(user.status).toBe(props.status);
      expect(user.isEmailVerified).toBe(props.isEmailVerified);
      expect(user.passwordHash).toBe(props.passwordHash);
    });

    it('should set createdAt and updatedAt if not provided', () => {
      const before = new Date();
      const user = User.create(createUserProps());
      const after = new Date();

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(user.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided createdAt and updatedAt', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-01');
      const user = User.create(createUserProps({ createdAt, updatedAt }));

      expect(user.createdAt).toEqual(createdAt);
      expect(user.updatedAt).toEqual(updatedAt);
    });
  });

  describe('verifyEmail', () => {
    it('should set isEmailVerified to true', () => {
      const user = User.create(createUserProps({ isEmailVerified: false }));

      user.verifyEmail();

      expect(user.isEmailVerified).toBe(true);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const user = User.create(createUserProps({ updatedAt: oldDate }));

      const before = new Date();
      user.verifyEmail();
      const after = new Date();

      expect(user.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('changePassword', () => {
    it('should update passwordHash', () => {
      const user = User.create(createUserProps({ passwordHash: 'old_hash' }));
      const newHash = 'new_password_hash';

      user.changePassword(newHash);

      expect(user.passwordHash).toBe(newHash);
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const user = User.create(createUserProps({ updatedAt: oldDate }));

      const before = new Date();
      user.changePassword('new_hash');
      const after = new Date();

      expect(user.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('activate', () => {
    it('should set status to active', () => {
      const user = User.create(createUserProps({ status: 'inactive' }));

      user.activate();

      expect(user.status).toBe('active');
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const user = User.create(createUserProps({ status: 'inactive', updatedAt: oldDate }));

      const before = new Date();
      user.activate();
      const after = new Date();

      expect(user.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('deactivate', () => {
    it('should set status to inactive', () => {
      const user = User.create(createUserProps({ status: 'active' }));

      user.deactivate();

      expect(user.status).toBe('inactive');
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const user = User.create(createUserProps({ status: 'active', updatedAt: oldDate }));

      const before = new Date();
      user.deactivate();
      const after = new Date();

      expect(user.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('suspend', () => {
    it('should set status to suspended', () => {
      const user = User.create(createUserProps({ status: 'active' }));

      user.suspend();

      expect(user.status).toBe('suspended');
    });

    it('should update updatedAt timestamp', () => {
      const oldDate = new Date('2024-01-01');
      const user = User.create(createUserProps({ status: 'active', updatedAt: oldDate }));

      const before = new Date();
      user.suspend();
      const after = new Date();

      expect(user.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getters', () => {
    it('should return correct email', () => {
      const user = User.create(createUserProps({ email: 'user@test.com' }));
      expect(user.email).toBe('user@test.com');
    });

    it('should return correct name', () => {
      const user = User.create(createUserProps({ name: 'John Doe' }));
      expect(user.name).toBe('John Doe');
    });

    it('should return correct role', () => {
      const user = User.create(createUserProps({ role: 'admin' }));
      expect(user.role).toBe('admin');
    });

    it('should return correct status', () => {
      const user = User.create(createUserProps({ status: 'suspended' }));
      expect(user.status).toBe('suspended');
    });

    it('should return correct isEmailVerified', () => {
      const user = User.create(createUserProps({ isEmailVerified: true }));
      expect(user.isEmailVerified).toBe(true);
    });

    it('should return correct passwordHash', () => {
      const user = User.create(createUserProps({ passwordHash: 'secret_hash' }));
      expect(user.passwordHash).toBe('secret_hash');
    });
  });
});
