import { z } from 'zod';

import { SUBSCRIPTION_PLATFORMS } from '../domain/value-objects/subscription-platform.vo';
import { SUBSCRIPTION_STATUSES } from '../domain/value-objects/subscription-status.vo';

export const subscriptionPlatformSchema = z.enum([
  SUBSCRIPTION_PLATFORMS.IOS,
  SUBSCRIPTION_PLATFORMS.ANDROID,
]);

export const subscriptionStatusSchema = z.enum([
  SUBSCRIPTION_STATUSES.ACTIVE,
  SUBSCRIPTION_STATUSES.EXPIRED,
  SUBSCRIPTION_STATUSES.CANCELED,
  SUBSCRIPTION_STATUSES.GRACE_PERIOD,
]);

export const verifySubscriptionRequestSchema = z.object({
  platform: subscriptionPlatformSchema.describe('Platform (ios or android)'),
  receipt: z.string().min(1).describe('Receipt/purchase token from the store'),
  billingKey: z.string().min(1).describe('Billing key (purchase token)'),
  productId: z.string().min(1).describe('Product ID'),
});

export const restoreSubscriptionRequestSchema = z.object({
  platform: subscriptionPlatformSchema.describe('Platform (ios or android)'),
  billingKey: z.string().min(1).describe('Billing key (purchase token) to restore'),
  receipt: z.string().optional().describe('Optional receipt for validation'),
});

export const subscriptionResponseSchema = z.object({
  id: z.string().describe('Subscription ID'),
  platform: subscriptionPlatformSchema.describe('Platform'),
  billingKey: z.string().describe('Billing key'),
  status: subscriptionStatusSchema.describe('Subscription status'),
  expiresAt: z.string().describe('Expiration timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
});

export const verifySubscriptionResponseSchema = z.object({
  success: z.literal(true),
  user: z.object({
    id: z.string().describe('User ID'),
    accountTier: z.string().describe('Account tier'),
    subscriptionExpiresAt: z.string().describe('Subscription expiration date'),
  }),
  subscription: subscriptionResponseSchema,
});

export const restoreSubscriptionResponseSchema = z.object({
  success: z.literal(true),
  restored: z.literal(true).describe('Subscription was found and restored'),
  user: z.object({
    id: z.string().describe('User ID'),
    accountTier: z.string().describe('Account tier'),
    subscriptionExpiresAt: z.string().describe('Subscription expiration date'),
  }),
  subscription: subscriptionResponseSchema,
});

export type VerifySubscriptionRequest = z.infer<typeof verifySubscriptionRequestSchema>;
export type RestoreSubscriptionRequest = z.infer<typeof restoreSubscriptionRequestSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
export type VerifySubscriptionResponse = z.infer<typeof verifySubscriptionResponseSchema>;
export type RestoreSubscriptionResponse = z.infer<typeof restoreSubscriptionResponseSchema>;
