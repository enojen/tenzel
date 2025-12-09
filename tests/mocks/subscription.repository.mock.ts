import type {
  SubscriptionRepository,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreateWebhookLogDto,
} from '@/modules/subscription/domain/repositories/subscription.repository.interface';

import { Subscription } from '@/modules/subscription/domain/entities/subscription.entity';
import { WebhookLog } from '@/modules/subscription/domain/entities/webhook-log.entity';

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private subscriptions: Map<string, Subscription> = new Map();
  private webhookLogs: Map<string, WebhookLog> = new Map();
  private idCounter = 1;

  async findById(id: string): Promise<Subscription | null> {
    return this.subscriptions.get(id) ?? null;
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.userId === userId) {
        return subscription;
      }
    }
    return null;
  }

  async findByBillingKey(billingKey: string): Promise<Subscription | null> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.billingKey === billingKey) {
        return subscription;
      }
    }
    return null;
  }

  async findExpired(): Promise<Subscription[]> {
    const result: Subscription[] = [];
    const now = new Date();
    for (const subscription of this.subscriptions.values()) {
      if (subscription.expiresAt <= now) {
        result.push(subscription);
      }
    }
    return result;
  }

  async create(data: CreateSubscriptionDto): Promise<Subscription> {
    const id = String(this.idCounter++);
    const now = new Date();

    const subscription = Subscription.create({
      id,
      userId: data.userId,
      platform: data.platform,
      billingKey: data.billingKey,
      status: data.status ?? 'active',
      expiresAt: data.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async update(id: string, data: UpdateSubscriptionDto): Promise<Subscription> {
    const existing = this.subscriptions.get(id);
    if (!existing) {
      throw new Error('Subscription not found');
    }

    const updated = Subscription.create({
      id: existing.id,
      userId: existing.userId,
      platform: existing.platform,
      billingKey: existing.billingKey,
      status: data.status ?? existing.status,
      expiresAt: data.expiresAt ?? existing.expiresAt,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.subscriptions.set(id, updated);
    return updated;
  }

  async findWebhookLog(eventId: string): Promise<WebhookLog | null> {
    return this.webhookLogs.get(eventId) ?? null;
  }

  async createWebhookLog(data: CreateWebhookLogDto): Promise<WebhookLog> {
    const log = WebhookLog.create({
      eventId: data.eventId,
      platform: data.platform,
      eventType: data.eventType,
      billingKey: data.billingKey,
      processedAt: new Date(),
      payload: data.payload,
    });

    this.webhookLogs.set(data.eventId, log);
    return log;
  }

  clear(): void {
    this.subscriptions.clear();
    this.webhookLogs.clear();
    this.idCounter = 1;
  }

  seed(subscriptions: Subscription[]): void {
    for (const subscription of subscriptions) {
      const id = String(subscription.id);
      this.subscriptions.set(id, subscription);
      const numId = parseInt(id, 10);
      if (!isNaN(numId) && numId >= this.idCounter) {
        this.idCounter = numId + 1;
      }
    }
  }
}
