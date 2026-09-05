import crypto from 'crypto';
import httpStatus from 'http-status';
import config from '../../config';
import { ApiError } from '../../errors/ApiError';
import { Prisma } from '../../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { buildS3PublicUrl, generatePresignedUploadUrl } from '../../lib/s3';
import {
  ICreateAssessmentPayload,
  IPresignThumbnailUploadPayload,
} from './evaluator.interfaces';

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');

const buildUniqueSlug = async (title: string) => {
  const baseSlug = generateSlug(title) || 'assessment';

  const existing = await prisma.assessment.findUnique({
    where: { slug: baseSlug },
  });

  if (!existing) {
    return baseSlug;
  }

  return `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
};

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
  const expiresInSeconds =
    Number(config.aws_s3_url_ttl_seconds) || 300;

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

  const slug = await buildUniqueSlug(payload.title);

  const assessment = await prisma.assessment.create({
    data: {
      creatorId,
      title: payload.title,
      slug,
      description: payload.description,
      duration: payload.duration,
      price: payload.price,
      passingPercentage: payload.passingPercentage,
      questions: payload.questions as unknown as Prisma.InputJsonValue,
      answers: payload.answer as unknown as Prisma.InputJsonValue,
      thumbnailUrl,
      thumbnailKey,
    },
  });

  return assessment;
};

export const EvaluatorServices = {
  presignThumbnailUpload,
  createAssessmentInDB,
};
