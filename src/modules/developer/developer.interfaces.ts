import { AttemptStatus } from '../../../generated/prisma/enums';

export interface ISelectedAnswer {
  questionId: string;
  answer: string;
}

export interface IEvaluateAssessmentPayload {
  selectedAnswer: ISelectedAnswer[];
}

export interface IGetAllAttemptsQuery {
  page?: number;
  limit?: number;
  status?: AttemptStatus;
  sortBy?: 'createdAt' | 'score';
  sortOrder?: 'asc' | 'desc';
}
