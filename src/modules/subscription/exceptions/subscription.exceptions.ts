import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from '@/shared/exceptions';

export class InvalidReceiptException extends BadRequestException {
  constructor() {
    super('errors.receipt.invalid');
  }
}

export class SubscriptionNotFoundException extends NotFoundException {
  constructor() {
    super('errors.subscription.not_found');
  }
}

export class SubscriptionExpiredException extends BadRequestException {
  constructor() {
    super('errors.subscription.expired');
  }
}

export class NoActiveSubscriptionException extends NotFoundException {
  constructor() {
    super('errors.subscription.no_active_subscription');
  }
}

export class SubscriptionCreationFailedException extends InternalServerException {
  constructor() {
    super('errors.subscription.creation_failed');
  }
}

export class SubscriptionUpdateFailedException extends InternalServerException {
  constructor() {
    super('errors.subscription.update_failed');
  }
}

export class WebhookLogCreationFailedException extends InternalServerException {
  constructor() {
    super('errors.subscription.webhook_log_creation_failed');
  }
}

export class PlatformNotSupportedException extends BadRequestException {
  constructor(platform: string) {
    super('errors.subscription.platform_not_supported', { platform });
  }
}
