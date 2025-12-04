import { describe, expect, it } from 'bun:test';

import { AggregateRoot, type DomainEvent, type EntityProps } from '@/shared/domain/aggregate-root';

class TestEvent implements DomainEvent {
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId: string | number;

  constructor(eventName: string, aggregateId: string | number, occurredAt: Date = new Date()) {
    this.eventName = eventName;
    this.aggregateId = aggregateId;
    this.occurredAt = occurredAt;
  }
}

class TestAggregate extends AggregateRoot<EntityProps> {
  constructor(props: EntityProps) {
    super(props);
  }

  triggerEvent(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

describe('AggregateRoot', () => {
  describe('inheritance', () => {
    it('should inherit from Entity', () => {
      const aggregate = new TestAggregate({ id: 1 });

      expect(aggregate.id).toBe(1);
    });

    it('should support identity-based equality', () => {
      const aggregate1 = new TestAggregate({ id: 1 });
      const aggregate2 = new TestAggregate({ id: 1 });

      expect(aggregate1.equals(aggregate2)).toBe(true);
    });
  });

  describe('domain events', () => {
    it('should start with empty events array', () => {
      const aggregate = new TestAggregate({ id: 1 });

      expect(aggregate.getDomainEvents()).toEqual([]);
    });

    it('should add single domain event', () => {
      const aggregate = new TestAggregate({ id: 1 });
      const event = new TestEvent('TestEvent', 1);

      aggregate.triggerEvent(event);

      expect(aggregate.getDomainEvents()).toHaveLength(1);
      expect(aggregate.getDomainEvents()[0]).toBe(event);
    });

    it('should add multiple domain events', () => {
      const aggregate = new TestAggregate({ id: 1 });
      const event1 = new TestEvent('Event1', 1);
      const event2 = new TestEvent('Event2', 1);
      const event3 = new TestEvent('Event3', 1);

      aggregate.triggerEvent(event1);
      aggregate.triggerEvent(event2);
      aggregate.triggerEvent(event3);

      expect(aggregate.getDomainEvents()).toHaveLength(3);
      expect(aggregate.getDomainEvents()[0]).toBe(event1);
      expect(aggregate.getDomainEvents()[1]).toBe(event2);
      expect(aggregate.getDomainEvents()[2]).toBe(event3);
    });

    it('should return events as readonly copy', () => {
      const aggregate = new TestAggregate({ id: 1 });
      const event = new TestEvent('TestEvent', 1);

      aggregate.triggerEvent(event);
      const events = aggregate.getDomainEvents();

      expect(Object.isFrozen(events) || Array.isArray(events)).toBe(true);
    });

    it('should prevent external mutation of events array', () => {
      const aggregate = new TestAggregate({ id: 1 });
      const event1 = new TestEvent('Event1', 1);

      aggregate.triggerEvent(event1);
      const events = aggregate.getDomainEvents();
      const newEvent = new TestEvent('Event2', 1);

      (events as DomainEvent[]).push(newEvent);

      expect(aggregate.getDomainEvents()).toHaveLength(1);
    });
  });

  describe('clearDomainEvents', () => {
    it('should clear all events', () => {
      const aggregate = new TestAggregate({ id: 1 });

      aggregate.triggerEvent(new TestEvent('Event1', 1));
      aggregate.triggerEvent(new TestEvent('Event2', 1));

      expect(aggregate.getDomainEvents()).toHaveLength(2);

      aggregate.clearDomainEvents();

      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });

    it('should allow adding new events after clearing', () => {
      const aggregate = new TestAggregate({ id: 1 });

      aggregate.triggerEvent(new TestEvent('Event1', 1));
      aggregate.clearDomainEvents();

      const newEvent = new TestEvent('Event2', 1);
      aggregate.triggerEvent(newEvent);

      expect(aggregate.getDomainEvents()).toHaveLength(1);
      expect(aggregate.getDomainEvents()[0]).toBe(newEvent);
    });

    it('should work when events array is empty', () => {
      const aggregate = new TestAggregate({ id: 1 });

      expect(() => aggregate.clearDomainEvents()).not.toThrow();
      expect(aggregate.getDomainEvents()).toHaveLength(0);
    });
  });

  describe('event details', () => {
    it('should preserve event name', () => {
      const aggregate = new TestAggregate({ id: 1 });
      const event = new TestEvent('UserCreatedEvent', 1);

      aggregate.triggerEvent(event);

      expect(aggregate.getDomainEvents()[0]?.eventName).toBe('UserCreatedEvent');
    });

    it('should preserve aggregate id in event', () => {
      const aggregate = new TestAggregate({ id: 'agg-123' });
      const event = new TestEvent('TestEvent', 'agg-123');

      aggregate.triggerEvent(event);

      expect(aggregate.getDomainEvents()[0]?.aggregateId).toBe('agg-123');
    });

    it('should preserve event occurrence time', () => {
      const aggregate = new TestAggregate({ id: 1 });
      const occurredAt = new Date('2025-12-04T10:30:00Z');
      const event = new TestEvent('TestEvent', 1, occurredAt);

      aggregate.triggerEvent(event);

      expect(aggregate.getDomainEvents()[0]?.occurredAt).toEqual(occurredAt);
    });
  });

  describe('sequential operations', () => {
    it('should maintain event order', () => {
      const aggregate = new TestAggregate({ id: 1 });
      const events = [
        new TestEvent('Event1', 1),
        new TestEvent('Event2', 1),
        new TestEvent('Event3', 1),
        new TestEvent('Event4', 1),
      ];

      events.forEach((event) => aggregate.triggerEvent(event));

      const domainEvents = aggregate.getDomainEvents();
      events.forEach((event, index) => {
        expect(domainEvents[index]).toBe(event);
      });
    });

    it('should handle add, clear, add cycle correctly', () => {
      const aggregate = new TestAggregate({ id: 1 });

      aggregate.triggerEvent(new TestEvent('Event1', 1));
      aggregate.triggerEvent(new TestEvent('Event2', 1));
      expect(aggregate.getDomainEvents()).toHaveLength(2);

      aggregate.clearDomainEvents();
      expect(aggregate.getDomainEvents()).toHaveLength(0);

      aggregate.triggerEvent(new TestEvent('Event3', 1));
      expect(aggregate.getDomainEvents()).toHaveLength(1);
      expect(aggregate.getDomainEvents()[0]?.eventName).toBe('Event3');
    });
  });

  describe('multiple aggregates', () => {
    it('should maintain separate event collections', () => {
      const aggregate1 = new TestAggregate({ id: 1 });
      const aggregate2 = new TestAggregate({ id: 2 });

      aggregate1.triggerEvent(new TestEvent('Event1', 1));
      aggregate2.triggerEvent(new TestEvent('Event2', 2));

      expect(aggregate1.getDomainEvents()).toHaveLength(1);
      expect(aggregate2.getDomainEvents()).toHaveLength(1);
      expect(aggregate1.getDomainEvents()[0]?.eventName).toBe('Event1');
      expect(aggregate2.getDomainEvents()[0]?.eventName).toBe('Event2');
    });

    it('should not affect other aggregates when clearing', () => {
      const aggregate1 = new TestAggregate({ id: 1 });
      const aggregate2 = new TestAggregate({ id: 2 });

      aggregate1.triggerEvent(new TestEvent('Event1', 1));
      aggregate2.triggerEvent(new TestEvent('Event2', 2));

      aggregate1.clearDomainEvents();

      expect(aggregate1.getDomainEvents()).toHaveLength(0);
      expect(aggregate2.getDomainEvents()).toHaveLength(1);
    });
  });
});
