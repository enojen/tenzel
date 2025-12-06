# MHSB-004: Rate Limit Middleware [INFRA]

## Description

Create rate limiting middleware with configurable limits per endpoint group.

## Dependencies

- MHSB-001 (TooManyRequestsException)

## Files to Create/Modify

- `src/shared/middleware/rate-limit.middleware.ts` (create)
- `src/shared/middleware/index.ts` (modify - add export)
- `src/shared/infrastructure/rate-limiter/` (create directory)
- `src/shared/infrastructure/rate-limiter/memory-store.ts` (create)

## Implementation Details

### Rate Limits Configuration

| Endpoint Group           | Limit   | Window              |
| ------------------------ | ------- | ------------------- |
| POST /api/app/init       | 10 req  | per minute per IP   |
| /api/rates/\*            | 120 req | per minute per user |
| /api/converter/calculate | 60 req  | per minute per user |
| /api/users/me/tracked    | 30 req  | per minute per user |
| /api/subscriptions/\*    | 10 req  | per minute per user |

### Rate Limit Response

```typescript
// HTTP 429
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": { "retryAfter": 60 }
  }
}
```

## Acceptance Criteria

- [ ] Rate limiter supports per-IP and per-user limiting
- [ ] Configurable limits per endpoint pattern
- [ ] Returns 429 with retryAfter when exceeded
- [ ] Memory-based store (can be replaced with Redis later)
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-004: add rate limiting middleware"
```
