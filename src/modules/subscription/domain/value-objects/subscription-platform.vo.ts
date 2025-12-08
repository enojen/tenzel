export const SUBSCRIPTION_PLATFORMS = {
  IOS: 'ios',
  ANDROID: 'android',
} as const;

export type SubscriptionPlatform =
  (typeof SUBSCRIPTION_PLATFORMS)[keyof typeof SUBSCRIPTION_PLATFORMS];
