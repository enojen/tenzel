import { z } from 'zod';

export const subscriptionResponseSchema = z.object({
  subscription: z.object({
    price: z.number().describe('Subscription price'),
    currency: z.string().describe('Currency code'),
    period: z.literal('monthly').describe('Billing period'),
    features: z.array(z.string()).describe('Premium feature list'),
    description: z.string().optional().describe('Subscription description'),
  }),
});

export const assetSchema = z.object({
  code: z.string().describe('Asset code'),
  type: z.enum(['currency', 'commodity']).describe('Asset type'),
  name: z.string().describe('Asset display name'),
  logoUrl: z.string().describe('Asset logo URL'),
});

export const defaultAssetsResponseSchema = z.object({
  assets: z.array(assetSchema).describe('Default assets list'),
});

export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type DefaultAssetsResponse = z.infer<typeof defaultAssetsResponseSchema>;
