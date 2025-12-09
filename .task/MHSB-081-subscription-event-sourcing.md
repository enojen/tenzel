# MHSB-081: Subscription Event Sourcing [FEATURE]

## Description

Implement event sourcing for subscription lifecycle to provide audit trail, debug capability, and analytics foundation. Record domain events for key subscription state transitions.

**Current State:** State changes happen directly without event history. Hard to debug issues, track user journey, or analyze subscription patterns.

**Priority:** 🟢 LOW (Nice to have)

## Dependencies

- MHSB-076 (Transaction management - events should be stored atomically with state changes)

## Files to Create

- `src/modules/subscription/domain/events/subscription-activated.event.ts`
- `src/modules/subscription/domain/events/subscription-canceled.event.ts`
- `src/modules/subscription/domain/events/subscription-expired.event.ts`
- `src/modules/subscription/domain/events/subscription-grace-period-entered.event.ts`
- `src/modules/subscription/domain/events/subscription-restored.event.ts`
- `src/modules/subscription/domain/events/index.ts`
- `src/modules/subscription/infrastructure/database/tables/subscription-events.table.ts`
- `src/modules/subscription/infrastructure/repositories/subscription-event.repository.ts`

## Files to Modify

- `src/modules/subscription/domain/entities/subscription.entity.ts`
- `src/modules/subscription/application/commands/verify-subscription.command.ts`
- `src/modules/subscription/application/commands/restore-subscription.command.ts`
- `src/modules/subscription/application/handlers/webhook-event.handler.ts`
- `src/modules/subscription/domain/repositories/subscription.repository.interface.ts`

## Implementation Details

### 1. Create Domain Events

**File:** `src/modules/subscription/domain/events/subscription-activated.event.ts`

```typescript
import type { SubscriptionPlatform } from '../value-objects/subscription-platform.vo';

import { DomainEvent } from '@/shared/domain/events/domain-event';

export interface SubscriptionActivatedEventData {
  subscriptionId: string;
  userId: string;
  platform: SubscriptionPlatform;
  billingKey: string;
  expiresAt: Date;
  previousStatus?: string;
  source: 'verify' | 'restore' | 'webhook';
}

export class SubscriptionActivatedEvent extends DomainEvent<SubscriptionActivatedEventData> {
  static readonly EVENT_TYPE = 'subscription.activated';

  constructor(data: SubscriptionActivatedEventData) {
    super(SubscriptionActivatedEvent.EVENT_TYPE, data);
  }
}
```

**File:** `src/modules/subscription/domain/events/subscription-canceled.event.ts`

```typescript
export interface SubscriptionCanceledEventData {
  subscriptionId: string;
  userId: string;
  billingKey: string;
  expiresAt: Date;
  source: 'user_action' | 'webhook';
}

export class SubscriptionCanceledEvent extends DomainEvent<SubscriptionCanceledEventData> {
  static readonly EVENT_TYPE = 'subscription.canceled';

  constructor(data: SubscriptionCanceledEventData) {
    super(SubscriptionCanceledEvent.EVENT_TYPE, data);
  }
}
```

**File:** `src/modules/subscription/domain/events/subscription-expired.event.ts`

```typescript
export interface SubscriptionExpiredEventData {
  subscriptionId: string;
  userId: string;
  billingKey: string;
  expiredAt: Date;
  source: 'cron_job' | 'webhook';
}

export class SubscriptionExpiredEvent extends DomainEvent<SubscriptionExpiredEventData> {
  static readonly EVENT_TYPE = 'subscription.expired';

  constructor(data: SubscriptionExpiredEventData) {
    super(SubscriptionExpiredEvent.EVENT_TYPE, data);
  }
}
```

**File:** `src/modules/subscription/domain/events/subscription-grace-period-entered.event.ts`

```typescript
export interface SubscriptionGracePeriodEnteredEventData {
  subscriptionId: string;
  userId: string;
  billingKey: string;
  expiresAt: Date;
  reason: 'payment_failed' | 'billing_issue';
}

export class SubscriptionGracePeriodEnteredEvent extends DomainEvent<SubscriptionGracePeriodEnteredEventData> {
  static readonly EVENT_TYPE = 'subscription.grace_period_entered';

  constructor(data: SubscriptionGracePeriodEnteredEventData) {
    super(SubscriptionGracePeriodEnteredEvent.EVENT_TYPE, data);
  }
}
```

**File:** `src/modules/subscription/domain/events/subscription-restored.event.ts`

