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
