export interface ICreateReviewPayload {
  assessmentId: string;
  rating: number;
  comment: string;
}

export interface IUpdateReviewPayload {
  rating?: number;
  comment?: string;
}

export interface IGetMyReviewsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
}
