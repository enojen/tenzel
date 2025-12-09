# MHSB-076: Subscription Transaction Management [REFACTOR]

## Description

Implement atomic transaction management for Subscription module operations. Currently, subscription and user updates are executed as separate operations, creating risk of partial failures and data inconsistency.

**Current Gap:** Operations in `verifySubscriptionCommand`, `restoreSubscriptionCommand`, and `processWebhookEvent` perform multiple database writes without transactions. If any operation fails, partial data can be committed causing:

- Subscription active but user remains free tier
- User upgraded but subscription not updated
- Race conditions on concurrent webhook events

**Priority:** 🔴 CRITICAL

## Dependencies

- MHSB-074 (User Transaction Management - reuse transaction utility)
- MHSB-036 (Subscription Module Tests - to validate transaction behavior)

## Files to Modify

- `src/modules/subscription/application/commands/verify-subscription.command.ts`
- `src/modules/subscription/application/commands/restore-subscription.command.ts`
- `src/modules/subscription/application/handlers/webhook-event.handler.ts`
- `src/modules/subscription/infrastructure/repositories/subscription.repository.ts`
- `src/modules/subscription/domain/repositories/subscription.repository.interface.ts`
- `src/modules/user/infrastructure/repositories/user.repository.ts` (if not already done in MHSB-074)
- `src/modules/user/domain/repositories/user.repository.interface.ts` (if not already done in MHSB-074)

## Implementation Details

### 1. Update Repository Interfaces to Accept Transaction Client

**SubscriptionRepository Interface:**

```typescript
import type { TransactionClient } from '@/shared/infrastructure/database/transaction';

export interface SubscriptionRepository {
  findById(id: string, tx?: TransactionClient): Promise<Subscription | null>;
  findByUserId(userId: string, tx?: TransactionClient): Promise<Subscription | null>;
  findByBillingKey(billingKey: string, tx?: TransactionClient): Promise<Subscription | null>;
  findExpired(tx?: TransactionClient): Promise<Subscription[]>;
  create(data: CreateSubscriptionDto, tx?: TransactionClient): Promise<Subscription>;
  update(id: string, data: UpdateSubscriptionDto, tx?: TransactionClient): Promise<Subscription>;
  findWebhookLog(eventId: string, tx?: TransactionClient): Promise<WebhookLog | null>;
  createWebhookLog(data: CreateWebhookLogDto, tx?: TransactionClient): Promise<WebhookLog>;
}
```

### 2. Update Repository Implementation

**Pattern:**

```typescript
export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly database: TransactionClient = db) {}

  async update(
    id: string,
    data: UpdateSubscriptionDto,
    tx?: TransactionClient,
  ): Promise<Subscription> {
    const client = tx ?? this.database;

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

    const [updated] = await client
      .update(subscriptionsTable)
      .set(updateData)
      .where(eq(subscriptionsTable.id, id))
      .returning();

    if (!updated) {
      throw new SubscriptionUpdateFailedException();
    }

    return this.toDomain(updated);
  }

  // ... apply same pattern to all methods
}
```

### 3. Update verifySubscriptionCommand

**Current (Non-Atomic):**

```typescript
// ❌ Lines 65-82
const subscription = await subscriptionRepository.update(...);
const user = await userRepository.update(...);
```

**Fixed (Atomic):**

```typescript
export async function verifySubscriptionCommand(
  input: VerifySubscriptionInput,
  deps: VerifySubscriptionDeps,
): Promise<VerifySubscriptionResult> {
  const { userId, subscriptionRepository, userRepository } = deps;

  // ... validation logic (outside transaction) ...

  return await withTransaction(async (tx) => {
    let subscription: Subscription;

    if (existingSubscription) {
      subscription = await subscriptionRepository.update(
        existingSubscription.id,
        {
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt,
        },
        tx,
      );
    } else {
      subscription = await subscriptionRepository.create(
        {
          userId,
          platform: input.platform,
          billingKey: input.billingKey,
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          expiresAt,
        },
        tx,
      );
    }

    const user = await userRepository.update(
      userId,
      {
        accountTier: ACCOUNT_TIERS.PREMIUM,
        subscriptionExpiresAt: expiresAt,
      },
      tx,
    );

    return { user, subscription };
  });
}
```

### 4. Update restoreSubscriptionCommand

**Current (Non-Atomic):**

```typescript
// ❌ Lines 70-78
const subscription = await subscriptionRepository.update(...);
const user = await userRepository.update(...);
```

**Fixed (Atomic):**

```typescript
return await withTransaction(async (tx) => {
  const subscription = await subscriptionRepository.update(
    existingSubscription.id,
    { status: SUBSCRIPTION_STATUSES.ACTIVE, expiresAt },
    tx,
  );

  const user = await userRepository.update(
    userId,
    { accountTier: ACCOUNT_TIERS.PREMIUM, subscriptionExpiresAt: expiresAt },
    tx,
  );

  return { restored: true, user, subscription };
});
```

### 5. Update processWebhookEvent Handler

**Current (Non-Atomic):**

```typescript
// ❌ Multiple separate updates throughout switch cases
await subscriptionRepository.update(subscription.id, {...});
await userRepository.update(subscription.userId, {...});
```

**Fixed (Atomic):**

