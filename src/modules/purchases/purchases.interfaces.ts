import { PaymentStatus, Role } from '../../../generated/prisma/enums';

export type PurchaseQueryRole = Extract<Role, 'DEVELOPER' | 'ADMIN'>;

export interface IGetAllPurchasesQuery {
  paymentStatus?: PaymentStatus;
  assessmentId?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface ICreatePurchasePayload {
  assessmentIds: string[];
}
