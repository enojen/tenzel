import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { usersTable } from './user.table';

export const selectUserSchema = createSelectSchema(usersTable);
export const insertUserSchema = createInsertSchema(usersTable);

export type DbUser = typeof usersTable.$inferSelect;
export type NewDbUser = typeof usersTable.$inferInsert;
