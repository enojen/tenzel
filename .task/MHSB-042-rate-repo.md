# MHSB-042: Rate Repository [REPO]

## Description

Implement Rate repository with all query and update operations.

## Dependencies

- MHSB-040 (Rate Domain)
- MHSB-041 (Rate Database)

## Files to Create

- `src/modules/rate/infrastructure/repositories/rate.repository.ts`
- `src/modules/rate/infrastructure/index.ts`

## Implementation Details

### RateRepository Methods

```typescript
class RateRepository implements IRateRepository {
  // Free Market Rates
  async getAllFreeMarketRates(): Promise<FreeMarketRate[]>;
  async getFreeMarketRatesByType(type: AssetType): Promise<FreeMarketRate[]>;
  async getFreeMarketRate(code: string, type: AssetType): Promise<FreeMarketRate | null>;
  async searchFreeMarketRates(query: string): Promise<FreeMarketRate[]>;
  async upsertFreeMarketRate(rate: UpsertFreeMarketRateDto): Promise<void>;
  async upsertManyFreeMarketRates(rates: UpsertFreeMarketRateDto[]): Promise<void>;

  // Bank Rates
  async getBankRates(assetCode: string, assetType: AssetType): Promise<BankRate[]>;
  async getBankRate(
    assetCode: string,
    assetType: AssetType,
    bankCode: string,
  ): Promise<BankRate | null>;
  async upsertBankRate(rate: UpsertBankRateDto): Promise<void>;
  async upsertManyBankRates(rates: UpsertBankRateDto[]): Promise<void>;

  // Previous Closes
  async getPreviousClose(code: string, type: AssetType): Promise<PreviousClose | null>;
  async upsertPreviousClose(close: UpsertPreviousCloseDto): Promise<void>;
  async saveCurrentAsClose(): Promise<void>; // Called at market close

  // Utility
  async getLastUpdateTime(): Promise<Date | null>;
  async isDataStale(thresholdMinutes: number): Promise<boolean>;
}
```

### Daily Change Calculation

```typescript
function calculateDailyChange(
  currentRate: FreeMarketRate,
  previousClose: PreviousClose,
): {
  dailyChange: number;
  dailyChangePercentage: number;
  trend: Trend;
} {
  const change = currentRate.sellingPrice - previousClose.closingPrice;
  const percentage = (change / previousClose.closingPrice) * 100;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
  return { dailyChange: change, dailyChangePercentage: percentage, trend };
}
```

### Search Logic

- Case-insensitive
- Minimum 2 characters
- Searches both code and name

## Acceptance Criteria

- [ ] All repository methods implemented
- [ ] Upsert operations work correctly
- [ ] Daily change calculation accurate
- [ ] Search with min 2 chars
- [ ] Stale data detection
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-042: implement rate repository"
```
