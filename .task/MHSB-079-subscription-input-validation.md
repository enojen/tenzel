# MHSB-079: Subscription Input Validation Enhancement [REFACTOR]

## Description

Enhance input validation for subscription endpoints using Zod schemas for better security, early failure detection, and improved error messages.

**Current State:** Basic validation exists via TypeScript types and Elysia schemas, but could be more comprehensive for security and UX.

**Priority:** 🟡 MEDIUM

## Dependencies

- None

## Files to Modify

- `src/modules/subscription/api/subscription.schemas.ts`
- `src/modules/subscription/application/commands/verify-subscription.command.ts`
- `src/modules/subscription/application/commands/restore-subscription.command.ts`

## Implementation Details

### 1. Enhance Subscription Schemas

**File:** `src/modules/subscription/api/subscription.schemas.ts`

```typescript
import { t } from 'elysia';

export const verifySubscriptionRequestSchema = t.Object({
  platform: t.Union([t.Literal('ios'), t.Literal('android')]),
  receipt: t.String({
    minLength: 1,
    maxLength: 10000,
    error: 'Receipt must be between 1 and 10000 characters',
  }),
  billingKey: t.String({
    minLength: 1,
    maxLength: 500,
    error: 'Billing key must be between 1 and 500 characters',
  }),
  productId: t.String({
    minLength: 1,
    maxLength: 200,
    pattern: '^[a-zA-Z0-9._-]+$', // Common product ID format
    error: 'Product ID must contain only alphanumeric characters, dots, underscores, and hyphens',
  }),
});

export const restoreSubscriptionRequestSchema = t.Object({
  platform: t.Union([t.Literal('ios'), t.Literal('android')]),
  billingKey: t.String({
    minLength: 1,
    maxLength: 500,
    error: 'Billing key must be between 1 and 500 characters',
  }),
  receipt: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 10000,
      error: 'Receipt must be between 1 and 10000 characters',
    }),
  ),
});
```

### 2. Add Input Sanitization

Create a sanitization utility:

**File:** `src/modules/subscription/application/utils/input-sanitizer.ts`

```typescript
export const sanitizeSubscriptionInput = {
  receipt(receipt: string): string {
    // Remove whitespace and null bytes
    return receipt.trim().replace(/\0/g, '');
  },

  billingKey(billingKey: string): string {
    // Remove whitespace and null bytes
    return billingKey.trim().replace(/\0/g, '');
  },

  productId(productId: string): string {
    // Remove whitespace
    return productId.trim();
  },
};
```

### 3. Add Command-Level Validation

**File:** `src/modules/subscription/application/commands/verify-subscription.command.ts`

Add validation at the beginning of the command:

```typescript
import { sanitizeSubscriptionInput } from '../utils/input-sanitizer';
import { InvalidInputException } from '../../exceptions';

export async function verifySubscriptionCommand(
  input: VerifySubscriptionInput,
  deps: VerifySubscriptionDeps,
): Promise<VerifySubscriptionResult> {
  // Sanitize inputs
  const sanitizedInput = {
    platform: input.platform,
    receipt: sanitizeSubscriptionInput.receipt(input.receipt),
    billingKey: sanitizeSubscriptionInput.billingKey(input.billingKey),
    productId: sanitizeSubscriptionInput.productId(input.productId),
  };

  // Additional business logic validation
  if (sanitizedInput.receipt.length === 0) {
    throw new InvalidInputException('receipt', 'Receipt cannot be empty after sanitization');
  }

  if (sanitizedInput.billingKey.length === 0) {
    throw new InvalidInputException('billingKey', 'Billing key cannot be empty after sanitization');
  }

  // ... rest of command logic with sanitizedInput ...
}
```

### 4. Add Rate Limiting Considerations

Document in schemas:

