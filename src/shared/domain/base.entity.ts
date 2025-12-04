export interface EntityProps {
  id: number | string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Base Entity class with identity-based equality.
 * All domain entities should extend this class.
 */
export abstract class Entity<T extends EntityProps> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = props;
  }

  get id(): T['id'] {
    return this.props.id;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  /**
   * Entities are equal if they have the same id.
   * This follows Domain-Driven Design principles.
   */
  equals(entity?: Entity<T>): boolean {
    if (!entity) return false;
    if (this === entity) return true;
    return this.id === entity.id;
  }
}
