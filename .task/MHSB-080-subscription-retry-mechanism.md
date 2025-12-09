# MHSB-080: Subscription Retry Mechanism [FEATURE]

## Description

Implement retry mechanism for external store API calls to improve reliability when dealing with network instability, rate limits, and temporary service outages.

**Current State:** No retry logic. If Apple/Google APIs fail temporarily, the entire request fails.

**Priority:** 🟢 LOW (Nice to have)

## Dependencies

- None

## Files to Create

- `src/shared/utils/retry.ts`

## Files to Modify

- `src/modules/subscription/infrastructure/services/apple-store.service.ts`
- `src/modules/subscription/infrastructure/services/google-store.service.ts`

## Implementation Details

### 1. Create Retry Utility

**File:** `src/shared/utils/retry.ts`

```typescript
import { createModuleLogger } from '../logging';

const logger = createModuleLogger('retry-utility');

export interface RetryOptions {
  retries?: number;
  delay?: number;
  exponentialBackoff?: boolean;
  maxDelay?: number;
  retryableErrors?: Array<new (...args: any[]) => Error>;
  onRetry?: (error: Error, attempt: number) => void;
}

export class RetryExhaustedException extends Error {
  constructor(
    message: string,
    public readonly lastError: Error,
    public readonly attempts: number,
  ) {
    super(message);
    this.name = 'RetryExhaustedException';
  }
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    exponentialBackoff = true,
    maxDelay = 10000,
    retryableErrors = [],
    onRetry,
  } = options;

  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (retryableErrors.length > 0) {
        const isRetryable = retryableErrors.some((ErrorClass) => error instanceof ErrorClass);
        if (!isRetryable) {
          throw error;
        }
      }

      // Last attempt, throw error
      if (attempt > retries) {
        throw new RetryExhaustedException(
          `Operation failed after ${attempt} attempts`,
          lastError,
          attempt,
        );
      }

      // Log retry
      logger.warn(
        {
          error: lastError.message,
          attempt,
          maxAttempts: retries + 1,
          nextDelay: currentDelay,
        },
        'Retrying operation',
      );

      // Call onRetry callback
      if (onRetry) {
        onRetry(lastError, attempt);
      }

      // Wait before retry
      await sleep(currentDelay);

      // Calculate next delay
      if (exponentialBackoff) {
        currentDelay = Math.min(currentDelay * 2, maxDelay);
      }
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 2. Update Apple Store Service

**File:** `src/modules/subscription/infrastructure/services/apple-store.service.ts`

```typescript
import { retry, RetryExhaustedException } from '@/shared/utils/retry';

export class AppleStoreService {
  // ... existing code ...

  async validateReceipt(receipt: string): Promise<JWSTransactionDecodedPayload> {
    const transactionId = this.receiptUtil.extractTransactionIdFromAppReceipt(receipt);

    if (!transactionId) {
      throw new Error('No transaction found in receipt');
    }

    logger.debug({ transactionId }, 'Extracting transaction info from receipt');

    // ✅ Add retry logic
    try {
      const response = await retry(() => this.client.getTransactionInfo(transactionId), {
        retries: 3,
        delay: 1000,
        exponentialBackoff: true,
        maxDelay: 5000,
        onRetry: (error, attempt) => {
          logger.warn(
            { transactionId, attempt, error: error.message },
            'Retrying Apple Store API call',
          );
        },
      });

      if (!response.signedTransactionInfo) {
        throw new Error('No signed transaction info in response');
      }

      return this.verifier.verifyAndDecodeTransaction(response.signedTransactionInfo);
    } catch (error) {
      if (error instanceof RetryExhaustedException) {
        logger.error(
          {
            transactionId,
            attempts: error.attempts,
            lastError: error.lastError.message,
          },
          'Apple Store API call failed after retries',
        );
      }
      throw error;
    }
  }

  async verifyWebhookNotification(signedPayload: string): Promise<ResponseBodyV2DecodedPayload> {
    // No retry for webhook verification (needs to be fast)
    return this.verifier.verifyAndDecodeNotification(signedPayload);
  }

  async getSubscriptionStatus(transactionId: string): Promise<StatusResponse> {
    // ✅ Add retry logic
    return retry(() => this.client.getAllSubscriptionStatuses(transactionId), {
      retries: 3,
      delay: 1000,
      exponentialBackoff: true,
      maxDelay: 5000,
      onRetry: (error, attempt) => {
        logger.warn(
          { transactionId, attempt, error: error.message },
          'Retrying subscription status check',
        );
      },
    });
  }
}
```

### 3. Update Google Store Service

**File:** `src/modules/subscription/infrastructure/services/google-store.service.ts`

```typescript
import { retry, RetryExhaustedException } from '@/shared/utils/retry';
import { GaxiosError } from 'gaxios';

export class GoogleStoreService {
  // ... existing code ...

