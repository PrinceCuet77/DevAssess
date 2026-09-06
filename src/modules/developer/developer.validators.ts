import { z } from 'zod';
import { AttemptStatus } from '../../../generated/prisma/enums';

export const assessmentIdParamSchema = z.object({
  assessmentId: z.string().uuid('Invalid assessment ID format'),
});

const selectedAnswerSchema = z.object({
  questionId: z.string().trim().min(1, 'Question id is required'),
  answer: z.string().trim().min(1, 'Answer is required'),
});

export const evaluateAssessmentSchema = z.object({
  selectedAnswer: z
    .array(selectedAnswerSchema)
    .min(1, 'At least 1 selected answer is required')
    .superRefine((selectedAnswer, ctx) => {
      const questionIds = selectedAnswer.map((answer) => answer.questionId);

      if (new Set(questionIds).size !== questionIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each question can only be answered once',
        });
      }
    }),
});

export const getAllAttemptsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.nativeEnum(AttemptStatus).optional(),
  sortBy: z.enum(['createdAt', 'score']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
