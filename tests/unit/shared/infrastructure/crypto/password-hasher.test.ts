import { describe, expect, it } from 'bun:test';

import { passwordHasher } from '@/shared/infrastructure/crypto/password-hasher';

describe('passwordHasher', () => {
  describe('hash', () => {
    it('should return a hashed string', async () => {
      const input = 'test-input-value';
      const hash = await passwordHasher.hash(input);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(input);
    });

    it('should produce different hashes for same input (salt)', async () => {
      const input = 'test-value';
      const hash1 = await passwordHasher.hash(input);
      const hash2 = await passwordHasher.hash(input);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce argon2id hash format', async () => {
      const input = 'test-value';
      const hash = await passwordHasher.hash(input);

      expect(hash).toContain('$argon2id$');
    });
  });

  describe('verify', () => {
    it('should return true for correct input', async () => {
      const input = 'correct-value';
      const hash = await passwordHasher.hash(input);

      const result = await passwordHasher.verify(input, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect input', async () => {
      const input = 'correct-value';
      const wrongInput = 'wrong-value';
      const hash = await passwordHasher.hash(input);

      const result = await passwordHasher.verify(wrongInput, hash);

      expect(result).toBe(false);
    });

    it('should return false for empty input against valid hash', async () => {
      const input = 'some-value';
      const hash = await passwordHasher.hash(input);

      const result = await passwordHasher.verify('', hash);

      expect(result).toBe(false);
    });

    it('should handle special characters in input', async () => {
      const input = 'test!#%^&*()_+-=[]{}|;:,.<>?';
      const hash = await passwordHasher.hash(input);

      const result = await passwordHasher.verify(input, hash);

      expect(result).toBe(true);
    });

    it('should handle unicode characters in input', async () => {
      const input = 'test123üöçğ';
      const hash = await passwordHasher.hash(input);

      const result = await passwordHasher.verify(input, hash);

      expect(result).toBe(true);
    });
  });
});
