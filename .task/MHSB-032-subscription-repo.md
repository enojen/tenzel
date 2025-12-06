# MHSB-032: Subscription Repository & Store Services [REPO]

## Description

Implement Subscription repository and Apple/Google store validation services.

## Dependencies

- MHSB-030 (Subscription Domain)
- MHSB-031 (Subscription Database)

## Files to Create

- `src/modules/subscription/infrastructure/repositories/subscription.repository.ts`
- `src/modules/subscription/infrastructure/services/apple-store.service.ts`
- `src/modules/subscription/infrastructure/services/google-store.service.ts`
- `src/modules/subscription/infrastructure/index.ts`

## Implementation Details

### SubscriptionRepository

```typescript
class SubscriptionRepository implements ISubscriptionRepository {
  async findById(id: string): Promise<Subscription | null>;
  async findByUserId(userId: string): Promise<Subscription | null>;
  async findByBillingKey(billingKey: string): Promise<Subscription | null>;
  async create(data: CreateSubscriptionDto): Promise<Subscription>;
  async update(id: string, data: UpdateSubscriptionDto): Promise<Subscription>;
  async findExpired(): Promise<Subscription[]>; // status IN ('active', 'canceled', 'grace_period') AND expires_at < NOW()

  // Webhook logs
  async findWebhookLog(eventId: string): Promise<WebhookLog | null>;
  async createWebhookLog(log: CreateWebhookLogDto): Promise<WebhookLog>;
}
```

### AppleStoreService

```typescript
interface AppleStoreService {
  validateReceipt(receipt: string): Promise<AppleReceiptInfo>;
  validateWebhookSignature(signedPayload: string): Promise<AppleNotificationPayload>;
}
```

### GoogleStoreService

```typescript
interface GoogleStoreService {
  validateReceipt(receipt: string, subscriptionId: string): Promise<GoogleSubscriptionInfo>;
  validatePubSubToken(token: string): Promise<boolean>;
}
```

### Environment Variables Needed

```bash
APPLE_BUNDLE_ID=com.yourcompany.muhasebat
APPLE_SHARED_SECRET=xxx
GOOGLE_PACKAGE_NAME=com.yourcompany.muhasebat
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json
```

## Acceptance Criteria

- [ ] SubscriptionRepository fully implemented
- [ ] AppleStoreService validates receipts
- [ ] GoogleStoreService validates receipts
- [ ] Webhook log idempotency working
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-032: implement subscription repository and store services"
```
