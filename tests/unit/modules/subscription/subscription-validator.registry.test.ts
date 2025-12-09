import { describe, it, expect, mock } from 'bun:test';

import type { SubscriptionValidator } from '@/modules/subscription/application/validators/subscription-validator.interface';

import { SubscriptionValidatorRegistry } from '@/modules/subscription/application/validators/subscription-validator.registry';
import { SUBSCRIPTION_PLATFORMS } from '@/modules/subscription/domain/value-objects/subscription-platform.vo';
import { PlatformNotSupportedException } from '@/modules/subscription/exceptions';

describe('SubscriptionValidatorRegistry', () => {
  describe('register', () => {
    it('should register a validator by platform', () => {
      const registry = new SubscriptionValidatorRegistry();
      const mockValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.IOS,
        validateReceipt: mock(),
      };

      registry.register(mockValidator);

      expect(registry.isSupported(SUBSCRIPTION_PLATFORMS.IOS)).toBe(true);
    });

    it('should register multiple validators', () => {
      const registry = new SubscriptionValidatorRegistry();
      const mockAppleValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.IOS,
        validateReceipt: mock(),
      };
      const mockGoogleValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.ANDROID,
        validateReceipt: mock(),
      };

      registry.register(mockAppleValidator);
      registry.register(mockGoogleValidator);

      expect(registry.isSupported(SUBSCRIPTION_PLATFORMS.IOS)).toBe(true);
      expect(registry.isSupported(SUBSCRIPTION_PLATFORMS.ANDROID)).toBe(true);
    });
  });

  describe('get', () => {
    it('should return registered validator for platform', () => {
      const registry = new SubscriptionValidatorRegistry();
      const mockValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.IOS,
        validateReceipt: mock(),
      };

      registry.register(mockValidator);

      const validator = registry.get(SUBSCRIPTION_PLATFORMS.IOS);

      expect(validator).toBe(mockValidator);
    });

    it('should throw PlatformNotSupportedException for unregistered platform', () => {
      const registry = new SubscriptionValidatorRegistry();

      expect(() => registry.get(SUBSCRIPTION_PLATFORMS.IOS)).toThrow(PlatformNotSupportedException);
    });

    it('should throw PlatformNotSupportedException with platform name', () => {
      const registry = new SubscriptionValidatorRegistry();

      expect(() => registry.get(SUBSCRIPTION_PLATFORMS.ANDROID)).toThrow(
        PlatformNotSupportedException,
      );
      expect(() => registry.get(SUBSCRIPTION_PLATFORMS.ANDROID)).toThrow(/ANDROID/);
    });
  });

  describe('isSupported', () => {
    it('should return true for registered platform', () => {
      const registry = new SubscriptionValidatorRegistry();
      const mockValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.IOS,
        validateReceipt: mock(),
      };

      registry.register(mockValidator);

      expect(registry.isSupported(SUBSCRIPTION_PLATFORMS.IOS)).toBe(true);
    });

    it('should return false for unregistered platform', () => {
      const registry = new SubscriptionValidatorRegistry();

      expect(registry.isSupported(SUBSCRIPTION_PLATFORMS.IOS)).toBe(false);
      expect(registry.isSupported(SUBSCRIPTION_PLATFORMS.ANDROID)).toBe(false);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return empty array when no validators registered', () => {
      const registry = new SubscriptionValidatorRegistry();

      expect(registry.getSupportedPlatforms()).toEqual([]);
    });

    it('should return array of registered platforms', () => {
      const registry = new SubscriptionValidatorRegistry();
      const mockAppleValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.IOS,
        validateReceipt: mock(),
      };
      const mockGoogleValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.ANDROID,
        validateReceipt: mock(),
      };

      registry.register(mockAppleValidator);
      registry.register(mockGoogleValidator);

      const platforms = registry.getSupportedPlatforms();

      expect(platforms).toHaveLength(2);
      expect(platforms).toContain(SUBSCRIPTION_PLATFORMS.IOS);
      expect(platforms).toContain(SUBSCRIPTION_PLATFORMS.ANDROID);
    });

    it('should return single platform when only one registered', () => {
      const registry = new SubscriptionValidatorRegistry();
      const mockValidator: SubscriptionValidator = {
        getPlatform: () => SUBSCRIPTION_PLATFORMS.IOS,
        validateReceipt: mock(),
      };

      registry.register(mockValidator);

      expect(registry.getSupportedPlatforms()).toEqual([SUBSCRIPTION_PLATFORMS.IOS]);
    });
  });
});
