import { ConflictException, NotFoundException } from '@/shared/exceptions';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super('errors.user.not_found');
  }
}

export class UserAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super('errors.user.already_exists', { email });
  }
}
