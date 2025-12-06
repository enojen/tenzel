# Backend Modules Documentation

---

## 📘 USER MODULE

### 1. Overview

The **User Module** manages **anonymous users** identified by a **Device ID + JWT token**.

Responsibilities:

- Device-based anonymous user creation
- User state management (`free` / `premium`)
- Tracked assets list (currencies & commodities)
- User deletion (with premium/free rules)
- Token lifecycle logic (JWT)

Not responsible for:

- Subscription validation (→ Subscription Module)
- Paywall / pricing information (→ Config Module)
- App startup orchestration (→ App Module)

---

### 2. Authentication Flow

#### Token Lifecycle

- Token is created via `POST /api/app/init`
- Token expiry: **None** (no expiration)
- Token becomes invalid when:
  - User is deleted (free user deletes account)
  - User is soft-deleted

#### Auth Responses

| Scenario                      | HTTP Status | Error Code         |
| ----------------------------- | ----------- | ------------------ |
| No token provided             | 401         | `UNAUTHORIZED`     |
| Invalid/expired token         | 401         | `INVALID_TOKEN`    |
| Free user on premium endpoint | 403         | `PREMIUM_REQUIRED` |

---

### 3. Data Models

#### 3.1. User

```ts
type AccountTier = 'free' | 'premium';

interface User {
  id: string;
  deviceId: string;
  accountTier: AccountTier;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

#### 3.2. Tracked Asset

```ts
type AssetType = 'currency' | 'commodity';

interface TrackedAsset {
  assetType: AssetType;
  assetCode: string;
  addedAt: string;
}
```

---

### 4. Common Error Schema

```ts
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

### 5. Endpoints

#### 5.1. GET /api/users/me

Fetch authenticated user information.

**Auth:** Bearer Token (Required)

**Response:**

```ts
interface CurrentUserResponse {
  user: {
    id: string;
    deviceId: string;
    accountTier: AccountTier;
    subscriptionExpiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

#### 5.2. DELETE /api/users/me

Delete the current user.

**Auth:** Bearer Token (Required)

**Business Rules:**

- Free users: Hard delete, token invalidated
- Premium users: Soft delete, subscription preserved for restore

**Response:**

```ts
interface DeleteUserResponse {
  success: true;
}
```

---

#### 5.3. GET /api/users/me/tracked

Get user's tracked assets list.

**Auth:** Bearer Token (Required)

```ts
interface TrackedAssetsResponse {
  assets: TrackedAsset[];
}
```

---

#### 5.4. POST /api/users/me/tracked

Add an asset to tracked list.

**Auth:** Bearer Token (Required)

```ts
interface AddTrackedAssetRequest {
  assetType: AssetType;
  assetCode: string;
}
```

```ts
interface AddTrackedAssetResponse {
  success: true;
  assets: TrackedAsset[];
}
```

---

#### 5.5. DELETE /api/users/me/tracked/:assetCode

Remove an asset from tracked list.

**Auth:** Bearer Token (Required)

```ts
interface RemoveTrackedAssetResponse {
  success: true;
  assets: TrackedAsset[];
}
```

---

## 📘 SUBSCRIPTION MODULE

### 1. Overview

Handles subscription logic:

- Receipt validation (Apple/Google)
- Subscription activation / expiration
- Restore purchase flow
- Subscription lifecycle management

---

### 2. Data Model

```ts
type SubscriptionPlatform = 'ios' | 'android';
type SubscriptionStatus = 'active' | 'expired' | 'canceled';

