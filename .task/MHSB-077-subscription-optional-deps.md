# MHSB-077: Subscription Optional Dependencies Refactor [REFACTOR]

## Description

Refactor optional AppleStoreService and GoogleStoreService dependencies to use Strategy Pattern, eliminating type safety issues and improving scalability.

**Current Problems:**

1. Services marked as optional (`?`) but used with non-null assertions (`!`)
2. Generic `Error` thrown instead of domain exceptions
3. Runtime error risk when service not configured
4. Not scalable for adding new platforms
5. Type safety lost with `!` operator

**Priority:** 🔴 CRITICAL

## Dependencies

- None

## Files to Create

- `src/modules/subscription/application/validators/subscription-validator.interface.ts`
- `src/modules/subscription/application/validators/apple-subscription-validator.ts`
- `src/modules/subscription/application/validators/google-subscription-validator.ts`
- `src/modules/subscription/application/validators/subscription-validator.registry.ts`
- `src/modules/subscription/application/validators/index.ts`

## Files to Modify

- `src/modules/subscription/application/commands/verify-subscription.command.ts`
- `src/modules/subscription/application/commands/restore-subscription.command.ts`
- `src/modules/subscription/application/dto/command-types.ts`
- `src/modules/subscription/api/subscription.controller.ts`
- `src/modules/subscription/index.ts`
- `src/modules/subscription/exceptions/subscription.exceptions.ts`

## Implementation Details

### 1. Create Validator Interface

**File:** `src/modules/subscription/application/validators/subscription-validator.interface.ts`

```typescript
import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';

export interface ValidateReceiptInput {
  receipt: string;
  billingKey: string;
  productId?: string;
}

export interface ValidationResult {
  expiresAt: Date;
  billingKey: string;
}

export interface SubscriptionValidator {
  validateReceipt(input: ValidateReceiptInput): Promise<ValidationResult>;
  getPlatform(): SubscriptionPlatform;
}
```

### 2. Create Apple Validator

**File:** `src/modules/subscription/application/validators/apple-subscription-validator.ts`

```typescript
import { SUBSCRIPTION_PLATFORMS } from '../../domain/value-objects/subscription-platform.vo';
import { InvalidReceiptException } from '../../exceptions';

import type {
  SubscriptionValidator,
  ValidateReceiptInput,
  ValidationResult,
} from './subscription-validator.interface';
import type { AppleStoreService } from '../../infrastructure/services/apple-store.service';
import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';

export class AppleSubscriptionValidator implements SubscriptionValidator {
  constructor(private readonly service: AppleStoreService) {}

  async validateReceipt(input: ValidateReceiptInput): Promise<ValidationResult> {
    try {
      const transactionInfo = await this.service.validateReceipt(input.receipt);

      if (!transactionInfo.expiresDate) {
        throw new Error('No expiration date in transaction');
      }

      return {
        expiresAt: new Date(transactionInfo.expiresDate),
        billingKey: input.billingKey,
      };
    } catch (error) {
      throw new InvalidReceiptException();
    }
  }

  getPlatform(): SubscriptionPlatform {
    return SUBSCRIPTION_PLATFORMS.IOS;
  }
}
```

### 3. Create Google Validator

**File:** `src/modules/subscription/application/validators/google-subscription-validator.ts`

```typescript
import { SUBSCRIPTION_PLATFORMS } from '../../domain/value-objects/subscription-platform.vo';
import { InvalidReceiptException } from '../../exceptions';

import type {
  SubscriptionValidator,
  ValidateReceiptInput,
  ValidationResult,
} from './subscription-validator.interface';
import type { GoogleStoreService } from '../../infrastructure/services/google-store.service';
import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';

export class GoogleSubscriptionValidator implements SubscriptionValidator {
  constructor(private readonly service: GoogleStoreService) {}

  async validateReceipt(input: ValidateReceiptInput): Promise<ValidationResult> {
    try {
      const subscriptionData = await this.service.validateReceipt(input.billingKey);

      const lineItem = subscriptionData.lineItems?.[0];
      if (!lineItem?.expiryTime) {
        throw new Error('No expiration time in subscription data');
      }

      return {
        expiresAt: new Date(lineItem.expiryTime),
        billingKey: input.billingKey,
      };
    } catch (error) {
      throw new InvalidReceiptException();
    }
  }

  getPlatform(): SubscriptionPlatform {
    return SUBSCRIPTION_PLATFORMS.ANDROID;
  }
}
```

