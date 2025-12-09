import { VALID_COMMODITIES, VALID_CURRENCIES } from '../constants/assets.constants';

import { ASSET_TYPES, type AssetType } from '@/modules/user/domain/value-objects/asset-type.vo';

export function isValidAsset(assetType: AssetType, assetCode: string): boolean {
  if (assetType === ASSET_TYPES.CURRENCY) {
    return (VALID_CURRENCIES as readonly string[]).includes(assetCode);
  }
  if (assetType === ASSET_TYPES.COMMODITY) {
    return (VALID_COMMODITIES as readonly string[]).includes(assetCode);
  }
  return false;
}
