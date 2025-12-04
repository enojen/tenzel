import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    timestamp: z.string().datetime(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
