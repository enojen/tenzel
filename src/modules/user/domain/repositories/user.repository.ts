import type { User } from '../entities/user.entity';

export interface FindAllOptions {
  limit?: number;
  offset?: number;
}

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  findAll(options?: FindAllOptions): Promise<User[]>;
}
