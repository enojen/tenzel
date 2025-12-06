# MHSB-048: Rate Module Tests [TEST]

## Description

Create unit, integration, and e2e tests for Rate module.

## Dependencies

- MHSB-040 through MHSB-047 (Complete Rate Module)

## Files to Create

- `tests/unit/modules/rate/rate.entity.test.ts`
- `tests/unit/modules/rate/rate.schemas.test.ts`
- `tests/unit/modules/rate/daily-change.test.ts`
- `tests/integration/modules/rate/rate.repository.test.ts`
- `tests/e2e/modules/rate/rate.controller.test.ts`
- `tests/e2e/modules/rate/converter.controller.test.ts`
- `tests/mocks/rate.repository.mock.ts`
- `tests/mocks/scraper.service.mock.ts`

## Test Coverage

### Unit Tests

- FreeMarketRate entity
- BankRate entity
- Daily change calculation
- Trend determination
- Market hours calculation
- Search filtering logic
- Converter calculation

### Integration Tests

- RateRepository.getAllFreeMarketRates()
- RateRepository.getFreeMarketRate()
- RateRepository.searchFreeMarketRates()
- RateRepository.getBankRates()
- RateRepository.upsertFreeMarketRate()
- RateRepository.upsertManyBankRates()
- RateRepository.getPreviousClose()
- Stale data detection

### E2E Tests

- GET /api/currencies - Returns all
- GET /api/commodities - Returns all
- GET /api/banks - Returns all
- GET /api/rates/free-market - All rates
- GET /api/rates/free-market?type=currency - Filtered
- GET /api/rates/free-market?search=dolar - Search
- GET /api/rates/free-market/:code - Single rate
- GET /api/rates/free-market/:code - ASSET_NOT_FOUND
- GET /api/rates/banks/:code - Premium success
- GET /api/rates/banks/:code - Free user 403
- GET /api/rates/banks/:code/:bankCode - Single bank
- POST /api/converter/calculate - Free user
- POST /api/converter/calculate - Premium with banks
- POST /api/converter/calculate - Buy vs Sell rates

### Scraper Tests

- Parse HTML correctly
- Retry on failure
- Health status calculation

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All e2e tests pass
- [ ] Premium endpoints return 403 for free users
- [ ] Coverage > 80%
- [ ] `bun test` passes

## On Completion

```bash
git commit -m "MHSB-048: add rate module tests"
```
