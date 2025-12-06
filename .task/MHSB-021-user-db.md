# MHSB-021: User Database Layer [DB]

## Description

Create Drizzle table definitions and Zod schemas for User module.

## Dependencies

- MHSB-020 (User Domain)

## Files to Create

- `src/modules/user/infrastructure/database/tables/users.table.ts`
- `src/modules/user/infrastructure/database/tables/tracked-assets.table.ts`
- `src/modules/user/infrastructure/database/index.ts`

## Implementation Details

### users Table

```typescript
export const accountTierEnum = pgEnum('account_tier', ['free', 'premium']);

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: varchar('device_id', { length: 255 }).notNull().unique(),
  accountTier: accountTierEnum('account_tier').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
```

### tracked_assets Table

```typescript
export const assetTypeEnum = pgEnum('asset_type', ['currency', 'commodity']);

export const trackedAssetsTable = pgTable(
  'tracked_assets',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    assetType: assetTypeEnum('asset_type').notNull(),
    assetCode: varchar('asset_code', { length: 50 }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueAsset: unique().on(table.userId, table.assetType, table.assetCode),
  }),
);
```

### Indexes

- `users.device_id` - unique index
- `tracked_assets.user_id` - foreign key index
- `tracked_assets.(user_id, asset_type, asset_code)` - unique constraint

## Acceptance Criteria

- [ ] users table with all columns
- [ ] tracked_assets table with foreign key
- [ ] Enum types for account_tier and asset_type
- [ ] Proper indexes and constraints
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-021: add user module database tables"
```
