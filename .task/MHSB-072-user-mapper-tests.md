# MHSB-072: User DTO Mapper Tests [TEST]

## Description

Create unit tests for the User module's DTO mapper (`user.mapper.ts`). These tests will validate data transformation between domain entities and API response DTOs, ensuring correct date serialization, field mapping, and null handling.

**Current Gap:** DTO mapper has no tests, risking silent date formatting failures and incorrect API responses.

## Dependencies

- MHSB-025 (User Module Tests - existing test setup)

## Files to Create

- `tests/unit/modules/user/application/dto/user.mapper.test.ts`

## Test Coverage

### toUserResponse()

**Success Cases:**

- Map all user fields correctly
- Serialize dates to ISO 8601 format
- Convert accountTier enum to string
- Handle null subscriptionExpiresAt
- Handle non-null subscriptionExpiresAt

**Edge Cases:**

- Empty string fields
- Date edge cases (year 2000, leap year, timezone boundaries)
- Premium user with expired subscription
- Free user (no subscription)

### toTrackedAssetResponse()

**Success Cases:**

- Map all tracked asset fields
- Serialize addedAt to ISO 8601
- Convert assetType enum to string
- Handle userId as string

**Edge Cases:**

- Asset with special characters in code (e.g., "BTC/USD")
- Very old addedAt dates

### toTrackedAssetsResponse()

**Success Cases:**

- Map empty array to empty array
- Map single asset
- Map multiple assets
- Preserve array order

**Edge Cases:**

- Very large arrays (100+ items)
- Assets with duplicate codes (different types)

## Test Pattern Example

```typescript
import { describe, it, expect } from 'bun:test';
import { userMapper } from '@/modules/user/application/dto/user.mapper';
import { User, TrackedAsset } from '@/modules/user/domain';

describe('userMapper', () => {
  describe('toUserResponse', () => {
    it('should map user with all fields', () => {
      const user = User.create({
        id: 'user-123',
        deviceId: 'device-456',
        accountTier: 'premium',
        subscriptionExpiresAt: new Date('2025-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-06-15T12:30:00Z'),
        deletedAt: null,
      });

      const result = userMapper.toUserResponse(user);

      expect(result).toEqual({
        id: 'user-123',
        accountTier: 'premium',
        subscriptionExpiresAt: '2025-12-31T23:59:59.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-06-15T12:30:00.000Z',
      });
    });

    it('should handle null subscriptionExpiresAt', () => {
      const user = User.create({
        deviceId: 'device-789',
        accountTier: 'free',
        subscriptionExpiresAt: null,
      });

      const result = userMapper.toUserResponse(user);

      expect(result.subscriptionExpiresAt).toBeNull();
    });

    it('should serialize dates to ISO 8601 format', () => {
      const testDate = new Date('2024-03-15T10:30:45.123Z');
      const user = User.create({
        deviceId: 'device-test',
        accountTier: 'free',
        createdAt: testDate,
      });

      const result = userMapper.toUserResponse(user);

      expect(result.createdAt).toBe('2024-03-15T10:30:45.123Z');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('toTrackedAssetResponse', () => {
    it('should map tracked asset fields', () => {
      const asset = TrackedAsset.create({
        userId: 'user-123',
        assetType: 'currency',
        assetCode: 'USD',
        addedAt: new Date('2024-05-20T08:15:30Z'),
      });

      const result = userMapper.toTrackedAssetResponse(asset);

      expect(result).toEqual({
        userId: 'user-123',
        assetType: 'currency',
        assetCode: 'USD',
        addedAt: '2024-05-20T08:15:30.000Z',
      });
    });

    it('should handle special characters in assetCode', () => {
      const asset = TrackedAsset.create({
        userId: 'user-123',
        assetType: 'commodity',
        assetCode: 'XAU/USD',
        addedAt: new Date(),
      });

      const result = userMapper.toTrackedAssetResponse(asset);

      expect(result.assetCode).toBe('XAU/USD');
    });
  });

  describe('toTrackedAssetsResponse', () => {
    it('should return empty array for empty input', () => {
      const result = userMapper.toTrackedAssetsResponse([]);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should map multiple assets', () => {
      const assets = [
        TrackedAsset.create({
          userId: 'user-1',
          assetType: 'currency',
          assetCode: 'USD',
          addedAt: new Date('2024-01-01'),
        }),
        TrackedAsset.create({
          userId: 'user-1',
          assetType: 'commodity',
          assetCode: 'GOLD',
          addedAt: new Date('2024-01-02'),
        }),
      ];

      const result = userMapper.toTrackedAssetsResponse(assets);

      expect(result).toHaveLength(2);
      expect(result[0].assetCode).toBe('USD');
      expect(result[1].assetCode).toBe('GOLD');
    });

    it('should preserve array order', () => {
      const assets = [
        TrackedAsset.create({ userId: 'u1', assetType: 'currency', assetCode: 'A' }),
        TrackedAsset.create({ userId: 'u1', assetType: 'currency', assetCode: 'B' }),
        TrackedAsset.create({ userId: 'u1', assetType: 'currency', assetCode: 'C' }),
      ];

      const result = userMapper.toTrackedAssetsResponse(assets);

      expect(result.map((r) => r.assetCode)).toEqual(['A', 'B', 'C']);
    });
  });
});
```

## Date Serialization Tests

**Critical:** Verify ISO 8601 format compliance:

- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Timezone: Always UTC (Z suffix)
- Milliseconds: Always 3 digits
- No timezone offset (e.g., +00:00)

## Acceptance Criteria

- [ ] All mapper methods tested
- [ ] Date serialization to ISO 8601 verified
- [ ] Null handling tested
- [ ] Empty array handling tested
- [ ] Edge cases covered (special characters, large arrays)
- [ ] Type safety maintained (TypeScript)
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

## On Completion

```bash
git commit -m "MHSB-072: add user DTO mapper tests

- Test toUserResponse date serialization
- Test toTrackedAssetResponse field mapping
- Test toTrackedAssetsResponse array handling
- Verify ISO 8601 format compliance
- Cover null and edge cases
- Improve API response reliability"
```
