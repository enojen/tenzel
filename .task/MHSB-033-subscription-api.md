# MHSB-033: Subscription API Endpoints [API]

## Description

Create subscription verification and restore endpoints.

## Dependencies

- MHSB-002 (Auth Middleware)
- MHSB-032 (Subscription Repository & Store Services)

## Endpoints

| Method | Path                       | Auth | Description                 |
| ------ | -------------------------- | ---- | --------------------------- |
| POST   | /api/subscriptions/verify  | Yes  | Validate receipt & activate |
| POST   | /api/subscriptions/restore | Yes  | Restore subscription        |

## Files to Create

- `src/modules/subscription/api/subscription.controller.ts`
- `src/modules/subscription/api/subscription.schemas.ts`
- `src/modules/subscription/application/commands/verify-subscription.command.ts`
- `src/modules/subscription/application/commands/restore-subscription.command.ts`
- `src/modules/subscription/exceptions/subscription.exceptions.ts`
- `src/modules/subscription/index.ts`

## Implementation Details

### POST /api/subscriptions/verify

```typescript
// Request
{
  platform: 'ios' | 'android',
  receipt: string,
  billingKey: string,
  productId: string
}

// Response
{
  success: true,
  user: { id, accountTier: 'premium', subscriptionExpiresAt },
  subscription: { id, platform, billingKey, status: 'active', expiresAt }
}
```

### POST /api/subscriptions/restore

```typescript
// Request
{
  platform: 'ios' | 'android',
  billingKey: string,
  receipt?: string
}

// Response (found)
{
  success: true,
  restored: true,
  user: { id, accountTier: 'premium', subscriptionExpiresAt },
  subscription: { ... }
}

// Response (not found)
{
  success: true,
  restored: false,
  message: 'No active subscription found for this billing key'
}
```

### Restore Flow

1. Find subscription by billingKey
2. Validate with Store API
3. If active: link to current user, set accountTier: 'premium'
4. If soft-deleted user exists with same billingKey: restore user data

### Errors

- `INVALID_RECEIPT`: Store validation failed
- `SUBSCRIPTION_NOT_FOUND`: No subscription for restore

## Acceptance Criteria

- [ ] POST /api/subscriptions/verify works
- [ ] POST /api/subscriptions/restore works
- [ ] User accountTier updated on success
- [ ] Proper error codes returned
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-033: add subscription verify and restore endpoints"
```