interface Subscription {
  id: string;
  userId: string;
  platform: SubscriptionPlatform;
  billingKey: string;
  status: SubscriptionStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### 3. Subscription Expiry Management

#### Periyodik Job (Önerilen)

- **Frequency:** Her 1 saat
- Job, `expiresAt < now()` olan subscriptionları bulur
- İlgili user'ların `accountTier` değerini `free` yapar
- Request-time check yapılmaz (performans için)

---

### 4. Endpoints

#### 4.1. POST /api/subscriptions/verify

Validate receipt and activate subscription.

**Auth:** Bearer Token (Required)

```ts
interface VerifySubscriptionRequest {
  platform: SubscriptionPlatform;
  receipt: string;
  billingKey: string;
  productId: string;
}
```

```ts
interface VerifySubscriptionResponse {
  success: true;
  user: {
    id: string;
    accountTier: 'premium';
    subscriptionExpiresAt: string;
  };
  subscription: {
    id: string;
    platform: SubscriptionPlatform;
    billingKey: string;
    status: 'active';
    expiresAt: string;
  };
}
```

---

#### 4.2. POST /api/subscriptions/restore

Restore subscription after reinstall or device change.

**Auth:** Bearer Token (Required)

**Flow:**

1. `billingKey` ile mevcut subscription aranır
2. Store'dan (Apple/Google) subscription durumu doğrulanır
3. Aktifse user'a bağlanır, `accountTier: premium` yapılır

```ts
interface RestoreSubscriptionRequest {
  platform: SubscriptionPlatform;
  billingKey: string;
  receipt?: string;
}
```

```ts
interface RestoreSubscriptionResponse {
  success: true;
  restored: boolean;
  user: {
    id: string;
    accountTier: 'premium';
    subscriptionExpiresAt: string;
  };
  subscription: {
    id: string;
    platform: SubscriptionPlatform;
    billingKey: string;
    status: 'active';
    expiresAt: string;
  };
}
```

---

### 5. Server-to-Server Notifications (Webhooks)

Apple ve Google, subscription lifecycle event'lerinde backend'i doğrudan bilgilendirir.

#### 5.1. Notification Types

```ts
// Apple App Store Server Notification Types
type AppleNotificationType =
  | 'DID_RENEW' // Otomatik yenileme başarılı
  | 'DID_FAIL_TO_RENEW' // Ödeme başarısız
  | 'CANCEL' // Kullanıcı iptal etti
  | 'EXPIRED' // Süresi doldu
  | 'REFUND' // İade yapıldı
  | 'GRACE_PERIOD_EXPIRED'; // Grace period bitti

// Google Real-Time Developer Notifications Types
type GoogleNotificationType =
  | 'SUBSCRIPTION_RENEWED' // Yenileme başarılı
  | 'SUBSCRIPTION_CANCELED' // İptal edildi
  | 'SUBSCRIPTION_EXPIRED' // Süresi doldu
  | 'SUBSCRIPTION_IN_GRACE_PERIOD' // Ödeme bekliyor
  | 'SUBSCRIPTION_RECOVERED' // Ödeme kurtarıldı
  | 'SUBSCRIPTION_PAUSED'; // Duraklatıldı
```

#### 5.2. POST /api/webhooks/apple

Apple App Store Server Notifications endpoint.

**Auth:** Apple JWS Signature Validation

**Request (Apple sends):**

```ts
interface AppleWebhookPayload {
  signedPayload: string; // JWS (JSON Web Signature)
}

// Decoded payload içeriği
interface AppleNotificationPayload {
  notificationType: AppleNotificationType;
  subtype?: string;
  data: {
    bundleId: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo: string; // JWS
    signedRenewalInfo: string; // JWS
  };
}

// Decoded transaction info
interface AppleTransactionInfo {
  originalTransactionId: string; // billingKey olarak kullanılır
  productId: string;
  expiresDate: number; // Unix timestamp (ms)
}
```

**Response:**

```ts
// HTTP 200 OK (boş body veya success)
interface AppleWebhookResponse {
  success: true;
}
```

**Validation:**

1. JWS signature'ı Apple'ın public key'i ile doğrula
2. `bundleId` kontrol et
3. `environment` kontrol et (Production/Sandbox)

---

#### 5.3. POST /api/webhooks/google

Google Real-Time Developer Notifications (RTDN) endpoint.

**Auth:** Google Pub/Sub Push Authentication

**Request (Google sends via Pub/Sub):**

```ts
interface GoogleWebhookPayload {
  message: {
    data: string; // Base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

// Decoded data içeriği
interface GoogleNotificationData {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number; // 1-13 arası değerler
    purchaseToken: string; // billingKey olarak kullanılır
    subscriptionId: string; // productId
  };
}

// Google notification type mapping
const GoogleNotificationTypeMap = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  12: 'SUBSCRIPTION_EXPIRED',
  13: 'SUBSCRIPTION_PAUSED',
};
```

**Response:**

```ts
// HTTP 200 OK (Pub/Sub için acknowledgment)
interface GoogleWebhookResponse {
  success: true;
}
```

**Validation:**

1. Pub/Sub push authentication token doğrula
2. `packageName` kontrol et
3. Message'ı acknowledge et (200 OK)

---

#### 5.4. Webhook Event Handling

| Event             | Platform                                                            | Action                                              |
| ----------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| Yenileme başarılı | Apple: `DID_RENEW` / Google: `SUBSCRIPTION_RENEWED`                 | `expiresAt` güncelle, `status: active`              |
| Ödeme başarısız   | Apple: `DID_FAIL_TO_RENEW` / Google: `SUBSCRIPTION_IN_GRACE_PERIOD` | Grace period başlat (genelde 16 gün)                |
| İptal             | Apple: `CANCEL` / Google: `SUBSCRIPTION_CANCELED`                   | `status: canceled`, subscription döneme kadar aktif |
| Süresi doldu      | Apple: `EXPIRED` / Google: `SUBSCRIPTION_EXPIRED`                   | `accountTier: free`, `status: expired`              |
| İade              | Apple: `REFUND`                                                     | `accountTier: free`, hemen iptal                    |
| Kurtarıldı        | Google: `SUBSCRIPTION_RECOVERED`                                    | Grace period bitti, `status: active`                |

**Handling Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Webhook Geldiğinde                                             │
├─────────────────────────────────────────────────────────────────┤
│  1. Signature/Auth doğrula                                      │
│  2. billingKey (originalTransactionId/purchaseToken) ile        │
│     subscription bul                                            │
│  3. Event type'a göre action uygula                             │
│  4. User'ın accountTier ve subscriptionExpiresAt güncelle       │
│  5. HTTP 200 döndür (acknowledge)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 5.5. Backend Webhook Handlers (Implementation)

Her event için backend'de yapılacak işlemler:

##### 5.5.1. Event Handlers

```ts
// ===== RENEWAL SUCCESS =====
async function handleRenewalSuccess(billingKey: string, newExpiresAt: Date) {
  await db.transaction(async (tx) => {
    // 1. Subscription güncelle
    const subscription = await tx.subscription.update({
      where: { billingKey },
      data: {
        status: 'active',
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      },
    });

    // 2. User'ı premium yap (zaten premium olabilir)
    await tx.user.update({
      where: { id: subscription.userId },
      data: {
        accountTier: 'premium',
        subscriptionExpiresAt: newExpiresAt,
      },
    });
  });
}

// ===== PAYMENT FAILED (Grace Period) =====
async function handlePaymentFailed(billingKey: string) {
  const gracePeriodDays = 16; // Apple: 16 gün, Google: 7-30 gün arası

  await db.transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { billingKey },
      data: {
        status: 'grace_period',
        updatedAt: new Date(),
      },
    });

    // User hala premium kalır (grace period boyunca)
    // Opsiyonel: Push notification gönder
    await notificationService.send(subscription.userId, {
      type: 'PAYMENT_FAILED',
      message: 'Ödeme alınamadı, lütfen ödeme yönteminizi güncelleyin',
    });
  });
}

// ===== SUBSCRIPTION CANCELED =====
async function handleCanceled(billingKey: string) {
  await db.subscription.update({
    where: { billingKey },
    data: {
      status: 'canceled',
      updatedAt: new Date(),
    },
  });
  // NOT: User hala premium kalır, expiresAt'e kadar
  // Dönem sonunda accountTier: free yapılır (hourly job veya EXPIRED event)
}

// ===== SUBSCRIPTION EXPIRED =====
async function handleExpired(billingKey: string) {
  await db.transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { billingKey },
      data: {
        status: 'expired',
        updatedAt: new Date(),
      },
    });

    // User'ı free'ye düşür
    await tx.user.update({
      where: { id: subscription.userId },
      data: {
        accountTier: 'free',
        subscriptionExpiresAt: null,
      },
    });
  });
}

// ===== REFUND =====
async function handleRefund(billingKey: string) {
  await db.transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { billingKey },
      data: {
        status: 'refunded',
        updatedAt: new Date(),
      },
    });

    // Hemen free'ye düşür
    await tx.user.update({
      where: { id: subscription.userId },
      data: {
        accountTier: 'free',
        subscriptionExpiresAt: null,
      },
    });
  });
}

// ===== GRACE PERIOD RECOVERED =====
async function handleRecovered(billingKey: string, newExpiresAt: Date) {
  // Ödeme başarılı oldu, normal akışa dön
  await handleRenewalSuccess(billingKey, newExpiresAt);
}
```

##### 5.5.2. Idempotency (Tekrarlayan Event'ler)

Apple/Google aynı event'i birden fazla kez gönderebilir. Duplicate işlemleri önlemek için:

```ts
interface WebhookLog {
  id: string;
  platform: 'apple' | 'google';
  eventId: string; // Apple: notificationUUID, Google: messageId
  eventType: string;
  billingKey: string;
  processedAt: Date;
  payload: string; // JSON olarak sakla
}

async function processWebhook(eventId: string, handler: () => Promise<void>) {
  // 1. Daha önce işlendi mi kontrol et
  const existing = await db.webhookLog.findUnique({
    where: { eventId },
  });

  if (existing) {
    console.log(`Webhook already processed: ${eventId}`);
    return { alreadyProcessed: true };
  }

  // 2. İşle
  await handler();

  // 3. Log'a kaydet
  await db.webhookLog.create({
    data: {
      eventId,
      platform,
      eventType,
      billingKey,
      processedAt: new Date(),
      payload: JSON.stringify(payload),
    },
  });

  return { alreadyProcessed: false };
}
```

##### 5.5.3. Error Handling & Retry

```ts
async function webhookController(req: Request, res: Response) {
  try {
    // 1. Signature doğrula
    const isValid = await validateSignature(req);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Event'i işle
    await processWebhookEvent(req.body);

    // 3. Başarılı - 200 döndür (Apple/Google retry yapmaz)
    return res.status(200).json({ success: true });
  } catch (error) {
    // Log error for monitoring
    logger.error('Webhook processing failed', { error, body: req.body });

    // 500 döndür → Apple/Google retry yapacak
    // Apple: 1 saat sonra, sonra 12 saat, sonra 24, 48, 72 saat
    // Google: Exponential backoff
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

##### 5.5.4. Logging & Monitoring

```ts
// Her webhook için log
interface WebhookMetrics {
  total_received: Counter;
  successful: Counter;
  failed: Counter;
  duplicate: Counter;
  processing_time: Histogram;
}

// Alert conditions
const alerts = {
  // 5 dakikada 10'dan fazla başarısız webhook
  highFailureRate: 'webhook_failed > 10 in 5m',

  // 1 saattir hiç webhook gelmedi (market saatlerinde)
  noWebhooks: 'webhook_received == 0 in 1h AND market_hours',

  // İşlem süresi 5 saniyeyi aştı
  slowProcessing: 'webhook_processing_time_p99 > 5s',
};
```

---

#### 5.6. Apple App Store Connect Setup

Apple'dan webhook almak için App Store Connect'te yapılacak ayarlar:

##### Step 1: App Store Connect'e Giriş

```
https://appstoreconnect.apple.com
→ Apps → [Uygulamanız] → App Information
```

##### Step 2: Server Notifications Ayarları

```
┌─────────────────────────────────────────────────────────────────┐
│  App Store Connect → App Information                            │
├─────────────────────────────────────────────────────────────────┤
│  App Store Server Notifications                                 │
│                                                                  │
│  Production Server URL:                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://api.yourapp.com/api/webhooks/apple              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Sandbox Server URL:                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://api-staging.yourapp.com/api/webhooks/apple      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Version: ◉ Version 2 Notifications (Önerilen)                  │
│           ○ Version 1 Notifications (Deprecated)                │
└─────────────────────────────────────────────────────────────────┘
```

##### Step 3: Shared Secret Oluşturma

```
App Store Connect → Apps → [App] → In-App Purchases → Manage
→ App-Specific Shared Secret → Generate

Bu secret'ı backend'de saklayın:
APPLE_SHARED_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

##### Step 4: Test Notification Gönderme

```
App Store Connect → Apps → [App] → App Information
→ App Store Server Notifications → Test Notification

veya API ile:
POST https://api.storekit.itunes.apple.com/inApps/v1/notifications/test
```

##### Apple Signature Validation (Backend)

```ts
import * as jose from 'jose';

async function validateAppleSignature(signedPayload: string): Promise<boolean> {
  try {
    // Apple'ın public key'lerini al
    const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

    // JWS'i doğrula ve decode et
    const { payload } = await jose.jwtVerify(signedPayload, JWKS, {
      issuer: 'https://appleid.apple.com',
    });

    // Bundle ID kontrolü
    if (payload.data.bundleId !== process.env.APPLE_BUNDLE_ID) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Apple signature validation failed:', error);
    return false;
  }
}
```

---

#### 5.7. Google Play Console Setup

Google'dan Real-Time Developer Notifications (RTDN) almak için yapılacak ayarlar:

##### Step 1: Google Cloud Console - Pub/Sub Topic Oluşturma

```
https://console.cloud.google.com
→ Pub/Sub → Topics → Create Topic

┌─────────────────────────────────────────────────────────────────┐
│  Create a topic                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Topic ID: play-billing-notifications                           │
│                                                                 │
│  ☑ Add a default subscription                                  │
│                                                                 │
│  Full topic name:                                               │
│  projects/your-project-id/topics/play-billing-notifications     │
└─────────────────────────────────────────────────────────────────┘
```

##### Step 2: Pub/Sub Subscription Oluşturma (Push)

```
Pub/Sub → Subscriptions → Create Subscription

┌─────────────────────────────────────────────────────────────────┐
│  Create subscription                                             │
├─────────────────────────────────────────────────────────────────┤
│  Subscription ID: play-billing-push                             │
│                                                                  │
│  Select a Cloud Pub/Sub topic:                                  │
│  projects/your-project-id/topics/play-billing-notifications    │
│                                                                  │
│  Delivery type: ◉ Push                                          │
│                                                                  │
│  Endpoint URL:                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://api.yourapp.com/api/webhooks/google             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ☑ Enable authentication                                        │
│  Service account: your-pubsub-sa@project.iam.gserviceaccount   │
│  Audience: https://api.yourapp.com                              │
└─────────────────────────────────────────────────────────────────┘
```

##### Step 3: Google Play Console - RTDN Etkinleştirme

```
https://play.google.com/console
→ [Uygulamanız] → Monetization setup → Real-time developer notifications

┌─────────────────────────────────────────────────────────────────┐
│  Real-time developer notifications                               │
├─────────────────────────────────────────────────────────────────┤
│  Topic name:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ projects/your-project-id/topics/play-billing-notif...   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Send test notification]  [Save changes]                       │
└─────────────────────────────────────────────────────────────────┘
```

##### Step 4: Service Account Permissions

```
Google Cloud Console → IAM & Admin → IAM

google-play-developer-notifications@system.gserviceaccount.com
  → Pub/Sub Publisher role ekle

Bu, Google Play'in topic'inize mesaj göndermesini sağlar.
```

##### Step 5: Backend Service Account

```
Google Cloud Console → IAM & Admin → Service Accounts
→ Create Service Account

Name: play-billing-verifier
Roles:
  - Pub/Sub Subscriber
  - Android Publisher (Play Developer API için)

JSON key indir → Backend'e ekle:
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json
```

##### Google Pub/Sub Validation (Backend)

```ts
import { OAuth2Client } from 'google-auth-library';

const authClient = new OAuth2Client();

async function validateGooglePubSub(req: Request): Promise<boolean> {
  try {
    // Authorization header'dan token al
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }
    const token = authHeader.substring(7);

    // Token'ı doğrula
    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_PUBSUB_AUDIENCE, // https://api.yourapp.com
    });

    const payload = ticket.getPayload();

    // Service account email kontrolü
    if (!payload?.email?.endsWith('.iam.gserviceaccount.com')) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Google Pub/Sub validation failed:', error);
    return false;
  }
}

// Subscription durumunu doğrulamak için Google Play API
import { google } from 'googleapis';

async function verifyGoogleSubscription(
  packageName: string,
  subscriptionId: string,
  purchaseToken: string,
) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidPublisher = google.androidpublisher({ version: 'v3', auth });

  const response = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId,
    token: purchaseToken,
  });

  return response.data;
}
```

---

#### 5.8. Environment Variables

```bash
# ===== APPLE =====
APPLE_BUNDLE_ID=com.yourcompany.muhasebat
APPLE_SHARED_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APPLE_KEY_ID=XXXXXXXXXX
APPLE_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8

# Apple API endpoints
APPLE_PRODUCTION_URL=https://api.storekit.itunes.apple.com
APPLE_SANDBOX_URL=https://api.storekit-sandbox.itunes.apple.com

# ===== GOOGLE =====
GOOGLE_PACKAGE_NAME=com.yourcompany.muhasebat
GOOGLE_PUBSUB_TOPIC=projects/your-project/topics/play-billing-notifications
GOOGLE_PUBSUB_AUDIENCE=https://api.yourapp.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json

# ===== WEBHOOK =====
WEBHOOK_SECRET_HEADER=X-Webhook-Secret  # Internal validation için (opsiyonel)
WEBHOOK_LOG_RETENTION_DAYS=90           # Webhook log'larını ne kadar sakla
```

---

#### 5.9. Subscription Flow Diagram (Complete)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE SUBSCRIPTION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Mobile     │    │  App Store/  │    │   Backend    │                   │
│  │     App      │    │  Play Store  │    │    Server    │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│  1. İLK SATIN ALMA                                                          │
│         │ ──Purchase──────► │                   │                            │
│         │ ◄────Receipt───── │                   │                            │
│         │ ─────────────────────Verify──────────►│                            │
│         │                   │                   │ (validate with Store API)  │
│         │ ◄────────────────────Premium─────────│                            │
│         │                   │                   │                            │
│  2. OTOMATİK YENİLEME (Her ay)                                              │
│         │                   │ ──DID_RENEW──────►│                            │
│         │                   │                   │ (update expiresAt)         │
│         │                   │ ◄─────200 OK──────│                            │
│         │                   │                   │                            │
│  3. ÖDEME BAŞARISIZ                                                         │
│         │                   │ ─FAIL_TO_RENEW───►│                            │
│         │ ◄──Push Notif─────────────────────────│ (grace period)             │
│         │                   │                   │                            │
│  4. ÖDEME KURTARILDI                                                        │
│         │                   │ ──RECOVERED──────►│                            │
│         │                   │                   │ (back to active)           │
│         │                   │                   │                            │
│  5. KULLANICI İPTAL ETTİ                                                    │
│         │                   │ ──CANCELED───────►│                            │
│         │                   │                   │ (status: canceled)         │
│         │                   │                   │ (still premium until exp)  │
│         │                   │                   │                            │
│  6. SÜRESİ DOLDU                                                            │
│         │                   │ ──EXPIRED────────►│                            │
│         │                   │                   │ (accountTier: free)        │
│         │                   │                   │                            │
│  7. İADE YAPILDI                                                            │
│         │                   │ ──REFUND─────────►│                            │
│         │                   │                   │ (immediate free)           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📘 APP MODULE (App Init)

### 1. Overview

Bootstraps the entire application session. Creates or retrieves user based on device ID.

### 2. App Init Flow

```
┌─────────────────────────────────────────────────────────┐
│                    POST /api/app/init                    │
├─────────────────────────────────────────────────────────┤
│  1. deviceId ile mevcut user aranır                     │
│     ├─ Bulundu → Mevcut user + yeni token döner         │
│     └─ Bulunamadı → Yeni user oluşturulur + token döner │
│                                                          │
│  2. Token JWT formatında, süresiz (no expiry)           │
│                                                          │
│  3. isNewUser flag'i frontend'e bilgi verir             │
└─────────────────────────────────────────────────────────┘
```

### 3. Endpoint

#### POST /api/app/init

**Auth:** None (Public endpoint)

```ts
interface AppInitRequest {
  deviceId: string; // Expo device ID veya UUID fallback
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber?: string;
  locale?: string;
  timezone?: string;
  pushToken?: string;
}
```

```ts
interface AppInitResponse {
  serverTime: string;
  token: string; // JWT, süresiz
  isNewUser: boolean; // true: yeni kullanıcı oluşturuldu
  user: {
    id: string;
    deviceId: string;
    accountTier: AccountTier;
    subscriptionExpiresAt: string | null;
    createdAt: string;
  };
  subscription: {
    status: SubscriptionStatus;
    expiresAt: string | null;
  } | null;
  trackedAssets: TrackedAsset[];
  paywallConfig: {
    price: number;
    currency: string;
    period: 'monthly';
    features: string[];
  };
  featureFlags: Record<string, boolean>;
}
```

### 4. Device ID Fallback Strategy

```
┌─────────────────────────────────────────────────────────┐
│  Frontend Device ID Generation                           │
├─────────────────────────────────────────────────────────┤
│  1. expo-application veya expo-device ile device ID al  │
│  2. Başarısız olursa → UUID generate et                 │
│  3. AsyncStorage'da sakla                               │
│  4. Her app/init'te aynı ID'yi gönder                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📘 CONFIG MODULE

### 1. GET /api/config/subscription

Returns paywall configuration.

**Auth:** None (Public endpoint)

```ts
interface SubscriptionConfigResponse {
  subscription: {
    price: number;
    currency: string;
    period: 'monthly';
    features: string[];
    description?: string;
  };
}
```

---

### 2. GET /api/config/default-assets

Returns default assets shown when user has no tracked assets.

**Auth:** None (Public endpoint)

```ts
interface DefaultAssetsResponse {
  assets: Array<{
    code: string;
    type: AssetType;
    name: string;
    logoUrl: string;
  }>;
}
```

**Static List:**

- `GRAM_GOLD` (commodity)
- `USD` (currency)
- `EUR` (currency)

**Usage:**

- Tracked list empty → show default assets
- 1+ tracked asset → show only tracked list

---

## 📘 RATE MODULE

(Free Market & Bank Rates + Scraper + Converter)

### 1. Overview

The **Rate Module** manages:

- Supported currencies, commodities, and banks
- Free market rates (live)
- Bank-specific buy/sell rates (Premium)
- Conversion engine (free market + premium bank mode)
- Daily change calculations
- Automated scraper that synchronizes data from _canlidoviz.com_

This module **does not** handle:

- Authentication (→ User Module)
- Tracked assets storage (→ User Module)
- Subscription state (→ Subscription Module)
- Paywall rules (→ Config Module)

---

### 2. Data Models

#### 2.1 Currency

```ts
interface Currency {
  code: string;
  name: string;
  flagUrl: string;
}
```

#### 2.2 Commodity

```ts
interface Commodity {
  code: string;
  name: string;
  logoUrl: string;
}
```

#### 2.3 Bank

```ts
interface Bank {
  code: string;
  name: string;
  logoUrl: string;
}
```

#### 2.4 Free Market Rate

```ts
type Trend = 'up' | 'down' | 'stable';

interface FreeMarketRate {
  code: string;
  type: AssetType;
  buyingPrice: number;
  sellingPrice: number;
  dailyChange: number;
  dailyChangePercentage: number;
  trend: Trend;
  lastUpdated: string;
  isStale: boolean; // true if data > 5 minutes old
}
```

#### 2.5 Bank Rate

```ts
interface BankRate {
  bankCode: string;
  buyingPrice: number | null; // null → UI'da "—" gösterilir
  sellingPrice: number | null; // Her ikisi de dönmeli
  lastUpdated: string;
}
```

> **Not:** Hem `buyingPrice` hem `sellingPrice` her zaman döner. Biri `null` ise ilgili banka o işlem türü için fiyat sağlamıyor demektir.

---

### 3. Premium Access Control

Premium endpoint'ler için guard mekanizması.

#### Protected Endpoints

- `GET /api/rates/banks/:code`
- `GET /api/rates/banks/:code/:bankCode`
- `POST /api/converter/calculate` (when `includeBanks: true`)

#### Guard Logic

```ts
// Pseudocode
@Guard()
class PremiumGuard {
  canActivate(context) {
    const user = context.getUser(); // Token'dan

    if (user.accountTier !== 'premium') {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'Bu özellik premium üyelik gerektirir',
      });
    }

