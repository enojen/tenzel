import type { WebhookEventType } from '../value-objects/webhook-event-type.vo';
import type { WebhookPlatform } from '../value-objects/webhook-platform.vo';

import { Entity, type EntityProps } from '@/shared/domain';

export interface WebhookLogProps extends EntityProps {
  eventId: string;
  platform: WebhookPlatform;
  eventType: WebhookEventType;
  billingKey: string;
  processedAt: Date;
  payload: string;
}

export class WebhookLog extends Entity<WebhookLogProps> {
  get eventId(): string {
    return this.props.eventId;
  }

  get platform(): WebhookPlatform {
    return this.props.platform;
  }

  get eventType(): WebhookEventType {
    return this.props.eventType;
  }

  get billingKey(): string {
    return this.props.billingKey;
  }

  get processedAt(): Date {
    return this.props.processedAt;
  }

  get payload(): string {
    return this.props.payload;
  }

  static create(props: Omit<WebhookLogProps, 'id'> & { id?: string }): WebhookLog {
    return new WebhookLog({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    } as WebhookLogProps);
  }
}
