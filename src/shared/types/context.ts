export interface AuthenticatedUser {
  id: string;
  deviceId: string;
  accountTier: 'free' | 'premium';
  subscriptionExpiresAt: string | null;
}
