# MHSB-036: Subscription Module Tests [TEST]

## Description

Create unit, integration, and e2e tests for Subscription module.

## Dependencies

- MHSB-030 through MHSB-035 (Complete Subscription Module)

## Files to Create

- `tests/unit/modules/subscription/subscription.entity.test.ts`
- `tests/unit/modules/subscription/subscription.schemas.test.ts`
- `tests/integration/modules/subscription/subscription.repository.test.ts`
- `tests/e2e/modules/subscription/subscription.controller.test.ts`
- `tests/e2e/modules/subscription/webhooks.test.ts`
- `tests/mocks/subscription.repository.mock.ts`
- `tests/mocks/store-services.mock.ts`

## Test Coverage

### Unit Tests

- Subscription entity creation
- SubscriptionStatus transitions
- Zod schema validation
- Webhook payload parsing

### Integration Tests

- SubscriptionRepository CRUD
- WebhookLog idempotency
- findExpired query
- Transaction rollback on error

### E2E Tests

- POST /api/subscriptions/verify - Success
- POST /api/subscriptions/verify - Invalid receipt
- POST /api/subscriptions/verify - 401 Unauthorized
- POST /api/subscriptions/restore - Found active subscription
- POST /api/subscriptions/restore - No subscription found
- POST /api/subscriptions/restore - Restore soft-deleted user
- POST /api/webhooks/apple - DID_RENEW
- POST /api/webhooks/apple - EXPIRED
- POST /api/webhooks/apple - Idempotent (duplicate event)
- POST /api/webhooks/google - SUBSCRIPTION_RENEWED
- POST /api/webhooks/google - SUBSCRIPTION_EXPIRED

### Job Tests

- Expiry job finds correct subscriptions
- Expiry job updates status and user tier
- Soft delete cleanup after 90 days

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All e2e tests pass
- [ ] Webhook tests with mocked store services
- [ ] Coverage > 80%
- [ ] `bun test` passes

## On Completion

```bash
git commit -m "MHSB-036: add subscription module tests"
```
