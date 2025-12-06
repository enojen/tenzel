# MHSB-022: User Repository [REPO]

## Description

Implement User repository with all CRUD operations and tracked assets management.

## Dependencies

- MHSB-020 (User Domain)
- MHSB-021 (User Database)

## Files to Create

- `src/modules/user/infrastructure/repositories/user.repository.ts`
- `src/modules/user/infrastructure/index.ts`

## Implementation Details

### UserRepository Methods

```typescript
class UserRepository implements IUserRepository {
  // User CRUD
  async findById(id: string): Promise<User | null>;
  async findByDeviceId(deviceId: string): Promise<User | null>;
  async create(data: CreateUserDto): Promise<User>;
  async update(id: string, data: UpdateUserDto): Promise<User>;

  // Deletion
  async softDelete(id: string): Promise<void>; // Set deletedAt
  async hardDelete(id: string): Promise<void>; // Actually delete

  // Tracked Assets
  async getTrackedAssets(userId: string): Promise<TrackedAsset[]>;
  async addTrackedAsset(userId: string, asset: AddTrackedAssetDto): Promise<TrackedAsset[]>;
  async removeTrackedAsset(
    userId: string,
    assetCode: string,
    assetType: AssetType,
  ): Promise<TrackedAsset[]>;

  // Soft delete cleanup (for cron job)
  async findExpiredSoftDeleted(days: number): Promise<User[]>;
}
```

### Important Business Rules

- `findByDeviceId` should exclude soft-deleted users (WHERE deleted_at IS NULL)
- `softDelete` sets deletedAt timestamp
- `addTrackedAsset` is idempotent (return success if already exists)
- `removeTrackedAsset` is idempotent (return success if doesn't exist)

## Acceptance Criteria

- [ ] All repository methods implemented
- [ ] Soft delete logic works correctly
- [ ] Tracked assets operations are idempotent
- [ ] Foreign key cascade works for hard delete
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-022: implement user repository"
```
