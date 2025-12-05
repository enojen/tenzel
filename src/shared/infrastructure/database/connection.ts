import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { config } from '../../../config';
import { logger } from '../../logging';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

let sqlClient: Sql | null = null;
let dbInstance: PostgresJsDatabase | null = null;

export async function initDatabase(): Promise<void> {
  if (sqlClient) {
    logger.warn('Database already initialized');
    return;
  }

  sqlClient = postgres(config.database.url, {
    max: config.database.pool.max,
    idle_timeout: config.database.pool.idleTimeout,
    connect_timeout: config.database.pool.connectTimeout,
    max_lifetime: config.database.pool.maxLifetime,
  });

  await sqlClient`SELECT 1`;
  logger.info('Database connected');

  dbInstance = drizzle(sqlClient);
}

export function getDb(): PostgresJsDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 });
    sqlClient = null;
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  if (!sqlClient) return false;
  try {
    await sqlClient`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
