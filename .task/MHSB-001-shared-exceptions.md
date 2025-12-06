# MHSB-001: Shared Exceptions [INFRA]

## Description

Add missing exception class for rate limiting to the shared exceptions.

## Dependencies

None

## Files to Create/Modify

- `src/shared/exceptions/too-many-requests.exception.ts` (create)
- `src/shared/exceptions/index.ts` (modify - add export)

## Implementation Details

### TooManyRequestsException

```typescript
export class TooManyRequestsException extends HttpException {
  constructor(
    messageKey: string = 'error.rate_limit_exceeded',
    code: string = 'RATE_LIMIT_EXCEEDED',
    details?: { retryAfter: number },
  ) {
    super(429, messageKey, code, details);
  }
}
```

## Acceptance Criteria

- [ ] TooManyRequestsException class created
- [ ] Exported from shared/exceptions/index.ts
- [ ] Returns HTTP 429 status code
- [ ] Supports retryAfter in details

## On Completion

```bash
git commit -m "MHSB-001: add TooManyRequestsException to shared exceptions"
```
