import { z } from 'zod';

export const healthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  uptime: z.number(),
  timestamp: z.string().datetime(),
  checks: z.object({
    database: z.enum(['healthy', 'unhealthy']),
  }),
});

export const apiInfoResponseSchema = z.object({
  message: z.string(),
});

export const openAPIResponseSchema = z.object({
  openapi: z.string(),
  info: z.object({
    title: z.string(),
    version: z.string(),
    description: z.string().optional(),
  }),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
export type ApiInfoResponse = z.infer<typeof apiInfoResponseSchema>;
export type OpenAPIResponse = z.infer<typeof openAPIResponseSchema>;
