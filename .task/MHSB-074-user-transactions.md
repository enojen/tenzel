# MHSB-074: User Transaction Management [REFACTOR]

## Description

Implement transaction management for User module operations to ensure atomic multi-step operations. This will add rollback capabilities for operations that involve multiple database writes, preventing partial failures and data inconsistency.

**Current Gap:** Multi-step operations (e.g., delete user + cleanup subscription data) lack explicit transaction management, creating risk of partial failures.

## Dependencies

- MHSB-071 (User Infrastructure Integration Tests - to validate transaction behavior)

## Files to Create

- `src/shared/infrastructure/database/transaction.ts`

## Files to Modify

- `src/modules/user/application/commands/add-tracked-asset.command.ts`
- `src/modules/user/application/commands/delete-user.command.ts`
- `src/modules/user/application/commands/remove-tracked-asset.command.ts`
- `src/modules/user/infrastructure/repositories/user.repository.ts`

## Implementation Details

### 1. Create Transaction Wrapper Utility

**Location:** `src/shared/infrastructure/database/transaction.ts`

```typescript
import { db } from './drizzle';
import type { PgTransaction } from 'drizzle-orm/pg-core';

export type TransactionClient = typeof db | PgTransaction<any, any>;

export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    return callback(tx);
  });
}

export function isInTransaction(client: TransactionClient): boolean {
  return 'rollback' in client;
}
```

### 2. Update Repository to Accept Transaction Client

**Pattern:**

```typescript
export class UserRepository {
  constructor(private readonly database: TransactionClient = db) {}

  async create(user: User): Promise<User> {
    const result = await this.database.insert(usersTable).values(this.toDb(user)).returning();

    return this.toDomain(result[0]);
  }

  // ... other methods
}
```

### 3. Update Commands to Use Transactions

**Example: deleteUserCommand with transaction**

```typescript
export async function deleteUserCommand(
  userId: string,
  deps: DeleteUserCommandDeps,
): Promise<void> {
  await withTransaction(async (tx) => {
    const userRepo = new UserRepository(tx);

    const user = await userRepo.findById(userId);
    if (!user || user.isDeleted) {
      throw new UserNotFoundException();
    }

    if (user.isPremium) {
      await userRepo.softDelete(userId);
      // Future: cleanup subscription data here
    } else {
      await userRepo.hardDelete(userId);
    }
  });
}
```

### 4. Transaction Isolation Levels (Optional)

Drizzle supports transaction isolation levels:

```typescript
import { sql } from 'drizzle-orm';

await db.transaction(
  async (tx) => {
    // ... operations
  },
  {
    isolationLevel: 'read committed', // or 'serializable', 'repeatable read'
  },
);
```

## Multi-Step Operations to Wrap

### Priority 1 (Critical):

1. **deleteUserCommand** - Delete user + related data cleanup
2. **Future subscription operations** - Verify purchase + create subscription

### Priority 2 (Optional):

3. **addTrackedAssetCommand** - If extended with additional operations
4. **removeTrackedAssetCommand** - If extended with additional operations

## Error Handling

**Transaction Rollback:**

- Automatic rollback on thrown exceptions
- Manual rollback via `tx.rollback()` if needed

**Error Propagation:**

```typescript
try {
  await withTransaction(async (tx) => {
    // operations
  });
} catch (error) {
  if (error instanceof UserNotFoundException) {
    throw error; // Preserve domain exceptions
  }
  throw new InternalServerException('transaction.failed');
}
```

## Test Coverage

Update/create tests in MHSB-071 for:

**Commit Scenarios:**

- Success: All operations complete, transaction commits
- Verify: Data persisted in database

**Rollback Scenarios:**

- Error during operation: Exception thrown, all changes rolled back
- Verify: Database state unchanged

**Concurrent Transactions:**

- Two transactions modifying same user
- Verify: Isolation level behavior

**Deadlock Handling:**

- Simulate deadlock scenario
- Verify: Appropriate error handling

## Migration Strategy

1. Create transaction utility
2. Update UserRepository to accept TransactionClient
3. Update one command at a time (start with deleteUserCommand)
4. Add integration tests for each updated command
5. Validate with `bun test` after each change

## Acceptance Criteria

- [ ] Transaction wrapper utility created
- [ ] UserRepository accepts TransactionClient
- [ ] deleteUserCommand uses transactions
- [ ] Other commands updated (if applicable)
- [ ] Rollback behavior tested
- [ ] Concurrent transaction tests pass
- [ ] No breaking changes to existing tests
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-074: implement user transaction management

- Add transaction wrapper utility
- Update UserRepository to accept TransactionClient
- Wrap deleteUserCommand in transaction
- Add rollback on error
- Test transaction commit/rollback behavior
- Improve data consistency and atomicity"
```
