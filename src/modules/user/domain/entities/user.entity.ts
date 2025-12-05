import { AggregateRoot, type EntityProps } from '../../../../shared/domain';

import type { UserRole } from '../value-objects/user-role.vo';
import type { UserStatus } from '../value-objects/user-status.vo';

export interface UserProps extends EntityProps {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  passwordHash: string;
  deletedAt?: Date;
}

export class User extends AggregateRoot<UserProps> {
  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get isEmailVerified(): boolean {
    return this.props.isEmailVerified;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return !!this.props.deletedAt;
  }

  verifyEmail(): void {
    this.props.isEmailVerified = true;
    this.props.updatedAt = new Date();
  }

  changePassword(newPasswordHash: string): void {
    this.props.passwordHash = newPasswordHash;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  suspend(): void {
    this.props.status = 'suspended';
    this.props.updatedAt = new Date();
  }

  delete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
    this.addDomainEvent({
      eventName: 'UserDeleted',
      occurredAt: new Date(),
      aggregateId: this.id,
    });
  }

  restore(): void {
    this.props.deletedAt = undefined;
    this.props.updatedAt = new Date();
    this.addDomainEvent({
      eventName: 'UserRestored',
      occurredAt: new Date(),
      aggregateId: this.id,
    });
  }

  static create(props: Omit<UserProps, 'id'> & { id?: number | string }): User {
    return new User({
      ...props,
      id: props.id ?? Math.random().toString(36).substr(2, 9),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    } as UserProps);
  }
}
