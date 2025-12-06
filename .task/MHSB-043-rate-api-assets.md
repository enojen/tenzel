# MHSB-043: Rate API - Asset Lists [API]

## Description

Create endpoints for listing supported currencies, commodities, and banks.

## Dependencies

- MHSB-002 (Auth Middleware)
- MHSB-040 (Rate Domain - static lists)

## Endpoints

| Method | Path             | Auth | Premium | Description          |
| ------ | ---------------- | ---- | ------- | -------------------- |
| GET    | /api/currencies  | Yes  | No      | List all currencies  |
| GET    | /api/commodities | Yes  | No      | List all commodities |
| GET    | /api/banks       | Yes  | No      | List all banks       |

## Files to Create

- `src/modules/rate/api/rate.controller.ts`
- `src/modules/rate/api/rate.schemas.ts`
- `src/modules/rate/index.ts`

## Implementation Details

### GET /api/currencies Response

```typescript
{
  currencies: [
    { code: 'USD', name: 'Amerikan Doları', flagUrl: '/assets/flags/usd.png' },
    { code: 'EUR', name: 'Euro', flagUrl: '/assets/flags/eur.png' },
    // ... 13 currencies total
  ];
}
```

### GET /api/commodities Response

```typescript
{
  commodities: [
    { code: 'GRAM_GOLD', name: 'Gram Altın', logoUrl: '/assets/commodities/gram-gold.png' },
    { code: 'ONS', name: 'Ons', logoUrl: '/assets/commodities/ons.png' },
    // ... 9 commodities total
  ];
}
```

### GET /api/banks Response

```typescript
{
  banks: [
    { code: 'ZIRAAT', name: 'Ziraat Bankası', logoUrl: '/assets/banks/ziraat.png' },
    { code: 'AKBANK', name: 'Akbank', logoUrl: '/assets/banks/akbank.png' },
    // ... 19 banks total
  ];
}
```

### Notes

- These are static lists, can be hardcoded or loaded from config
- All require authentication but not premium

## Acceptance Criteria

- [ ] GET /api/currencies returns 13 currencies
- [ ] GET /api/commodities returns 9 commodities
- [ ] GET /api/banks returns 19 banks
- [ ] All endpoints require auth
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-043: add asset list endpoints (currencies, commodities, banks)"
```
