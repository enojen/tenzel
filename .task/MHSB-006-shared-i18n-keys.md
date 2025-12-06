# MHSB-006: i18n Error Keys [INFRA]

## Description

Add Turkish and English translations for all Muhasebat-specific error messages.

## Dependencies

None

## Files to Create/Modify

- `src/shared/i18n/locales/en.json` (modify)
- `src/shared/i18n/locales/tr.json` (modify)

## Implementation Details

### English (en.json) - Add:

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

### Turkish (tr.json) - Add:

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

## Acceptance Criteria

- [ ] All error keys added to en.json
- [ ] All error keys added to tr.json
- [ ] Translations are accurate
- [ ] No duplicate keys

## On Completion

```bash
git commit -m "MHSB-006: add i18n keys for Muhasebat error messages"
```
