# MHSB-078: Subscription Domain Exceptions [REFACTOR]

## Description

Replace generic `Error` usage with domain-specific exceptions throughout the subscription module for better error tracking, meaningful error messages, and i18n support.

**Current Problems:**

1. Generic `Error` thrown in multiple places
2. No error codes for i18n
3. Hard to track specific error types in monitoring
4. Inconsistent error handling

**Priority:** 🟡 MEDIUM

## Dependencies

- None

## Files to Modify

- `src/modules/subscription/exceptions/subscription.exceptions.ts`
- `src/modules/subscription/application/commands/verify-subscription.command.ts`
- `src/modules/subscription/application/commands/restore-subscription.command.ts`
- `src/modules/subscription/infrastructure/services/apple-store.service.ts`
- `src/modules/subscription/infrastructure/services/google-store.service.ts`
- `src/shared/i18n/locales/en.json`
- `src/shared/i18n/locales/tr.json`

## Implementation Details

### 1. Add New Domain Exceptions

**File:** `src/modules/subscription/exceptions/subscription.exceptions.ts`

```typescript
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/shared/exceptions';

// ... existing exceptions ...

export class TransactionInfoMissingException extends BadRequestException {
  constructor(field: string) {
    super('errors.subscription.transaction_info_missing', { field });
  }
}

export class SubscriptionDataMissingException extends BadRequestException {
  constructor(field: string) {
    super('errors.subscription.subscription_data_missing', { field });
  }
}

export class AppleStoreConfigurationException extends InternalServerException {
  constructor(missingConfig: string[]) {
    super('errors.subscription.apple_store_not_configured', {
      missingConfig: missingConfig.join(', '),
    });
  }
}

export class GoogleStoreConfigurationException extends InternalServerException {
  constructor(missingConfig: string[]) {
    super('errors.subscription.google_store_not_configured', {
      missingConfig: missingConfig.join(', '),
    });
  }
}
```

### 2. Update verifySubscriptionCommand

**Before:**

```typescript
// ❌ Lines 28-34
if (input.platform === SUBSCRIPTION_PLATFORMS.IOS && !appleStoreService) {
  throw new Error('Apple Store integration is not configured');
}

if (input.platform === SUBSCRIPTION_PLATFORMS.ANDROID && !googleStoreService) {
  throw new Error('Google Play integration is not configured');
}
```

**After (if not using MHSB-077 registry):**

```typescript
// ✅ Domain-specific exception
if (input.platform === SUBSCRIPTION_PLATFORMS.IOS && !appleStoreService) {
  throw new AppleStoreConfigurationException(['appleStoreService']);
}

if (input.platform === SUBSCRIPTION_PLATFORMS.ANDROID && !googleStoreService) {
  throw new GoogleStoreConfigurationException(['googleStoreService']);
}
```

**Note:** If MHSB-077 is implemented, these checks are handled by the registry with `PlatformNotSupportedException`.

### 3. Update Transaction Validation

**Before:**

```typescript
// ❌ Line 42-44
if (!transactionInfo.expiresDate) {
  throw new Error('No expiration date in transaction');
}
```

**After:**

```typescript
// ✅ Domain exception
if (!transactionInfo.expiresDate) {
  throw new TransactionInfoMissingException('expiresDate');
}
```

**Before:**

```typescript
// ❌ Lines 51-53
if (!lineItem?.expiryTime) {
  throw new Error('No expiration time in subscription data');
}
```

**After:**

```typescript
// ✅ Domain exception
if (!lineItem?.expiryTime) {
  throw new SubscriptionDataMissingException('expiryTime');
}
```

### 4. Update restoreSubscriptionCommand

Apply same patterns as verify command for transaction/subscription data validation.

**Before:**

```typescript
// ❌ Lines 40-42
if (!appleStoreService) {
  throw new Error('Apple Store integration is not configured');
}
```

**After:**

```typescript
// ✅ Domain exception
if (!appleStoreService) {
  throw new AppleStoreConfigurationException(['appleStoreService']);
}
```

### 5. Update AppleStoreService

**Before:**

```typescript
// ❌ Lines 29-33
if (!keyPath || !keyId || !issuerId || !bundleId) {
  throw new Error(
    'Apple Store integration is not configured. Please set APPLE_KEY_PATH, APPLE_KEY_ID, APPLE_ISSUER_ID, and APPLE_BUNDLE_ID in your environment variables.',
  );
}
```

**After:**

```typescript
// ✅ Domain exception with specific missing config
const missingConfig: string[] = [];
if (!keyPath) missingConfig.push('APPLE_KEY_PATH');
if (!keyId) missingConfig.push('APPLE_KEY_ID');
if (!issuerId) missingConfig.push('APPLE_ISSUER_ID');
if (!bundleId) missingConfig.push('APPLE_BUNDLE_ID');

if (missingConfig.length > 0) {
  throw new AppleStoreConfigurationException(missingConfig);
}
```

**Before:**

```typescript
// ❌ Lines 39-43
if (!rootCAG3Path || !rootCAG2Path) {
  throw new Error(
    'Apple Root CA certificate paths are not configured. Please set APPLE_ROOT_CA_G3_PATH and APPLE_ROOT_CA_G2_PATH in your environment variables.',
  );
}
```

