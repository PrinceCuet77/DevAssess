import { z } from 'zod';
import { AssessmentStatus } from '../../../generated/prisma/client';

export const getMyAssessmentsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.nativeEnum(AssessmentStatus).optional(),
  search: z.string().trim().min(1).optional(),
  duration: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sortBy: z
    .enum(['title', 'price', 'createdAt', 'duration'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const getAssessmentByIdParamSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment id'),
});

export const presignThumbnailUploadSchema = z.object({
  fileName: z.string().trim().min(1, 'File name is required'),
  fileType: z
    .string()
    .trim()
    .regex(/^image\//, 'File type must be an image mime type'),
});

const optionSchema = z.object({
  id: z.string().trim().min(1, 'Option id is required'),
  text: z.string().trim().min(1, 'Option text is required'),
});

const questionSchema = z.object({
  id: z.string().trim().min(1, 'Question id is required'),
  question: z.string().trim().min(1, 'Question text is required'),
  options: z.array(optionSchema).min(2, 'At least 2 options are required'),
  marks: z.coerce.number().positive('Marks must be greater than 0'),
});

const answerSchema = z.object({
  questionId: z.string().trim().min(1, 'Question id is required'),
  answer: z.string().trim().min(1, 'Answer is required'),
});

export const createAssessmentSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters'),
    description: z.string().trim().optional(),
    duration: z.coerce
      .number()
      .int()
      .positive('Duration must be greater than 0'),
    price: z.coerce.number().nonnegative('Price cannot be negative'),
    passingPercentage: z.coerce
      .number()
      .int()
      .min(1, 'Passing percentage must be at least 1')
      .max(100, 'Passing percentage cannot exceed 100'),
    thumbnailKey: z.string().trim().min(1).optional(),
    tags: z
      .string()
      .trim()
      .optional()
      .transform((value) =>
        value
          ? Array.from(
              new Set(
                value
                  .split(',')
                  .map((tag) => tag.trim().toLowerCase())
                  .filter((tag) => tag.length > 0),
              ),
            )
          : [],
      ),
    questions: z
      .array(questionSchema)
      .min(1, 'At least 1 question is required'),
    answer: z.array(answerSchema).min(1, 'At least 1 answer is required'),
  })
  .superRefine((data, ctx) => {
    const questionIds = data.questions.map((q) => q.id);
    const uniqueQuestionIds = new Set(questionIds);

    if (uniqueQuestionIds.size !== questionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questions'],
        message: 'Question ids must be unique',
      });
    }

    const answerQuestionIds = data.answer.map((a) => a.questionId);
    const uniqueAnswerQuestionIds = new Set(answerQuestionIds);

    if (uniqueAnswerQuestionIds.size !== answerQuestionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: 'Each question can only have one answer',
      });
    }

    if (uniqueQuestionIds.size !== uniqueAnswerQuestionIds.size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answer'],
        message: 'Every question must have exactly one answer',
      });
    }

    data.answer.forEach((ans, index) => {
      const question = data.questions.find((q) => q.id === ans.questionId);

      if (!question) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['answer', index, 'questionId'],
          message: `No question found with id "${ans.questionId}"`,
        });
        return;
      }

      const validOptionIds = question.options.map((o) => o.id);
      if (!validOptionIds.includes(ans.answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['answer', index, 'answer'],
          message: `Answer must be one of the option ids: ${validOptionIds.join(', ')}`,
        });
      }
    });
  });
