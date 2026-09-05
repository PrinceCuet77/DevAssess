import crypto from 'crypto';
import httpStatus from 'http-status';
import config from '../../config';
import { ApiError, NotFoundError } from '../../errors/ApiError';
import { AssessmentStatus, Prisma } from '../../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { buildS3PublicUrl, generatePresignedUploadUrl } from '../../lib/s3';
import {
  ICreateAssessmentPayload,
  IGetMyAssessmentsQuery,
  IPresignThumbnailUploadPayload,
  IUpdateAssessmentPayload,
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

export const EvaluatorServices = {
  presignThumbnailUpload,
  createAssessmentInDB,
  getMyCreatedAssessments,
  getSingleAssessmentById,
  updateSingleAssessmentById,
};
