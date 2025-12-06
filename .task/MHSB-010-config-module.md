# MHSB-010: Config Module [API]

## Description

Create Config module with subscription pricing and default assets endpoints. No authentication required.

## Dependencies

None (standalone module)

## Endpoints

| Method | Path                       | Auth | Description                |
| ------ | -------------------------- | ---- | -------------------------- |
| GET    | /api/config/subscription   | No   | Paywall configuration      |
| GET    | /api/config/default-assets | No   | Default home screen assets |

## Files to Create

- `src/modules/config/api/config.controller.ts`
- `src/modules/config/api/config.schemas.ts`
- `src/modules/config/index.ts`

## Implementation Details

### GET /api/config/subscription Response

```typescript
{
  subscription: {
    price: number,        // e.g., 99.99
    currency: string,     // "TRY"
    period: "monthly",
    features: string[],   // Premium feature list
    description?: string
  }
}
```

### GET /api/config/default-assets Response

```typescript
{
  assets: [
    { code: 'GRAM_GOLD', type: 'commodity', name: 'Gram Altın', logoUrl: '...' },
    { code: 'USD', type: 'currency', name: 'Amerikan Doları', logoUrl: '...' },
    { code: 'EUR', type: 'currency', name: 'Euro', logoUrl: '...' },
  ];
}
```

### Notes

- Values can be hardcoded or from config file
- No database required
- No authentication required

## Acceptance Criteria

- [ ] GET /api/config/subscription returns pricing info
- [ ] GET /api/config/default-assets returns 3 default assets
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-010: add config module with subscription and default-assets endpoints"
```
