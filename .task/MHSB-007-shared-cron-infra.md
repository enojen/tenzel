# MHSB-007: Cron Job Infrastructure [INFRA]

## Description

Create cron job scheduler infrastructure for recurring tasks (scraper, subscription expiry).

## Dependencies

None

## Files to Create/Modify

- `src/shared/infrastructure/cron/cron.service.ts` (create)
- `src/shared/infrastructure/cron/index.ts` (create)
- `src/shared/infrastructure/index.ts` (modify - add export)

## Implementation Details

### Cron Service Interface

```typescript
interface CronJob {
  name: string;
  schedule: string; // cron expression
  handler: () => Promise<void>;
  enabled: boolean;
}

interface CronService {
  register(job: CronJob): void;
  start(): void;
  stop(): void;
  runNow(jobName: string): Promise<void>;
}
```

### Required Jobs (to be registered later)

| Job                 | Schedule                     | Module       |
| ------------------- | ---------------------------- | ------------ |
| scraper             | `*/1 * * * *` (every minute) | Rate         |
| subscription-expiry | `0 * * * *` (every hour)     | Subscription |
| soft-delete-cleanup | `0 0 * * *` (daily)          | User         |

### Implementation Notes

- Use `node-cron` or similar package
- Jobs should be registerable from modules
- Support manual trigger via runNow()
- Graceful shutdown support

## Acceptance Criteria

- [ ] CronService can register jobs
- [ ] Jobs run on schedule
- [ ] Jobs can be triggered manually
- [ ] Graceful shutdown stops all jobs
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-007: add cron job scheduler infrastructure"
```