  async validateReceipt(
    purchaseToken: string,
  ): Promise<androidpublisher_v3.Schema$SubscriptionPurchaseV2> {
    logger.debug({ purchaseToken: purchaseToken.substring(0, 10) + '...' }, 'Validating receipt');

    // ✅ Add retry logic with specific error handling
    try {
      const response = await retry(
        () =>
          this.client.purchases.subscriptionsv2.get({
            packageName: this.packageName,
            token: purchaseToken,
          }),
        {
          retries: 3,
          delay: 1000,
          exponentialBackoff: true,
          maxDelay: 5000,
          retryableErrors: [GaxiosError], // Only retry on network errors
          onRetry: (error, attempt) => {
            logger.warn(
              {
                purchaseToken: purchaseToken.substring(0, 10) + '...',
                attempt,
                error: error.message,
              },
              'Retrying Google Play API call',
            );
          },
        },
      );

      if (!response.data) {
        throw new Error('No subscription data returned from Google Play');
      }

      return response.data;
    } catch (error) {
      if (error instanceof RetryExhaustedException) {
        logger.error(
          {
            purchaseToken: purchaseToken.substring(0, 10) + '...',
            attempts: error.attempts,
            lastError: error.lastError.message,
          },
          'Google Play API call failed after retries',
        );
      }
      throw error;
    }
  }

  decodePubSubMessage(data: string): GoogleNotification {
    // No retry for decoding (synchronous operation)
    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }
}
```

## Retry Strategy

### Configuration

| Service | Operation             | Retries | Initial Delay | Max Delay | Backoff     |
| ------- | --------------------- | ------- | ------------- | --------- | ----------- |
| Apple   | validateReceipt       | 3       | 1s            | 5s        | Exponential |
| Apple   | getSubscriptionStatus | 3       | 1s            | 5s        | Exponential |
| Apple   | verifyWebhook         | 0       | -             | -         | None        |
| Google  | validateReceipt       | 3       | 1s            | 5s        | Exponential |
| Google  | decodePubSub          | 0       | -             | -         | None        |

### Rationale

**Why retry validateReceipt?**

- Network instability common
- Apple/Google APIs can have temporary issues
- User-initiated, can afford slight delay

**Why NOT retry webhook verification?**

- Must respond quickly (< 30s)
- Apple/Google will retry webhook themselves
- Idempotency protects against duplicate processing

**Exponential backoff:**

- 1st retry: 1s delay
- 2nd retry: 2s delay
- 3rd retry: 4s delay (capped at 5s)

## Error Handling

### Retryable Errors

- Network timeouts
- Connection errors
- 5xx server errors
- Rate limit errors (429)

### Non-Retryable Errors

- 4xx client errors (except 429)
- Authentication errors
- Invalid receipt format
- Domain exceptions (InvalidReceiptException)

## Monitoring & Logging

**Metrics to track:**

- Retry count per operation
- Success rate after retries
- Average retry delay
- Operations failing after all retries

**Log levels:**

- `warn` - Each retry attempt
- `error` - Retry exhausted
- `info` - Success after retry

## Test Coverage

**Unit Tests:**

- ✅ Retry utility retries n times
- ✅ Exponential backoff increases delay
- ✅ Max delay cap respected
- ✅ RetryExhaustedException thrown after max retries
- ✅ Non-retryable errors thrown immediately

**Integration Tests:**

- ✅ Apple API call retries on network error
- ✅ Google API call retries on network error
- ✅ Webhook verification does NOT retry
- ✅ Success after 2 retries
- ✅ Failure after 3 retries

**Mock Tests:**

- ✅ Mock API to fail 2 times then succeed
- ✅ Mock API to always fail
- ✅ Verify delays are applied

## Migration Strategy

1. ✅ Create retry utility
2. ✅ Add unit tests for retry utility
3. ✅ Update Apple Store Service
4. ✅ Update Google Store Service
5. ✅ Add integration tests
6. ✅ Monitor retry metrics in staging
7. ✅ Deploy to production

## Acceptance Criteria

- [ ] Retry utility created with exponential backoff
- [ ] RetryExhaustedException implemented
- [ ] Apple validateReceipt uses retry
- [ ] Apple getSubscriptionStatus uses retry
- [ ] Google validateReceipt uses retry
- [ ] Webhook operations do NOT retry
- [ ] Retry attempts are logged
- [ ] RetryExhaustedException includes attempt count
- [ ] Unit tests for retry utility pass
- [ ] Integration tests with mocked failures pass
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-080: add retry mechanism for store API calls

- Create retry utility with exponential backoff
- Add RetryExhaustedException
- Implement retry for Apple Store API calls
- Implement retry for Google Play API calls
- Skip retry for webhook verification (fast response required)
- Add comprehensive logging
- Improve reliability against network issues
- Add unit and integration tests"
```

## Future Enhancements

- Circuit breaker pattern for persistent failures
- Adaptive retry based on error type
- Retry budget to prevent cascading delays
- Distributed tracing for retry chains
