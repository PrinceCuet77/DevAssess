import { AssessmentStatus } from '../../../generated/prisma/client';

export interface IOption {
  id: string;
  text: string;
}

export interface IQuestion {
  id: string;
  question: string;
  options: IOption[];
  marks: number;
}

export interface IAnswer {
  questionId: string;
  answer: string;
}

export interface ICreateAssessmentPayload {
  title: string;
  description?: string;
  duration: number;
  price: number;
  passingPercentage: number;
  questions: IQuestion[];
  answer: IAnswer[];
  thumbnailKey?: string;
  tags?: string[];
}

export type IUpdatableAssessmentStatus = Extract<
  AssessmentStatus,
  'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
>;

export interface IUpdateAssessmentPayload {
  title?: string;
  description?: string;
  duration?: number;
  price?: number;
  passingPercentage?: number;
  questions?: IQuestion[];
  answer?: IAnswer[];
  thumbnailKey?: string;
  tags?: string[];
  status?: IUpdatableAssessmentStatus;
}

export interface IPresignThumbnailUploadPayload {
  fileName: string;
  fileType: string;
}

export interface IGetMyAssessmentsQuery {
  minPrice?: number;
  maxPrice?: number;
  duration?: number;
  page: number;
  limit: number;
  status?: AssessmentStatus;
  search?: string;
  sortBy?: 'title' | 'price' | 'createdAt' | 'duration';
  sortOrder?: 'asc' | 'desc';
}
