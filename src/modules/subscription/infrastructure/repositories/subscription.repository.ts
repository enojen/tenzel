import { and, eq, inArray, lt } from 'drizzle-orm';

import { Subscription } from '../../domain/entities/subscription.entity';
import { WebhookLog } from '../../domain/entities/webhook-log.entity';
import { SUBSCRIPTION_STATUSES } from '../../domain/value-objects/subscription-status.vo';
import {
  SubscriptionCreationFailedException,
  SubscriptionUpdateFailedException,
  WebhookLogCreationFailedException,
} from '../../exceptions';
import { subscriptionsTable, type DbSubscription } from '../database/tables/subscriptions.table';
import { webhookLogsTable, type DbWebhookLog } from '../database/tables/webhook-logs.table';

import type {
  SubscriptionRepository as ISubscriptionRepository,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreateWebhookLogDto,
} from '../../domain/repositories/subscription.repository.interface';
import type { WebhookEventType } from '../../domain/value-objects/webhook-event-type.vo';

import { db } from '@/shared/infrastructure/database/drizzle';

export class SubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly database: typeof db = db) {}

  async findById(id: string): Promise<Subscription | null> {
    const result = await this.database
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, id))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    const result = await this.database
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findByBillingKey(billingKey: string): Promise<Subscription | null> {
    const result = await this.database
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.billingKey, billingKey))
      .limit(1);

    return result[0] ? this.toDomain(result[0]) : null;
  }

  async findExpired(): Promise<Subscription[]> {
    const result = await this.database
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          lt(subscriptionsTable.expiresAt, new Date()),
          inArray(subscriptionsTable.status, [
            SUBSCRIPTION_STATUSES.ACTIVE,
            SUBSCRIPTION_STATUSES.CANCELED,
            SUBSCRIPTION_STATUSES.GRACE_PERIOD,
          ]),
        ),
      );

    return result.map((row) => this.toDomain(row));
  }

  async create(data: CreateSubscriptionDto): Promise<Subscription> {
    const [created] = await this.database
      .insert(subscriptionsTable)
      .values({
        userId: data.userId,
        platform: data.platform,
        billingKey: data.billingKey,
        status: data.status ?? SUBSCRIPTION_STATUSES.ACTIVE,
        expiresAt: data.expiresAt,
      })
      .returning();

    if (!created) {
      throw new SubscriptionCreationFailedException();
    }

    return this.toDomain(created);
  }

  async update(id: string, data: UpdateSubscriptionDto): Promise<Subscription> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt;
    }

    const [updated] = await this.database
      .update(subscriptionsTable)
      .set(updateData)
      .where(eq(subscriptionsTable.id, id))
      .returning();

    if (!updated) {
      throw new SubscriptionUpdateFailedException();
    }

    return this.toDomain(updated);
  }

  async findWebhookLog(eventId: string): Promise<WebhookLog | null> {
    const result = await this.database
      .select()
      .from(webhookLogsTable)
      .where(eq(webhookLogsTable.eventId, eventId))
      .limit(1);

    return result[0] ? this.toWebhookLogDomain(result[0]) : null;
  }

  async createWebhookLog(data: CreateWebhookLogDto): Promise<WebhookLog> {
    const [created] = await this.database
      .insert(webhookLogsTable)
      .values({
        eventId: data.eventId,
        platform: data.platform,
        eventType: data.eventType,
        billingKey: data.billingKey,
        payload: data.payload,
        processedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new WebhookLogCreationFailedException();
    }

    return this.toWebhookLogDomain(created);
  }

  private toDomain(dbSubscription: DbSubscription): Subscription {
    return Subscription.create({
      id: dbSubscription.id,
      userId: dbSubscription.userId,
      platform: dbSubscription.platform,
      billingKey: dbSubscription.billingKey,
      status: dbSubscription.status,
      expiresAt: dbSubscription.expiresAt,
      createdAt: dbSubscription.createdAt,
      updatedAt: dbSubscription.updatedAt,
    });
  }

  private toWebhookLogDomain(dbLog: DbWebhookLog): WebhookLog {
    return WebhookLog.create({
      id: dbLog.id,
      eventId: dbLog.eventId,
      platform: dbLog.platform,
      eventType: dbLog.eventType as WebhookEventType,
      billingKey: dbLog.billingKey,
      processedAt: dbLog.processedAt,
      payload: dbLog.payload,
    });
  }
}