```typescript
export interface SubscriptionRestoredEventData {
  subscriptionId: string;
  userId: string;
  previousUserId?: string;
  billingKey: string;
  expiresAt: Date;
}

export class SubscriptionRestoredEvent extends DomainEvent<SubscriptionRestoredEventData> {
  static readonly EVENT_TYPE = 'subscription.restored';

  constructor(data: SubscriptionRestoredEventData) {
    super(SubscriptionRestoredEvent.EVENT_TYPE, data);
  }
}
```

### 2. Update Subscription Entity

**File:** `src/modules/subscription/domain/entities/subscription.entity.ts`

```typescript
import {
  SubscriptionActivatedEvent,
  SubscriptionCanceledEvent,
  SubscriptionExpiredEvent,
  SubscriptionGracePeriodEnteredEvent,
} from '../events';

export class Subscription extends AggregateRoot<SubscriptionProps> {
  // ... existing code ...

  activate(expiresAt?: Date, source: 'verify' | 'restore' | 'webhook' = 'webhook'): void {
    const previousStatus = this.props.status;
    this.props.status = SUBSCRIPTION_STATUSES.ACTIVE;
    if (expiresAt) {
      this.props.expiresAt = expiresAt;
    }
    this.props.updatedAt = new Date();

    // ✅ Add domain event
    this.addDomainEvent(
      new SubscriptionActivatedEvent({
        subscriptionId: this.id,
        userId: this.userId,
        platform: this.platform,
        billingKey: this.billingKey,
        expiresAt: this.expiresAt,
        previousStatus,
        source,
      }),
    );
  }

  cancel(source: 'user_action' | 'webhook' = 'webhook'): void {
    this.props.status = SUBSCRIPTION_STATUSES.CANCELED;
    this.props.updatedAt = new Date();

    // ✅ Add domain event
    this.addDomainEvent(
      new SubscriptionCanceledEvent({
        subscriptionId: this.id,
        userId: this.userId,
        billingKey: this.billingKey,
        expiresAt: this.expiresAt,
        source,
      }),
    );
  }

  expire(source: 'cron_job' | 'webhook' = 'cron_job'): void {
    this.props.status = SUBSCRIPTION_STATUSES.EXPIRED;
    this.props.updatedAt = new Date();

    // ✅ Add domain event
    this.addDomainEvent(
      new SubscriptionExpiredEvent({
        subscriptionId: this.id,
        userId: this.userId,
        billingKey: this.billingKey,
        expiredAt: new Date(),
        source,
      }),
    );
  }

  enterGracePeriod(reason: 'payment_failed' | 'billing_issue' = 'payment_failed'): void {
    this.props.status = SUBSCRIPTION_STATUSES.GRACE_PERIOD;
    this.props.updatedAt = new Date();

    // ✅ Add domain event
    this.addDomainEvent(
      new SubscriptionGracePeriodEnteredEvent({
        subscriptionId: this.id,
        userId: this.userId,
        billingKey: this.billingKey,
        expiresAt: this.expiresAt,
        reason,
      }),
    );
  }

  // ... rest of existing methods ...
}
```

### 3. Create Event Store Table

**File:** `src/modules/subscription/infrastructure/database/tables/subscription-events.table.ts`

```typescript
import { pgTable, text, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';

export const subscriptionEventsTable = pgTable('subscription_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  subscriptionId: text('subscription_id').notNull(),
  userId: text('user_id').notNull(),
  eventData: jsonb('event_data').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type DbSubscriptionEvent = typeof subscriptionEventsTable.$inferSelect;
```

### 4. Create Event Repository

**File:** `src/modules/subscription/infrastructure/repositories/subscription-event.repository.ts`

```typescript
import { db } from '@/shared/infrastructure/database/drizzle';
import { subscriptionEventsTable } from '../database/tables/subscription-events.table';
import type { DomainEvent } from '@/shared/domain/events/domain-event';
import type { TransactionClient } from '@/shared/infrastructure/database/transaction';

export class SubscriptionEventRepository {
  constructor(private readonly database: TransactionClient = db) {}

  async saveEvents(events: DomainEvent<any>[], tx?: TransactionClient): Promise<void> {
    if (events.length === 0) return;

    const client = tx ?? this.database;

    await client.insert(subscriptionEventsTable).values(
      events.map((event) => ({
        eventType: event.eventType,
        subscriptionId: event.data.subscriptionId,
        userId: event.data.userId,
        eventData: event.data,
        occurredAt: event.occurredAt,
      })),
    );
  }

  async getEventsBySubscriptionId(subscriptionId: string): Promise<DbSubscriptionEvent[]> {
    return this.database
      .select()
      .from(subscriptionEventsTable)
      .where(eq(subscriptionEventsTable.subscriptionId, subscriptionId))
      .orderBy(subscriptionEventsTable.occurredAt);
  }

  async getEventsByUserId(userId: string): Promise<DbSubscriptionEvent[]> {
    return this.database
      .select()
      .from(subscriptionEventsTable)
      .where(eq(subscriptionEventsTable.userId, userId))
      .orderBy(subscriptionEventsTable.occurredAt);
  }
}
```

