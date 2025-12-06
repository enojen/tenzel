# MHSB-025: User Module Tests [TEST]

## Description

Create unit, integration, and e2e tests for User module.

## Dependencies

- MHSB-020 through MHSB-024 (Complete User Module)

## Files to Create

- `tests/unit/modules/user/user.entity.test.ts`
- `tests/unit/modules/user/user.schemas.test.ts`
- `tests/integration/modules/user/user.repository.test.ts`
- `tests/e2e/modules/user/user.controller.test.ts`
- `tests/mocks/user.repository.mock.ts`

## Test Coverage

### Unit Tests

- User entity creation and validation
- TrackedAsset value object
- AccountTier and AssetType value objects
- Zod schema validation

### Integration Tests

- UserRepository.create()
- UserRepository.findById()
- UserRepository.findByDeviceId()
- UserRepository.softDelete() / hardDelete()
- UserRepository.getTrackedAssets()
- UserRepository.addTrackedAsset()
- UserRepository.removeTrackedAsset()
- Unique constraint on deviceId
- Unique constraint on tracked assets

### E2E Tests

- GET /api/users/me - Success
- GET /api/users/me - 401 Unauthorized
- DELETE /api/users/me - Free user (hard delete)
- DELETE /api/users/me - Premium user (soft delete)
- GET /api/users/me/tracked - Empty list
- GET /api/users/me/tracked - With items
- POST /api/users/me/tracked - Add asset
- POST /api/users/me/tracked - Idempotent add
- POST /api/users/me/tracked - Invalid asset
- DELETE /api/users/me/tracked/:code - Remove asset
- DELETE /api/users/me/tracked/:code - Idempotent remove

## Acceptance Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All e2e tests pass
- [ ] Coverage > 80%
- [ ] `bun test` passes

## On Completion

```bash
git commit -m "MHSB-025: add user module tests"
```