**After:**

```typescript
// ✅ Domain exception
const missingCerts: string[] = [];
if (!rootCAG3Path) missingCerts.push('APPLE_ROOT_CA_G3_PATH');
if (!rootCAG2Path) missingCerts.push('APPLE_ROOT_CA_G2_PATH');

if (missingCerts.length > 0) {
  throw new AppleStoreConfigurationException(missingCerts);
}
```

**Before:**

```typescript
// ❌ Lines 54-56
if (!transactionId) {
  throw new Error('No transaction found in receipt');
}
```

**After:**

```typescript
// ✅ Domain exception
if (!transactionId) {
  throw new InvalidReceiptException();
}
```

**Before:**

```typescript
// ❌ Lines 62-64
if (!response.signedTransactionInfo) {
  throw new Error('No signed transaction info in response');
}
```

**After:**

```typescript
// ✅ Domain exception
if (!response.signedTransactionInfo) {
  throw new TransactionInfoMissingException('signedTransactionInfo');
}
```

### 6. Update GoogleStoreService

**Before:**

```typescript
// ❌ Lines 28-33
if (!packageName || !serviceAccountKeyPath) {
  throw new Error(
    'Google Play integration is not configured. Please set GOOGLE_PACKAGE_NAME and GOOGLE_SERVICE_ACCOUNT_KEY_PATH in your environment variables.',
  );
}
```

**After:**

```typescript
// ✅ Domain exception
const missingConfig: string[] = [];
if (!packageName) missingConfig.push('GOOGLE_PACKAGE_NAME');
if (!serviceAccountKeyPath) missingConfig.push('GOOGLE_SERVICE_ACCOUNT_KEY_PATH');

if (missingConfig.length > 0) {
  throw new GoogleStoreConfigurationException(missingConfig);
}
```

**Before:**

```typescript
// ❌ Lines 58-60
if (!response.data) {
  throw new Error('No subscription data returned from Google Play');
}
```

**After:**

```typescript
// ✅ Domain exception
if (!response.data) {
  throw new SubscriptionDataMissingException('subscriptionData');
}
```

### 7. Add i18n Keys

**File:** `src/shared/i18n/locales/en.json`

```json
{
  "errors": {
    "subscription": {
      "transaction_info_missing": "Transaction information is incomplete. Missing field: {{field}}",
      "subscription_data_missing": "Subscription data is incomplete. Missing field: {{field}}",
      "apple_store_not_configured": "Apple Store integration is not configured. Missing: {{missingConfig}}",
      "google_store_not_configured": "Google Play integration is not configured. Missing: {{missingConfig}}"
    }
  }
}
```

**File:** `src/shared/i18n/locales/tr.json`

```json
{
  "errors": {
    "subscription": {
      "transaction_info_missing": "İşlem bilgisi eksik. Eksik alan: {{field}}",
      "subscription_data_missing": "Abonelik verisi eksik. Eksik alan: {{field}}",
      "apple_store_not_configured": "Apple Store entegrasyonu yapılandırılmamış. Eksik: {{missingConfig}}",
      "google_store_not_configured": "Google Play entegrasyonu yapılandırılmamış. Eksik: {{missingConfig}}"
    }
  }
}
```

## Benefits

### Before vs After

| Aspect          | Before              | After                    |
| --------------- | ------------------- | ------------------------ |
| Error Type      | ❌ Generic Error    | ✅ Domain-specific       |
| Error Tracking  | ❌ Hard to filter   | ✅ Easy to track by type |
| i18n Support    | ❌ No               | ✅ Full i18n             |
| Monitoring      | ❌ Generic alerts   | ✅ Specific alerts       |
| User Experience | ❌ Generic messages | ✅ Meaningful messages   |

## Migration Strategy

1. ✅ Add new exception classes
2. ✅ Add i18n keys
3. ✅ Update commands (verify, restore)
4. ✅ Update store services (Apple, Google)
5. ✅ Test exception throwing
6. ✅ Validate error messages in both languages
7. ✅ Update monitoring/alerting if needed

## Test Coverage

**Unit Tests:**

- ✅ Exceptions are thrown with correct error codes
- ✅ Error messages include dynamic values
- ✅ i18n keys resolve correctly in both languages

**Integration Tests:**

- ✅ Invalid receipt returns InvalidReceiptException
- ✅ Missing transaction info returns TransactionInfoMissingException
- ✅ Missing subscription data returns SubscriptionDataMissingException
- ✅ Missing config returns configuration exception on service init

## Acceptance Criteria

- [ ] All new exceptions added to subscription.exceptions.ts
- [ ] All generic `Error` usage replaced
- [ ] i18n keys added for all new exceptions
- [ ] Commands updated (verify, restore)
- [ ] Store services updated (Apple, Google)
- [ ] Error messages include relevant context
- [ ] English error messages readable
- [ ] Turkish error messages readable
- [ ] Exception types are specific and meaningful
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-078: replace generic errors with domain exceptions

- Add TransactionInfoMissingException
- Add SubscriptionDataMissingException
- Add AppleStoreConfigurationException
- Add GoogleStoreConfigurationException
- Replace all generic Error usage
- Add i18n keys for new exceptions
- Improve error tracking and monitoring
- Better user-facing error messages"
```
