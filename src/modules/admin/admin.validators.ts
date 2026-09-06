import { z } from 'zod';
import {
  AssessmentStatus,
  PaymentStatus,
  Role,
  UserStatus,
} from '../../../generated/prisma/enums';

const normalizeTags = (values: string[]) =>
  Array.from(
    new Set(
      values
        .flatMap((tag) => tag.split(','))
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  );

const tagsSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const tags = normalizeTags(Array.isArray(value) ? value : [value]);

    return tags.length ? tags : undefined;
  });

export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export const getAllUsersQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateUserStatusSchema = z.object({
  status: z.enum([
    UserStatus.NOT_VERIFIED,
    UserStatus.VERIFIED,
    UserStatus.SUSPENDED,
  ]),
});

export const getAllAssessmentsQuerySchema = z.object({
  status: z.nativeEnum(AssessmentStatus).optional(),
  creatorId: z.string().uuid().optional(),
  tags: tagsSchema,
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'title', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const getAllPurchasesQuerySchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  assessmentId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
