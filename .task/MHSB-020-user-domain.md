# MHSB-020: User Domain Layer [DOMAIN]

## Description

Create User module domain layer with entities, value objects, and repository interface.

## Dependencies

None

## Files to Create

- `src/modules/user/domain/entities/user.entity.ts`
- `src/modules/user/domain/entities/tracked-asset.entity.ts`
- `src/modules/user/domain/value-objects/account-tier.vo.ts`
- `src/modules/user/domain/value-objects/asset-type.vo.ts`
- `src/modules/user/domain/repositories/user.repository.interface.ts`
- `src/modules/user/domain/index.ts`

## Implementation Details

### User Entity

```typescript
interface User {
  id: string;
  deviceId: string;
  accountTier: AccountTier; // 'free' | 'premium'
  subscriptionExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // Soft delete for premium users
}
```

### TrackedAsset Entity

```typescript
interface TrackedAsset {
  userId: string;
  assetType: AssetType; // 'currency' | 'commodity'
  assetCode: string;
  addedAt: Date;
}
```

### Value Objects

- `AccountTier`: 'free' | 'premium'
- `AssetType`: 'currency' | 'commodity'

### Repository Interface

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByDeviceId(deviceId: string): Promise<User | null>;
  create(user: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;

  // Tracked assets
  getTrackedAssets(userId: string): Promise<TrackedAsset[]>;
  addTrackedAsset(userId: string, asset: AddTrackedAssetDto): Promise<TrackedAsset[]>;
  removeTrackedAsset(
    userId: string,
    assetCode: string,
    assetType: AssetType,
  ): Promise<TrackedAsset[]>;
}
```

## Acceptance Criteria

- [ ] User entity with all properties
- [ ] TrackedAsset entity
- [ ] Value objects for AccountTier and AssetType
- [ ] Repository interface defined
- [ ] All types exported from index.ts
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-020: add user module domain layer"
```
