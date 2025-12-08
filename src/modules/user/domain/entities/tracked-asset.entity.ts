import type { AssetType } from '../value-objects/asset-type.vo';

export interface TrackedAssetProps {
  userId: string;
  assetType: AssetType;
  assetCode: string;
  addedAt: Date;
}

export class TrackedAsset {
  private readonly props: TrackedAssetProps;

  constructor(props: TrackedAssetProps) {
    this.props = props;
  }

  get userId(): string {
    return this.props.userId;
  }

  get assetType(): AssetType {
    return this.props.assetType;
  }

  get assetCode(): string {
    return this.props.assetCode;
  }

  get addedAt(): Date {
    return this.props.addedAt;
  }

  equals(other: TrackedAsset): boolean {
    return (
      this.userId === other.userId &&
      this.assetType === other.assetType &&
      this.assetCode === other.assetCode
    );
  }

  static create(props: Omit<TrackedAssetProps, 'addedAt'> & { addedAt?: Date }): TrackedAsset {
    return new TrackedAsset({
      ...props,
      addedAt: props.addedAt ?? new Date(),
    });
  }
}
