# MHSB-047: Rate Scraper Service [JOB]

## Description

Create scraper service that fetches rates from canlidoviz.com every minute.

## Dependencies

- MHSB-007 (Cron Infrastructure)
- MHSB-042 (Rate Repository)

## Files to Create

- `src/modules/rate/infrastructure/services/scraper.service.ts`
- `src/modules/rate/infrastructure/jobs/scraper.job.ts`
- `src/modules/rate/api/internal/scraper.controller.ts`

## Endpoints (Internal)

| Method | Path                               | Auth             | Description    |
| ------ | ---------------------------------- | ---------------- | -------------- |
| POST   | /api/internal/rates/scraper/run    | Internal API Key | Manual trigger |
| GET    | /api/internal/rates/scraper/health | Internal API Key | Health check   |

## Implementation Details

### Scraper Service

```typescript
interface ScraperService {
  scrape(): Promise<ScrapedData>;
  parseRates(html: string): ParsedRate[];
}
```

### Data Source

- URL: https://canlidoviz.com
- Frequency: Every 1 minute

### Retry Mechanism

| Attempt   | Wait Time  | Action                              |
| --------- | ---------- | ----------------------------------- |
| 1st error | 10 seconds | Retry                               |
| 2nd error | 30 seconds | Retry                               |
| 3rd error | —          | Log error, wait for next cron cycle |

### Cron Job

```typescript
{
  name: 'rate-scraper',
  schedule: '*/1 * * * *', // Every minute
  enabled: true
}
```

### Health Check Response

```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  lastSuccessAt: string | null,
  lastErrorAt: string | null,
  consecutiveErrors: number,
  isStale: boolean,
  marketOpen: boolean
}
```

### Status Logic

- `healthy`: Last scrape successful, data fresh
- `degraded`: Data stale (>5 min) or 1-2 consecutive errors
- `unhealthy`: 3+ consecutive errors or data >15 min old

### Stale Data Handling

| Condition         | Action                                |
| ----------------- | ------------------------------------- |
| Data > 5 min old  | Add `isStale: true` to responses      |
| Data > 15 min old | Trigger monitoring alert              |
| Scraper fails     | Continue serving last successful data |

### Market Close Job

At 18:00 Turkey time, save current selling prices as previous closes.

## Environment Variables

```bash
SCRAPER_SOURCE_URL=https://canlidoviz.com
SCRAPER_INTERVAL_MS=60000
```

## Acceptance Criteria

- [ ] Scraper fetches data from canlidoviz.com
- [ ] Parses currencies, commodities, and bank rates
- [ ] Cron job runs every minute
- [ ] Retry mechanism with exponential backoff
- [ ] Health endpoint shows status
- [ ] Manual trigger works
- [ ] Previous close saved at market close
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-047: add rate scraper service with cron job"
```
