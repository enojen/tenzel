import { pgEnum, pgTable, serial, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

import { ASSET_TYPES } from '../../../domain/value-objects/asset-type.vo';

import { usersTable } from './users.table';

export const assetTypeEnum = pgEnum('asset_type', [ASSET_TYPES.CURRENCY, ASSET_TYPES.COMMODITY]);

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
  (table) => [unique('unique_user_asset').on(table.userId, table.assetType, table.assetCode)],
);

export type DbTrackedAsset = typeof trackedAssetsTable.$inferSelect;
export type NewDbTrackedAsset = typeof trackedAssetsTable.$inferInsert;
