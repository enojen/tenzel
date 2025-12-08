import { z } from 'zod';

import { USER_ROLES, type UserRole } from '../domain/value-objects/user-role.vo';
import { USER_STATUSES, type UserStatus } from '../domain/value-objects/user-status.vo';

const userRoleValues = Object.values(USER_ROLES) as [UserRole, ...UserRole[]];
const userStatusValues = Object.values(USER_STATUSES) as [UserStatus, ...UserStatus[]];

export const createUserRequestSchema = z.object({
  email: z.string().email().describe('User email address'),
  name: z.string().min(2).max(255).describe('User display name'),
  password: z.string().min(8).describe('User password (min 8 characters)'),
  role: z.enum(userRoleValues).optional().default(USER_ROLES.USER).describe('User role'),
});

export const userResponseSchema = z.object({
  id: z.number().int().describe('User ID'),
  email: z.string().email().describe('User email'),
  name: z.string().describe('User display name'),
  role: z.enum(userRoleValues).describe('User role'),
  status: z.enum(userStatusValues).describe('Account status'),
  isEmailVerified: z.boolean().describe('Email verification status'),
  createdAt: z.string().datetime().describe('Creation timestamp (ISO 8601)'),
  updatedAt: z.string().datetime().describe('Last update timestamp (ISO 8601)'),
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