### 4. Create Validator Registry

**File:** `src/modules/subscription/application/validators/subscription-validator.registry.ts`

```typescript
import { PlatformNotSupportedException } from '../../exceptions';

import type { SubscriptionValidator } from './subscription-validator.interface';
import type { SubscriptionPlatform } from '../../domain/value-objects/subscription-platform.vo';

export class SubscriptionValidatorRegistry {
  private validators = new Map<SubscriptionPlatform, SubscriptionValidator>();

  register(validator: SubscriptionValidator): void {
    this.validators.set(validator.getPlatform(), validator);
  }

  get(platform: SubscriptionPlatform): SubscriptionValidator {
    const validator = this.validators.get(platform);
    if (!validator) {
      throw new PlatformNotSupportedException(platform);
    }
    return validator;
  }

  isSupported(platform: SubscriptionPlatform): boolean {
    return this.validators.has(platform);
  }

  getSupportedPlatforms(): SubscriptionPlatform[] {
    return Array.from(this.validators.keys());
  }
}
```

### 5. Add New Domain Exceptions

**File:** `src/modules/subscription/exceptions/subscription.exceptions.ts`

```typescript
export class PlatformNotSupportedException extends BadRequestException {
  constructor(platform: string) {
    super('errors.subscription.platform_not_supported', { platform });
  }
}

export class StoreServiceNotConfiguredException extends InternalServerException {
  constructor(platform: string, details?: string) {
    super('errors.subscription.store_service_not_configured', { platform, details });
  }
}
```

### 6. Update Command Dependencies

**File:** `src/modules/subscription/application/commands/verify-subscription.command.ts`

**Before:**

```typescript
export interface VerifySubscriptionDeps {
  userId: string;
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService; // ❌ Optional
  googleStoreService?: GoogleStoreService; // ❌ Optional
}

// ... inside command:
if (input.platform === SUBSCRIPTION_PLATFORMS.IOS && !appleStoreService) {
  throw new Error('Apple Store integration is not configured'); // ❌
}
const transactionInfo = await appleStoreService!.validateReceipt(input.receipt); // ❌
```

**After:**

```typescript
import type { SubscriptionValidatorRegistry } from '../validators/subscription-validator.registry';

export interface VerifySubscriptionDeps {
  userId: string;
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  validatorRegistry: SubscriptionValidatorRegistry; // ✅ Required, type-safe
}

export async function verifySubscriptionCommand(
  input: VerifySubscriptionInput,
  deps: VerifySubscriptionDeps,
): Promise<VerifySubscriptionResult> {
  const { userId, subscriptionRepository, userRepository, validatorRegistry } = deps;

  // ✅ Type-safe, throws PlatformNotSupportedException if not supported
  const validator = validatorRegistry.get(input.platform);

  // ✅ Clean validation, throws InvalidReceiptException on failure
  const { expiresAt } = await validator.validateReceipt({
    receipt: input.receipt,
    billingKey: input.billingKey,
    productId: input.productId,
  });

  // ... rest with transaction (from MHSB-076) ...
}
```

### 7. Update Restore Command

**File:** `src/modules/subscription/application/commands/restore-subscription.command.ts`

Apply same pattern as verify command.

### 8. Update Controller

**File:** `src/modules/subscription/api/subscription.controller.ts`

**Before:**

```typescript
export interface SubscriptionControllerDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}
```

**After:**

```typescript
import type { SubscriptionValidatorRegistry } from '../application/validators/subscription-validator.registry';

export interface SubscriptionControllerDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  validatorRegistry: SubscriptionValidatorRegistry; // ✅ Single dependency
}
```

### 9. Update Module Setup

**File:** `src/modules/subscription/index.ts`

**Before:**

```typescript
export interface SubscriptionModuleDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

export function createSubscriptionModule(deps: SubscriptionModuleDeps) {
  return new Elysia({ prefix: '/subscriptions' })
    .use(authMiddleware)
    .use(subscriptionController(deps));
}
```

**After:**

