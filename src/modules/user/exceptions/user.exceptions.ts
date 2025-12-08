import { NotFoundException } from '@/shared/exceptions';

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
