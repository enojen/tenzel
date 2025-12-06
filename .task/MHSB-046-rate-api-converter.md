# MHSB-046: Rate API - Converter [API]

## Description

Create currency/commodity converter endpoint.

## Dependencies

- MHSB-002 (Auth Middleware)
- MHSB-003 (Premium Guard - for includeBanks)
- MHSB-042 (Rate Repository)

## Endpoints

| Method | Path                     | Auth | Premium   | Description                |
| ------ | ------------------------ | ---- | --------- | -------------------------- |
| POST   | /api/converter/calculate | Yes  | Partial\* | Convert FX/commodity → TRY |

\*`includeBanks: true` requires premium

## Files to Create/Modify

- `src/modules/rate/api/converter.controller.ts` (create)
- `src/modules/rate/api/converter.schemas.ts` (create)
- `src/modules/rate/application/commands/calculate-conversion.command.ts`

## Implementation Details

### POST /api/converter/calculate

**Request:**

```typescript
{
  fromCode: string,        // "USD", "GRAM_GOLD"
  fromType: 'currency' | 'commodity',
  amount: number,          // e.g., 100
  transactionType: 'buy' | 'sell',
  includeBanks?: boolean   // Premium feature
}
```

**Response:**

```typescript
{
  freeMarket: {
    rate: number,
    result: number   // amount × rate
  },
  banks?: [{         // Only if premium + includeBanks
    bankCode: string,
    bankName: string,
    bankLogoUrl: string,
    rate: number,
    result: number
  }]
}
```

### Calculation Logic

- `transactionType: 'buy'` → Use sellingPrice (you buy at seller's price)
- `transactionType: 'sell'` → Use buyingPrice (you sell at buyer's price)
- `result = amount × rate`

### Access Control

| User    | includeBanks    | Result                                    |
| ------- | --------------- | ----------------------------------------- |
| Free    | false/undefined | freeMarket only                           |
| Free    | true            | freeMarket only, banks omitted (no error) |
| Premium | false/undefined | freeMarket only                           |
| Premium | true            | freeMarket + banks array                  |

### Rate Limit

60 requests per minute per user

## Acceptance Criteria

- [ ] POST /api/converter/calculate works
- [ ] Correct rate used based on transactionType
- [ ] Free users get freeMarket only
- [ ] Premium users can include banks
- [ ] Banks sorted by best rate
- [ ] Rate limiting applied
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-046: add converter endpoint"
```
