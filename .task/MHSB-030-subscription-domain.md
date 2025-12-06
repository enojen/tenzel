# MHSB-030: Subscription Domain Layer [DOMAIN]

## Description

Create Subscription module domain layer with entity, value objects, and repository interface.

## Dependencies

None

## Files to Create

- `src/modules/subscription/domain/entities/subscription.entity.ts`
- `src/modules/subscription/domain/entities/webhook-log.entity.ts`
- `src/modules/subscription/domain/value-objects/subscription-status.vo.ts`
- `src/modules/subscription/domain/value-objects/subscription-platform.vo.ts`
- `src/modules/subscription/domain/repositories/subscription.repository.interface.ts`
- `src/modules/subscription/domain/index.ts`

## Implementation Details

### Subscription Entity

```typescript
interface Subscription {
  id: string;
  userId: string;
  platform: SubscriptionPlatform; // 'ios' | 'android'
  billingKey: string; // Apple: originalTransactionId, Google: purchaseToken
  status: SubscriptionStatus; // 'active' | 'expired' | 'canceled' | 'grace_period'
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### WebhookLog Entity (for idempotency)

```typescript
interface WebhookLog {
  id: string;
  eventId: string; // Apple: notificationUUID, Google: messageId
  platform: 'apple' | 'google';
  eventType: string;
  billingKey: string;
  processedAt: Date;
  payload: string; // JSON
}
```

### Subscription Status Lifecycle

```
(none) → active → canceled → expired
                ↘ grace_period → expired
                              → active (recovered)
```

### Repository Interface

```typescript
interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription | null>;
  findByBillingKey(billingKey: string): Promise<Subscription | null>;
  create(subscription: CreateSubscriptionDto): Promise<Subscription>;
  update(id: string, data: UpdateSubscriptionDto): Promise<Subscription>;
  findExpired(): Promise<Subscription[]>;

  // Webhook logs
  findWebhookLog(eventId: string): Promise<WebhookLog | null>;
  createWebhookLog(log: CreateWebhookLogDto): Promise<WebhookLog>;
}
```

## Acceptance Criteria

- [ ] Subscription entity with all properties
- [ ] WebhookLog entity for idempotency
- [ ] Value objects for status and platform
- [ ] Repository interface defined
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-030: add subscription module domain layer"
```
