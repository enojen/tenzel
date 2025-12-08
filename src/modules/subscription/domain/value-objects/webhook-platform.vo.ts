export const WEBHOOK_PLATFORMS = {
  APPLE: 'apple',
  GOOGLE: 'google',
} as const;

export type WebhookPlatform = (typeof WEBHOOK_PLATFORMS)[keyof typeof WEBHOOK_PLATFORMS];
