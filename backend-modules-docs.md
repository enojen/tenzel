# Muhasebat Backend Specification v3.0

> **Authoritative Source**: This document is the single source of truth for all backend API specifications.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Global Standards](#2-global-standards)
3. [App Module](#3-app-module)
4. [User Module](#4-user-module)
5. [Subscription Module](#5-subscription-module)
6. [Config Module](#6-config-module)
7. [Rate Module](#7-rate-module)
8. [Webhooks](#8-webhooks)
9. [API Endpoint Summary](#9-api-endpoint-summary)
10. [Shared Infrastructure Requirements](#10-shared-infrastructure-requirements)

---

## 1. Overview

### 1.1 Project Description

Muhasebat is a financial mobile application providing currency exchange rates and precious metals pricing with free and premium tiers. The app features real-time data scraping from external sources and requires complex user state management across different app installations.

### 1.2 Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MUHASEBAT BACKEND                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐            │
│  │    App    │  │     User     │  │Subscription│  │   Config  │   Modules  │
│  │  Module   │  │    Module    │  │   Module   │  │   Module  │            │
│  └─────┬─────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘            │
│        │               │                │               │                   │
│        └───────────────┼────────────────┼───────────────┘                   │
│                        │                │                                    │
│  ┌───────────┐         │                │                                    │
│  │   Rate    │─────────┘                │                                    │
│  │  Module   │──────────────────────────┘                                    │
│  └───────────┘                                                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │                        Shared Kernel                           │         │
│  │  (exceptions, i18n, logging, auth middleware, crypto)          │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐         │
│  │                       Infrastructure                           │         │
│  │  (PostgreSQL, JWT, External APIs, Scraper Service)             │         │
│  └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Key Technical Decisions

| Decision        | Implementation                             |
| --------------- | ------------------------------------------ |
| Authentication  | Device ID + JWT (no expiration)            |
| User Model      | Anonymous users, no registration           |
| Premium Access  | Store-based subscriptions (Apple/Google)   |
| Data Source     | canlidoviz.com scraper (1-minute interval) |
| Token Lifecycle | Invalidated only on user deletion          |

---

## 2. Global Standards

### 2.1 Common Types

```typescript
// Account tier determines feature access
type AccountTier = 'free' | 'premium';

// Asset categories
type AssetType = 'currency' | 'commodity';

// Price change indicator
type Trend = 'up' | 'down' | 'stable';

// Supported platforms for subscriptions
type SubscriptionPlatform = 'ios' | 'android';

// Subscription lifecycle states
type SubscriptionStatus = 'active' | 'expired' | 'canceled' | 'grace_period';

// Scraper health indicator
type ScraperStatus = 'healthy' | 'degraded' | 'unhealthy';
```

### 2.2 Error Response Schema

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string; // Localized message
    details?: unknown;
  };
}
```

### 2.3 Standard Error Codes

| Code                     | HTTP Status | Description                          |
| ------------------------ | ----------- | ------------------------------------ |
| `UNAUTHORIZED`           | 401         | No token provided                    |
| `INVALID_TOKEN`          | 401         | Token is invalid or user deleted     |
| `PREMIUM_REQUIRED`       | 403         | Free user accessing premium endpoint |
| `USER_NOT_FOUND`         | 404         | User does not exist                  |
| `ASSET_NOT_FOUND`        | 404         | Currency/commodity not found         |
| `BANK_NOT_FOUND`         | 404         | Bank not found                       |
| `INVALID_RECEIPT`        | 400         | Store receipt validation failed      |
| `SUBSCRIPTION_NOT_FOUND` | 404         | No subscription for restore          |
| `VALIDATION_ERROR`       | 400         | Request validation failed            |
| `RATE_LIMIT_EXCEEDED`    | 429         | Too many requests                    |
| `INTERNAL_ERROR`         | 500         | Server error                         |

### 2.4 Rate Limiting

| Endpoint Group             | Limit        | Window              |
| -------------------------- | ------------ | ------------------- |
| `POST /api/app/init`       | 10 requests  | per minute per IP   |
| `/api/rates/*`             | 120 requests | per minute per user |
| `/api/converter/calculate` | 60 requests  | per minute per user |
| `/api/users/me/tracked`    | 30 requests  | per minute per user |
| `/api/subscriptions/*`     | 10 requests  | per minute per user |

**Rate Limit Response:**

```typescript
// HTTP 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 60  // seconds
    }
  }
}
```

### 2.5 Authentication Responses

| Scenario                      | HTTP Status | Error Code         |
| ----------------------------- | ----------- | ------------------ |
| No token provided             | 401         | `UNAUTHORIZED`     |
| Invalid/malformed token       | 401         | `INVALID_TOKEN`    |
| Token for deleted user        | 401         | `INVALID_TOKEN`    |
| Free user on premium endpoint | 403         | `PREMIUM_REQUIRED` |

---

## 3. App Module

### 3.1 Overview

The App Module bootstraps the entire application session. It creates or retrieves users based on device ID and returns all necessary data for app initialization.

**Responsibilities:**

- Device-based user creation/retrieval
- JWT token generation
- Initial data aggregation (user, subscription, assets, config)

### 3.2 Endpoint: POST /api/app/init

Initializes the application session.

**Auth:** None (Public endpoint)

**Request:**

```typescript
interface AppInitRequest {
  deviceId: string; // Expo device ID or UUID fallback
  platform: 'ios' | 'android';
  appVersion: string;
  buildNumber?: string;
  locale?: string; // e.g., "tr-TR"
  timezone?: string; // e.g., "Europe/Istanbul"
  pushToken?: string;
}
```

**Response:**

```typescript
interface AppInitResponse {
  serverTime: string; // ISO 8601
  token: string; // JWT, no expiration
  isNewUser: boolean; // true = new user created

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

  // Home screen assets (tracked OR defaults)
  homeAssets: {
    source: 'tracked' | 'defaults';
    items: Array<{
      code: string;
      type: AssetType;
      name: string;
      logoUrl: string;
    }>;
  };

  config: {
    subscription: {
      price: number;
      currency: string;
      period: 'monthly';
      features: string[];
    };
  };

  featureFlags: Record<string, boolean>;
}
```

**Business Logic:**

```
1. Search for user by deviceId
   ├─ Found → Return existing user + new token
   └─ Not Found → Create new user (accountTier: 'free') + token

2. Token: JWT format, no expiration

3. homeAssets logic:
   IF user.trackedAssets.length > 0:
     source = 'tracked'
     items = user.trackedAssets
   ELSE:
     source = 'defaults'
     items = [GRAM_GOLD, USD, EUR]
```

### 3.3 Device ID Strategy

```
Frontend Device ID Generation:
1. Try expo-application getIosIdForVendorAsync() / getAndroidId()
2. If fails → Generate UUID v4
3. Store in AsyncStorage
4. Send same ID on every app/init
```

---

## 4. User Module

### 4.1 Overview

Manages anonymous users identified by Device ID + JWT token.

**Responsibilities:**

- User state management (free/premium)
- Tracked assets list management
- User deletion with tier-specific rules
- Token lifecycle

**Not Responsible For:**

- Subscription validation (→ Subscription Module)
- Paywall configuration (→ Config Module)

### 4.2 Data Models

**User:**

```typescript
interface User {
  id: string;
  deviceId: string;
  accountTier: AccountTier;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // Soft delete for premium users
}
```

**Tracked Asset:**

```typescript
interface TrackedAsset {
  assetType: AssetType;
  assetCode: string;
  addedAt: string;
}
```

### 4.3 User Deletion Rules

| User Type   | Delete Action | Token          | Data                   | Restore                 |
| ----------- | ------------- | -------------- | ---------------------- | ----------------------- |
| **Free**    | Hard delete   | ❌ Invalidated | 🗑️ Permanently deleted | ❌ Not possible         |
| **Premium** | Soft delete   | ❌ Invalidated | 💾 Preserved 90 days   | ✅ Via restore endpoint |

**Premium User Soft Delete Flow:**

1. `deletedAt` timestamp is set
2. Token becomes invalid immediately
3. Subscription record preserved in database
4. User can restore on same/different device using `billingKey`
5. After 90 days without restore → hard delete (cron job)

### 4.4 Endpoints

#### GET /api/users/me

Fetch authenticated user information.

**Auth:** Bearer Token (Required)

**Response:**

```typescript
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

#### DELETE /api/users/me

Delete the current user.

**Auth:** Bearer Token (Required)

**Response:**

```typescript
interface DeleteUserResponse {
  success: true;
}
```

---

#### GET /api/users/me/tracked

Get user's tracked assets list.

**Auth:** Bearer Token (Required)

**Response:**

```typescript
interface TrackedAssetsResponse {
  assets: TrackedAsset[];
}
```

---

#### POST /api/users/me/tracked

Add an asset to tracked list.

**Auth:** Bearer Token (Required)

**Request:**

```typescript
interface AddTrackedAssetRequest {
  assetType: AssetType;
  assetCode: string;
}
```

**Response:**

```typescript
interface AddTrackedAssetResponse {
  success: true;
  assets: TrackedAsset[];
}
```

**Business Rules:**

- Same asset cannot be added twice (idempotent - returns success)
- New assets added to end of list
- No maximum limit

**Errors:**

- `ASSET_NOT_FOUND`: Invalid assetCode/assetType combination

---

#### DELETE /api/users/me/tracked/:assetCode

Remove an asset from tracked list.

**Auth:** Bearer Token (Required)

**Query Params:**

| Param  | Type                    | Required | Description |
| ------ | ----------------------- | -------- | ----------- |
| `type` | `currency \| commodity` | Yes      | Asset type  |

**Response:**

```typescript
interface RemoveTrackedAssetResponse {
  success: true;
  assets: TrackedAsset[];
}
```

**Business Rules:**

- Idempotent: removing non-tracked asset returns success
- `type` query param required to distinguish assets with same code

---

## 5. Subscription Module

### 5.1 Overview

Handles all subscription logic including receipt validation, activation, expiration, and restore flows.

**Responsibilities:**

- Receipt validation (Apple/Google)
- Subscription activation/expiration
- Restore purchase flow
- Subscription lifecycle via webhooks

### 5.2 Data Model

```typescript
interface Subscription {
  id: string;
  userId: string;
  platform: SubscriptionPlatform;
  billingKey: string; // Apple: originalTransactionId, Google: purchaseToken
  status: SubscriptionStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5.3 Subscription Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION STATUS FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐    payment     ┌──────────┐                              │
│   │  (none)  │ ──────────────►│  active  │◄─────────────────┐           │
│   └──────────┘    success     └────┬─────┘              │           │
│                                    │                     │           │
│                    ┌───────────────┼───────────────┐    │           │
│                    │               │               │    │           │
│                    ▼               ▼               │    │           │
│              user cancels    payment fails        │    │           │
│                    │               │               │    │           │
│                    ▼               ▼               │    │           │
│              ┌──────────┐   ┌─────────────┐       │    │           │
│              │ canceled │   │ grace_period│───────┘    │           │
│              └────┬─────┘   └──────┬──────┘  recovered │           │
│                   │                │                    │           │
│                   │   expiresAt    │   grace ended     │           │
│                   │   reached      │   (no payment)    │           │
│                   ▼                ▼                    │           │
│              ┌─────────────────────────────┐           │           │
│              │          expired            │───────────┘           │
│              │   (accountTier: free)       │  user resubscribes    │
│              └─────────────────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Status Descriptions:**

| Status         | accountTier | Description                             |
| -------------- | ----------- | --------------------------------------- |
| `active`       | premium     | Payment confirmed, full access          |
| `canceled`     | premium     | User canceled, access until `expiresAt` |
| `grace_period` | premium     | Payment failed, retrying (~16 days)     |
| `expired`      | free        | Subscription ended, downgraded          |

### 5.4 Subscription Expiry Job

**Frequency:** Every 1 hour

**Logic:**

```typescript
// Find expired subscriptions
const expired = await db.subscription.findMany({
  where: {
    expiresAt: { lt: new Date() },
    status: { in: ['active', 'canceled', 'grace_period'] },
  },
});

// Update each
for (const sub of expired) {
  await db.$transaction([
    db.subscription.update({
      where: { id: sub.id },
      data: { status: 'expired' },
    }),
    db.user.update({
      where: { id: sub.userId },
      data: { accountTier: 'free', subscriptionExpiresAt: null },
    }),
  ]);
}
```

### 5.5 Endpoints

#### POST /api/subscriptions/verify

Validate receipt and activate subscription.

**Auth:** Bearer Token (Required)

**Request:**

```typescript
interface VerifySubscriptionRequest {
  platform: SubscriptionPlatform;
  receipt: string;
  billingKey: string;
  productId: string;
}
```

**Response:**

```typescript
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

**Errors:**

- `INVALID_RECEIPT`: Store validation failed

---

#### POST /api/subscriptions/restore

Restore subscription after reinstall or device change.

**Auth:** Bearer Token (Required)

**Flow:**

1. Find subscription by `billingKey`
2. Validate with Store API (Apple/Google)
3. If active: link to current user, set `accountTier: 'premium'`
4. If soft-deleted user exists with same billingKey: restore that user's data

**Request:**

```typescript
interface RestoreSubscriptionRequest {
  platform: SubscriptionPlatform;
  billingKey: string;
  receipt?: string;
}
```

**Response (Success):**

```typescript
interface RestoreSubscriptionResponse {
  success: true;
  restored: true;
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

**Response (No Active Subscription):**

```typescript
interface RestoreSubscriptionResponse {
  success: true;
  restored: false;
  message: 'No active subscription found for this billing key';
}
```

**Errors:**

- `SUBSCRIPTION_NOT_FOUND`: No subscription exists for billingKey
- `INVALID_RECEIPT`: Store validation failed

---

## 6. Config Module

### 6.1 Overview

Provides dynamic configuration for subscription pricing and default assets.

### 6.2 Endpoints

#### GET /api/config/subscription

Returns paywall configuration.

**Auth:** None (Public endpoint)

**Response:**

```typescript
interface SubscriptionConfigResponse {
  subscription: {
    price: number;
    currency: string; // "TRY"
    period: 'monthly';
    features: string[];
    description?: string;
  };
}
```

---

#### GET /api/config/default-assets

Returns default assets shown when user has no tracked assets.

**Auth:** None (Public endpoint)

**Response:**

```typescript
interface DefaultAssetsResponse {
  assets: Array<{
    code: string;
    type: AssetType;
    name: string;
    logoUrl: string;
  }>;
}
```

**Static List (Hardcoded):**

| Code        | Type      | Name            |
| ----------- | --------- | --------------- |
| `GRAM_GOLD` | commodity | Gram Altın      |
| `USD`       | currency  | Amerikan Doları |
| `EUR`       | currency  | Euro            |

---

## 7. Rate Module

### 7.1 Overview

Manages currency/commodity rates from free market and banks.

**Responsibilities:**

- Supported currencies, commodities, banks definitions
- Free market rates (live, public)
- Bank-specific rates (premium only)
- Currency converter engine
- Daily change calculations
- Automated scraper service

### 7.2 Supported Assets

**Currencies (13):**
USD, EUR, GBP, CHF, CAD, RUB, AED, AUD, DKK, SEK, NOK, JPY, KWD

**Commodities (9):**
| Code | Name |
|------|------|
| `GRAM_GOLD` | Gram Altın |
| `ONS` | Ons |
| `CEYREK` | Çeyrek |
| `YARIM` | Yarım |
| `TAM` | Tam |
| `CUMHURIYET` | Cumhuriyet |
| `GREMSE` | Gremse |
| `HAS` | Has |
| `GUMUS` | Gümüş |

**Banks (19):**
KAPALI_CARSI, AKBANK, ALBARAKA, DENIZBANK, ENPARA, FIBABANKA, QNB_FINANSBANK, GARANTI, HALKBANK, HSBC, ING, IS_BANKASI, KUVEYT_TURK, MERKEZ_BANKASI, SEKERBANK, TEB, VAKIFBANK, YAPI_KREDI, ZIRAAT

### 7.3 Data Models

**Currency:**

```typescript
interface Currency {
  code: string; // "USD"
  name: string; // "Amerikan Doları"
  flagUrl: string; // "/assets/flags/usd.png"
}
```

**Commodity:**

```typescript
interface Commodity {
  code: string; // "GRAM_GOLD"
  name: string; // "Gram Altın"
  logoUrl: string; // "/assets/commodities/gram-gold.png"
}
```

**Bank:**

```typescript
interface Bank {
  code: string; // "ZIRAAT"
  name: string; // "Ziraat Bankası"
  logoUrl: string; // "/assets/banks/ziraat.png"
}
```

**Free Market Rate:**

```typescript
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

**Bank Rate:**

```typescript
interface BankRate {
  bankCode: string;
  buyingPrice: number | null; // null = bank doesn't offer
  sellingPrice: number | null;
  lastUpdated: string;
}
```

**Market Status:**

```typescript
interface MarketStatus {
  isOpen: boolean;
  lastCloseAt: string | null;
  nextOpenAt: string | null;
}
```

### 7.4 Daily Change Calculation

```typescript
// Stored daily at market close (18:00 Turkey time)
interface PreviousClose {
  code: string;
  type: AssetType;
  closingPrice: number; // = sellingPrice at close
  closedAt: string;
}

// Calculation
dailyChange = currentSellingPrice - previousClose.closingPrice;
dailyChangePercentage = (dailyChange / previousClose.closingPrice) * 100;
trend = dailyChange > 0 ? 'up' : dailyChange < 0 ? 'down' : 'stable';
```

**Market Hours (Turkey Time - UTC+3):**

- Weekdays: 09:00 - 18:00
- Weekends: Closed
- Turkish holidays: Closed

**Weekend/Holiday Handling:**

- Use last trading day's close as reference

### 7.5 Premium Access Control

**Protected Endpoints:**

- `GET /api/rates/banks/:code`
- `GET /api/rates/banks/:code/:bankCode`
- `POST /api/converter/calculate` (when `includeBanks: true`)

**Guard Logic:**

```typescript
if (user.accountTier !== 'premium') {
  throw ForbiddenException({
    code: 'PREMIUM_REQUIRED',
    message: 'Bu özellik premium üyelik gerektirir',
  });
}
```

### 7.6 Endpoints

#### GET /api/currencies

Returns supported currencies list.

**Auth:** Bearer Token (Required)

**Response:**

```typescript
interface CurrenciesResponse {
  currencies: Currency[];
}
```

---

#### GET /api/commodities

Returns supported commodities list.

**Auth:** Bearer Token (Required)

**Response:**

```typescript
interface CommoditiesResponse {
  commodities: Commodity[];
}
```

---

#### GET /api/banks

Returns supported banks list.

**Auth:** Bearer Token (Required)

**Response:**

```typescript
interface BanksResponse {
  banks: Bank[];
}
```

---

#### GET /api/rates/free-market

Fetch all free market rates with optional filtering.

**Auth:** Bearer Token (Required)

**Query Params:**

| Param    | Type                    | Required | Description                       |
| -------- | ----------------------- | -------- | --------------------------------- |
| `type`   | `currency \| commodity` | No       | Filter by asset type              |
| `search` | `string`                | No       | Search by name/code (min 2 chars) |

**Response:**

```typescript
interface FreeMarketRatesResponse {
  market: MarketStatus;
  items: Array<
    FreeMarketRate & {
      name: string;
      logoUrl: string;
      isTracked: boolean;
    }
  >;
}
```

---

#### GET /api/rates/free-market/:code

Return a single free market item.

**Auth:** Bearer Token (Required)

**Query Params:**

| Param  | Type                    | Required | Description |
| ------ | ----------------------- | -------- | ----------- |
| `type` | `currency \| commodity` | Yes      | Asset type  |

**Response:**

```typescript
interface SingleFreeMarketRateResponse {
  market: MarketStatus;
  item: FreeMarketRate & {
    name: string;
    logoUrl: string;
    isTracked: boolean;
  };
}
```

**Errors:**

- `ASSET_NOT_FOUND`: Invalid code or type

---

#### GET /api/rates/banks/:code (Premium)

Returns bank-specific prices for an asset.

**Auth:** Bearer Token (Required) + Premium Guard

**Query Params:**

| Param             | Type                    | Required | Description           |
| ----------------- | ----------------------- | -------- | --------------------- |
| `type`            | `currency \| commodity` | Yes      | Asset type            |
| `transactionType` | `buy \| sell`           | Yes      | Transaction direction |

**Response:**

```typescript
interface BankRatesResponse {
  item: {
    code: string;
    name: string;
    logoUrl: string;
  };
  transactionType: 'buy' | 'sell';
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

**Sorting:**

- `transactionType: 'buy'` → Sort by price ASC (cheapest first)
- `transactionType: 'sell'` → Sort by price DESC (highest first)

**Best Rate:**

- `buy` → Lowest sellingPrice
- `sell` → Highest buyingPrice

---

#### GET /api/rates/banks/:code/:bankCode (Premium)

Return single bank detail for an asset.

**Auth:** Bearer Token (Required) + Premium Guard

**Query Params:**

| Param  | Type                    | Required | Description |
| ------ | ----------------------- | -------- | ----------- |
| `type` | `currency \| commodity` | Yes      | Asset type  |

**Response:**

```typescript
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

#### POST /api/converter/calculate

Convert FX/commodity → TRY.

**Auth:** Bearer Token (Required)

**Request:**

```typescript
interface ConverterRequest {
  fromCode: string;
  fromType: AssetType;
  amount: number;
  transactionType: 'buy' | 'sell';
  includeBanks?: boolean; // Premium feature
}
```

**Response:**

```typescript
interface ConverterResponse {
  freeMarket: {
    rate: number;
    result: number;
  };
  banks?: Array<{
    bankCode: string;
    bankName: string;
    bankLogoUrl: string;
    rate: number;
    result: number;
  }>;
}
```

**Business Rules:**

| User    | includeBanks    | Result                             |
| ------- | --------------- | ---------------------------------- |
| Free    | false/undefined | `freeMarket` only                  |
| Free    | true            | `freeMarket` only, `banks` omitted |
| Premium | false/undefined | `freeMarket` only                  |
| Premium | true            | `freeMarket` + `banks` array       |

**Calculation:**

- `transactionType: 'buy'` → Use sellingPrice
- `transactionType: 'sell'` → Use buyingPrice
- `result = amount × rate`

### 7.7 Scraper Service

**Data Source:** canlidoviz.com

**Frequency:** Every 1 minute (cron job)

**Retry Mechanism:**

| Attempt   | Wait Time  | Action                              |
| --------- | ---------- | ----------------------------------- |
| 1st error | 10 seconds | Retry                               |
| 2nd error | 30 seconds | Retry                               |
| 3rd error | —          | Log error, wait for next cron cycle |

**Stale Data Handling:**

| Condition             | Action                                |
| --------------------- | ------------------------------------- |
| Data > 5 minutes old  | Add `isStale: true` to responses      |
| Data > 15 minutes old | Trigger monitoring alert              |
| Scraper fails         | Continue serving last successful data |

#### POST /api/internal/rates/scraper/run

Manual trigger for scraper.

**Auth:** Internal API Key

**Response:**

```typescript
interface ScraperRunResponse {
  success: true;
  startedAt: string;
}
```

---

#### GET /api/internal/rates/scraper/health

Scraper health check.

**Auth:** Internal API Key

**Response:**

```typescript
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

- `healthy`: Last scrape successful, data fresh
- `degraded`: Data stale (>5 min) or 1-2 consecutive errors
- `unhealthy`: 3+ consecutive errors or data >15 min old

---

## 8. Webhooks

### 8.1 Overview

Server-to-Server notifications from Apple and Google for subscription lifecycle events.

**Benefits:**

- Real-time subscription status updates
- Handle events when app is not running
- More reliable than client-side receipt validation
- Required for grace period and refund handling

### 8.2 Apple App Store Server Notifications

#### Notification Types

| Type                   | Description                          |
| ---------------------- | ------------------------------------ |
| `DID_RENEW`            | Auto-renewal successful              |
| `DID_FAIL_TO_RENEW`    | Payment failed (grace period starts) |
| `CANCEL`               | User canceled subscription           |
| `EXPIRED`              | Subscription expired                 |
| `REFUND`               | Refund issued                        |
| `GRACE_PERIOD_EXPIRED` | Grace period ended (no payment)      |
| `SUBSCRIBED`           | Initial purchase                     |

#### Endpoint: POST /api/webhooks/apple

**Auth:** Apple JWS Signature Validation

**Request Payload:**

```typescript
interface AppleWebhookPayload {
  signedPayload: string; // JWS (JSON Web Signature)
}

// Decoded payload
interface AppleNotificationPayload {
  notificationType: AppleNotificationType;
  subtype?: string;
  notificationUUID: string; // For idempotency
  data: {
    bundleId: string;
    environment: 'Sandbox' | 'Production';
    signedTransactionInfo: string; // JWS
    signedRenewalInfo: string; // JWS
  };
}

// Decoded transaction info
interface AppleTransactionInfo {
  originalTransactionId: string; // billingKey
  transactionId: string;
  productId: string;
  purchaseDate: number; // Unix timestamp (ms)
  expiresDate: number; // Unix timestamp (ms)
}
```

**Response:**

```typescript
// HTTP 200 OK
{ "success": true }
```

**Validation Steps:**

1. Verify JWS signature using Apple's public keys
2. Check `bundleId` matches app
3. Validate `environment` (Production/Sandbox)

#### Apple Setup (App Store Connect)

```
App Store Connect → Apps → [App] → App Information → App Store Server Notifications

Production Server URL: https://api.yourapp.com/api/webhooks/apple
Sandbox Server URL: https://api-staging.yourapp.com/api/webhooks/apple
Version: Version 2 Notifications (Required)
```

**Shared Secret:**

```
App Store Connect → Apps → [App] → In-App Purchases → Manage
→ App-Specific Shared Secret → Generate
```

### 8.3 Google Play Real-Time Developer Notifications

#### Notification Types

| Type ID | Name                           | Description            |
| ------- | ------------------------------ | ---------------------- |
| 1       | `SUBSCRIPTION_RECOVERED`       | Payment recovered      |
| 2       | `SUBSCRIPTION_RENEWED`         | Renewal successful     |
| 3       | `SUBSCRIPTION_CANCELED`        | User canceled          |
| 4       | `SUBSCRIPTION_PURCHASED`       | Initial purchase       |
| 5       | `SUBSCRIPTION_ON_HOLD`         | Account on hold        |
| 6       | `SUBSCRIPTION_IN_GRACE_PERIOD` | Payment pending        |
| 7       | `SUBSCRIPTION_RESTARTED`       | Subscription restarted |
| 12      | `SUBSCRIPTION_EXPIRED`         | Subscription expired   |
| 13      | `SUBSCRIPTION_PAUSED`          | Subscription paused    |

#### Endpoint: POST /api/webhooks/google

**Auth:** Google Pub/Sub Push Authentication

**Request Payload:**

```typescript
interface GoogleWebhookPayload {
  message: {
    data: string; // Base64 encoded
    messageId: string; // For idempotency
    publishTime: string;
  };
  subscription: string;
}

// Decoded message.data
interface GoogleNotificationData {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number; // 1-13
    purchaseToken: string; // billingKey
    subscriptionId: string; // Product ID
  };
}
```

**Response:**

```typescript
// HTTP 200 OK (acknowledges message)
{ "success": true }
```

#### Google Setup

**1. Create Pub/Sub Topic (Google Cloud Console):**

```
Pub/Sub → Topics → Create Topic
Topic ID: play-billing-notifications
```

**2. Create Push Subscription:**

```
Pub/Sub → Subscriptions → Create Subscription
Subscription ID: play-billing-push
Delivery type: Push
Endpoint URL: https://api.yourapp.com/api/webhooks/google
Enable authentication: Yes
```

**3. Grant Publisher Permission:**

```
IAM → Add:
Member: google-play-developer-notifications@system.gserviceaccount.com
Role: Pub/Sub Publisher
```

**4. Configure in Play Console:**

```
Play Console → [App] → Monetization setup → Real-time developer notifications
Topic name: projects/your-project-id/topics/play-billing-notifications
```

### 8.4 Event Handling

| Event           | Platform                                                            | Backend Action                             |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| Renewal success | Apple: `DID_RENEW` / Google: `SUBSCRIPTION_RENEWED`                 | Update `expiresAt`, `status: active`       |
| Payment failed  | Apple: `DID_FAIL_TO_RENEW` / Google: `SUBSCRIPTION_IN_GRACE_PERIOD` | Set `status: grace_period`                 |
| Canceled        | Apple: `CANCEL` / Google: `SUBSCRIPTION_CANCELED`                   | Set `status: canceled`                     |
| Expired         | Apple: `EXPIRED` / Google: `SUBSCRIPTION_EXPIRED`                   | Set `accountTier: free`, `status: expired` |
| Refund          | Apple: `REFUND`                                                     | Immediate `accountTier: free`              |
| Recovered       | Google: `SUBSCRIPTION_RECOVERED`                                    | Set `status: active`                       |

### 8.5 Event Handlers Implementation

```typescript
// RENEWAL SUCCESS
async function handleRenewalSuccess(billingKey: string, newExpiresAt: Date) {
  await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { billingKey },
      data: { status: 'active', expiresAt: newExpiresAt },
    });

    await tx.user.update({
      where: { id: subscription.userId },
      data: { accountTier: 'premium', subscriptionExpiresAt: newExpiresAt },
    });
  });
}

// PAYMENT FAILED (Grace Period)
async function handlePaymentFailed(billingKey: string) {
  await db.subscription.update({
    where: { billingKey },
    data: { status: 'grace_period' },
  });
  // User keeps premium during grace period
  // Optional: Send push notification
}

// CANCELED
async function handleCanceled(billingKey: string) {
  await db.subscription.update({
    where: { billingKey },
    data: { status: 'canceled' },
  });
  // User stays premium until expiresAt
}

// EXPIRED
async function handleExpired(billingKey: string) {
  await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { billingKey },
      data: { status: 'expired' },
    });

    await tx.user.update({
      where: { id: subscription.userId },
      data: { accountTier: 'free', subscriptionExpiresAt: null },
    });
  });
}

// REFUND
async function handleRefund(billingKey: string) {
  await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { billingKey },
      data: { status: 'refunded' },
    });

    await tx.user.update({
      where: { id: subscription.userId },
      data: { accountTier: 'free', subscriptionExpiresAt: null },
    });
  });
}
```

### 8.6 Idempotency

Store webhook logs to prevent duplicate processing:

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

**Processing Logic:**

```typescript
async function processWebhook(eventId: string, handler: () => Promise<void>) {
  const existing = await db.webhookLog.findUnique({ where: { eventId } });
  if (existing) {
    return { alreadyProcessed: true };
  }

  await handler();

  await db.webhookLog.create({
    data: { eventId, platform, eventType, billingKey, processedAt: new Date(), payload },
  });
}
```

### 8.7 Retry Behavior

**Apple Retry Schedule (on non-2xx response):**

1. 1 hour later
2. 12 hours later
3. 24 hours later
4. 48 hours later
5. 72 hours later
6. Gives up

**Google Pub/Sub Retry:**

- Exponential backoff starting at 10 seconds
- Max 10 minutes between retries
- Continues for 7 days

### 8.8 Environment Variables

```bash
# Apple
APPLE_BUNDLE_ID=com.yourcompany.muhasebat
APPLE_SHARED_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google
GOOGLE_PACKAGE_NAME=com.yourcompany.muhasebat
GOOGLE_PUBSUB_AUDIENCE=https://api.yourapp.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json
```

---

## 9. API Endpoint Summary

| Method | Endpoint                             | Auth           | Premium   | Module       |
| ------ | ------------------------------------ | -------------- | --------- | ------------ |
| POST   | `/api/app/init`                      | No             | No        | App          |
| GET    | `/api/users/me`                      | Yes            | No        | User         |
| DELETE | `/api/users/me`                      | Yes            | No        | User         |
| GET    | `/api/users/me/tracked`              | Yes            | No        | User         |
| POST   | `/api/users/me/tracked`              | Yes            | No        | User         |
| DELETE | `/api/users/me/tracked/:assetCode`   | Yes            | No        | User         |
| POST   | `/api/subscriptions/verify`          | Yes            | No        | Subscription |
| POST   | `/api/subscriptions/restore`         | Yes            | No        | Subscription |
| POST   | `/api/webhooks/apple`                | Apple JWS      | No        | Subscription |
| POST   | `/api/webhooks/google`               | Google Pub/Sub | No        | Subscription |
| GET    | `/api/config/subscription`           | No             | No        | Config       |
| GET    | `/api/config/default-assets`         | No             | No        | Config       |
| GET    | `/api/currencies`                    | Yes            | No        | Rate         |
| GET    | `/api/commodities`                   | Yes            | No        | Rate         |
| GET    | `/api/banks`                         | Yes            | No        | Rate         |
| GET    | `/api/rates/free-market`             | Yes            | No        | Rate         |
| GET    | `/api/rates/free-market/:code`       | Yes            | No        | Rate         |
| GET    | `/api/rates/banks/:code`             | Yes            | **Yes**   | Rate         |
| GET    | `/api/rates/banks/:code/:bankCode`   | Yes            | **Yes**   | Rate         |
| POST   | `/api/converter/calculate`           | Yes            | Partial\* | Rate         |
| POST   | `/api/internal/rates/scraper/run`    | Internal       | No        | Rate         |
| GET    | `/api/internal/rates/scraper/health` | Internal       | No        | Rate         |
| GET    | `/health`                            | No             | No        | System       |
| GET    | `/ready`                             | No             | No        | System       |

\* `includeBanks: true` requires premium

---

## 10. Shared Infrastructure Requirements

This section identifies shared components that need to be implemented in the Tenzel framework's shared kernel before building the modules.

### 10.1 Required Shared Exceptions

The following custom exceptions need to be added to `src/shared/exceptions/`:

| Exception                  | HTTP Status | Required For                                        |
| -------------------------- | ----------- | --------------------------------------------------- |
| `UnauthorizedException`    | 401         | Auth middleware (UNAUTHORIZED, INVALID_TOKEN)       |
| `ForbiddenException`       | 403         | Premium guard (PREMIUM_REQUIRED)                    |
| `NotFoundException`        | 404         | All modules (USER_NOT_FOUND, ASSET_NOT_FOUND, etc.) |
| `BadRequestException`      | 400         | Validation (INVALID_RECEIPT, VALIDATION_ERROR)      |
| `ConflictException`        | 409         | Duplicate entries                                   |
| `TooManyRequestsException` | 429         | Rate limiting                                       |

> **Note:** Check if these already exist in Tenzel's `src/shared/exceptions/` - some may already be implemented.

### 10.2 Required Middleware

**Auth Middleware (`src/shared/middleware/auth.middleware.ts`):**

```typescript
// JWT token validation
// Extract user from token
// Attach to request context
// Handle UNAUTHORIZED and INVALID_TOKEN errors
```

**Premium Guard (`src/shared/middleware/premium.guard.ts`):**

```typescript
// Check user.accountTier === 'premium'
// Return 403 PREMIUM_REQUIRED if not
```

**Rate Limit Middleware (`src/shared/middleware/rate-limit.middleware.ts`):**

```typescript
// Per-endpoint rate limiting
// Return 429 with retryAfter
```

### 10.3 Required Shared Infrastructure

**JWT Service (`src/shared/infrastructure/jwt/`):**

```typescript
interface JwtService {
  sign(payload: { userId: string; deviceId: string }): string;
  verify(token: string): JwtPayload | null;
}
```

**Store Validation Services:**

```typescript
// Apple receipt validation
interface AppleStoreService {
  validateReceipt(receipt: string): Promise<AppleReceiptInfo>;
  validateWebhookSignature(signedPayload: string): Promise<AppleNotificationPayload>;
}

// Google receipt validation
interface GoogleStoreService {
  validateReceipt(receipt: string, subscriptionId: string): Promise<GoogleSubscriptionInfo>;
  validatePubSubToken(token: string): Promise<boolean>;
}
```

### 10.4 Required i18n Keys

Add to `src/shared/i18n/locales/`:

**English (en.json):**

```json
{
  "error.unauthorized": "Authentication required",
  "error.invalid_token": "Invalid or expired token",
  "error.premium_required": "This feature requires premium subscription",
  "error.user_not_found": "User not found",
  "error.asset_not_found": "Asset not found",
  "error.bank_not_found": "Bank not found",
  "error.invalid_receipt": "Invalid purchase receipt",
  "error.subscription_not_found": "No subscription found",
  "error.validation_error": "Validation failed",
  "error.rate_limit_exceeded": "Too many requests. Please try again later."
}
```

**Turkish (tr.json):**

```json
{
  "error.unauthorized": "Kimlik doğrulama gerekli",
  "error.invalid_token": "Geçersiz veya süresi dolmuş token",
  "error.premium_required": "Bu özellik premium üyelik gerektirir",
  "error.user_not_found": "Kullanıcı bulunamadı",
  "error.asset_not_found": "Varlık bulunamadı",
  "error.bank_not_found": "Banka bulunamadı",
  "error.invalid_receipt": "Geçersiz satın alma makbuzu",
  "error.subscription_not_found": "Abonelik bulunamadı",
  "error.validation_error": "Doğrulama hatası",
  "error.rate_limit_exceeded": "Çok fazla istek. Lütfen daha sonra tekrar deneyin."
}
```

### 10.5 Required Cron Job Infrastructure

**Scheduled Tasks Service:**

```typescript
// For subscription expiry check (hourly)
// For scraper execution (every minute)
// For soft-deleted user cleanup (daily)
```

### 10.6 Database Schema Additions

**Common Columns Mixin:**

```typescript
// All tables should include:
{
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),  // For soft delete
}
```

### 10.7 Module Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     MODULE DEPENDENCIES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Shared Kernel (implement first)                                │
│  ├── Exceptions                                                 │
│  ├── Auth Middleware                                            │
│  ├── Premium Guard                                              │
│  ├── Rate Limit Middleware                                      │
│  ├── JWT Service                                                │
│  └── i18n Keys                                                  │
│                                                                  │
│  Config Module (no dependencies)                                │
│  └── Standalone, can be implemented first                       │
│                                                                  │
│  User Module                                                     │
│  ├── Depends on: Auth Middleware, JWT Service                   │
│  └── Required by: Subscription, Rate, App                       │
│                                                                  │
│  Subscription Module                                             │
│  ├── Depends on: User Module, Auth Middleware                   │
│  ├── Requires: Store Validation Services                        │
│  └── Required by: App Module                                    │
│                                                                  │
│  Rate Module                                                     │
│  ├── Depends on: User Module, Auth Middleware, Premium Guard    │
│  └── Requires: Scraper Service, Cron Infrastructure            │
│                                                                  │
│  App Module                                                      │
│  ├── Depends on: User, Subscription, Config, Rate               │
│  └── Aggregates all modules for app/init                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Business Rules Summary

| Rule                  | Description                                 |
| --------------------- | ------------------------------------------- |
| Current Price         | = sellingPrice                              |
| Daily Change          | = current - previousClose                   |
| Buy Transaction       | Show bank's sellingPrice                    |
| Sell Transaction      | Show bank's buyingPrice                     |
| Best Rate (Buy)       | Lowest sellingPrice                         |
| Best Rate (Sell)      | Highest buyingPrice                         |
| Search                | Case-insensitive, min 2 chars               |
| Stale Data            | > 5 minutes since last update               |
| Token Expiry          | Never expires, invalidated on user deletion |
| Soft Delete Retention | 90 days for premium users                   |
| Market Hours          | Weekdays 09:00-18:00 Turkey Time            |

---

## Appendix B: Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
DEFAULT_LOCALE=tr

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/muhasebat
DATABASE_POOL_MAX=10

# Security
JWT_SECRET=your-32-character-minimum-secret-key

# Apple
APPLE_BUNDLE_ID=com.yourcompany.muhasebat
APPLE_SHARED_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google
GOOGLE_PACKAGE_NAME=com.yourcompany.muhasebat
GOOGLE_PUBSUB_AUDIENCE=https://api.yourapp.com
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json

# Scraper
SCRAPER_SOURCE_URL=https://canlidoviz.com
SCRAPER_INTERVAL_MS=60000

# Observability (Optional)
OTEL_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

---

**Document Version:** 3.0  
**Last Updated:** December 2024