    return true;
  }
}
```

#### Error Response (Free User)

```ts
// HTTP 403 Forbidden
{
  "error": {
    "code": "PREMIUM_REQUIRED",
    "message": "Bu özellik premium üyelik gerektirir"
  }
}
```

---

### 4. Common Error Schema

```ts
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

---

### 5. Endpoints

#### 5.1 Definitions (Currencies / Commodities / Banks)

##### 5.1.1 GET /api/currencies

Returns the list of supported currencies.

**Auth:** Bearer Token (Required)

**Response**

```ts
interface CurrenciesResponse {
  currencies: Currency[];
}
```

##### 5.1.2 GET /api/commodities

Returns the list of supported commodities.

**Auth:** Bearer Token (Required)

**Response**

```ts
interface CommoditiesResponse {
  commodities: Commodity[];
}
```

##### 5.1.3 GET /api/banks

Returns the list of supported banks.

**Auth:** Bearer Token (Required)

**Response**

```ts
interface BanksResponse {
  banks: Bank[];
}
```

---

#### 5.2 Free Market Rates

##### 5.2.1 GET /api/rates/free-market

Fetch all free market rates with optional filtering + tracking flag.

**Auth:** Bearer Token (Required)

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `type` | `currency \| commodity` | Filter by asset type |
| `code` | `string` | Filter by specific code |
| `search` | `string` | Search by name (min 2 chars, case-insensitive) |

