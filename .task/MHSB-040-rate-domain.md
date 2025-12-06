# MHSB-040: Rate Domain Layer [DOMAIN]

## Description

Create Rate module domain layer with entities for currencies, commodities, banks, and rates.

## Dependencies

None

## Files to Create

- `src/modules/rate/domain/entities/currency.entity.ts`
- `src/modules/rate/domain/entities/commodity.entity.ts`
- `src/modules/rate/domain/entities/bank.entity.ts`
- `src/modules/rate/domain/entities/free-market-rate.entity.ts`
- `src/modules/rate/domain/entities/bank-rate.entity.ts`
- `src/modules/rate/domain/entities/previous-close.entity.ts`
- `src/modules/rate/domain/value-objects/trend.vo.ts`
- `src/modules/rate/domain/value-objects/asset-type.vo.ts`
- `src/modules/rate/domain/repositories/rate.repository.interface.ts`
- `src/modules/rate/domain/index.ts`

## Implementation Details

### Currency Entity

```typescript
interface Currency {
  code: string; // "USD"
  name: string; // "Amerikan Doları"
  flagUrl: string; // "/assets/flags/usd.png"
}
```

### Commodity Entity

```typescript
interface Commodity {
  code: string; // "GRAM_GOLD"
  name: string; // "Gram Altın"
  logoUrl: string; // "/assets/commodities/gram-gold.png"
}
```

### Bank Entity

```typescript
interface Bank {
  code: string; // "ZIRAAT"
  name: string; // "Ziraat Bankası"
  logoUrl: string; // "/assets/banks/ziraat.png"
}
```

### FreeMarketRate Entity

```typescript
interface FreeMarketRate {
  code: string;
  type: AssetType;
  buyingPrice: number;
  sellingPrice: number;
  dailyChange: number;
  dailyChangePercentage: number;
  trend: Trend; // 'up' | 'down' | 'stable'
  lastUpdated: Date;
  isStale: boolean; // true if > 5 minutes old
}
```

### BankRate Entity

```typescript
interface BankRate {
  assetCode: string;
  assetType: AssetType;
  bankCode: string;
  buyingPrice: number | null;
  sellingPrice: number | null;
  lastUpdated: Date;
}
```

### PreviousClose Entity

```typescript
interface PreviousClose {
  code: string;
  type: AssetType;
  closingPrice: number;
  closedAt: Date;
}
```

### Supported Assets (Static)

- **Currencies (13):** USD, EUR, GBP, CHF, CAD, RUB, AED, AUD, DKK, SEK, NOK, JPY, KWD
- **Commodities (9):** GRAM_GOLD, ONS, CEYREK, YARIM, TAM, CUMHURIYET, GREMSE, HAS, GUMUS
- **Banks (19):** KAPALI_CARSI, AKBANK, ALBARAKA, ... (see docs)

## Acceptance Criteria

- [ ] All entities defined with proper types
- [ ] Value objects for Trend and AssetType
- [ ] Repository interface defined
- [ ] Static lists for supported assets/banks
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-040: add rate module domain layer"
```
