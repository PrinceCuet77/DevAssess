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
import { UnauthorizedError } from '../../errors/ApiError';
import config from '../../config';

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

const logoutUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    clearAuthCookie(res);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User logged out successfully',
      data: null,
    });
  },
);

const refreshToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.refreshToken
      ? req.cookies.refreshToken
      : req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization?.split(' ')[1]
        : req.headers.authorization;

    if (!token) {
      throw new UnauthorizedError(
        'Refresh token not found. Please log in again.',
      );
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await AuthServices.refreshTokenIntoNewAccessToken(token);

    setAuthCookie(res, { accessToken, refreshToken: newRefreshToken });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Access token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  },
);

const googleCallback = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'google',
      async (err: Error, user: User, info: IVerifyOptions) => {
        try {
          if (err) {
            return next(err || 'Google authentication Failed');
          }
          if (!user) {
            return next(
              new Error(info?.message || 'Google authentication Failed'),
            );
          }

          const { accessToken, refreshToken } = createUserTokens(
            user.id,
            user.email,
            user.role,
          );

          setAuthCookie(res, { accessToken, refreshToken });
          res.redirect(`${config.frontend_url}/auth/success`);
        } catch (error) {
          next(error);
        }
      },
    )(req, res, next);
  },
);

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  await AuthServices.forgotPassword(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `OTP Sent To Email : ${payload.email}`,
    data: null,
  });
});

export const AuthControllers = {
  registerUser,
  verifyUserEmail,
  loginUser,
  logoutUser,
  refreshToken,
  googleCallback,
  forgotPassword,
};