**Response**

```ts
interface FreeMarketRatesResponse {
  items: Array<
    FreeMarketRate & {
      name: string;
      logoUrl: string;
      isTracked: boolean;
    }
  >;
}
```

##### 5.2.2 GET /api/rates/free-market/:code

Return a single free market item.

**Auth:** Bearer Token (Required)

```ts
interface SingleFreeMarketRateResponse {
  item: FreeMarketRate & {
    name: string;
    logoUrl: string;
  };
}
```

---

#### 5.3 Bank Rates (Premium Only)

##### 5.3.1 GET /api/rates/banks/:code

Returns bank-specific prices & best price for an asset.

**Auth:** Bearer Token (Required) + Premium Guard

**Query Params**
| Param | Type | Description |
|-------|------|-------------|
| `type` | `currency \| commodity` | Asset type (required) |
| `transactionType` | `buy \| sell` | Transaction direction (required) |

**Response**

```ts
interface BankRatesResponse {
  item: {
    code: string;
    name: string;
    logoUrl: string;
  };
  bankRates: Array<{
    bankCode: string;
    bankName: string;
    bankLogoUrl: string;
    price: number;
    lastUpdated: string;
  }>;
  bestRate: {
    bankCode: string;
    bankName: string;
    price: number;
  };
}
```

