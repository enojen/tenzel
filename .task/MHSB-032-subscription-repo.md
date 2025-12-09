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

---

## v2 Implementation Notes (Context7 MCP Research)

### Key Changes from Original Spec:

**Apple App Store Integration:**

- Uses `@apple/app-store-server-library@2.0.0` (official Apple library)
- Requires `.p8` private key file instead of `APPLE_SHARED_SECRET`
- Authentication via `APPLE_KEY_ID` + `APPLE_ISSUER_ID` + key file
- Requires Apple Root CA certificates (G2 and G3) for webhook signature verification
- `SignedDataVerifier` handles both receipt and webhook validation
- `ReceiptUtility` extracts transaction IDs from base64-encoded receipts

**Google Play Integration:**

- Uses `@googleapis/androidpublisher@33.1.0` (official Google package)
- Authentication via service account JSON key file with JWT
- Pub/Sub messages are base64-encoded and must be decoded
- Uses `subscriptionsv2.get` API for subscription status

**Environment Variables Added:**

```bash
# Apple (v2 - updated from original)
APPLE_BUNDLE_ID=com.yourcompany.muhasebat
APPLE_KEY_ID=YOUR_KEY_ID_HERE
APPLE_ISSUER_ID=YOUR_ISSUER_ID_HERE
APPLE_KEY_PATH=./keys/SubscriptionKey.p8
APPLE_APP_ID=YOUR_APP_ID_HERE
APPLE_ROOT_CA_G3_PATH=./certs/AppleRootCA-G3.cer
APPLE_ROOT_CA_G2_PATH=./certs/AppleRootCA-G2.cer

# Google Play
GOOGLE_PACKAGE_NAME=com.yourcompany.muhasebat
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./keys/google-service-account.json
```
