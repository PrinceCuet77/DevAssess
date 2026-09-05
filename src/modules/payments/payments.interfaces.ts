import { PaymentStatus } from '../../../generated/prisma/enums';

export interface ICreatePaymentPayload {
  purchaseId: string;
}

export interface IGetPaymentHistoryQuery {
  status?: PaymentStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'amount' | 'paidAt';
  sortOrder?: 'asc' | 'desc';
}