##### 5.3.2 GET /api/rates/banks/:code/:bankCode

Return single bank detail for an asset.

**Auth:** Bearer Token (Required) + Premium Guard

```ts
interface SingleBankRateResponse {
  item: {
    code: string;
    name: string;
  };
  bank: {
    bankCode: string;
    bankName: string;
    bankLogoUrl: string;
  };
  rates: {
    buyingPrice: number | null;
    sellingPrice: number | null;
    dailyChange: number;
    dailyChangePercentage: number;
    lastUpdated: string;
  };
}
```

---

#### 5.4 Converter Engine

##### 5.4.1 POST /api/converter/calculate

Convert FX/commodity → TRY using free market and (optional) banks.

**Auth:** Bearer Token (Required)
**Premium:** Required only when `includeBanks: true`

**Request**

```ts
interface ConverterRequest {
  fromCode: string;
  fromType: AssetType;
  amount: number;
  transactionType: 'buy' | 'sell';
  includeBanks?: boolean; // Premium feature
}
```

**Response**

```ts
interface ConverterResponse {
  freeMarket: {
    rate: number;
    result: number;
  };
  banks?: Array<{
    // Only if includeBanks: true AND premium user
    bankCode: string;
    bankName: string;
    bankLogoUrl: string;
    rate: number;
    result: number;
  }>;
}
```

