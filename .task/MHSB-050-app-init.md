# MHSB-050: App Init Endpoint [API]

## Description

Create the main app initialization endpoint that aggregates all modules.

## Dependencies

- MHSB-005 (JWT Service)
- MHSB-022 (User Repository)
- MHSB-032 (Subscription Repository)
- MHSB-010 (Config Module)
- MHSB-042 (Rate Repository - for home assets)

## Endpoints

| Method | Path          | Auth | Description            |
| ------ | ------------- | ---- | ---------------------- |
| POST   | /api/app/init | No   | Initialize app session |

## Files to Create

- `src/modules/app/api/app.controller.ts`
- `src/modules/app/api/app.schemas.ts`
- `src/modules/app/application/commands/init-app.command.ts`
- `src/modules/app/index.ts`

## Implementation Details

### POST /api/app/init

**Request:**

```typescript
{
  deviceId: string,           // Expo device ID or UUID fallback
  platform: 'ios' | 'android',
  appVersion: string,
  buildNumber?: string,
  locale?: string,            // e.g., "tr-TR"
  timezone?: string,          // e.g., "Europe/Istanbul"
  pushToken?: string
}
```

**Response:**

```typescript
{
  serverTime: string,         // ISO 8601
  token: string,              // JWT, no expiration
  isNewUser: boolean,         // true = new user created

  user: {
    id: string,
    deviceId: string,
    accountTier: 'free' | 'premium',
    subscriptionExpiresAt: string | null,
    createdAt: string
  },

  subscription: {
    status: 'active' | 'expired' | 'canceled' | 'grace_period',
    expiresAt: string | null
  } | null,

  homeAssets: {
    source: 'tracked' | 'defaults',
    items: [{
      code: string,
      type: 'currency' | 'commodity',
      name: string,
      logoUrl: string
    }]
  },

  config: {
    subscription: {
      price: number,
      currency: string,
      period: 'monthly',
      features: string[]
    }
  },

  featureFlags: Record<string, boolean>
}
```

### Business Logic

```
1. Search for user by deviceId
   ├─ Found → Return existing user + new token
   └─ Not Found → Create new user (accountTier: 'free') + token

2. Token: JWT format, no expiration

3. homeAssets logic:
   IF user.trackedAssets.length > 0:
     source = 'tracked'
     items = user.trackedAssets
   ELSE:
     source = 'defaults'
     items = [GRAM_GOLD, USD, EUR]
```

### Rate Limit

10 requests per minute per IP

### Notes

- This is a PUBLIC endpoint (no auth required)
- Creates JWT for subsequent requests
- Aggregates data from all modules

## Acceptance Criteria

- [ ] POST /api/app/init creates new user if not exists
- [ ] Returns existing user if deviceId found
- [ ] JWT token generated and returned
- [ ] homeAssets from tracked or defaults
- [ ] Subscription status included if exists
- [ ] Config included
- [ ] Rate limit applied (10/min per IP)
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-050: add app init endpoint"
```
