import type { PaginationParams } from './pagination';

export type SortDirection = 'asc' | 'desc';

export interface SortOption<T> {
  field: keyof T;
  direction: SortDirection;
}

export interface QueryOptions<T> {
  pagination?: PaginationParams;
  orderBy?: SortOption<T>[];
}

export function parseSortParam<T>(
  sortParam: string | undefined,
  allowedFields: (keyof T)[],
): SortOption<T>[] {
  if (!sortParam) return [];

  return sortParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const direction: SortDirection = s.startsWith('-') ? 'desc' : 'asc';
      const field = (s.startsWith('-') || s.startsWith('+') ? s.slice(1) : s) as keyof T;

      if (!allowedFields.includes(field)) return null;

      return { field, direction };
    })
    .filter((s): s is SortOption<T> => s !== null);
}
