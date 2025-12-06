# MHSB-035: Subscription Expiry Job [JOB]

## Description

Create hourly cron job to check and expire subscriptions.

## Dependencies

- MHSB-007 (Cron Infrastructure)
- MHSB-032 (Subscription Repository)

## Files to Create

- `src/modules/subscription/infrastructure/jobs/subscription-expiry.job.ts`

## Implementation Details

### Job Configuration

```typescript
{
  name: 'subscription-expiry',
  schedule: '0 * * * *', // Every hour
  enabled: true
}
```

### Job Logic

```typescript
async function runExpiryCheck() {
  // Find expired subscriptions
  const expired = await subscriptionRepo.findExpired();
  // WHERE expires_at < NOW()
  // AND status IN ('active', 'canceled', 'grace_period')

  for (const sub of expired) {
    await db.$transaction([
      // Update subscription status
      subscriptionRepo.update(sub.id, { status: 'expired' }),

      // Downgrade user
      userRepo.update(sub.userId, {
        accountTier: 'free',
        subscriptionExpiresAt: null,
      }),
    ]);

    logger.info({ subscriptionId: sub.id, userId: sub.userId }, 'Subscription expired');
  }

  return { processed: expired.length };
}
```

### Additional Job: Soft Delete Cleanup

```typescript
{
  name: 'soft-delete-cleanup',
  schedule: '0 0 * * *', // Daily at midnight
  enabled: true
}

// Find users where deletedAt < (NOW - 90 days) AND accountTier = 'premium'
// Hard delete them
```

## Acceptance Criteria

- [ ] Expiry job runs hourly
- [ ] Expired subscriptions marked as 'expired'
- [ ] Users downgraded to 'free'
- [ ] Transaction ensures atomicity
- [ ] Logging for each expiry
- [ ] Soft delete cleanup job (90 days)
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-035: add subscription expiry and cleanup cron jobs"
```
