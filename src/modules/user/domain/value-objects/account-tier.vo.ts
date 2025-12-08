export const ACCOUNT_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
} as const;

export type AccountTier = (typeof ACCOUNT_TIERS)[keyof typeof ACCOUNT_TIERS];
