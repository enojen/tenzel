# MHSB-034: Subscription Webhooks [WEBHOOK]

## Description

Create Apple and Google webhook handlers for subscription lifecycle events.

## Dependencies

- MHSB-032 (Store Services for validation)
- MHSB-030 (WebhookLog for idempotency)

## Endpoints

| Method | Path                 | Auth           | Description                   |
| ------ | -------------------- | -------------- | ----------------------------- |
| POST   | /api/webhooks/apple  | Apple JWS      | Apple App Store notifications |
| POST   | /api/webhooks/google | Google Pub/Sub | Google Play notifications     |

## Files to Create/Modify

- `src/modules/subscription/api/webhooks/apple-webhook.controller.ts`
- `src/modules/subscription/api/webhooks/google-webhook.controller.ts`
- `src/modules/subscription/application/handlers/webhook-event.handler.ts`

## Implementation Details

### Apple Notification Types

| Type              | Action                                 |
| ----------------- | -------------------------------------- |
| DID_RENEW         | Update expiresAt, status: 'active'     |
| DID_FAIL_TO_RENEW | status: 'grace_period'                 |
| CANCEL            | status: 'canceled'                     |
| EXPIRED           | status: 'expired', accountTier: 'free' |
| REFUND            | Immediate accountTier: 'free'          |

### Google Notification Types

| Type ID | Name                         | Action                 |
| ------- | ---------------------------- | ---------------------- |
| 2       | SUBSCRIPTION_RENEWED         | Update expiresAt       |
| 3       | SUBSCRIPTION_CANCELED        | status: 'canceled'     |
| 6       | SUBSCRIPTION_IN_GRACE_PERIOD | status: 'grace_period' |
| 12      | SUBSCRIPTION_EXPIRED         | status: 'expired'      |
| 1       | SUBSCRIPTION_RECOVERED       | status: 'active'       |

### Idempotency

```typescript
async function processWebhook(eventId: string, handler: () => Promise<void>) {
  const existing = await db.webhookLog.findUnique({ where: { eventId } });
  if (existing) return { alreadyProcessed: true };

  await handler();
  await db.webhookLog.create({ ... });
}
```

### Validation

- Apple: Verify JWS signature using Apple's public keys
- Google: Verify Pub/Sub push authentication

## Acceptance Criteria

- [ ] Apple webhook receives and processes events
- [ ] Google webhook receives and processes events
- [ ] Signature/token validation working
- [ ] Idempotency via webhook_logs
- [ ] User accountTier updated correctly
- [ ] Returns 200 OK to acknowledge
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-034: add Apple and Google webhook handlers"
```

---

## Config Centralization (Completed)

### Changes Made

#### 1. Config Schema (`src/config/schema.ts`)

Added Apple and Google environment variables to the central schema:

```typescript
// Apple Store Config (optional - only required if iOS is used)
APPLE_KEY_PATH: z.string().optional(),
APPLE_KEY_ID: z.string().optional(),
APPLE_ISSUER_ID: z.string().optional(),
APPLE_BUNDLE_ID: z.string().optional(),
APPLE_ROOT_CA_G3_PATH: z.string().optional(),
APPLE_ROOT_CA_G2_PATH: z.string().optional(),
APPLE_APP_ID: z.coerce.number().optional(),

