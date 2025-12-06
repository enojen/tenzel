# MHSB-061: Module Registration [INFRA]

## Description

Register all modules in app.ts and configure middleware.

## Dependencies

- All previous tasks completed

## Files to Modify

- `src/app.ts`
- `src/config/schema.ts` (add new env vars)

## Implementation Details

### Module Registration in app.ts

```typescript
import { appModule } from './modules/app';
import { userModule } from './modules/user';
import { subscriptionModule } from './modules/subscription';
import { rateModule } from './modules/rate';
import { configModule } from './modules/config';

// Shared infrastructure
import { authMiddleware } from './shared/middleware/auth.middleware';
import { rateLimitMiddleware } from './shared/middleware/rate-limit.middleware';
import { cronService } from './shared/infrastructure/cron';

export const createApp = () => {
  const app = new Elysia()
    // Global middleware
    .use(requestIdMiddleware)
    .use(loggingMiddleware)
    .use(rateLimitMiddleware)
    .use(exceptionHandler)

    // Health checks
    .get('/health', healthHandler)
    .get('/ready', readyHandler)

    // API routes
    .group('/api', (app) =>
      app
        // Public endpoints
        .use(appModule)
        .use(configModule)

        // Authenticated endpoints
        .use(authMiddleware)
        .use(userModule)
        .use(subscriptionModule)
        .use(rateModule),
    )

    // OpenAPI
    .use(openApiPlugin);

  return app;
};
```

### Environment Variables to Add

```typescript
// src/config/schema.ts
const configSchema = z.object({
  // ... existing ...

  // Apple Store
  APPLE_BUNDLE_ID: z.string().optional(),
  APPLE_SHARED_SECRET: z.string().optional(),

  // Google Store
  GOOGLE_PACKAGE_NAME: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH: z.string().optional(),
  GOOGLE_PUBSUB_AUDIENCE: z.string().optional(),

  // Scraper
  SCRAPER_SOURCE_URL: z.string().default('https://canlidoviz.com'),
  SCRAPER_INTERVAL_MS: z.coerce.number().default(60000),

  // Internal API
  INTERNAL_API_KEY: z.string().optional(),
});
```

### Cron Job Registration

```typescript
// In bootstrap.ts or separate file
cronService.register({
  name: 'rate-scraper',
  schedule: '*/1 * * * *',
  handler: scraperJob.run,
  enabled: true,
});

cronService.register({
  name: 'subscription-expiry',
  schedule: '0 * * * *',
  handler: expiryJob.run,
  enabled: true,
});

cronService.register({
  name: 'soft-delete-cleanup',
  schedule: '0 0 * * *',
  handler: cleanupJob.run,
  enabled: true,
});

cronService.start();
```

### Final Checklist

- [ ] All modules imported and registered
- [ ] Auth middleware applied to protected routes
- [ ] Rate limiting configured per endpoint group
- [ ] Premium guard available for use
- [ ] Cron jobs registered and started
- [ ] Environment variables documented
- [ ] OpenAPI docs include all endpoints

## Acceptance Criteria

- [ ] App starts without errors
- [ ] All endpoints accessible
- [ ] Auth working on protected routes
- [ ] Rate limiting working
- [ ] Cron jobs running
- [ ] `bun run dev` works
- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes

## On Completion

```bash
git commit -m "MHSB-061: register all modules and configure app"
```
