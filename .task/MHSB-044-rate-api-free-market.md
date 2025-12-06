# MHSB-044: Rate API - Free Market [API]

## Description

Create endpoints for free market rates (available to all authenticated users).

## Dependencies

- MHSB-002 (Auth Middleware)
- MHSB-042 (Rate Repository)

## Endpoints

| Method | Path                         | Auth | Premium | Description           |
| ------ | ---------------------------- | ---- | ------- | --------------------- |
| GET    | /api/rates/free-market       | Yes  | No      | All free market rates |
| GET    | /api/rates/free-market/:code | Yes  | No      | Single asset rate     |

## Files to Create/Modify

- `src/modules/rate/api/rate.controller.ts` (modify)
- `src/modules/rate/api/rate.schemas.ts` (modify)
- `src/modules/rate/application/queries/get-free-market-rates.query.ts`
- `src/modules/rate/application/queries/get-free-market-rate.query.ts`

## Implementation Details

### GET /api/rates/free-market

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| type | currency \| commodity | No | Filter by asset type |
| search | string | No | Search by name/code (min 2 chars) |

**Response:**

```typescript
{
  market: {
    isOpen: boolean,
    lastCloseAt: string | null,
    nextOpenAt: string | null
  },
  items: [{
    code: string,
    type: 'currency' | 'commodity',
    name: string,
    logoUrl: string,
    buyingPrice: number,
    sellingPrice: number,
    dailyChange: number,
    dailyChangePercentage: number,
    trend: 'up' | 'down' | 'stable',
    lastUpdated: string,
    isStale: boolean,
    isTracked: boolean  // Based on user's tracked list
  }]
}
```

### GET /api/rates/free-market/:code

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| type | currency \| commodity | Yes | Asset type |

**Response:**

```typescript
{
  market: { ... },
  item: { ... }  // Same as items array element
}
```

### Market Hours

- Weekdays: 09:00 - 18:00 Turkey Time (UTC+3)
- Weekends: Closed
- Turkish holidays: Closed

### Errors

- `ASSET_NOT_FOUND`: Invalid code or type

## Acceptance Criteria

- [ ] GET /api/rates/free-market returns all rates
- [ ] Filtering by type works
- [ ] Search works (min 2 chars)
- [ ] GET /api/rates/free-market/:code returns single rate
- [ ] isTracked populated from user's list
- [ ] Market status calculated correctly
- [ ] isStale flag for data > 5 min
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-044: add free market rate endpoints"
```
