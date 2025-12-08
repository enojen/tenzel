import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { ACCOUNT_TIERS } from '../../../domain/value-objects/account-tier.vo';

export const accountTierEnum = pgEnum('account_tier', [ACCOUNT_TIERS.FREE, ACCOUNT_TIERS.PREMIUM]);

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: varchar('device_id', { length: 255 }).notNull().unique(),
  accountTier: accountTierEnum('account_tier').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type DbUser = typeof usersTable.$inferSelect;
export type NewDbUser = typeof usersTable.$inferInsert;
