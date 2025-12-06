# MHSB-060: Database Migrations [DB]

## Description

Generate and verify all database migrations for the project.

## Dependencies

- MHSB-021 (User DB)
- MHSB-031 (Subscription DB)
- MHSB-041 (Rate DB)

## Tasks

### 1. Generate Migrations

```bash
bun run db:generate
```

### 2. Verify Migration Files

Check `drizzle/migrations/` for:

- [ ] Users table migration
- [ ] Tracked assets table migration
- [ ] Subscriptions table migration
- [ ] Webhook logs table migration
- [ ] Free market rates table migration
- [ ] Bank rates table migration
- [ ] Previous closes table migration

### 3. Enum Types

Verify these enums are created:

- [ ] `account_tier` ('free', 'premium')
- [ ] `asset_type` ('currency', 'commodity')
- [ ] `subscription_platform` ('ios', 'android')
- [ ] `subscription_status` ('active', 'expired', 'canceled', 'grace_period')
- [ ] `webhook_platform` ('apple', 'google')

### 4. Foreign Keys

- [ ] tracked_assets.user_id → users.id (CASCADE DELETE)
- [ ] subscriptions.user_id → users.id

### 5. Indexes

- [ ] users.device_id (unique)
- [ ] subscriptions.billing_key (unique)
- [ ] webhook_logs.event_id (unique)
- [ ] All foreign key columns indexed

### 6. Test Migration

```bash
# Apply to test database
bun run db:migrate

# Verify schema
bun run db:studio
```

## Acceptance Criteria

- [ ] All migrations generated
- [ ] Migrations apply cleanly
- [ ] All tables created correctly
- [ ] All constraints in place
- [ ] Rollback tested (if supported)

## On Completion

```bash
git commit -m "MHSB-060: generate database migrations"
```
