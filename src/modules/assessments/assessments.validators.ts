import { z } from 'zod';

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

export const getAllAssessmentsSchema = z.object({
  tags: tagsSchema,
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(['title', 'price', 'createdAt', 'duration'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const getAssessmentByIdSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment ID format'),
});

export const getAssessmentReviewsSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment ID format'),
});

export const getAssessmentReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'rating']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
