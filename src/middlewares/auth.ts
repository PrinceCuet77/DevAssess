import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import { prisma } from '../lib/prisma';
import { catchAsync } from '../utils/catchAsync';
import { jwtUtils } from '../utils/jwt';
import { Role, UserStatus } from '../../generated/prisma/enums';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../errors/ApiError';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization?.split(' ')[1]
        : req.headers.authorization;

    if (!token) {
      throw new UnauthorizedError(
        'You are not logged in. Please log in to access this resource.',
      );
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

    if (!verifiedToken.success) {
      throw new UnauthorizedError(verifiedToken.error);
    }

    const { id, email, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new ForbiddenError(
        "Forbidden. You don't have permission to access this resource.",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('User not found. Please log in again.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenError(
        'Your account has been blocked. Please contact support.',
      );
    }

    if (user.status === UserStatus.DELETED) {
      throw new ForbiddenError('Your account has been deleted.');
    }

    req.user = {
      id,
      email,
      role,
    };

    next();
  });
};
