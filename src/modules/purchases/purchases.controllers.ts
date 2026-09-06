import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { purchasesServices } from './purchases.services';
import {
  ICreatePurchasePayload,
  IGetAllPurchasesQuery,
  PurchaseQueryRole,
} from './purchases.interfaces';

const createPurchase = catchAsync(async (req: Request, res: Response) => {
  const purchase = await purchasesServices.createPurchase(
    req.user!.id,
    req.body as ICreatePurchasePayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Purchase is created successfully',
    data: purchase,
  });
});

const getAllPurchasesByUserId = catchAsync(
  async (req: Request, res: Response) => {
    const { purchases, meta } = await purchasesServices.getAllPurchasesByUserId(
      req.user!.id as string,
      req.user!.role as PurchaseQueryRole,
      req.query as unknown as IGetAllPurchasesQuery,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Purchases is retrieved successfully',
      data: purchases,
      meta,
    });
  },
);

const getSinglePurchaseById = catchAsync(
  async (req: Request, res: Response) => {
    const purchase = await purchasesServices.getSinglePurchaseById(
      req.params.purchaseId as string,
      req.user!.id,
      req.user!.role as PurchaseQueryRole,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Purchase is retrieved successfully',
      data: purchase,
    });
  },
);

export const purchasesControllers = {
  getAllPurchasesByUserId,
  getSinglePurchaseById,
  createPurchase,
};
