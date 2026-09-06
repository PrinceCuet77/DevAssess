import crypto from 'crypto';
import httpStatus from 'http-status';
import config from '../../config';
import { ApiError, NotFoundError } from '../../errors/ApiError';
import {
  AssessmentStatus,
  AttemptStatus,
  PaymentStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { buildS3PublicUrl, generatePresignedUploadUrl } from '../../lib/s3';
import {
  ICreateAssessmentPayload,
  IGetMyAssessmentPurchasesQuery,
  IGetMyAssessmentsQuery,
  IPresignThumbnailUploadPayload,
  IUpdateAssessmentPayload,
  IUpdateMyAssessmentPurchasePayload,
} from './evaluator.interfaces';

const presignThumbnailUpload = async (
  creatorId: string,
  payload: IPresignThumbnailUploadPayload,
) => {
  if (!config.aws_s3_assessment_bucket) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Assessment storage bucket is not configured',
    );
  }

  const key = `${creatorId}/assessments/${crypto.randomUUID()}-${payload.fileName.replace(/\s+/g, '-')}`;
  const expiresInSeconds = Number(config.aws_s3_url_ttl_seconds) || 300;

  const uploadUrl = await generatePresignedUploadUrl({
    bucket: config.aws_s3_assessment_bucket,
    key,
    contentType: payload.fileType,
    expiresInSeconds,
  });

  return {
    uploadUrl,
    key,
    thumbnailUrl: buildS3PublicUrl(config.aws_s3_assessment_bucket, key),
    expiresInSeconds,
  };
};

const createAssessmentInDB = async (
  creatorId: string,
  payload: ICreateAssessmentPayload,
) => {
  let thumbnailUrl: string | null = null;
  let thumbnailKey: string | null = null;

  if (payload.thumbnailKey) {
    if (!config.aws_s3_assessment_bucket) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Assessment storage bucket is not configured',
      );
    }

    if (!payload.thumbnailKey.startsWith(`${creatorId}/assessments/`)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Thumbnail key does not belong to this account',
      );
    }

    thumbnailKey = payload.thumbnailKey;
    thumbnailUrl = buildS3PublicUrl(
      config.aws_s3_assessment_bucket,
      thumbnailKey,
    );
  }

  const assessment = await prisma.assessment.create({
    data: {
      creatorId,
      title: payload.title,
      description: payload.description,
      duration: payload.duration,
      price: payload.price,
      passingPercentage: payload.passingPercentage,
      questions: payload.questions as unknown as Prisma.InputJsonValue,
      answers: payload.answer as unknown as Prisma.InputJsonValue,
      thumbnailUrl,
      thumbnailKey,
      tags: payload.tags ?? [],
    },
  });

  const { thumbnailKey: _thumbnailKey, ...assessmentResponse } = assessment;

  return assessmentResponse;
};

const getMyCreatedAssessments = async (
  creatorId: string,
  query: IGetMyAssessmentsQuery,
) => {
  const {
    minPrice,
    maxPrice,
    duration,
    status,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where: Prisma.AssessmentWhereInput = {
    creatorId,
  };

  if (status) {
    where.status = status;
  }

  if (duration !== undefined) {
    where.duration = Number(duration);
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) {
      where.price.gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      where.price.lte = Number(maxPrice);
    }
  }

  if (search) {
    where.OR = [
      { title: { contains: String(search), mode: 'insensitive' } },
      { description: { contains: String(search), mode: 'insensitive' } },
      { tags: { hasSome: [String(search).trim().toLowerCase()] } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [assessments, total] = await Promise.all([
    prisma.assessment.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: Number(limit),
    }),
    prisma.assessment.count({ where }),
  ]);

  return {
    assessments,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getSingleAssessmentById = async (
  userId: string,
  assessmentId: string,
) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId, creatorId: userId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviews: true,
    },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found or access denied');
  }

  return assessment;
};

