import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { config } from '../../../config';

const client = postgres(config.database.url, {
  max: config.database.pool.max,
});

export const db = drizzle(client);