```typescript
export async function processWebhookEvent(
  params: ProcessWebhookEventParams,
  deps: ProcessWebhookEventDeps,
): Promise<ProcessWebhookEventResult> {
  const { eventId, platform, eventType, billingKey, payload, expiresAt } = params;
  const { subscriptionRepository, userRepository } = deps;

  // Idempotency check (outside transaction)
  const existingLog = await subscriptionRepository.findWebhookLog(eventId);
  if (existingLog) {
    logger.info({ eventId, platform, eventType }, 'Webhook already processed');
    return { alreadyProcessed: true };
  }

  const subscription = await subscriptionRepository.findByBillingKey(billingKey);
  if (!subscription) {
    throw new SubscriptionNotFoundException();
  }

  // Process event atomically
  await withTransaction(async (tx) => {
    switch (eventType) {
      case WEBHOOK_EVENT_TYPES.DID_RENEW:
      case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RENEWED:
        if (expiresAt) {
          await subscriptionRepository.update(
            subscription.id,
            { status: SUBSCRIPTION_STATUSES.ACTIVE, expiresAt },
            tx,
          );
          await userRepository.update(
            subscription.userId,
            { accountTier: ACCOUNT_TIERS.PREMIUM, subscriptionExpiresAt: expiresAt },
            tx,
          );
        }
        break;

      case WEBHOOK_EVENT_TYPES.EXPIRED:
      case WEBHOOK_EVENT_TYPES.GRACE_PERIOD_EXPIRED:
      case WEBHOOK_EVENT_TYPES.SUBSCRIPTION_EXPIRED:
        await subscriptionRepository.update(
          subscription.id,
          { status: SUBSCRIPTION_STATUSES.EXPIRED },
          tx,
        );
        await userRepository.update(
          subscription.userId,
          { accountTier: ACCOUNT_TIERS.FREE, subscriptionExpiresAt: null },
          tx,
        );
        break;

      // ... other cases ...
    }

    // Log webhook after successful processing (within transaction)
    await subscriptionRepository.createWebhookLog(
      { eventId, platform, eventType, billingKey, payload },
      tx,
    );
  });

  return { alreadyProcessed: false };
}
```

## Error Handling

**Transaction Rollback:**

- Automatic rollback on thrown exceptions
- Preserves domain exceptions (InvalidReceiptException, SubscriptionNotFoundException, etc.)

**Error Propagation:**

```typescript
try {
  await withTransaction(async (tx) => {
    // operations
  });
} catch (error) {
  if (error instanceof InvalidReceiptException) {
    throw error; // Preserve domain exceptions
  }
  if (error instanceof SubscriptionUpdateFailedException) {
    throw error;
  }
  logger.error({ error }, 'Transaction failed');
  throw new InternalServerException('subscription.transaction_failed');
}
```

## Test Coverage

**Integration Tests (in MHSB-036):**

### Commit Scenarios:

- ✅ Verify subscription: Both subscription and user updated
- ✅ Restore subscription: Both records updated atomically
- ✅ Webhook processing: All updates committed together

### Rollback Scenarios:

- ✅ Subscription update succeeds, user update fails → rollback both
- ✅ User update fails → subscription not created
- ✅ Webhook log creation fails → entire event processing rolled back

### Concurrent Operations:

- ✅ Two webhooks for same subscription arrive simultaneously
- ✅ Verify and restore called concurrently
- ✅ Multiple expiry job runs

### Data Consistency:

- ✅ Verify subscription.status always matches user.accountTier
- ✅ Verify subscription.expiresAt === user.subscriptionExpiresAt

## Migration Strategy

1. ✅ Ensure MHSB-074 transaction utility exists
2. ✅ Update repository interfaces (add optional `tx` parameter)
3. ✅ Update repository implementations
4. ✅ Update verifySubscriptionCommand
5. ✅ Update restoreSubscriptionCommand
6. ✅ Update processWebhookEvent
7. ✅ Add integration tests for transaction behavior
8. ✅ Validate with `bun test`

## Acceptance Criteria

- [ ] All repository methods accept optional `tx` parameter
- [ ] SubscriptionRepository uses TransactionClient
- [ ] UserRepository uses TransactionClient (from MHSB-074)
- [ ] verifySubscriptionCommand wrapped in transaction
- [ ] restoreSubscriptionCommand wrapped in transaction
- [ ] processWebhookEvent wrapped in transaction
- [ ] Rollback behavior tested (subscription + user consistency)
- [ ] Concurrent webhook tests pass
- [ ] Race condition scenarios handled
- [ ] No partial data commits possible
- [ ] Domain exceptions preserved through transaction
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-076: implement subscription transaction management

- Add transaction support to SubscriptionRepository
- Update verifySubscriptionCommand with atomic operations
- Update restoreSubscriptionCommand with atomic operations
- Update processWebhookEvent with atomic operations
- Ensure subscription+user consistency with rollback
- Prevent partial failures and race conditions
- Add integration tests for transaction behavior"
```

## References

- [Red Hat - Transactions in Node.js](https://developers.redhat.com/articles/2023/07/31/how-handle-transactions-nodejs-reference-architecture)
- [MongoDB Transactions Guide](https://www.prisma.io/dataguide/mongodb/mongodb-transactions)
- [Propagated Transactions for Node.js](https://dev.to/mokuteki225/propagated-transactions-for-nodejs-applications-2ob4)
- [SohamKamani - SQL Transactions in Node.js](https://www.sohamkamani.com/nodejs/sql-transactions/)
