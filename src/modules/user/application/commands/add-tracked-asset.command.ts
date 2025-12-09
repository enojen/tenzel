import { AssetNotFoundException } from '../../exceptions';

import type { TrackedAsset } from '../../domain/entities/tracked-asset.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { AssetType } from '../../domain/value-objects/asset-type.vo';

import { isValidAsset } from '@/shared/domain';

export interface AddTrackedAssetCommandDeps {
  userRepository: UserRepository;
}

export interface AddTrackedAssetInput {
  assetType: AssetType;
  assetCode: string;
}

export async function addTrackedAssetCommand(
  userId: string,
  input: AddTrackedAssetInput,
  deps: AddTrackedAssetCommandDeps,
): Promise<TrackedAsset[]> {
  if (!isValidAsset(input.assetType, input.assetCode)) {
    throw new AssetNotFoundException();
  }

  return deps.userRepository.addTrackedAsset(userId, {
    assetType: input.assetType,
    assetCode: input.assetCode,
  });
}