**Business Rules:**

- Free user with `includeBanks: true` → `banks` array returns empty `[]`
- Premium user with `includeBanks: true` → `banks` array populated

---

#### 5.5 Scraper (Internal)

##### Overview

Automated data synchronization from canlidoviz.com.

**Frequency:** Every 1 minute (cron job)

##### Retry Mechanism

| Attempt   | Wait Time  | Action                              |
| --------- | ---------- | ----------------------------------- |
| 1st error | 10 seconds | Retry                               |
| 2nd error | 30 seconds | Retry                               |
| 3rd error | —          | Log error, wait for next cron cycle |

##### Stale Data Handling

| Condition             | Action                                |
| --------------------- | ------------------------------------- |
| Data > 5 minutes old  | Add `isStale: true` to API responses  |
| Data > 15 minutes old | Trigger monitoring alert              |
| Scraper fails         | Continue serving last successful data |

##### 5.5.1 POST /api/internal/scraper/run

Manual trigger for scraper.

**Auth:** Internal API Key

```ts
interface ScraperRunResponse {
  success: true;
  startedAt: string;
}
```

##### 5.5.2 GET /api/internal/scraper/health

Scraper health check for monitoring.

**Auth:** Internal API Key

```ts
type ScraperStatus = 'healthy' | 'degraded' | 'unhealthy';

interface ScraperHealthResponse {
  status: ScraperStatus;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  consecutiveErrors: number;
  isStale: boolean;
  marketOpen: boolean;
}
```

