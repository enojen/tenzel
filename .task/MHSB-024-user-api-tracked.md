# MHSB-024: User API - Tracked Assets [API]

## Description

Create endpoints for managing user's tracked assets list.

## Dependencies

- MHSB-002 (Auth Middleware)
- MHSB-022 (User Repository)

## Endpoints

| Method | Path                             | Auth | Description          |
| ------ | -------------------------------- | ---- | -------------------- |
| GET    | /api/users/me/tracked            | Yes  | Get tracked assets   |
| POST   | /api/users/me/tracked            | Yes  | Add tracked asset    |
| DELETE | /api/users/me/tracked/:assetCode | Yes  | Remove tracked asset |

## Files to Create/Modify

- `src/modules/user/api/user.controller.ts` (modify)
- `src/modules/user/api/user.schemas.ts` (modify)
- `src/modules/user/application/queries/get-tracked-assets.query.ts` (create)
- `src/modules/user/application/commands/add-tracked-asset.command.ts` (create)
- `src/modules/user/application/commands/remove-tracked-asset.command.ts` (create)

## Implementation Details

### GET /api/users/me/tracked Response

```typescript
{
  assets: [
    { assetType: 'currency', assetCode: 'USD', addedAt: string },
    { assetType: 'commodity', assetCode: 'GRAM_GOLD', addedAt: string },
  ];
}
```

### POST /api/users/me/tracked Request/Response

```typescript
// Request
{ assetType: 'currency' | 'commodity', assetCode: string }

// Response
{ success: true, assets: TrackedAsset[] }
```

### DELETE /api/users/me/tracked/:assetCode

Query param: `type=currency|commodity` (required)

```typescript
// Response
{ success: true, assets: TrackedAsset[] }
```

### Business Rules

- Add is idempotent (same asset = success)
- Remove is idempotent (non-existing = success)
- ASSET_NOT_FOUND if invalid assetCode/assetType combo
- `type` query param required for DELETE to distinguish same-code assets

## Acceptance Criteria

- [ ] GET returns user's tracked assets
- [ ] POST adds asset (idempotent)
- [ ] DELETE removes asset (idempotent)
- [ ] ASSET_NOT_FOUND error for invalid assets
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-024: add tracked assets endpoints"
```
