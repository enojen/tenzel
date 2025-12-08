import type { TrackedAsset } from '../../domain/entities/tracked-asset.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';

export interface GetTrackedAssetsQueryDeps {
  userRepository: UserRepository;
}

export async function getTrackedAssetsQuery(
  userId: string,
  deps: GetTrackedAssetsQueryDeps,
): Promise<TrackedAsset[]> {
  return deps.userRepository.getTrackedAssets(userId);
}
