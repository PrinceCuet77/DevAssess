import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { sendResponse } from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AuthServices } from './auth.services';

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

export const AuthControllers = {
  registerUser,
  verifyUserEmail,
};
