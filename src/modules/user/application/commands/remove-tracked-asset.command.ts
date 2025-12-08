import type { TrackedAsset } from '../../domain/entities/tracked-asset.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { AssetType } from '../../domain/value-objects/asset-type.vo';

export interface RemoveTrackedAssetCommandDeps {
  userRepository: UserRepository;
}

export async function removeTrackedAssetCommand(
  userId: string,
  assetCode: string,
  assetType: AssetType,
  deps: RemoveTrackedAssetCommandDeps,
): Promise<TrackedAsset[]> {
  return deps.userRepository.removeTrackedAsset(userId, assetCode, assetType);
}
