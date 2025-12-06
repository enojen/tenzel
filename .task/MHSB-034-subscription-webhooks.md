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
