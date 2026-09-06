import {
  AssessmentStatus,
  PaymentStatus,
  Role,
  UserStatus,
} from '../../../generated/prisma/enums';

export interface IGetAllUsersQuery {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface IUpdateUserStatusPayload {
  status: UserStatus;
}

export interface IGetAllAssessmentsQuery {
  status?: AssessmentStatus;
  creatorId?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'title' | 'price';
  sortOrder?: 'asc' | 'desc';
}

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
