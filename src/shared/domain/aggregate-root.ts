import { Entity, type EntityProps } from './base.entity';

export type { EntityProps };

export interface DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: string | number;
}

/**
 * Aggregate Root base class with domain events support.
 * Aggregates are the primary unit of consistency and transactional boundaries.
 * They collect domain events that can be published for eventual consistency patterns.
 */
export abstract class AggregateRoot<T extends EntityProps> extends Entity<T> {
  private domainEvents: DomainEvent[] = [];

  /**
   * Add a domain event to the aggregate.
   * Events will be published after the aggregate is persisted.
   */
  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Get all domain events for this aggregate.
   * Returns a copy to prevent external mutations.
   */
  getDomainEvents(): readonly DomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Clear all domain events after they have been published.
   * Should be called after events are dispatched.
   */
  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
