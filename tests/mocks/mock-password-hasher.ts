import type { PasswordHasher } from '@/shared/infrastructure/crypto';

export const mockPasswordHasher: PasswordHasher = {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`;
  },
  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`;
  },
};
