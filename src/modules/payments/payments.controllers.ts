import { Request, Response } from 'express';
import httpStatus from 'http-status';
import config from '../../config';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { paymentServices } from './payments.services';
import { IGetPaymentHistoryQuery } from './payments.interfaces';

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentServices.createPaymentInDB(
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Payment is initiated successfully',
    data: result,
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const { purchaseId, tranId, status } = req.query;
  const payload = req.body;

  const response = await paymentServices.confirmPayment(
    tranId as string,
    status as string,
    payload,
  );

  if (response === 'success') {
    res.redirect(
      `${config.frontend_url}/developer/payments?status=success&purchaseId=${purchaseId}&tranId=${tranId}`,
    );
  } else if (response === 'fail') {
    res.redirect(
      `${config.frontend_url}/developer/payments?status=failed&purchaseId=${purchaseId}`,
    );
  } else if (response === 'cancel') {
    res.redirect(
      `${config.frontend_url}/developer/payments?status=cancelled&purchaseId=${purchaseId}`,
    );
  }
});

const getPaymentsHistory = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.id as string;
  const result = await paymentServices.getPaymentsHistory(
    customerId,
    req.query as IGetPaymentHistoryQuery,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payment history is retrieved successfully',
    data: result.payments,
    meta: result.meta,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user?.id as string;
  const paymentId = req.params.paymentId as string;
  const payment = await paymentServices.getPaymentById(paymentId, customerId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payment details are retrieved successfully',
    data: payment,
  });
});

export const paymentController = {
  createPayment,
  confirmPayment,
  getPaymentsHistory,
  getPaymentById,
};
