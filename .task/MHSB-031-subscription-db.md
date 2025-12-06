# MHSB-031: Subscription Database Layer [DB]

## Description

Create Drizzle table definitions for Subscription module.

## Dependencies

- MHSB-030 (Subscription Domain)
- MHSB-021 (User Database - for foreign key)

## Files to Create

- `src/modules/subscription/infrastructure/database/tables/subscriptions.table.ts`
- `src/modules/subscription/infrastructure/database/tables/webhook-logs.table.ts`
- `src/modules/subscription/infrastructure/database/index.ts`

## Implementation Details

### subscriptions Table

```typescript
export const subscriptionPlatformEnum = pgEnum('subscription_platform', ['ios', 'android']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'expired',
  'canceled',
  'grace_period',
]);

export const subscriptionsTable = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id),
  platform: subscriptionPlatformEnum('platform').notNull(),
  billingKey: varchar('billing_key', { length: 500 }).notNull().unique(),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### webhook_logs Table

```typescript
export const webhookPlatformEnum = pgEnum('webhook_platform', ['apple', 'google']);

export const webhookLogsTable = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  platform: webhookPlatformEnum('platform').notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  billingKey: varchar('billing_key', { length: 500 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  payload: text('payload').notNull(), // JSON string
});
```

### Indexes

- `subscriptions.user_id` - foreign key index
- `subscriptions.billing_key` - unique index
- `subscriptions.status` - for expiry job queries
- `webhook_logs.event_id` - unique index for idempotency

## Acceptance Criteria

- [ ] subscriptions table with all columns
- [ ] webhook_logs table for idempotency
- [ ] Enum types for platform and status
- [ ] Foreign key to users table
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-031: add subscription module database tables"
```