```typescript
/**
 * Verify Subscription Request
 *
 * Rate Limit: 10 requests per minute per user (as per backend-modules-docs.md)
 *
 * Validation Rules:
 * - platform: Must be 'ios' or 'android'
 * - receipt: 1-10000 chars, sanitized (whitespace/null bytes removed)
 * - billingKey: 1-500 chars, sanitized
 * - productId: 1-200 chars, alphanumeric + [._-]
 */
export const verifySubscriptionRequestSchema = t.Object({
  // ... schema ...
});
```

### 5. Add Custom Error Messages for Validation

**File:** `src/modules/subscription/exceptions/subscription.exceptions.ts`

```typescript
export class InvalidInputException extends BadRequestException {
  constructor(field: string, reason: string) {
    super('errors.subscription.invalid_input', { field, reason });
  }
}

export class ReceiptTooLargeException extends BadRequestException {
  constructor(size: number, maxSize: number) {
    super('errors.subscription.receipt_too_large', { size, maxSize });
  }
}
```

### 6. Add i18n Keys

**File:** `src/shared/i18n/locales/en.json`

```json
{
  "errors": {
    "subscription": {
      "invalid_input": "Invalid input for field '{{field}}': {{reason}}",
      "receipt_too_large": "Receipt size ({{size}}) exceeds maximum allowed ({{maxSize}})"
    }
  }
}
```

**File:** `src/shared/i18n/locales/tr.json`

```json
{
  "errors": {
    "subscription": {
      "invalid_input": "'{{field}}' alanı için geçersiz giriş: {{reason}}",
      "receipt_too_large": "Makbuz boyutu ({{size}}) izin verilen maksimumu ({{maxSize}}) aşıyor"
    }
  }
}
```

## Security Considerations

### SQL Injection Prevention

- ✅ Using Drizzle ORM with parameterized queries
- ✅ No raw SQL in subscription module

### XSS Prevention

- ✅ Receipt/billingKey are not rendered in HTML
- ✅ Stored as-is, never executed

### Input Size Limits

- ✅ Receipt: max 10KB
- ✅ BillingKey: max 500 chars
- ✅ ProductId: max 200 chars

### Null Byte Injection

- ✅ Sanitized in input sanitizer

### Command Injection

- ✅ No shell execution with user input
- ✅ No eval/Function usage

## Validation Layers

| Layer             | Tool           | Purpose                  |
| ----------------- | -------------- | ------------------------ |
| 1. API Schema     | Elysia         | Type & format validation |
| 2. Sanitization   | Custom utility | Remove dangerous chars   |
| 3. Business Logic | Command        | Domain rules validation  |
| 4. Store API      | Apple/Google   | Receipt authenticity     |

## Test Coverage

**Unit Tests:**

- ✅ Sanitization removes whitespace
- ✅ Sanitization removes null bytes
- ✅ Empty string after sanitization throws error
- ✅ Valid input passes all checks

**Integration Tests:**

- ✅ Request with too-long receipt returns 400
- ✅ Request with invalid platform returns 400
- ✅ Request with special chars in productId returns 400
- ✅ Valid request passes validation
- ✅ Error messages are localized

## Migration Strategy

1. ✅ Add enhanced schemas
2. ✅ Create input sanitizer
3. ✅ Add new exceptions
4. ✅ Update commands to use sanitization
5. ✅ Add i18n keys
6. ✅ Add unit tests
7. ✅ Add integration tests
8. ✅ Validate with `bun test`

## Acceptance Criteria

- [ ] Enhanced validation schemas in place
- [ ] Input sanitizer created and tested
- [ ] InvalidInputException added
- [ ] ReceiptTooLargeException added
- [ ] Commands sanitize inputs
- [ ] i18n keys added for new errors
- [ ] Unit tests for sanitization pass
- [ ] Integration tests for validation pass
- [ ] No valid inputs are rejected
- [ ] All invalid inputs are rejected
- [ ] Error messages are clear and helpful
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-079: enhance subscription input validation

- Add comprehensive validation schemas
- Create input sanitizer utility
- Add InvalidInputException
- Add ReceiptTooLargeException
- Sanitize inputs in commands
- Add validation tests
- Improve security posture
- Better error messages for users"
```
