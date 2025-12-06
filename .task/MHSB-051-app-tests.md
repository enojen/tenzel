# MHSB-051: App Module Tests [TEST]

## Description

Create tests for App init endpoint.

## Dependencies

- MHSB-050 (App Init Endpoint)

## Files to Create

- `tests/unit/modules/app/app.schemas.test.ts`
- `tests/e2e/modules/app/app.controller.test.ts`
- `tests/mocks/app.mocks.ts`

## Test Coverage

### Unit Tests

- AppInitRequest schema validation
- AppInitResponse schema validation
- homeAssets source logic

### E2E Tests

#### New User Flow

- POST /api/app/init - New deviceId creates user
- Returns isNewUser: true
- Returns valid JWT token
- User has accountTier: 'free'
- homeAssets.source = 'defaults'
- homeAssets.items = [GRAM_GOLD, USD, EUR]

#### Existing User Flow

- POST /api/app/init - Existing deviceId returns user
- Returns isNewUser: false
- Returns valid JWT token
- User data preserved

#### With Tracked Assets

- User has tracked assets
- homeAssets.source = 'tracked'
- homeAssets.items = user's tracked list

#### With Subscription

- User has active subscription
- subscription object populated
- accountTier: 'premium'

#### Token Validation

- Returned token works for authenticated endpoints
- Token contains correct userId and deviceId

#### Rate Limiting

- 11th request within 1 minute returns 429
- retryAfter included in response

#### Validation Errors

- Missing deviceId returns 400
- Missing platform returns 400
- Invalid platform returns 400

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] All e2e tests pass
- [ ] New user flow tested
- [ ] Existing user flow tested
- [ ] Token validation tested
- [ ] Rate limiting tested
- [ ] Coverage > 80%
- [ ] `bun test` passes

## On Completion

```bash
git commit -m "MHSB-051: add app module tests"
```
