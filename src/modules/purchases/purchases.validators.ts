import { z } from 'zod';
import { PaymentStatus } from '../../../generated/prisma/enums';

export const getAllPurchasesQuerySchema = z.object({
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  assessmentId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  sortBy: z.enum(['createdAt', 'price']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export const purchaseParamsSchema = z.object({
  purchaseId: z.string().min(1, 'Purchase ID is required'),
});

export const createPurchaseSchema = z.object({
  assessmentIds: z
    .array(z.string().min(1, 'Assessment ID is required'))
    .min(1, 'At least one assessment ID is required'),
});
