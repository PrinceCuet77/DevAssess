import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { UserServices } from './user.services';

const getUserProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await UserServices.getUserProfileFromDB(req.user!.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User profile retrieved successfully',
      data: user,
    });
  },
);

export const UserControllers = {
  getUserProfile,
};
