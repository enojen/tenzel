import { InternalServerException, NotFoundException } from '@/shared/exceptions';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super('errors.user.not_found');
  }
}

export class AssetNotFoundException extends NotFoundException {
  constructor() {
    super('errors.asset.not_found');
  }
}

export class UserCreationFailedException extends InternalServerException {
  constructor() {
    super('errors.user.creation_failed');
  }
}

export class UserUpdateFailedException extends InternalServerException {
  constructor() {
    super('errors.user.update_failed');
  }
}
