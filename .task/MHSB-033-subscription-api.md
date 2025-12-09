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

---

## v3 Code Quality Refactoring

### Improvements Made:

**1. Shared Asset Constants & Validators**

- Created `src/shared/domain/constants/assets.constants.ts` - VALID_CURRENCIES, VALID_COMMODITIES
- Created `src/shared/domain/validators/asset.validator.ts` - isValidAsset() function
- Exported from `src/shared/domain/index.ts`
- Removed duplicate constants from `add-tracked-asset.command.ts`
- Now reusable across modules instead of hardcoded in command

**2. Module-Specific Exceptions**

- Added `UserCreationFailedException`, `UserUpdateFailedException` to user module
- Added `SubscriptionCreationFailedException`, `SubscriptionUpdateFailedException`, `WebhookLogCreationFailedException` to subscription module
- Replaced generic `Error('Failed to...')` with proper exception classes
- Added i18n keys for all new exceptions

**3. Data Mapping Refactoring**

- Added `toUserSubscriptionResponse()` to `subscription.mapper.ts`
- Removed inline user mapping from `subscription.controller.ts` verify/restore endpoints
- Controller now delegates to mapper for consistency with user module pattern

**4. Enum Usage Instead of Magic Strings**

- Updated `subscription.repository.ts` findExpired() to use SUBSCRIPTION_STATUSES enum
- Replaced hardcoded string array `['active', 'canceled', 'grace_period']` with enum constants
- Ensures type safety and maintainability

**5. i18n Translations**

- Added to `src/shared/i18n/locales/en.json`:
  - errors.user.creation_failed
  - errors.user.update_failed
  - errors.subscription.creation_failed
  - errors.subscription.update_failed
  - errors.subscription.webhook_log_creation_failed
- Added Turkish equivalents to `tr.json`

---

## v2 Implementation Notes (Context7 MCP Research)

### Implementation Details:

**Files Created:**

- `src/modules/subscription/api/subscription.controller.ts` - Controller with verify and restore endpoints
- `src/modules/subscription/api/subscription.schemas.ts` - Zod schemas for request/response validation
- `src/modules/subscription/application/commands/verify-subscription.command.ts` - Business logic for verification
- `src/modules/subscription/application/commands/restore-subscription.command.ts` - Business logic for restoration
- `src/modules/subscription/application/dto/subscription.mapper.ts` - Entity to DTO mapping
- `src/modules/subscription/exceptions/subscription.exceptions.ts` - Custom exceptions
- `src/modules/subscription/index.ts` - Module exports

**Key Implementation Points:**

- Uses Apple and Google store services from MHSB-032 for receipt validation
- Verify endpoint validates receipt and creates/updates subscription atomically
- Restore endpoint finds existing subscription by billingKey and re-validates if receipt provided
- Both endpoints update user's accountTier to 'premium' on success
- Follows existing module patterns (controller, commands, DTOs, exceptions)
- Integrated with auth middleware for protected routes

**Type Safety:**

- Entity IDs are `string | number` but API responses need `string` - added explicit String() conversions
- Optional timestamps handled with fallbacks to ensure non-null values in responses
