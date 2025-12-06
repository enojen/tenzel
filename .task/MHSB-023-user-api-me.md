# MHSB-023: User API - Me Endpoints [API]

## Description

Create user profile endpoints for getting and deleting current user.

## Dependencies

- MHSB-002 (Auth Middleware)
- MHSB-022 (User Repository)

## Endpoints

| Method | Path          | Auth | Description           |
| ------ | ------------- | ---- | --------------------- |
| GET    | /api/users/me | Yes  | Get current user info |
| DELETE | /api/users/me | Yes  | Delete current user   |

## Files to Create/Modify

- `src/modules/user/api/user.controller.ts` (create)
- `src/modules/user/api/user.schemas.ts` (create)
- `src/modules/user/application/queries/get-current-user.query.ts` (create)
- `src/modules/user/application/commands/delete-user.command.ts` (create)
- `src/modules/user/exceptions/user.exceptions.ts` (create)
- `src/modules/user/index.ts` (create)

## Implementation Details

### GET /api/users/me Response

```typescript
{
  user: {
    id: string,
    deviceId: string,
    accountTier: 'free' | 'premium',
    subscriptionExpiresAt: string | null,
    createdAt: string,
    updatedAt: string
  }
}
```

### DELETE /api/users/me Response

```typescript
{
  success: true;
}
```

### Delete Logic

| User Type | Action      | Token       | Data                |
| --------- | ----------- | ----------- | ------------------- |
| Free      | Hard delete | Invalidated | Permanently deleted |
| Premium   | Soft delete | Invalidated | Preserved 90 days   |

## Acceptance Criteria

- [ ] GET /api/users/me returns user data
- [ ] DELETE /api/users/me applies correct deletion type
- [ ] Auth middleware applied
- [ ] OpenAPI schemas documented
- [ ] Lint & typecheck pass

## On Completion

```bash
git commit -m "MHSB-023: add user me endpoints (GET, DELETE)"
```
