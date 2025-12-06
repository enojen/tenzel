import { describe, expect, it } from 'bun:test';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerException,
  NotFoundException,
  TooManyRequestsException,
  UnauthorizedException,
} from '@/shared/exceptions';

describe('HTTP Exceptions', () => {
  describe('BadRequestException', () => {
    it('should have status 400 and correct code', () => {
      const error = new BadRequestException();

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.messageKey).toBe('errors.bad_request');
    });

    it('should accept custom messageKey', () => {
      const error = new BadRequestException('errors.validation');

      expect(error.messageKey).toBe('errors.validation');
    });

    it('should accept messageParams', () => {
      const error = new BadRequestException('errors.bad_request', { field: 'email' });

      expect(error.messageParams).toEqual({ field: 'email' });
    });

    it('should have timestamp', () => {
      const before = new Date();
      const error = new BadRequestException();
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('UnauthorizedException', () => {
    it('should have status 401 and correct code', () => {
      const error = new UnauthorizedException();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.messageKey).toBe('errors.unauthorized');
    });
  });

  describe('ForbiddenException', () => {
    it('should have status 403 and correct code', () => {
      const error = new ForbiddenException();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.messageKey).toBe('errors.forbidden');
    });
  });

  describe('NotFoundException', () => {
    it('should have status 404 and correct code', () => {
      const error = new NotFoundException();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.messageKey).toBe('errors.not_found');
    });

    it('should accept custom messageKey for user not found', () => {
      const error = new NotFoundException('errors.user.not_found');

      expect(error.messageKey).toBe('errors.user.not_found');
    });
  });

  describe('ConflictException', () => {
    it('should have status 409 and correct code', () => {
      const error = new ConflictException();

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.messageKey).toBe('errors.conflict');
    });

    it('should accept messageParams for user already exists', () => {
      const error = new ConflictException('errors.user.already_exists', {
        email: 'test@example.com',
      });

      expect(error.messageKey).toBe('errors.user.already_exists');
      expect(error.messageParams).toEqual({ email: 'test@example.com' });
    });
  });

  describe('InternalServerException', () => {
    it('should have status 500 and correct code', () => {
      const error = new InternalServerException();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.messageKey).toBe('errors.internal');
    });
  });

  describe('TooManyRequestsException', () => {
    it('should have status 429 and correct code', () => {
      const error = new TooManyRequestsException();

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.messageKey).toBe('errors.rate_limit_exceeded');
    });

    it('should accept retryAfter in details', () => {
      const error = new TooManyRequestsException(undefined, undefined, { retryAfter: 60 });

      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('Exception inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new NotFoundException();

      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new NotFoundException();

      expect(error.name).toBe('NotFoundException');
    });

    it('should accept details parameter', () => {
      const details = { userId: 123, action: 'delete' };
      const error = new ForbiddenException('errors.forbidden', undefined, details);

      expect(error.details).toEqual(details);
    });
  });
});
