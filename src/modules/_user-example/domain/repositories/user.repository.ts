import type { PaginatedResult, PaginationParams, SortOption } from '../../../../shared/types';
import type { User } from '../entities/user.entity';

export type UserSortField = 'id' | 'email' | 'name' | 'createdAt' | 'updatedAt';

export interface FindAllOptions {
  limit?: number;
  offset?: number;
  orderBy?: SortOption<{ [K in UserSortField]: unknown }>[];
}

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  findAll(options?: FindAllOptions): Promise<User[]>;
  findAllPaginated(
    options: PaginationParams & { orderBy?: SortOption<{ [K in UserSortField]: unknown }>[] },
  ): Promise<PaginatedResult<User>>;
  count(): Promise<number>;
}
