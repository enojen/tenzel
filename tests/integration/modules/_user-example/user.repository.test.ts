import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { InMemoryUserRepository } from '../../../mocks/in-memory-_user-example.repository';

import { User } from '@/modules/_user-example/domain/entities/user.entity';

describe('UserRepository (InMemory)', () => {
  let repository: InMemoryUserRepository;

  const createTestUser = (overrides = {}) => {
    return User.create({
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      status: 'active',
      isEmailVerified: false,
      passwordHash: 'hashed_password',
      ...overrides,
    });
  };

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  afterEach(() => {
    repository.clear();
  });

  describe('create', () => {
    it('should create a new user with generated id', async () => {
      const user = createTestUser();
      const created = await repository.create(user);

      expect(created.id).toBe(1);
      expect(created.email).toBe('test@example.com');
      expect(created.name).toBe('Test User');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const user = createTestUser();
      const created = await repository.create(user);
      const after = new Date();

      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
      expect(created.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(created.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should auto-increment ids for multiple users', async () => {
      const user1 = await repository.create(createTestUser({ email: 'user1@example.com' }));
      const user2 = await repository.create(createTestUser({ email: 'user2@example.com' }));
      const user3 = await repository.create(createTestUser({ email: 'user3@example.com' }));

      expect(user1.id).toBe(1);
      expect(user2.id).toBe(2);
      expect(user3.id).toBe(3);
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const created = await repository.create(createTestUser());
      const found = await repository.findById(created.id as number);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      const found = await repository.findById(999);

      expect(found).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when email matches', async () => {
      await repository.create(createTestUser({ email: 'unique@example.com' }));
      const found = await repository.findByEmail('unique@example.com');

      expect(found).not.toBeNull();
      expect(found!.email).toBe('unique@example.com');
    });

    it('should return null when email not found', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');

      expect(found).toBeNull();
    });

    it('should be case-sensitive for email search', async () => {
      await repository.create(createTestUser({ email: 'Test@Example.com' }));
      const found = await repository.findByEmail('test@example.com');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update existing user', async () => {
      const created = await repository.create(createTestUser());

      const toUpdate = User.create({
        id: created.id,
        email: 'updated@example.com',
        name: 'Updated Name',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        passwordHash: 'new_hash',
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });

      const updated = await repository.update(toUpdate);

      expect(updated.email).toBe('updated@example.com');
      expect(updated.name).toBe('Updated Name');
      expect(updated.role).toBe('admin');
      expect(updated.isEmailVerified).toBe(true);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await repository.create(createTestUser());
      const originalUpdatedAt = created.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const toUpdate = User.create({
        ...created,
        id: created.id,
        email: created.email,
        name: 'Updated Name',
        role: created.role,
        status: created.status,
        isEmailVerified: created.isEmailVerified,
        passwordHash: created.passwordHash,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      });

      const updated = await repository.update(toUpdate);

      expect(updated.updatedAt!.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
    });

    it('should throw error when updating non-existent user', async () => {
      const user = User.create({
        id: 999,
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        status: 'active',
        isEmailVerified: false,
        passwordHash: 'hash',
      });

      expect(repository.update(user)).rejects.toThrow('User not found');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await repository.create(createTestUser({ email: 'user1@example.com', name: 'User 1' }));
      await repository.create(createTestUser({ email: 'user2@example.com', name: 'User 2' }));
      await repository.create(createTestUser({ email: 'user3@example.com', name: 'User 3' }));
      await repository.create(createTestUser({ email: 'user4@example.com', name: 'User 4' }));
      await repository.create(createTestUser({ email: 'user5@example.com', name: 'User 5' }));
    });

    it('should return all users when no options provided', async () => {
      const users = await repository.findAll();

      expect(users).toHaveLength(5);
    });

    it('should respect limit option', async () => {
      const users = await repository.findAll({ limit: 2 });

      expect(users).toHaveLength(2);
    });

    it('should respect offset option', async () => {
      const users = await repository.findAll({ offset: 2 });

      expect(users).toHaveLength(3);
      expect(users[0]?.name).toBe('User 3');
    });

    it('should respect both limit and offset options', async () => {
      const users = await repository.findAll({ limit: 2, offset: 1 });

      expect(users).toHaveLength(2);
      expect(users[0]?.name).toBe('User 2');
      expect(users[1]?.name).toBe('User 3');
    });

    it('should return empty array when offset exceeds total count', async () => {
      const users = await repository.findAll({ offset: 100 });

      expect(users).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all users', async () => {
      await repository.create(createTestUser({ email: 'user1@example.com' }));
      await repository.create(createTestUser({ email: 'user2@example.com' }));

      repository.clear();

      const users = await repository.findAll();
      expect(users).toHaveLength(0);
    });

    it('should reset id counter', async () => {
      await repository.create(createTestUser({ email: 'user1@example.com' }));
      repository.clear();

      const newUser = await repository.create(createTestUser({ email: 'user2@example.com' }));
      expect(newUser.id).toBe(1);
    });
  });

  describe('seed', () => {
    it('should seed repository with predefined users', () => {
      const users = [
        User.create({
          id: 10,
          email: 'seeded1@example.com',
          name: 'Seeded 1',
          role: 'user',
          status: 'active',
          isEmailVerified: false,
          passwordHash: 'hash',
        }),
        User.create({
          id: 20,
          email: 'seeded2@example.com',
          name: 'Seeded 2',
          role: 'admin',
          status: 'active',
          isEmailVerified: true,
          passwordHash: 'hash',
        }),
      ];

      repository.seed(users);

      expect(repository.findById(10)).resolves.not.toBeNull();
      expect(repository.findById(20)).resolves.not.toBeNull();
    });

    it('should update id counter based on seeded data', async () => {
      repository.seed([
        User.create({
          id: 50,
          email: 'seeded@example.com',
          name: 'Seeded',
          role: 'user',
          status: 'active',
          isEmailVerified: false,
          passwordHash: 'hash',
        }),
      ]);

      const newUser = await repository.create(createTestUser({ email: 'new@example.com' }));
      expect(newUser.id).toBe(51);
    });
  });
});
