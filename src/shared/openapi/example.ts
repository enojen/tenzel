import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export const CreateUserRequest = UserSchema.omit({ id: true, createdAt: true });

export const UserResponse = UserSchema;

export const UserListResponse = z.object({
  users: z.array(UserSchema),
  total: z.number().int(),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserRequest>;
