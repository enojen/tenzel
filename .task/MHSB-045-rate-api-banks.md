# MHSB-045: Rate API - Bank Rates [API]

## Description

Create premium-only endpoints for bank-specific rates.

## Dependencies

- MHSB-002 (Auth Middleware)
- MHSB-003 (Premium Guard)
- MHSB-042 (Rate Repository)

## Endpoints

| Method | Path                             | Auth | Premium | Description          |
| ------ | -------------------------------- | ---- | ------- | -------------------- |
| GET    | /api/rates/banks/:code           | Yes  | **Yes** | Bank rates for asset |
| GET    | /api/rates/banks/:code/:bankCode | Yes  | **Yes** | Single bank detail   |

## Files to Create/Modify

- `src/modules/rate/api/rate.controller.ts` (modify)
- `src/modules/rate/api/rate.schemas.ts` (modify)
- `src/modules/rate/application/queries/get-bank-rates.query.ts`
- `src/modules/rate/application/queries/get-bank-rate.query.ts`

## Implementation Details

### GET /api/rates/banks/:code

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| type | currency \| commodity | Yes | Asset type |
| transactionType | buy \| sell | Yes | Transaction direction |

**Response:**

```typescript
{
  item: {
    code: string,
    name: string,
    logoUrl: string
  },
  transactionType: 'buy' | 'sell',
  bankRates: [{
    bankCode: string,
    bankName: string,
    bankLogoUrl: string,
    price: number,
    lastUpdated: string
  }],
  bestRate: {
    bankCode: string,
    bankName: string,
    price: number
  }
}
```

**Sorting:**

- `transactionType: 'buy'` → Sort by price ASC (cheapest first)
- `transactionType: 'sell'` → Sort by price DESC (highest first)

**Best Rate:**

- `buy` → Lowest sellingPrice
- `sell` → Highest buyingPrice

### GET /api/rates/banks/:code/:bankCode

**Query Params:**
| Param | Type | Required |
|-------|------|----------|
| type | currency \| commodity | Yes |

**Response:**

```typescript
{
  item: { code, name },
  bank: { bankCode, bankName, bankLogoUrl },
  rates: {
    buyingPrice: number | null,
    sellingPrice: number | null,
    dailyChange: number,
    dailyChangePercentage: number,
    lastUpdated: string
  }
}
```

### Errors

- `PREMIUM_REQUIRED`: Free user accessing endpoint
- `ASSET_NOT_FOUND`: Invalid code/type
- `BANK_NOT_FOUND`: Invalid bankCode

## Acceptance Criteria

- [ ] Premium guard applied to both endpoints
- [ ] GET /api/rates/banks/:code returns sorted bank rates
- [ ] Best rate calculated correctly
- [ ] GET /api/rates/banks/:code/:bankCode returns single bank
- [ ] Proper error codes for free users
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-045: add bank rate endpoints (premium only)"
```
