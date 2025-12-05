import { describe, expect, it } from 'bun:test';

import { createUserRequestSchema, userResponseSchema } from '@/modules/user/api/user.schemas';
import { USER_ROLES } from '@/modules/user/domain/value-objects/user-role.vo';

describe('createUserRequestSchema', () => {
  const validInput = {
    email: 'test@example.com',
    name: 'John Doe',
    password: 'password123',
  };

  it('should validate correct input', () => {
    const result = createUserRequestSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.name).toBe('John Doe');
      expect(result.data.password).toBe('password123');
    }
  });

  it('should reject invalid email format', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);
  });

  it('should reject empty email', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      email: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('should accept password with exactly 8 characters', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      password: '12345678',
    });

    expect(result.success).toBe(true);
  });

  it('should reject name shorter than 2 characters', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      name: 'A',
    });

    expect(result.success).toBe(false);
  });

  it('should accept name with exactly 2 characters', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      name: 'Jo',
    });

    expect(result.success).toBe(true);
  });

  it('should reject name longer than 255 characters', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      name: 'A'.repeat(256),
    });

    expect(result.success).toBe(false);
  });

  it('should default role to "user" when not provided', () => {
    const result = createUserRequestSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(USER_ROLES.USER);
    }
  });

  it('should accept explicit role "admin"', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      role: USER_ROLES.ADMIN,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(USER_ROLES.ADMIN);
    }
  });

  it('should reject invalid role', () => {
    const result = createUserRequestSchema.safeParse({
      ...validInput,
      role: 'superuser',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    expect(createUserRequestSchema.safeParse({}).success).toBe(false);
    expect(createUserRequestSchema.safeParse({ email: 'test@example.com' }).success).toBe(false);
    expect(
      createUserRequestSchema.safeParse({ email: 'test@example.com', name: 'John' }).success,
    ).toBe(false);
  });
});

describe('userResponseSchema', () => {
  const validResponse = {
    id: 1,
    email: 'test@example.com',
    name: 'John Doe',
    role: 'user' as const,
    status: 'active' as const,
    isEmailVerified: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };

  it('should validate correct response', () => {
    const result = userResponseSchema.safeParse(validResponse);

    expect(result.success).toBe(true);
  });

  it('should validate ISO 8601 datetime strings', () => {
    const result = userResponseSchema.safeParse({
      ...validResponse,
      createdAt: '2025-12-05T14:30:00.000Z',
      updatedAt: '2025-12-05T15:45:30.123Z',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid datetime format', () => {
    const result = userResponseSchema.safeParse({
      ...validResponse,
      createdAt: '2025-01-01',
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer id', () => {
    const result = userResponseSchema.safeParse({
      ...validResponse,
      id: 1.5,
    });

    expect(result.success).toBe(false);
  });

  it('should validate all status values', () => {
    const statuses = ['active', 'inactive', 'suspended'] as const;

    for (const status of statuses) {
      const result = userResponseSchema.safeParse({
        ...validResponse,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should validate all role values', () => {
    const roles = ['admin', 'user'] as const;

    for (const role of roles) {
      const result = userResponseSchema.safeParse({
        ...validResponse,
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status', () => {
    const result = userResponseSchema.safeParse({
      ...validResponse,
      status: 'deleted',
    });

    expect(result.success).toBe(false);
  });
});
