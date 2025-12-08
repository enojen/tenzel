import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { WEBHOOK_PLATFORMS } from '@/modules/subscription/domain/value-objects';

export const webhookPlatformEnum = pgEnum('webhook_platform', [
  WEBHOOK_PLATFORMS.APPLE,
  WEBHOOK_PLATFORMS.GOOGLE,
]);

export const webhookLogsTable = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: varchar('event_id', { length: 255 }).notNull().unique(),
  platform: webhookPlatformEnum('platform').notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  billingKey: varchar('billing_key', { length: 500 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  payload: text('payload').notNull(),
});

export type DbWebhookLog = typeof webhookLogsTable.$inferSelect;
export type NewDbWebhookLog = typeof webhookLogsTable.$inferInsert;
