# MHSB-073: TrackedAsset Entity Tests [TEST]

## Description

Create unit tests for the `TrackedAsset` entity in the User module's domain layer. These tests will validate the factory method, equality comparison logic, and value object behavior.

**Current Gap:** TrackedAsset entity has no tests, risking silent failures in asset identity comparison and factory logic.

## Dependencies

- MHSB-020 (User Domain Layer)

## Files to Create

- `tests/unit/modules/user/domain/tracked-asset.entity.test.ts`

## Test Coverage

### Factory Method (create)

**Success Cases:**

- Create TrackedAsset with all fields
- Auto-set addedAt if not provided
- Preserve provided addedAt if specified
- Accept all valid assetTypes (currency, commodity)
- Accept string userId

**Edge Cases:**

- Empty assetCode (should this be allowed?)
- Special characters in assetCode
- Very long assetCode
- Date in the past vs future

### Getter Accessors

**Test all getters:**

- `userId` returns correct value
- `assetType` returns correct enum value
- `assetCode` returns correct string
- `addedAt` returns Date object

**Immutability:**

- Verify getters return values, not references
- Ensure properties cannot be modified externally

### Equality Comparison (equals)

**True Cases (should be equal):**

- Same userId, assetType, assetCode (different addedAt)
- Same object reference

**False Cases (should NOT be equal):**

- Different userId
- Different assetType
- Different assetCode
- Same assetCode but different type (e.g., "USD" currency vs "USD" commodity)

**Edge Cases:**

- Comparison with null
- Comparison with undefined
- Comparison with different class instance

### Value Object Behavior

**Immutability:**

- Properties cannot be changed after creation
- No setter methods
- Frozen object (if implemented)

**Identity:**

- Equality based on attributes, not object reference
- Two instances with same attributes are equal

## Test Pattern Example

```typescript
import { describe, it, expect } from 'bun:test';
import { TrackedAsset } from '@/modules/user/domain';

describe('TrackedAsset Entity', () => {
  describe('create', () => {
    it('should create TrackedAsset with all fields', () => {
      const asset = TrackedAsset.create({
        userId: 'user-123',
        assetType: 'currency',
        assetCode: 'USD',
        addedAt: new Date('2024-01-15'),
      });

      expect(asset.userId).toBe('user-123');
      expect(asset.assetType).toBe('currency');
      expect(asset.assetCode).toBe('USD');
      expect(asset.addedAt).toEqual(new Date('2024-01-15'));
    });

    it('should auto-set addedAt if not provided', () => {
      const beforeCreate = new Date();

      const asset = TrackedAsset.create({
        userId: 'user-123',
        assetType: 'currency',
        assetCode: 'EUR',
      });

      const afterCreate = new Date();

      expect(asset.addedAt).toBeInstanceOf(Date);
      expect(asset.addedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(asset.addedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it('should accept commodity assetType', () => {
      const asset = TrackedAsset.create({
        userId: 'user-123',
        assetType: 'commodity',
        assetCode: 'GOLD',
      });

      expect(asset.assetType).toBe('commodity');
    });

    it('should handle special characters in assetCode', () => {
      const asset = TrackedAsset.create({
        userId: 'user-123',
        assetType: 'currency',
        assetCode: 'BTC/USD',
      });

      expect(asset.assetCode).toBe('BTC/USD');
    });
  });

  describe('equals', () => {
    it('should be equal when userId, assetType, assetCode match', () => {
      const asset1 = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
        addedAt: new Date('2024-01-01'),
      });

      const asset2 = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
        addedAt: new Date('2024-06-15'), // Different date
      });

      expect(asset1.equals(asset2)).toBe(true);
    });

    it('should NOT be equal when userId differs', () => {
      const asset1 = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
      });

      const asset2 = TrackedAsset.create({
        userId: 'user-2',
        assetType: 'currency',
        assetCode: 'USD',
      });

      expect(asset1.equals(asset2)).toBe(false);
    });

    it('should NOT be equal when assetType differs', () => {
      const asset1 = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
      });

      const asset2 = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'commodity',
        assetCode: 'USD',
      });

      expect(asset1.equals(asset2)).toBe(false);
    });

    it('should NOT be equal when assetCode differs', () => {
      const asset1 = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
      });

      const asset2 = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'EUR',
      });

      expect(asset1.equals(asset2)).toBe(false);
    });

    it('should handle same object reference', () => {
      const asset = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
      });

      expect(asset.equals(asset)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should not allow external modification of properties', () => {
      const asset = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
      });

      // These should not compile if immutability is enforced
      // @ts-expect-error - properties should be readonly
      expect(() => {
        asset.assetCode = 'EUR';
      }).toThrow();
    });

    it('should return consistent values from getters', () => {
      const asset = TrackedAsset.create({
        userId: 'user-1',
        assetType: 'currency',
        assetCode: 'USD',
      });

      const code1 = asset.assetCode;
      const code2 = asset.assetCode;

      expect(code1).toBe(code2);
      expect(code1).toBe('USD');
    });
  });
});
```

## Acceptance Criteria

- [ ] Factory method tested with all scenarios
- [ ] Auto addedAt setting verified
- [ ] All getter accessors tested
- [ ] Equality comparison logic validated
- [ ] Immutability enforced and tested
- [ ] Edge cases covered
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

## On Completion

```bash
git commit -m "MHSB-073: add TrackedAsset entity tests

- Test factory method and auto addedAt
- Verify equality comparison logic
- Test getter accessors
- Validate value object immutability
- Cover edge cases (special characters, date handling)
- Improve domain layer reliability"
```
