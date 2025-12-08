import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import {
  SUBSCRIPTION_PLATFORMS,
  SUBSCRIPTION_STATUSES,
} from '@/modules/subscription/domain/value-objects';
import { usersTable } from '@/modules/user/infrastructure/database';

export const subscriptionPlatformEnum = pgEnum('subscription_platform', [
  SUBSCRIPTION_PLATFORMS.IOS,
  SUBSCRIPTION_PLATFORMS.ANDROID,
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  SUBSCRIPTION_STATUSES.ACTIVE,
  SUBSCRIPTION_STATUSES.EXPIRED,
  SUBSCRIPTION_STATUSES.CANCELED,
  SUBSCRIPTION_STATUSES.GRACE_PERIOD,
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

export type DbSubscription = typeof subscriptionsTable.$inferSelect;
export type NewDbSubscription = typeof subscriptionsTable.$inferInsert;
