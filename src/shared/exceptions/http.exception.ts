import { BaseException, type ExceptionOptions } from './base.exception';

import type { TranslationKey } from '../i18n';

type HttpExceptionInit = Omit<ExceptionOptions, 'statusCode'>;

class HttpException extends BaseException {
  constructor(statusCode: number, opts: HttpExceptionInit) {
    super({ ...opts, statusCode });
  }
}

export class BadRequestException extends HttpException {
  constructor(
    messageKey: TranslationKey = 'errors.bad_request',
    messageParams?: Record<string, string | number>,
    details?: Record<string, unknown>,
  ) {
    super(400, {
      code: 'BAD_REQUEST',
      messageKey,
      messageParams,
      details,
    });
  }
}

export class UnauthorizedException extends HttpException {
  constructor(
    messageKey: TranslationKey = 'errors.unauthorized',
    messageParams?: Record<string, string | number>,
    details?: Record<string, unknown>,
  ) {
    super(401, {
      code: 'UNAUTHORIZED',
      messageKey,
      messageParams,
      details,
    });
  }
}

export class ForbiddenException extends HttpException {
  constructor(
    messageKey: TranslationKey = 'errors.forbidden',
    messageParams?: Record<string, string | number>,
    details?: Record<string, unknown>,
  ) {
    super(403, {
      code: 'FORBIDDEN',
      messageKey,
      messageParams,
      details,
    });
  }
}

export class NotFoundException extends HttpException {
  constructor(
    messageKey: TranslationKey = 'errors.not_found',
    messageParams?: Record<string, string | number>,
    details?: Record<string, unknown>,
  ) {
    super(404, {
      code: 'NOT_FOUND',
      messageKey,
      messageParams,
      details,
    });
  }
}

export class ConflictException extends HttpException {
  constructor(
    messageKey: TranslationKey = 'errors.conflict',
    messageParams?: Record<string, string | number>,
    details?: Record<string, unknown>,
  ) {
    super(409, {
      code: 'CONFLICT',
      messageKey,
      messageParams,
      details,
    });
  }
}

export class InternalServerException extends HttpException {
  constructor(
    messageKey: TranslationKey = 'errors.internal',
    messageParams?: Record<string, string | number>,
    details?: Record<string, unknown>,
  ) {
    super(500, {
      code: 'INTERNAL_ERROR',
      messageKey,
      messageParams,
      details,
    });
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(
    messageKey: TranslationKey = 'errors.rate_limit_exceeded',
    messageParams?: Record<string, string | number>,
    details?: Record<string, unknown>,
  ) {
    super(429, {
      code: 'RATE_LIMIT_EXCEEDED',
      messageKey,
      messageParams,
      details,
    });
  }
}
