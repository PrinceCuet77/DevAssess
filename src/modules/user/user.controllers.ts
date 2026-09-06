import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { clearAuthCookie } from '../../utils/authCookie';
import { sendResponse } from '../../utils/sendResponse';
import { userServices } from './user.services';

const getUserProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await userServices.getUserProfileFromDB(req.user!.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User profile retrieved successfully',
      data: user,
    });
  },
);

const updateUserProfile = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const updatedUser = await userServices.updateUserProfileIntoDB(
      req.user!.id,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User profile is updated successfully',
      data: updatedUser,
    });
  },
);

const presignAvatarUpload = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await userServices.presignAvatarUpload(
      req.user!.id,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Presigned avatar upload URL is generated successfully',
      data: result,
    });
  },
);

const updateUserAvatarUrl = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const updatedUser = await userServices.confirmAvatarUpload(
      req.user!.id,
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User avatar is updated successfully',
      data: updatedUser,
    });
  },
);

const deleteUserAvatar = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const updatedUser = await userServices.deleteAvatar(req.user!.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User avatar removed successfully',
      data: updatedUser,
    });
  },
);

const deleteUserAccount = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await userServices.deleteUserAccount(req.user!.id);

    clearAuthCookie(res);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Account deleted successfully',
      data: null,
    });
  },
);

export const userControllers = {
  getUserProfile,
  updateUserProfile,
  presignAvatarUpload,
  updateUserAvatarUrl,
  deleteUserAvatar,
  deleteUserAccount,
};
