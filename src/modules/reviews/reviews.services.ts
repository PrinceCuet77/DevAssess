import httpStatus from 'http-status';
import { ApiError, ForbiddenError, NotFoundError } from '../../errors/ApiError';
import { AttemptStatus, Prisma } from '../../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import {
  ICreateReviewPayload,
  IGetMyReviewsQuery,
  IUpdateReviewPayload,
} from './reviews.interfaces';

const createReviewInDB = async (
  developerId: string,
  payload: ICreateReviewPayload,
) => {
  const evaluatedAttempt = await prisma.attempt.findFirst({
    where: {
      assessmentId: payload.assessmentId,
      developerId,
      status: AttemptStatus.EVALUATED,
    },
    orderBy: { evaluatedAt: 'desc' },
  });

  if (!evaluatedAttempt) {
    throw new ForbiddenError(
      'You can only review an assessment after your attempt has been evaluated',
    );
  }

  const existingReview = await prisma.review.findFirst({
    where: {
      assessmentId: payload.assessmentId,
      developerId,
      deletedAt: null,
    },
  });

  if (existingReview) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'You have already reviewed this assessment',
    );
  }

  const review = await prisma.review.create({
    data: {
      rating: payload.rating,
      comment: payload.comment,
      developerId,
      assessmentId: payload.assessmentId,
    },
  });

  return review;
};

const getMyReviews = async (developerId: string, query: IGetMyReviewsQuery) => {
  const {
    page = 1,
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where: Prisma.ReviewWhereInput = {
    developerId,
    deletedAt: null,
  };

  if (search) {
    where.assessment = {
      OR: [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ],
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            price: true,
            duration: true,
          },
        },
        developer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: Number(limit),
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getReviewById = async (developerId: string, reviewId: string) => {
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      developerId,
      deletedAt: null,
    },
    include: {
      assessment: {
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          price: true,
          duration: true,
        },
      },
      developer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!review) {
    throw new NotFoundError('Review not found or access denied');
  }

  return review;
};

const updateReviewInDB = async (
  developerId: string,
  reviewId: string,
  payload: IUpdateReviewPayload,
) => {
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      developerId,
      deletedAt: null,
    },
  });

  if (!review) {
    throw new NotFoundError('Review not found or access denied');
  }

  const data: Prisma.ReviewUpdateInput = {};

  if (payload.rating !== undefined) {
    data.rating = payload.rating;
  }

  if (payload.comment !== undefined) {
    data.comment = payload.comment;
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data
  });

  return updatedReview;
};

const deleteReviewInDB = async (developerId: string, reviewId: string) => {
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      developerId,
      deletedAt: null,
    },
  });

  if (!review) {
    throw new NotFoundError('Review not found or access denied');
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { deletedAt: new Date() },
  });
};

export const reviewsServices = {
  createReviewInDB,
  getMyReviews,
  getReviewById,
  updateReviewInDB,
  deleteReviewInDB,
};
