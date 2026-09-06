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

export interface IAnswerKey {
  questionId: string;
  answer: string;
}