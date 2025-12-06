# MHSB-005: JWT Service [INFRA]

## Description

Create JWT service for token generation and validation. Tokens have no expiration.

## Dependencies

None

## Files to Create/Modify

- `src/shared/infrastructure/jwt/jwt.service.ts` (create)
- `src/shared/infrastructure/jwt/index.ts` (create)
- `src/shared/infrastructure/index.ts` (modify - add export)

## Implementation Details

### JWT Payload

```typescript
interface JwtPayload {
  userId: string;
  deviceId: string;
  iat: number; // issued at
  // NO exp - tokens don't expire
}
```

### JWT Service Interface

```typescript
interface JwtService {
  sign(payload: { userId: string; deviceId: string }): string;
  verify(token: string): JwtPayload | null;
}
```

### Implementation Notes

- Use `jsonwebtoken` package or Bun's built-in crypto
- Secret from config (JWT_SECRET, min 32 chars)
- No expiration - tokens invalidated only on user deletion
- Return null on invalid/malformed tokens

## Acceptance Criteria

- [ ] JwtService.sign() generates valid JWT
- [ ] JwtService.verify() validates and returns payload
- [ ] Tokens have no expiration
- [ ] Uses JWT_SECRET from config
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-005: add JWT service for token management"
```