### 5. Update Commands to Persist Events

**File:** `src/modules/subscription/application/commands/verify-subscription.command.ts`

```typescript
export async function verifySubscriptionCommand(
  input: VerifySubscriptionInput,
  deps: VerifySubscriptionDeps,
): Promise<VerifySubscriptionResult> {
  // ... validation ...

  return await withTransaction(async (tx) => {
    let subscription: Subscription;

    if (existingSubscription) {
      existingSubscription.activate(expiresAt, 'verify'); // ✅ Creates event
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
      subscription.activate(expiresAt, 'verify'); // ✅ Creates event
    }

    const user = await userRepository.update(
      userId,
      { accountTier: ACCOUNT_TIERS.PREMIUM, subscriptionExpiresAt: expiresAt },
      tx,
    );

    // ✅ Persist events atomically
    await eventRepository.saveEvents(subscription.getDomainEvents(), tx);
    subscription.clearDomainEvents();

    return { user, subscription };
  });
}
```

### 6. Add Event Query Endpoint (Optional)

**File:** `src/modules/subscription/api/subscription.controller.ts`

```typescript
export function subscriptionController(deps: SubscriptionControllerDeps) {
  return (
    new Elysia()
      // ... existing endpoints ...
      .get(
        '/events',
        async ({ user }) => {
          const events = await deps.eventRepository.getEventsByUserId(user.id);
          return { events };
        },
        {
          detail: {
            summary: 'Get subscription event history',
            description: 'Returns all subscription events for the current user',
            tags: ['Subscriptions'],
          },
        },
      )
  );
}
```

## Benefits

### Audit Trail

- ✅ Complete history of subscription changes
- ✅ Who/what/when/why for each change
- ✅ Forensic debugging capability

### Analytics

- ✅ Track subscription lifecycle patterns
- ✅ Measure time in each status
- ✅ Calculate churn rate
- ✅ Analyze cancellation reasons

### Debugging

- ✅ Replay subscription history
- ✅ Identify when issues occurred
- ✅ Understand user journey

### Compliance

- ✅ GDPR audit requirements
- ✅ Financial audit trail
- ✅ Dispute resolution

## Event Storage Size

**Estimated size per event:** ~500 bytes (JSON)

**Events per subscription lifecycle:**

- Activation: 1
- Renewals: ~12/year
- Cancellation: 1
- Expiration: 1
- Total: ~15 events/subscription/year

**Storage for 10K subscriptions:** ~7.5 MB/year (negligible)

## Migration Strategy

1. ✅ Create domain events
2. ✅ Create event store table
3. ✅ Create event repository
4. ✅ Update entity methods to emit events
5. ✅ Update commands to persist events
6. ✅ Add migration for subscription_events table
7. ✅ Add unit tests for events
8. ✅ Add integration tests
9. ✅ Monitor event storage size

## Test Coverage

**Unit Tests:**

- ✅ Entity methods emit correct events
- ✅ Event data includes all required fields
- ✅ Multiple events can be emitted
- ✅ clearDomainEvents() works

**Integration Tests:**

- ✅ Events persisted on verify subscription
- ✅ Events persisted on restore subscription
- ✅ Events persisted on webhook processing
- ✅ Events rolled back on transaction failure
- ✅ Query events by subscriptionId
- ✅ Query events by userId

## Acceptance Criteria

- [ ] All domain events created
- [ ] subscription_events table created
- [ ] SubscriptionEventRepository implemented
- [ ] Subscription entity emits events
- [ ] Commands persist events atomically
- [ ] Events rolled back on failure
- [ ] Query endpoint for events (optional)
- [ ] Unit tests for events pass
- [ ] Integration tests pass
- [ ] Migration for events table
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-081: implement subscription event sourcing

- Create subscription domain events
- Add subscription_events table
- Create SubscriptionEventRepository
- Update entity to emit events
- Persist events atomically with state changes
- Add event query capability
- Provide complete audit trail
- Enable analytics and debugging
- Add comprehensive tests"
```

## Future Enhancements

- Event replay for debugging
- Event-driven notifications
- Event streaming to analytics platform
- Snapshot optimization for large event logs
