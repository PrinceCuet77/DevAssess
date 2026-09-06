import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().min(1).optional(),
  sortBy: z.enum(['createdAt', 'rating']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const createReviewSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  comment: z
    .string()
    .min(1, 'Comment is required')
    .max(1000, 'Comment cannot exceed 1000 characters'),
});

export const updateReviewSchema = z.object({
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
    .optional(),
  comment: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(100, 'Comment cannot exceed 100 characters')
    .optional(),
});

export const reviewParamsSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
});