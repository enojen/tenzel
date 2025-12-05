import { z } from 'zod';

export const paginationMetaSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const paginationLinksSchema = z.object({
  self: z.string().url(),
  first: z.string().url(),
  last: z.string().url(),
  next: z.string().url().optional(),
  prev: z.string().url().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function createPaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
    links: paginationLinksSchema,
  });
}

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type PaginationLinks = z.infer<typeof paginationLinksSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
