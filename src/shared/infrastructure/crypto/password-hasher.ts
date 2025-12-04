export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export const passwordHasher: PasswordHasher = {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, { algorithm: 'argon2id' });
  },
  async verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  },
};