**Status Logic:**

- `healthy`: Son scrape başarılı, veri taze
- `degraded`: Veri stale (>5 dk) veya 1-2 ardışık hata
- `unhealthy`: 3+ ardışık hata veya veri >15 dk eski

---

### 6. Business Rules

**Free Market**

- `current` = `sellingPrice`
- `previousClose` stored daily
- `dailyChange` = `current` − `previousClose`

**Bank Rates**

- User wants to `buy` → show bank's `sellingPrice`
- User wants to `sell` → show bank's `buyingPrice`

**Search**

- Case-insensitive
- Minimum 2 characters

---

### 7. Module Interactions

| Module              | Purpose                                |
| ------------------- | -------------------------------------- |
| User Module         | deviceId, tracked assets, account tier |
| Subscription Module | Premium validation                     |
| Config Module       | Paywall logic, default assets          |

---

## 📘 SUMMARY: Type Definitions

```ts
// ===== Common Types =====
type AccountTier = 'free' | 'premium';
type AssetType = 'currency' | 'commodity';
type Trend = 'up' | 'down' | 'stable';
type SubscriptionPlatform = 'ios' | 'android';
type SubscriptionStatus = 'active' | 'expired' | 'canceled';
type ScraperStatus = 'healthy' | 'degraded' | 'unhealthy';

// ===== User Module =====
interface User { ... }
interface TrackedAsset { ... }

// ===== Subscription Module =====
interface Subscription { ... }

// ===== Rate Module =====
interface Currency { ... }
interface Commodity { ... }
interface Bank { ... }
interface FreeMarketRate { ... }
interface BankRate { ... }
```

