# MHSB-002: Auth Middleware [INFRA]

## Description

Create JWT authentication middleware that validates tokens and attaches user context to requests.

## Dependencies

- MHSB-005 (JWT Service)

## Files to Create/Modify

- `src/shared/middleware/auth.middleware.ts` (create)
- `src/shared/middleware/index.ts` (modify - add export)
- `src/shared/types/context.ts` (create - user context type)

## Implementation Details

### Auth Middleware

```typescript
// Extracts Bearer token from Authorization header
// Validates JWT using JwtService
// Fetches user from database
// Attaches user to request context
// Returns 401 UNAUTHORIZED if no token
// Returns 401 INVALID_TOKEN if token invalid or user deleted
```

### User Context Type

```typescript
interface AuthenticatedUser {
  id: string;
  deviceId: string;
  accountTier: 'free' | 'premium';
  subscriptionExpiresAt: string | null;
}
```

## Acceptance Criteria

- [ ] Middleware extracts Bearer token
- [ ] Validates token with JwtService
- [ ] Attaches user to Elysia context
- [ ] Returns proper error codes (UNAUTHORIZED, INVALID_TOKEN)
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-002: add JWT auth middleware with user context"
```