const updateSingleAssessmentById = async (
  userId: string,
  assessmentId: string,
  payload: IUpdateAssessmentPayload,
) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId, creatorId: userId },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found or access denied');
  }

  const { thumbnailKey, questions, answer, status, ...rest } = payload;

  const data: Prisma.AssessmentUpdateInput = {
    ...rest,
  };

  if (questions !== undefined) {
    data.questions = questions as unknown as Prisma.InputJsonValue;
  }
  if (answer !== undefined) {
    data.answers = answer as unknown as Prisma.InputJsonValue;
  }

  if (status !== undefined) {
    data.status = status;

    if (status === AssessmentStatus.PUBLISHED) {
      data.publishedAt = new Date();
    }
  }

  if (thumbnailKey !== undefined) {
    if (!config.aws_s3_assessment_bucket) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Assessment storage bucket is not configured',
      );
    }

    if (!thumbnailKey.startsWith(`${userId}/assessments/`)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Thumbnail key does not belong to this account',
      );
    }

    data.thumbnailKey = thumbnailKey;
    data.thumbnailUrl = buildS3PublicUrl(
      config.aws_s3_assessment_bucket,
      thumbnailKey,
    );
  }

  const updatedAssessment = await prisma.assessment.update({
    where: { id: assessmentId },
    data,
  });

  const { thumbnailKey: _thumbnailKey, ...assessmentResponse } =
    updatedAssessment;

  return assessmentResponse;
};

const deleteSingleAssessmentById = async (
  userId: string,
  assessmentId: string,
) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId, creatorId: userId },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found or access denied');
  }

  if (assessment.status === AssessmentStatus.DELETED) {
    throw new NotFoundError('Assessment not found or access denied');
  }

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      status: AssessmentStatus.DELETED,
      deletedAt: new Date(),
    },
  });
};

