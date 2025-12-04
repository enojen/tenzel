import { describe, expect, it } from 'bun:test';

import { ErrorResponseSchema } from '../../../../src/shared/openapi';

describe('ErrorResponseSchema', () => {
  it('should validate a correct error response', () => {
    const validError = {
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    };

    const result = ErrorResponseSchema.safeParse(validError);
    expect(result.success).toBe(true);
  });

  it('should reject when error object is missing', () => {
    const invalid = {};

    const result = ErrorResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject when code is missing', () => {
    const invalid = {
      error: {
        message: 'Some error',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    };

    const result = ErrorResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject when message is missing', () => {
    const invalid = {
      error: {
        code: 'ERROR_CODE',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    };

    const result = ErrorResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject when timestamp is missing', () => {
    const invalid = {
      error: {
        code: 'ERROR_CODE',
        message: 'Some error',
      },
    };

    const result = ErrorResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid timestamp format', () => {
    const invalid = {
      error: {
        code: 'ERROR_CODE',
        message: 'Some error',
        timestamp: 'not-a-date',
      },
    };

    const result = ErrorResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
