# MHSB-026: User Module Type Refactoring [REFACTOR]

## Description

Refactor user module to fix TypeScript errors, centralize enums, follow \_user-example patterns, and add mapper layer.

## Dependencies

- MHSB-022 (User Repository)
- MHSB-023 (User API - Me Endpoints)
- MHSB-024 (User API - Tracked Assets)

## Files to Create

- `src/modules/user/application/dto/user.mapper.ts`
- `src/modules/user/application/dto/index.ts`

## Files to Modify

- `src/shared/types/context.ts` - Import AccountTier from domain
- `src/modules/user/api/user.schemas.ts` - Derive enums from domain constants
- `src/modules/user/api/user.controller.ts` - Use authMiddleware chain, remove manual types, use mapper
- `src/modules/user/domain/repositories/user.repository.interface.ts` → Rename to `user.repository.ts`, change IUserRepository to UserRepository
- `src/modules/user/infrastructure/database/tables/tracked-assets.table.ts` - Import enum values from domain
- `src/modules/user/application/queries/get-current-user.query.ts` - Return mapped response
- `src/modules/user/application/queries/get-tracked-assets.query.ts` - Return mapped response
- Update all imports referencing IUserRepository

## Implementation Details

### 1. Centralize Enums (Single Source of Truth)

- Use existing `domain/value-objects/account-tier.vo.ts` and `asset-type.vo.ts`
- All schemas and tables derive from these constants

### 2. Repository Naming Convention

- Follow \_user-example: `UserRepository` instead of `IUserRepository`

### 3. Mapper Pattern

- Domain Entity → API Response DTO transformation in mapper
- Controller stays clean, no inline mapping

### 4. Fix Elysia Type Integration

- Chain authMiddleware in controller
- Let Elysia infer context types automatically

## Completed Work

### Auth Context Type Safety (2025-12-08)

Fixed type-unsafe casting in user.controller.ts using Elysia's Service Locator pattern:

**Problem:** `const { user } = ctx as unknown as AuthContext` - unsafe double casting

**Solution:**

1. `auth.middleware.ts` - Added `name: 'auth'` for deduplication and `as: 'global'` for type propagation
2. `user.controller.ts` - Added `.use(authMiddleware)` to get proper type inference
3. `user/index.ts` - Removed redundant authMiddleware (now in controller)

**Files Modified:**

- `src/shared/middleware/auth.middleware.ts`
- `src/modules/user/api/user.controller.ts`
- `src/modules/user/index.ts`

## Acceptance Criteria

- [x] No TypeScript errors (bun run typecheck passes)
- [x] Controller has type-safe auth context (no casting)
- [ ] All enums defined in single location (domain/value-objects)
- [ ] Repository follows UserRepository naming (no I prefix)
- [ ] Mapper handles all domain→response transformations
- [ ] Controller has no inline data mapping
- [ ] All existing tests pass

## On Completion

```bash
git commit -m "MHSB-026: refactor user module types and patterns"
```
