import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../errors/ApiError';
import config from '../../config';

const buildAvatarUrl = (key: string) =>
  `https://${config.aws_s3_avatar_bucket}.s3.${config.aws_region}.amazonaws.com/${key}`;

const getUserProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { password: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return {
    ...user,
    avatarUrl: user.avatarKey ? buildAvatarUrl(user.avatarKey) : null,
  };
};

export const UserServices = {
  getUserProfileFromDB,
};