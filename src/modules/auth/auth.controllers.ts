import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { sendResponse } from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthServices } from './auth.services';
import passport from 'passport';
import { User } from '../../../generated/prisma/client';
import { IVerifyOptions } from 'passport-local';
import { createUserTokens } from '../../utils/authToken';
import { clearAuthCookie, setAuthCookie } from '../../utils/authCookie';

const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await AuthServices.registerUser(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'OTP has been sent to your email',
      data: null,
    });
  },
);

const verifyUserEmail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await AuthServices.verifyUserEmail(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Email verified & user registered successfully',
      data: null,
    });
  },
);

const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'local',
      async (err: Error, user: User, info: IVerifyOptions) => {
        try {
          if (err) {
            return next(err || 'Credential authentication Failed');
          }
          if (!user) {
            return next(new Error(info?.message || 'Invalid credentials!'));
          }

          const { accessToken, refreshToken } = createUserTokens(
            user.id,
            user.email,
            user.role,
          );

          setAuthCookie(res, { accessToken, refreshToken });

          const { password, ...restUserInfo } = user;

          sendResponse(res, {
            success: true,
            statusCode: httpStatus.OK,
            message: 'User login successfully',
            data: {
              user: { ...restUserInfo, accessToken, refreshToken },
            },
          });
        } catch (error) {
          next(error);
        }
      },
    )(req, res, next);
  },
);

export const AuthControllers = {
  registerUser,
  verifyUserEmail,
  loginUser,
};
