import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import httpStatus from 'http-status';
import { UserStatus } from '../../../generated/prisma/enums';
import config from '../../config';
import { ApiError, ForbiddenError, NotFoundError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import {
  buildS3PublicUrl,
  deleteS3Object,
  generatePresignedUploadUrl,
} from '../../lib/s3';
import {
  IChangePasswordPayload,
  IConfirmAvatarUploadPayload,
  IPresignAvatarUploadPayload,
  IUpdateUserProfilePayload,
} from './user.interfaces';

const AVATAR_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const getUserProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { password: true, avatarKey: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

const updateUserProfileIntoDB = async (
  userId: string,
  payload: IUpdateUserProfilePayload,
) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    omit: { password: true, avatarKey: true },
  });

  return updatedUser;
};

const changePassword = async (
  userId: string,
  payload: IChangePasswordPayload,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (!user.password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This account has no password set. Use forgot password to create one.',
    );
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    payload.currentPassword,
    user.password,
  );
  if (!isCurrentPasswordValid) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
};

const presignAvatarUpload = async (
  userId: string,
  payload: IPresignAvatarUploadPayload,
) => {
  if (!config.aws_s3_avatar_bucket) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Avatar storage bucket is not configured',
    );
  }

  const extension = AVATAR_EXTENSION_BY_MIME[payload.contentType];
  const key = `${userId}/avatar/${crypto.randomUUID()}.${extension}`;
  const expiresInSeconds = Number(config.aws_s3_url_ttl_seconds) || 300;

  const uploadUrl = await generatePresignedUploadUrl({
    bucket: config.aws_s3_avatar_bucket,
    key,
    contentType: payload.contentType,
    expiresInSeconds,
  });

  return {
    uploadUrl,
    key,
    avatarUrl: buildS3PublicUrl(config.aws_s3_avatar_bucket, key),
    expiresInSeconds,
  };
};

const confirmAvatarUpload = async (
  userId: string,
  payload: IConfirmAvatarUploadPayload,
) => {
  if (!config.aws_s3_avatar_bucket) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Avatar storage bucket is not configured',
    );
  }

  if (!payload.key.startsWith(`${userId}/avatar/`)) {
    throw new ForbiddenError('Avatar key does not belong to this account');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      avatarKey: payload.key,
      avatarUrl: buildS3PublicUrl(config.aws_s3_avatar_bucket, payload.key),
    },
    omit: { password: true, avatarKey: true },
  });

  return updatedUser;
};

const deleteAvatar = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarKey: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.avatarKey && config.aws_s3_avatar_bucket) {
    await deleteS3Object({
      bucket: config.aws_s3_avatar_bucket,
      key: user.avatarKey,
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    omit: { password: true },
    data: { avatarKey: null, avatarUrl: null },
  });

  return updatedUser;
};

const deleteUserAccount = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.DELETED, deletedAt: new Date() },
  });
};

export const userServices = {
  changePassword,
  getUserProfileFromDB,
  updateUserProfileIntoDB,
  presignAvatarUpload,
  confirmAvatarUpload,
  deleteAvatar,
  deleteUserAccount,
};
