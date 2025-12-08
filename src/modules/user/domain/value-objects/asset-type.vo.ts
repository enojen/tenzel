export const ASSET_TYPES = {
  CURRENCY: 'currency',
  COMMODITY: 'commodity',
} as const;

export type AssetType = (typeof ASSET_TYPES)[keyof typeof ASSET_TYPES];