```typescript
import {
  SubscriptionValidatorRegistry,
  AppleSubscriptionValidator,
  GoogleSubscriptionValidator,
} from './application/validators';

export interface SubscriptionModuleDeps {
  subscriptionRepository: SubscriptionRepository;
  userRepository: UserRepository;
  appleStoreService?: AppleStoreService;
  googleStoreService?: GoogleStoreService;
}

export function createSubscriptionModule(deps: SubscriptionModuleDeps) {
  // ✅ Build registry at module initialization
  const validatorRegistry = new SubscriptionValidatorRegistry();

  if (deps.appleStoreService) {
    validatorRegistry.register(new AppleSubscriptionValidator(deps.appleStoreService));
  }

  if (deps.googleStoreService) {
    validatorRegistry.register(new GoogleSubscriptionValidator(deps.googleStoreService));
  }

  // ✅ Validate at least one platform is supported
  if (validatorRegistry.getSupportedPlatforms().length === 0) {
    throw new Error(
      'No subscription platforms configured. Please configure at least one store service (Apple or Google).',
    );
  }

  return new Elysia({ prefix: '/subscriptions' }).use(authMiddleware).use(
    subscriptionController({
      subscriptionRepository: deps.subscriptionRepository,
      userRepository: deps.userRepository,
      validatorRegistry,
    }),
  );
}
```

## Benefits

### Before vs After

| Aspect        | Before                   | After                      |
| ------------- | ------------------------ | -------------------------- |
| Type Safety   | ❌ Lost with `!`         | ✅ Full type safety        |
| Error Type    | ❌ Generic Error         | ✅ Domain exceptions       |
| Scalability   | ❌ Hard to add platforms | ✅ Just add new validator  |
| Testing       | ❌ Hard to mock          | ✅ Easy to mock validators |
| Configuration | ❌ Runtime checks        | ✅ Startup validation      |
| SOLID         | ❌ Violates OCP          | ✅ Follows SOLID           |

### New Platform Example

Adding Huawei AppGallery:

```typescript
// 1. Create validator
class HuaweiSubscriptionValidator implements SubscriptionValidator {
  constructor(private service: HuaweiStoreService) {}
  // ... implement interface
}

// 2. Register in module
if (deps.huaweiStoreService) {
  validatorRegistry.register(new HuaweiSubscriptionValidator(deps.huaweiStoreService));
}

// Done! No changes to commands needed
```

## Migration Strategy

1. ✅ Create validator interface and implementations
2. ✅ Create validator registry
3. ✅ Add new domain exceptions
4. ✅ Update command dependencies
5. ✅ Update controller dependencies
6. ✅ Update module setup
7. ✅ Add unit tests for validators
8. ✅ Update integration tests
9. ✅ Validate with `bun test`

## Test Coverage

**Unit Tests:**

- ✅ AppleSubscriptionValidator validates correctly
- ✅ GoogleSubscriptionValidator validates correctly
- ✅ Registry throws PlatformNotSupportedException for unsupported platform
- ✅ Registry returns correct validator for platform
- ✅ Module setup validates at least one platform configured

**Integration Tests:**

- ✅ Verify subscription works with registry
- ✅ Restore subscription works with registry
- ✅ Invalid platform returns 400 with proper error code
- ✅ Unsupported platform returns proper error message

## Acceptance Criteria

- [ ] SubscriptionValidator interface created
- [ ] AppleSubscriptionValidator implemented
- [ ] GoogleSubscriptionValidator implemented
- [ ] SubscriptionValidatorRegistry created
- [ ] PlatformNotSupportedException added
- [ ] StoreServiceNotConfiguredException added
- [ ] verifySubscriptionCommand uses registry
- [ ] restoreSubscriptionCommand uses registry
- [ ] Controller updated to use registry
- [ ] Module setup builds registry
- [ ] No `!` operators used
- [ ] No optional service parameters in commands
- [ ] All type checks pass
- [ ] Unit tests for validators pass
- [ ] Integration tests pass
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

## On Completion

```bash
git commit -m "MHSB-077: refactor subscription optional dependencies with strategy pattern

- Create SubscriptionValidator interface
- Implement AppleSubscriptionValidator
- Implement GoogleSubscriptionValidator
- Create SubscriptionValidatorRegistry
- Add PlatformNotSupportedException
- Remove optional service dependencies from commands
- Eliminate non-null assertions (!)
- Improve type safety and scalability
- Simplify adding new platforms"
```
