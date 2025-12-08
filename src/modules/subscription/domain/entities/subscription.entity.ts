import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from '../value-objects/subscription-status.vo';

import type { SubscriptionPlatform } from '../value-objects/subscription-platform.vo';

import { AggregateRoot, type EntityProps } from '@/shared/domain';

export interface SubscriptionProps extends EntityProps {
  userId: string;
  platform: SubscriptionPlatform;
  billingKey: string;
  status: SubscriptionStatus;
  expiresAt: Date;
}

export class Subscription extends AggregateRoot<SubscriptionProps> {
  get userId(): string {
    return this.props.userId;
  }

  get platform(): SubscriptionPlatform {
    return this.props.platform;
  }

  get billingKey(): string {
    return this.props.billingKey;
  }

  get status(): SubscriptionStatus {
    return this.props.status;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get isActive(): boolean {
    return this.props.status === SUBSCRIPTION_STATUSES.ACTIVE && this.props.expiresAt > new Date();
  }

  get isExpired(): boolean {
    return (
      this.props.status === SUBSCRIPTION_STATUSES.EXPIRED || this.props.expiresAt <= new Date()
    );
  }

  get isInGracePeriod(): boolean {
    return this.props.status === SUBSCRIPTION_STATUSES.GRACE_PERIOD;
  }

  get isCanceled(): boolean {
    return this.props.status === SUBSCRIPTION_STATUSES.CANCELED;
  }

  activate(expiresAt?: Date): void {
    this.props.status = SUBSCRIPTION_STATUSES.ACTIVE;
    if (expiresAt) {
      this.props.expiresAt = expiresAt;
    }
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    this.props.status = SUBSCRIPTION_STATUSES.CANCELED;
    this.props.updatedAt = new Date();
  }

  expire(): void {
    this.props.status = SUBSCRIPTION_STATUSES.EXPIRED;
    this.props.updatedAt = new Date();
  }

  enterGracePeriod(): void {
    this.props.status = SUBSCRIPTION_STATUSES.GRACE_PERIOD;
    this.props.updatedAt = new Date();
  }

  extendExpiration(newExpiresAt: Date): void {
    this.props.expiresAt = newExpiresAt;
    this.props.updatedAt = new Date();
  }

  static create(props: Omit<SubscriptionProps, 'id'> & { id?: string }): Subscription {
    return new Subscription({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    } as SubscriptionProps);
  }
}
