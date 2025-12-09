# MHSB-075: User Domain Events Enhancement [REFACTOR]

## Description

Enhance the User module with comprehensive domain event implementation. This will enable event-driven architecture, eventual consistency, and future integration with external systems (notifications, analytics, subscription management).

**Current Gap:** User entity extends AggregateRoot but never calls `addDomainEvent()`, missing opportunities for event-driven patterns and decoupled communication.

## Dependencies

- MHSB-020 (User Domain Layer)

## Files to Create

### Domain Events

- `src/modules/user/domain/events/user-created.event.ts`
- `src/modules/user/domain/events/user-upgraded-to-premium.event.ts`
- `src/modules/user/domain/events/user-downgraded-to-free.event.ts`
- `src/modules/user/domain/events/user-deleted.event.ts`
- `src/modules/user/domain/events/tracked-asset-added.event.ts`
- `src/modules/user/domain/events/tracked-asset-removed.event.ts`

### Event Infrastructure (Optional)

- `src/shared/domain/event-publisher.ts`
- `src/shared/domain/event-handler.interface.ts`

## Files to Modify

- `src/modules/user/domain/entities/user.entity.ts`
- `src/modules/user/application/commands/*.command.ts` (event publishing)

## Implementation Details

### 1. Define Domain Events

**Base Event Pattern:**

```typescript
// src/modules/user/domain/events/user-created.event.ts
import { DomainEvent } from '@/shared/domain';

export interface UserCreatedEventPayload {
  userId: string;
  deviceId: string;
  accountTier: 'free' | 'premium';
  createdAt: Date;
}

export class UserCreatedEvent extends DomainEvent<UserCreatedEventPayload> {
  constructor(payload: UserCreatedEventPayload) {
    super('user.created', payload);
  }
}
```

**All Domain Events:**

1. **UserCreatedEvent** - When user first created
   - Payload: userId, deviceId, accountTier, createdAt

2. **UserUpgradedToPremiumEvent** - When account tier upgraded
   - Payload: userId, subscriptionExpiresAt, upgradedAt

3. **UserDowngradedToFreeEvent** - When premium expires or manually downgraded
   - Payload: userId, downgradedAt, reason

4. **UserDeletedEvent** - When user soft/hard deleted
   - Payload: userId, deleteType ('soft' | 'hard'), deletedAt

5. **TrackedAssetAddedEvent** - When asset added to tracking list
   - Payload: userId, assetType, assetCode, addedAt

6. **TrackedAssetRemovedEvent** - When asset removed
   - Payload: userId, assetType, assetCode, removedAt

### 2. Update User Entity to Emit Events

**Modify entity methods:**

```typescript
export class User extends AggregateRoot<UserProps> {
  upgradeToPremium(expiresAt: Date): void {
    this.props.accountTier = 'premium';
    this.props.subscriptionExpiresAt = expiresAt;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new UserUpgradedToPremiumEvent({
        userId: this.id,
        subscriptionExpiresAt: expiresAt,
        upgradedAt: this.props.updatedAt,
      }),
    );
  }

  downgradeToFree(): void {
    this.props.accountTier = 'free';
    this.props.subscriptionExpiresAt = null;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new UserDowngradedToFreeEvent({
        userId: this.id,
        downgradedAt: this.props.updatedAt,
        reason: 'manual',
      }),
    );
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new UserDeletedEvent({
        userId: this.id,
        deleteType: 'soft',
        deletedAt: this.props.deletedAt,
      }),
    );
  }

  static create(props: Omit<UserProps, 'id'> & { id?: string }): User {
    const user = new User({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    } as UserProps);

    // Only emit event for new users (no id provided)
    if (!props.id) {
      user.addDomainEvent(
        new UserCreatedEvent({
          userId: user.id,
          deviceId: user.deviceId,
          accountTier: user.accountTier,
          createdAt: user.createdAt!,
        }),
      );
    }

    return user;
  }
}
```

### 3. Event Publishing Infrastructure

**Option A: Simple In-Memory Publisher**

```typescript
// src/shared/domain/event-publisher.ts
import type { DomainEvent } from './domain-event';

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void>;

export class EventPublisher {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) || [];
    this.handlers.set(eventName, [...existing, handler]);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) || [];
    await Promise.all(handlers.map((h) => h(event)));
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

export const eventPublisher = new EventPublisher();
```

**Option B: Integration with Message Broker (Future)**

Prepare structure for RabbitMQ, Kafka, or AWS SQS integration:

```typescript
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}
```

### 4. Publish Events After Persistence

**Update command handlers:**

```typescript
export async function createUserHandler(
  input: CreateUserInput,
  deps: CreateUserDeps,
): Promise<UserResponse> {
  const user = User.create(input);
  const created = await deps.userRepo.create(user);

  // Publish domain events after persistence
  const events = created.getDomainEvents();
  await eventPublisher.publishAll(events);
  created.clearDomainEvents();

  return userMapper.toUserResponse(created);
}
```

### 5. Event Handler Examples

**User Created Handler (Example):**

```typescript
// src/modules/user/application/event-handlers/user-created.handler.ts
import type { UserCreatedEvent } from '../../domain/events';

export async function handleUserCreated(event: UserCreatedEvent): Promise<void> {
  // Future integrations:
  // - Send welcome email
  // - Track analytics event
  // - Initialize default settings
  // - Notify admin dashboard

  console.log('User created:', event.payload);
}
```

**Registration:**

```typescript
// src/modules/user/index.ts
import { eventPublisher } from '@/shared/domain/event-publisher';
import { handleUserCreated } from './application/event-handlers/user-created.handler';

eventPublisher.on('user.created', async (event) => {
  await handleUserCreated(event as UserCreatedEvent);
});
```

## Use Cases for Events

### Immediate (Post-Implementation):

- **Logging & Audit:** Track all user lifecycle events
- **Analytics:** Send events to analytics service
- **Testing:** Verify events emitted in unit tests

### Future Integrations:

- **Notifications:** Email/push notifications on premium upgrade
- **Subscription Management:** Sync with payment provider
- **External Systems:** Webhook notifications to third parties
- **Read Models:** Update denormalized views (CQRS)
- **Background Jobs:** Trigger async processing

## Test Coverage

**Unit Tests:**

- Verify events added to entity on state changes
- Test event payload correctness
- Ensure events cleared after publishing

**Integration Tests:**

- Verify events published after persistence
- Test event handler execution
- Validate event ordering

## Migration Strategy

1. Create domain event classes (no side effects yet)
2. Update entity methods to add events
3. Create event publisher infrastructure
4. Add event publishing in command handlers
5. Create basic event handlers (logging only)
6. Add tests for event emission and handling
7. Gradually add real event handlers

## Acceptance Criteria

- [ ] All 6 domain events defined
- [ ] User entity emits events on state changes
- [ ] Event publisher infrastructure created
- [ ] Events published after persistence
- [ ] At least 1 event handler implemented (logging)
- [ ] Unit tests verify event emission
- [ ] Integration tests verify event publishing
- [ ] Documentation for adding new events
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-075: enhance user domain events

- Add 6 domain events (created, upgraded, downgraded, deleted, asset added/removed)
- Update User entity to emit events
- Create event publisher infrastructure
- Publish events after persistence
- Add logging event handler
- Enable event-driven architecture foundation
- Support future integrations (notifications, analytics)"
```
