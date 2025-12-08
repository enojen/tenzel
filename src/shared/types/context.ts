import type { AccountTier } from '@/modules/user/domain/value-objects/account-tier.vo';

export interface AuthenticatedUser {
  id: string;
  deviceId: string;
  accountTier: AccountTier;
  subscriptionExpiresAt: string | null;
}
