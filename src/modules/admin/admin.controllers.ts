import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { adminServices } from './admin.services';
import {
  IGetAllAssessmentsQuery,
  IGetAllPurchasesQuery,
  IGetAllUsersQuery,
  IUpdateUserStatusPayload,
} from './admin.interfaces';

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { users, meta } = await adminServices.getAllUsers(
    req.query as unknown as IGetAllUsersQuery,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Users is retrieved successfully',
    data: users,
    meta,
  });
});

const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const user = await adminServices.getSingleUser(req.params.userId as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User is retrieved successfully',
    data: user,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const user = await adminServices.updateUserStatus(
    req.params.userId as string,
    req.body as IUpdateUserStatusPayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User status is updated successfully',
    data: user,
  });
});

const getAllAssessments = catchAsync(async (req: Request, res: Response) => {
  const { assessments, meta } = await adminServices.getAllAssessments(
    req.query as unknown as IGetAllAssessmentsQuery,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Assessments is retrieved successfully',
    data: assessments,
    meta,
  });
});

const getAllPurchases = catchAsync(async (req: Request, res: Response) => {
  const { purchases, meta } = await adminServices.getAllPurchases(
    req.query as unknown as IGetAllPurchasesQuery,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Purchases is retrieved successfully',
    data: purchases,
    meta,
  });
});

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const dashboard = await adminServices.getDashboard();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Dashboard is retrieved successfully',
    data: dashboard,
  });
});

export const adminControllers = {
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  getAllAssessments,
  getAllPurchases,
  getDashboard,
};
