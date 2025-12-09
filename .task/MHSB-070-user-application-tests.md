# MHSB-070: User Application Layer Unit Tests [TEST]

## Description

Create comprehensive unit tests for User module's application layer (Commands and Queries). These tests will provide isolated testing of business logic with mocked dependencies, improving debuggability and catching logic errors early.

**Current Gap:** Application layer commands and queries are only tested through E2E tests, making debugging difficult and lacking isolated business logic validation.

## Dependencies

- MHSB-025 (User Module Tests - existing test setup)

## Files to Create

- `tests/unit/modules/user/application/add-tracked-asset.command.test.ts`
- `tests/unit/modules/user/application/delete-user.command.test.ts`
- `tests/unit/modules/user/application/remove-tracked-asset.command.test.ts`
- `tests/unit/modules/user/application/get-current-user.query.test.ts`
- `tests/unit/modules/user/application/get-tracked-assets.query.test.ts`

## Test Coverage

### Commands

**add-tracked-asset.command.test.ts:**

- Success path with mocked repository
- AssetNotFoundException for invalid asset code
- AssetNotFoundException for invalid asset type
- Idempotency verification (same asset added twice)
- Edge cases: empty assetCode, special characters

**delete-user.command.test.ts:**

- Success: Free user hard delete
- Success: Premium user soft delete
- UserNotFoundException when user doesn't exist
- UserNotFoundException when user already deleted
- Business logic: isPremium determines delete strategy

**remove-tracked-asset.command.test.ts:**

- Success path with mocked repository
- AssetNotFoundException for non-existent asset
- Idempotency verification (removing non-existent asset)
- Edge cases: empty assetCode

### Queries

**get-current-user.query.test.ts:**

- Success: Return user when exists
- UserNotFoundException when user doesn't exist
- UserNotFoundException when user is soft deleted
- Proper DTO mapping verification

**get-tracked-assets.query.test.ts:**

- Success: Return empty array for user with no assets
- Success: Return array of assets for user with assets
- UserNotFoundException when user doesn't exist
- Proper DTO mapping for multiple assets

## Mock Setup

Use `InMemoryUserRepository` from `tests/mocks/user.repository.mock.ts` or create command-specific mocks:

```typescript
const mockUserRepository: UserRepository = {
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  hardDelete: vi.fn(),
  addTrackedAsset: vi.fn(),
  removeTrackedAsset: vi.fn(),
  getTrackedAssets: vi.fn(),
};
```

## Test Pattern Example

```typescript
describe('addTrackedAssetCommand', () => {
  let mockRepo: UserRepository;

  beforeEach(() => {
    mockRepo = {
      addTrackedAsset: vi.fn().mockResolvedValue([
        TrackedAsset.create({
          userId: 'user-1',
          assetType: 'currency',
          assetCode: 'USD',
          addedAt: new Date(),
        }),
      ]),
    } as any;
  });

  it('should add valid asset successfully', async () => {
    const result = await addTrackedAssetCommand(
      'user-1',
      { assetType: 'currency', assetCode: 'USD' },
      { userRepository: mockRepo },
    );

    expect(result).toHaveLength(1);
    expect(result[0].assetCode).toBe('USD');
    expect(mockRepo.addTrackedAsset).toHaveBeenCalledOnce();
  });

  it('should throw AssetNotFoundException for invalid asset', async () => {
    await expect(
      addTrackedAssetCommand(
        'user-1',
        { assetType: 'currency', assetCode: 'INVALID' },
        { userRepository: mockRepo },
      ),
    ).rejects.toThrow(AssetNotFoundException);
  });
});
```

## Acceptance Criteria

- [ ] All command tests pass with >90% coverage
- [ ] All query tests pass with >90% coverage
- [ ] Error paths tested (UserNotFoundException, AssetNotFoundException)
- [ ] Business logic isolated and validated (premium vs free delete)
- [ ] Idempotency scenarios covered
- [ ] Mock repository used (no real DB)
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

## On Completion

```bash
git commit -m "MHSB-070: add user application layer unit tests

- Add command tests (add/delete/remove tracked assets, delete user)
- Add query tests (get current user, get tracked assets)
- Test error paths and business logic
- Use mocked repository for isolation
- Improve debuggability and test coverage"
```
