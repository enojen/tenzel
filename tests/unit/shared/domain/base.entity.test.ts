import { describe, expect, it } from 'bun:test';

import { Entity, type EntityProps } from '@/shared/domain/base.entity';

class TestEntity extends Entity<EntityProps> {
  constructor(props: EntityProps) {
    super(props);
  }
}

describe('Entity', () => {
  describe('constructor', () => {
    it('should initialize with props', () => {
      const props: EntityProps = { id: 1, createdAt: new Date(), updatedAt: new Date() };
      const entity = new TestEntity(props);

      expect(entity).toBeDefined();
      expect(entity.id).toBe(1);
    });

    it('should work with string id', () => {
      const props: EntityProps = { id: 'uuid-123' };
      const entity = new TestEntity(props);

      expect(entity.id).toBe('uuid-123');
    });

    it('should work with numeric id', () => {
      const props: EntityProps = { id: 42 };
      const entity = new TestEntity(props);

      expect(entity.id).toBe(42);
    });
  });

  describe('getters', () => {
    it('should return id from props', () => {
      const entity = new TestEntity({ id: 'test-id' });
      expect(entity.id).toBe('test-id');
    });

    it('should return createdAt from props', () => {
      const createdAt = new Date('2025-01-01');
      const entity = new TestEntity({ id: 1, createdAt });

      expect(entity.createdAt).toBe(createdAt);
    });

    it('should return updatedAt from props', () => {
      const updatedAt = new Date('2025-01-02');
      const entity = new TestEntity({ id: 1, updatedAt });

      expect(entity.updatedAt).toBe(updatedAt);
    });

    it('should return undefined for missing createdAt', () => {
      const entity = new TestEntity({ id: 1 });
      expect(entity.createdAt).toBeUndefined();
    });

    it('should return undefined for missing updatedAt', () => {
      const entity = new TestEntity({ id: 1 });
      expect(entity.updatedAt).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for same id', () => {
      const entity1 = new TestEntity({ id: 1 });
      const entity2 = new TestEntity({ id: 1 });

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should return false for different ids', () => {
      const entity1 = new TestEntity({ id: 1 });
      const entity2 = new TestEntity({ id: 2 });

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should return true for same reference', () => {
      const entity = new TestEntity({ id: 1 });

      expect(entity.equals(entity)).toBe(true);
    });

    it('should return false when comparing to undefined', () => {
      const entity = new TestEntity({ id: 1 });

      expect(entity.equals(undefined)).toBe(false);
    });

    it('should work with string ids', () => {
      const entity1 = new TestEntity({ id: 'uuid-abc' });
      const entity2 = new TestEntity({ id: 'uuid-abc' });

      expect(entity1.equals(entity2)).toBe(true);
    });

    it('should return false for different string ids', () => {
      const entity1 = new TestEntity({ id: 'uuid-abc' });
      const entity2 = new TestEntity({ id: 'uuid-def' });

      expect(entity1.equals(entity2)).toBe(false);
    });

    it('should be identity-based, ignoring other properties', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-02');

      const entity1 = new TestEntity({ id: 1, createdAt: date1 });
      const entity2 = new TestEntity({ id: 1, createdAt: date2 });

      expect(entity1.equals(entity2)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero as valid id', () => {
      const entity = new TestEntity({ id: 0 });
      expect(entity.id).toBe(0);
    });

    it('should handle empty string as valid id', () => {
      const entity = new TestEntity({ id: '' });
      expect(entity.id).toBe('');
    });

    it('should handle entities with all optional properties undefined', () => {
      const entity = new TestEntity({ id: 1 });
      expect(entity.createdAt).toBeUndefined();
      expect(entity.updatedAt).toBeUndefined();
    });
  });
});
