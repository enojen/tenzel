# MHSB-041: Rate Database Layer [DB]

## Description

Create Drizzle table definitions for Rate module.

## Dependencies

- MHSB-040 (Rate Domain)

## Files to Create

- `src/modules/rate/infrastructure/database/tables/free-market-rates.table.ts`
- `src/modules/rate/infrastructure/database/tables/bank-rates.table.ts`
- `src/modules/rate/infrastructure/database/tables/previous-closes.table.ts`
- `src/modules/rate/infrastructure/database/index.ts`

## Implementation Details

### free_market_rates Table

```typescript
export const freeMarketRatesTable = pgTable(
  'free_market_rates',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).notNull(),
    type: assetTypeEnum('type').notNull(),
    buyingPrice: decimal('buying_price', { precision: 18, scale: 6 }).notNull(),
    sellingPrice: decimal('selling_price', { precision: 18, scale: 6 }).notNull(),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueAsset: unique().on(table.code, table.type),
  }),
);
```

### bank_rates Table

```typescript
export const bankRatesTable = pgTable(
  'bank_rates',
  {
    id: serial('id').primaryKey(),
    assetCode: varchar('asset_code', { length: 50 }).notNull(),
    assetType: assetTypeEnum('asset_type').notNull(),
    bankCode: varchar('bank_code', { length: 50 }).notNull(),
    buyingPrice: decimal('buying_price', { precision: 18, scale: 6 }),
    sellingPrice: decimal('selling_price', { precision: 18, scale: 6 }),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRate: unique().on(table.assetCode, table.assetType, table.bankCode),
  }),
);
```

### previous_closes Table

```typescript
export const previousClosesTable = pgTable(
  'previous_closes',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).notNull(),
    type: assetTypeEnum('type').notNull(),
    closingPrice: decimal('closing_price', { precision: 18, scale: 6 }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    uniqueClose: unique().on(table.code, table.type),
  }),
);
```

### Notes

- Use decimal for prices (not float) for precision
- asset_type enum reused from user module
- Unique constraints on (code, type) pairs

## Acceptance Criteria

- [ ] free_market_rates table with unique constraint
- [ ] bank_rates table with unique constraint
- [ ] previous_closes table for daily change calc
- [ ] Decimal precision for prices
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-041: add rate module database tables"
```
