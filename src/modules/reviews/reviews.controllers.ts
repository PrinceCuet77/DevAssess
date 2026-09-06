import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import {
  ICreateReviewPayload,
  IGetMyReviewsQuery,
  IUpdateReviewPayload,
} from './reviews.interfaces';
import { reviewsServices } from './reviews.services';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewsServices.createReviewInDB(
    req.user!.id as string,
    req.body as ICreateReviewPayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Review is created successfully',
    data: review,
  });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const { reviews, meta } = await reviewsServices.getMyReviews(
    req.user!.id,
    req.query as unknown as IGetMyReviewsQuery,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Reviews is retrieved successfully',
    data: reviews,
    meta,
  });
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewsServices.getReviewById(
    req.user!.id,
    req.params.reviewId as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Review retrieved successfully',
    data: review,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewsServices.updateReviewInDB(
    req.user!.id,
    req.params.reviewId as string,
    req.body as IUpdateReviewPayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Review is updated successfully',
    data: review,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await reviewsServices.deleteReviewInDB(
    req.user!.id,
    req.params.reviewId as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Review is deleted successfully',
    data: null,
  });
});

export const reviewsControllers = {
  getMyReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
};