const myAssessmentPurchaseInclude = (evaluatorId: string) =>
  ({
    customer: {
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        profession: true,
        company: true,
      },
    },
    items: {
      where: { assessment: { creatorId: evaluatorId } },
      select: {
        price: true,
        assessment: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            price: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
    payments: {
      select: {
        id: true,
        transactionId: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    },
  }) satisfies Prisma.PurchaseInclude;

// `price` is the whole order's total; `subtotal` is what this evaluator earned on it.
const serializeMyAssessmentPurchase = <
  T extends { items: Array<{ price: Prisma.Decimal; assessment: unknown }> },
>(
  purchase: T,
) => {
  const { items, ...rest } = purchase;

  return {
    ...rest,
    subtotal: items.reduce(
      (sum, item) => sum.plus(item.price),
      new Prisma.Decimal(0),
    ),
    assessments: items.map((item) => item.assessment),
  };
};

const getMyAssessmentPurchaseList = async (
  evaluatorId: string,
  query: IGetMyAssessmentPurchasesQuery,
) => {
  const {
    paymentStatus,
    assessmentId,
    customerId,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const itemFilter: Prisma.PurchaseItemWhereInput = {
    assessment: { creatorId: evaluatorId },
  };

  if (assessmentId) {
    itemFilter.assessmentId = assessmentId;
  }

  const where: Prisma.PurchaseWhereInput = { items: { some: itemFilter } };

  if (customerId) {
    where.customerId = customerId;
  }

  if (paymentStatus) {
    where.payments = { some: { status: paymentStatus } };
  }

  if (search) {
    where.OR = [
      {
        items: {
          some: {
            ...itemFilter,
            assessment: {
              creatorId: evaluatorId,
              title: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: myAssessmentPurchaseInclude(evaluatorId),
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: Number(limit),
    }),
    prisma.purchase.count({ where }),
  ]);

  return {
    purchases: purchases.map(serializeMyAssessmentPurchase),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getMyAssessmentPurchaseByPurchaseId = async (
  evaluatorId: string,
  purchaseId: string,
) => {
  // Combine id + the creator of an item so a purchase carrying none of this
  // evaluator's assessments 404s instead of leaking its existence.
  const purchase = await prisma.purchase.findFirst({
    where: {
      id: purchaseId,
      items: { some: { assessment: { creatorId: evaluatorId } } },
    },
    include: myAssessmentPurchaseInclude(evaluatorId),
  });

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  return serializeMyAssessmentPurchase(purchase);
};

const updateMyAssessmentPurchaseByPurchaseId = async (
  evaluatorId: string,
  purchaseId: string,
  payload: IUpdateMyAssessmentPurchasePayload,
) => {
  const item = await prisma.purchaseItem.findFirst({
    where: {
      purchaseId,
      assessmentId: payload.assessmentId,
      assessment: { creatorId: evaluatorId },
    },
  });

  if (!item) {
    throw new NotFoundError('Purchase not found');
  }

  const updatedPurchase = await prisma.$transaction(async (tx) => {
    await tx.purchaseItem.update({
      where: { id: item.id },
      data: { price: payload.price },
    });

    const totalAgg = await tx.purchaseItem.aggregate({
      where: { purchaseId },
      _sum: { price: true },
    });

    return tx.purchase.update({
      where: { id: purchaseId },
      data: { price: totalAgg._sum.price ?? 0 },
      include: myAssessmentPurchaseInclude(evaluatorId),
    });
  });

  return serializeMyAssessmentPurchase(updatedPurchase);
};

// Turns a groupBy result (e.g. [{ status: 'PUBLISHED', _count: { _all: 2 } }]) into { PUBLISHED: 2 }.
const groupCounts = (
  rows: Array<Record<string, unknown> & { _count: { _all: number } }>,
  key: string,
) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    acc[String(row[key])] = row._count._all;
    return acc;
  }, {});

const getDashboard = async (evaluatorId: string) => {
  const [
    totalAssessments,
    totalPurchases,
    totalAttempts,
    totalReviews,
    assessmentsByStatus,
    attemptsByStatus,
    revenueAgg,
    ratingAgg,
    totalEvaluatedAttempts,
    totalPassedAttempts,
    recentPurchases,
    recentReviews,
    topAssessments,
  ] = await Promise.all([
    prisma.assessment.count({ where: { creatorId: evaluatorId } }),
    // Counts assessments sold, not orders — an order can carry several of them.
    prisma.purchaseItem.count({
      where: { assessment: { creatorId: evaluatorId } },
    }),
    prisma.attempt.count({ where: { assessment: { creatorId: evaluatorId } } }),
    prisma.review.count({
      where: { assessment: { creatorId: evaluatorId }, deletedAt: null },
    }),
    prisma.assessment.groupBy({
      by: ['status'],
      where: { creatorId: evaluatorId },
      _count: { _all: true },
    }),
    prisma.attempt.groupBy({
      by: ['status'],
      where: { assessment: { creatorId: evaluatorId } },
      _count: { _all: true },
    }),
    prisma.purchaseItem.aggregate({
      where: {
        assessment: { creatorId: evaluatorId },
        purchase: { payments: { some: { status: PaymentStatus.SUCCESS } } },
      },
      _sum: { price: true },
    }),
    prisma.review.aggregate({
      where: { assessment: { creatorId: evaluatorId }, deletedAt: null },
      _avg: { rating: true },
    }),
    prisma.attempt.count({
      where: {
        assessment: { creatorId: evaluatorId },
        status: AttemptStatus.EVALUATED,
      },
    }),
    prisma.attempt.count({
      where: {
        assessment: { creatorId: evaluatorId },
        status: AttemptStatus.EVALUATED,
        isPassed: true,
      },
    }),
    prisma.purchaseItem.findMany({
      where: { assessment: { creatorId: evaluatorId } },
      select: {
        id: true,
        purchaseId: true,
        price: true,
        createdAt: true,
        assessment: { select: { id: true, title: true } },
        purchase: {
          select: {
            customer: { select: { id: true, name: true, email: true } },
            payments: {
              select: { status: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.review.findMany({
      where: { assessment: { creatorId: evaluatorId }, deletedAt: null },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        developer: { select: { id: true, name: true, email: true } },
        assessment: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.assessment.findMany({
      where: { creatorId: evaluatorId },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        _count: {
          select: { purchaseItems: true, reviews: true, attempts: true },
        },
      },
      orderBy: { purchaseItems: { _count: 'desc' } },
      take: 5,
    }),
  ]);

  const passRate =
    totalEvaluatedAttempts > 0
      ? Math.round((totalPassedAttempts / totalEvaluatedAttempts) * 10000) /
        100
      : 0;

  return {
    stats: {
      totalAssessments,
      totalPurchases,
      totalAttempts,
      totalReviews,
      totalRevenue: revenueAgg._sum.price ?? 0,
      averageRating: ratingAgg._avg.rating ?? 0,
      totalEvaluatedAttempts,
      totalPassedAttempts,
      passRate,
      assessmentsByStatus: groupCounts(assessmentsByStatus, 'status'),
      attemptsByStatus: groupCounts(attemptsByStatus, 'status'),
    },
    recentPurchases: recentPurchases.map(({ purchase, ...item }) => ({
      ...item,
      customer: purchase.customer,
      payments: purchase.payments,
    })),
    recentReviews,
    topAssessments: topAssessments.map(({ _count, ...assessment }) => ({
      ...assessment,
      _count: {
        purchases: _count.purchaseItems,
        reviews: _count.reviews,
        attempts: _count.attempts,
      },
    })),
  };
};

export const evaluatorServices = {
  presignThumbnailUpload,
  createAssessmentInDB,
  getMyCreatedAssessments,
  getSingleAssessmentById,
  updateSingleAssessmentById,
  deleteSingleAssessmentById,
  getMyAssessmentPurchaseList,
  getMyAssessmentPurchaseByPurchaseId,
  updateMyAssessmentPurchaseByPurchaseId,
  getDashboard,
};
