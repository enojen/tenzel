# MHSB-003: Premium Guard [INFRA]

## Description

Create middleware guard that checks if user has premium account tier.

## Dependencies

- MHSB-002 (Auth Middleware - for user context)

## Files to Create/Modify

- `src/shared/middleware/premium.guard.ts` (create)
- `src/shared/middleware/index.ts` (modify - add export)

## Implementation Details

### Premium Guard

```typescript
// Checks user.accountTier from context
// Returns 403 PREMIUM_REQUIRED if not premium
// Allows request to continue if premium

export const premiumGuard = (app: Elysia) =>
  app.derive(({ user }) => {
    if (user.accountTier !== 'premium') {
      throw new ForbiddenException('error.premium_required', 'PREMIUM_REQUIRED');
    }
    return {};
  });
```

## Acceptance Criteria

- [ ] Guard checks accountTier from user context
- [ ] Returns 403 with PREMIUM_REQUIRED code for free users
- [ ] Premium users pass through
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-003: add premium guard middleware"
```
