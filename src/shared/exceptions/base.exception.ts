import type { TranslationKey } from '../i18n';

export interface ExceptionOptions {
  code: string;
  statusCode: number;
  messageKey: TranslationKey;
  messageParams?: Record<string, string | number>;
  details?: Record<string, unknown>;
}

export abstract class BaseException extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly messageKey: TranslationKey;
  public readonly messageParams?: Record<string, string | number>;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(options: ExceptionOptions) {
    super(options.messageKey);
    this.name = new.target.name;

    this.code = options.code;
    this.statusCode = options.statusCode;
    this.messageKey = options.messageKey;
    this.messageParams = options.messageParams;
    this.details = options.details;
    this.timestamp = new Date();

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
