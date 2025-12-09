# MHSB-071: User Infrastructure Integration Tests [TEST]

## Description

Create integration tests for the real `DrizzleUserRepository` implementation with actual PostgreSQL database. These tests will validate database queries, transactions, constraints, and edge cases that can only be caught with real DB interactions.

**Current Gap:** Only in-memory mock repository is tested. Real Drizzle ORM queries, SQL constraints, and transaction behavior are untested.

## Dependencies

- MHSB-022 (User Repository implementation)
- Docker PostgreSQL test database

## Files to Create

- `tests/integration/modules/user/infrastructure/drizzle-user.repository.test.ts`

## Test Database Setup

Tests should use a dedicated test database with automatic cleanup:

```typescript
import { db } from '@/shared/infrastructure/database/drizzle';
import { sql } from 'drizzle-orm';

beforeAll(async () => {
  // Ensure test database is clean
  await db.execute(sql`TRUNCATE TABLE tracked_assets CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
});

afterEach(async () => {
  // Clean up after each test
  await db.execute(sql`TRUNCATE TABLE tracked_assets CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
});
```

## Test Coverage

### CRUD Operations

**create():**

- Success: Insert user with all fields
- Success: Auto-generate UUID for id
- Success: Auto-set createdAt and updatedAt
- Error: Duplicate deviceId (unique constraint)
- Error: Invalid data types

**findById():**

- Success: Find existing user
- Success: Include soft-deleted user
- Null: User doesn't exist
- Null: Invalid UUID format

**findByDeviceId():**

- Success: Find existing user
- Null: User doesn't exist
- Null: Soft-deleted user (excluded by default)

**update():**

- Success: Update accountTier
- Success: Update subscriptionExpiresAt
- Success: Auto-update updatedAt timestamp
- Error: User doesn't exist

**softDelete():**

- Success: Set deletedAt timestamp
- Success: Preserve user data
- Success: Cascade to tracked_assets (verify)
- Error: User doesn't exist

**hardDelete():**

- Success: Remove user completely
- Success: Cascade delete tracked_assets
- Verify: Related records removed
- Error: User doesn't exist

### Tracked Assets Operations

**addTrackedAsset():**

- Success: Insert new asset
- Success: Idempotent (onConflictDoNothing)
- Success: Return updated asset list
- Error: Foreign key violation (invalid userId)
- Error: Unique constraint (userId, assetType, assetCode)

**removeTrackedAsset():**

- Success: Remove existing asset
- Success: Idempotent (removing non-existent)
- Success: Return updated asset list
- Verify: Other assets unaffected

**getTrackedAssets():**

- Success: Empty array for user with no assets
- Success: Array of assets ordered by addedAt
- Success: Only assets for specified user
- Null handling: Deleted users

### Database Constraints

**Unique Constraints:**

- Test deviceId uniqueness
- Test (userId, assetType, assetCode) composite uniqueness

**Foreign Keys:**

- Test cascade delete from users to tracked_assets
- Test invalid userId in tracked_assets

**Timestamps:**

- Verify createdAt is auto-set
- Verify updatedAt is auto-set and updates on change
- Verify deletedAt is set on soft delete

### Soft Delete Filtering

**findByDeviceId():**

- Excludes soft-deleted users
- Includes active users only

**Query Behavior:**

- Soft-deleted users still accessible via findById()
- Soft-deleted users excluded from findByDeviceId()

### Expired Soft Deleted Users

**findExpiredSoftDeleted():**

- Return users deleted > X days ago
- Only soft-deleted users (deletedAt NOT NULL)
- Ordered by deletedAt ascending

### Transaction Behavior (Future)

Once MHSB-074 is implemented:

- Test transaction commit
- Test transaction rollback on error
- Test concurrent transactions
- Test deadlock scenarios

## Test Pattern Example

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { db } from '@/shared/infrastructure/database/drizzle';
import { sql } from 'drizzle-orm';
import { UserRepository } from '@/modules/user/infrastructure';
import { User } from '@/modules/user/domain';

describe('DrizzleUserRepository Integration', () => {
  let userRepo: UserRepository;

  beforeAll(async () => {
    userRepo = new UserRepository(db);
    await db.execute(sql`TRUNCATE TABLE tracked_assets CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  });

  afterEach(async () => {
    await db.execute(sql`TRUNCATE TABLE tracked_assets CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  });

  describe('create', () => {
    it('should insert user with auto-generated id', async () => {
      const user = User.create({
        deviceId: 'test-device-1',
        accountTier: 'free',
        subscriptionExpiresAt: null,
        deletedAt: null,
      });

      const created = await userRepo.create(user);

      expect(created.id).toBeDefined();
      expect(created.deviceId).toBe('test-device-1');
      expect(created.createdAt).toBeInstanceOf(Date);
    });

    it('should throw on duplicate deviceId', async () => {
      const user1 = User.create({ deviceId: 'duplicate-device', accountTier: 'free' });
      const user2 = User.create({ deviceId: 'duplicate-device', accountTier: 'free' });

      await userRepo.create(user1);

      await expect(userRepo.create(user2)).rejects.toThrow();
    });
  });

  describe('softDelete and cascade', () => {
    it('should set deletedAt and preserve data', async () => {
      const user = await userRepo.create(
        User.create({ deviceId: 'test-device', accountTier: 'free' }),
      );

      await userRepo.softDelete(user.id);

      const found = await userRepo.findById(user.id);
      expect(found).not.toBeNull();
      expect(found!.deletedAt).toBeInstanceOf(Date);
    });

    it('should cascade to tracked_assets', async () => {
      const user = await userRepo.create(
        User.create({ deviceId: 'test-device', accountTier: 'free' }),
      );
      await userRepo.addTrackedAsset(user.id, {
        assetType: 'currency',
        assetCode: 'USD',
      });

      await userRepo.softDelete(user.id);

      const assets = await userRepo.getTrackedAssets(user.id);
      // Verify cascade behavior (depends on DB schema)
      expect(assets).toHaveLength(0);
    });
  });
});
```

## Acceptance Criteria

- [ ] All CRUD operations tested with real DB
- [ ] Database constraints validated (unique, foreign key)
- [ ] Soft delete behavior verified
- [ ] Cascade deletes tested
- [ ] Timestamp auto-setting verified
- [ ] Idempotency scenarios covered
- [ ] Test database cleanup working
- [ ] `bun test:integration` passes
- [ ] `bun run typecheck` passes

## On Completion

```bash
git commit -m "MHSB-071: add user infrastructure integration tests

- Add DrizzleUserRepository tests with real PostgreSQL
- Test CRUD operations and database constraints
- Verify soft delete and cascade behavior
- Test tracked assets integration
- Validate timestamp auto-setting
- Improve confidence in DB layer"
```
