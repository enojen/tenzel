import type { Subscription } from '../entities/subscription.entity';
import type { WebhookLog } from '../entities/webhook-log.entity';
import type { SubscriptionPlatform } from '../value-objects/subscription-platform.vo';
import type { SubscriptionStatus } from '../value-objects/subscription-status.vo';
import type { WebhookEventType } from '../value-objects/webhook-event-type.vo';
import type { WebhookPlatform } from '../value-objects/webhook-platform.vo';

export interface CreateSubscriptionDto {
  userId: string;
  platform: SubscriptionPlatform;
  billingKey: string;
  status?: SubscriptionStatus;
  expiresAt: Date;
}

export interface UpdateSubscriptionDto {
  status?: SubscriptionStatus;
  expiresAt?: Date;
}

export interface CreateWebhookLogDto {
  eventId: string;
  platform: WebhookPlatform;
  eventType: WebhookEventType;
  billingKey: string;
  payload: string;
}

export interface SubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription | null>;
  findByBillingKey(billingKey: string): Promise<Subscription | null>;
  findExpired(): Promise<Subscription[]>;
  create(data: CreateSubscriptionDto): Promise<Subscription>;
  update(id: string, data: UpdateSubscriptionDto): Promise<Subscription>;

  findWebhookLog(eventId: string): Promise<WebhookLog | null>;
  createWebhookLog(data: CreateWebhookLogDto): Promise<WebhookLog>;
}