---

## 📘 API ENDPOINT SUMMARY

| Method | Endpoint                           | Auth           | Premium   |
| ------ | ---------------------------------- | -------------- | --------- |
| POST   | `/api/app/init`                    | No             | No        |
| GET    | `/api/users/me`                    | Yes            | No        |
| DELETE | `/api/users/me`                    | Yes            | No        |
| GET    | `/api/users/me/tracked`            | Yes            | No        |
| POST   | `/api/users/me/tracked`            | Yes            | No        |
| DELETE | `/api/users/me/tracked/:assetCode` | Yes            | No        |
| POST   | `/api/subscriptions/verify`        | Yes            | No        |
| POST   | `/api/subscriptions/restore`       | Yes            | No        |
| POST   | `/api/webhooks/apple`              | Apple JWS      | No        |
| POST   | `/api/webhooks/google`             | Google Pub/Sub | No        |
| GET    | `/api/config/subscription`         | No             | No        |
| GET    | `/api/config/default-assets`       | No             | No        |
| GET    | `/api/currencies`                  | Yes            | No        |
| GET    | `/api/commodities`                 | Yes            | No        |
| GET    | `/api/banks`                       | Yes            | No        |
| GET    | `/api/rates/free-market`           | Yes            | No        |
| GET    | `/api/rates/free-market/:code`     | Yes            | No        |
| GET    | `/api/rates/banks/:code`           | Yes            | **Yes**   |
| GET    | `/api/rates/banks/:code/:bankCode` | Yes            | **Yes**   |
| POST   | `/api/converter/calculate`         | Yes            | Partial\* |
| POST   | `/api/internal/scraper/run`        | Internal       | No        |
| GET    | `/api/internal/scraper/health`     | Internal       | No        |

\* `includeBanks: true` requires premium