// Google Play Config (optional - only required if Android is used)
GOOGLE_PACKAGE_NAME: z.string().optional(),
GOOGLE_SERVICE_ACCOUNT_KEY_PATH: z.string().optional(),
```

#### 2. Config Index (`src/config/index.ts`)

Added subscription config object to centralized config:

```typescript
subscription: {
  apple: {
    keyPath: env.APPLE_KEY_PATH,
    keyId: env.APPLE_KEY_ID,
    issuerId: env.APPLE_ISSUER_ID,
    bundleId: env.APPLE_BUNDLE_ID,
    rootCAG3Path: env.APPLE_ROOT_CA_G3_PATH,
    rootCAG2Path: env.APPLE_ROOT_CA_G2_PATH,
    appId: env.APPLE_APP_ID,
  },
  google: {
    packageName: env.GOOGLE_PACKAGE_NAME,
    serviceAccountKeyPath: env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  },
}
```

#### 3. Service Updates

- **AppleStoreService**: Now uses `config.subscription.apple` instead of `process.env`
- **GoogleStoreService**: Now uses `config.subscription.google` instead of `process.env`
- Both services provide clear error messages when config is missing

#### 4. Environment Example (`.env.example`)

Commented out Apple and Google configs as optional (only needed when using those platforms)

### Benefits

✅ Config validation happens at app startup (fail-fast)
✅ Centralized config management
✅ Type safety throughout the app
✅ Clear error messages for missing config
✅ Easier to test services with mock config

---

## Conditional Service Instantiation (Completed)

### Problem

- Apple/Google store services were always instantiated in `createApp()`, but configs are optional
- Services threw errors in constructor if config was missing
- Tests failed because test environment doesn't have Apple/Google credentials

### Solution: Made Services and Webhook Routes Conditional

#### 1. App Updates (`src/app.ts`)

```typescript
// Check if configs exist before instantiating services
const appleConfig = config.subscription.apple;
const googleConfig = config.subscription.google;

const hasAppleConfig = !!(
  appleConfig.keyPath &&
  appleConfig.keyId &&
  appleConfig.issuerId &&
  appleConfig.bundleId
);
const hasGoogleConfig = !!(googleConfig.packageName && googleConfig.serviceAccountKeyPath);

const appleStoreService = hasAppleConfig ? new AppleStoreService() : undefined;
const googleStoreService = hasGoogleConfig ? new GoogleStoreService() : undefined;

// Only register webhooks module if at least one service is configured
if (appleStoreService || googleStoreService) {
  return api.use(
    createWebhooksModule({
      subscriptionRepository,
      userRepository,
      appleStoreService,
      googleStoreService,
    }),
  );
}

return api; // No webhooks if no services configured
```

#### 2. Module Updates (`src/modules/subscription/index.ts`)

```typescript
// Made services optional in interfaces
export interface WebhooksModuleDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

// Conditionally register routes based on service availability
export function createWebhooksModule(deps: WebhooksModuleDeps) {
  const app = new Elysia({ prefix: '/webhooks', tags: ['Webhooks'] });

  if (deps.appleStoreService) {
    app.group('/apple', (group) =>
      group.use(
        appleWebhookController({
          subscriptionRepository: deps.subscriptionRepository,
          userRepository: deps.userRepository,
          appleStoreService: deps.appleStoreService!,
        }),
      ),
    );
  }

  if (deps.googleStoreService) {
    app.group('/google', (group) =>
      group.use(
        googleWebhookController({
          subscriptionRepository: deps.subscriptionRepository,
          userRepository: deps.userRepository,
          googleStoreService: deps.googleStoreService!,
        }),
      ),
    );
  }

  return app;
}
```

#### 3. Command Updates

Made services optional in command dependencies and added runtime checks:

**verify-subscription.command.ts:**

```typescript
export interface VerifySubscriptionDeps {
  userId: string;
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

// Added runtime checks
if (input.platform === SUBSCRIPTION_PLATFORMS.IOS) {
  if (!appleStoreService) {
    throw new Error('Apple Store integration is not configured');
  }
  // ... use service
}
```

**restore-subscription.command.ts:** Similar pattern applied

#### 4. Controller Updates

Made services optional in `SubscriptionControllerDeps` interface

### Benefits

✅ App starts successfully without Apple/Google configs
✅ Tests pass in environments without credentials
✅ Production can still enforce required configs via deployment checks
✅ Webhook routes only registered when services are configured
✅ Clean separation - no mock data or complex test setup needed
✅ Runtime validation provides clear error messages when services are needed but not configured
