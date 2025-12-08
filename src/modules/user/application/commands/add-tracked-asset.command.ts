import { AssetNotFoundException } from '../../exceptions';

import type { TrackedAsset } from '../../domain/entities/tracked-asset.entity';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type { AssetType } from '../../domain/value-objects/asset-type.vo';

const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'CHF', 'JPY', 'AUD', 'CAD'];
const VALID_COMMODITIES = [
  'GRAM_GOLD',
  'QUARTER_GOLD',
  'HALF_GOLD',
  'FULL_GOLD',
  'SILVER',
  'PLATINUM',
];

function isValidAsset(assetType: AssetType, assetCode: string): boolean {
  if (assetType === 'currency') {
    return VALID_CURRENCIES.includes(assetCode);
  }
  if (assetType === 'commodity') {
    return VALID_COMMODITIES.includes(assetCode);
  }
  return false;
}

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
