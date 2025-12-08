import type { AccountTier } from '../value-objects/account-tier.vo';

import { AggregateRoot, type EntityProps } from '@/shared/domain';

export interface UserProps extends EntityProps {
  deviceId: string;
  accountTier: AccountTier;
  subscriptionExpiresAt: Date | null;
  deletedAt: Date | null;
}

export class User extends AggregateRoot<UserProps> {
  get deviceId(): string {
    return this.props.deviceId;
  }

  get accountTier(): AccountTier {
    return this.props.accountTier;
  }

  get subscriptionExpiresAt(): Date | null {
    return this.props.subscriptionExpiresAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  get isPremium(): boolean {
    if (this.props.accountTier !== 'premium') return false;
    if (!this.props.subscriptionExpiresAt) return false;
    return this.props.subscriptionExpiresAt > new Date();
  }

  upgradeToPremium(expiresAt: Date): void {
    this.props.accountTier = 'premium';
    this.props.subscriptionExpiresAt = expiresAt;
    this.props.updatedAt = new Date();
  }

  downgradeToFree(): void {
    this.props.accountTier = 'free';
    this.props.subscriptionExpiresAt = null;
    this.props.updatedAt = new Date();
  }

  extendSubscription(newExpiresAt: Date): void {
    this.props.subscriptionExpiresAt = newExpiresAt;
    this.props.updatedAt = new Date();
  }

  softDelete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }

  restore(): void {
    this.props.deletedAt = null;
    this.props.updatedAt = new Date();
  }

  static create(props: Omit<UserProps, 'id'> & { id?: string }): User {
    return new User({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    } as UserProps);
  }
}
