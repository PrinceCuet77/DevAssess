import axios from 'axios';
import config from '../../config';
import { prisma } from '../../lib/prisma';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../errors/ApiError';
import { Prisma } from '../../../generated/prisma/client';
import { PaymentStatus } from '../../../generated/prisma/enums';
import {
  ICreatePaymentPayload,
  IGetPaymentHistoryQuery,
} from './payments.interfaces';

const createPaymentInDB = async (
  customerId: string,
  payload: ICreatePaymentPayload,
) => {
  const { purchaseId } = payload;

  // Combine id + customerId so a purchase belonging to someone else 404s
  // instead of leaking its existence.
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId, customerId },
    include: {
      customer: true,
      assessment: { select: { title: true } },
    },
  });

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  const existingSuccessfulPayment = await prisma.payment.findFirst({
    where: {
      purchaseId,
      status: PaymentStatus.SUCCESS,
    },
  });

  if (existingSuccessfulPayment) {
    throw new ConflictError('This assessment has already been purchased');
  }

  const transactionId = `TRNX_${purchase.id}_${Date.now()}`;
  const { customer } = purchase;

  const sslPayload = {
    store_id: config.ssl_commerz_store_id,
    store_passwd: config.ssl_commerz_store_password,
    total_amount: Number(purchase.price),
    currency: 'BDT',
    tran_id: transactionId,
    success_url: `${config.backend_api_url}/api/v1/payments/confirm?purchaseId=${purchase.id}&tranId=${transactionId}&status=success`,
    fail_url: `${config.backend_api_url}/api/v1/payments/confirm?purchaseId=${purchase.id}&tranId=${transactionId}&status=fail`,
    cancel_url: `${config.backend_api_url}/api/v1/payments/confirm?purchaseId=${purchase.id}&tranId=${transactionId}&status=cancel`,
    cus_name: customer.name ?? 'Developer',
    cus_email: customer.email,
    cus_add1: 'N/A',
    cus_add2: 'N/A',
    cus_city: 'N/A',
    cus_state: 'N/A',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: '017xxxxxxxx',
    cus_fax: '017xxxxxxxx',
    product_name: purchase.assessment.title,
    product_category: 'Assessment',
    product_profile: 'general',
    shipping_method: 'NO',
  };

  const response = await axios.post(config.sslcommerz_session_url, sslPayload, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const data = response.data;

  if (!data.GatewayPageURL) {
    throw new BadRequestError(
      'Failed to initiate payment gateway. Please try again.',
    );
  }

  await prisma.payment.create({
    data: {
      transactionId,
      purchaseId: purchase.id,
      amount: purchase.price,
    },
  });

  return {
    gatewayPageURL: data.GatewayPageURL,
    transactionId,
  };
};

const confirmPayment = async (
  tranId: string,
  status: string,
  payload: Record<string, unknown>,
) => {
  const payment = await prisma.payment.findUnique({
    where: { transactionId: tranId },
  });

  if (!payment) {
    throw new NotFoundError('Payment record not found for this transaction');
  }

  if (payment.status === PaymentStatus.SUCCESS) {
    return 'success';
  }

  if (status === 'cancel') {
    await prisma.payment.update({
      where: { transactionId: tranId },
      data: {
        status: PaymentStatus.CANCELLED,
        gatewayResponse: JSON.parse(JSON.stringify(payload)),
      },
    });
    return 'cancel';
  }

  if (status === 'fail') {
    await prisma.payment.update({
      where: { transactionId: tranId },
      data: {
        status: PaymentStatus.FAILED,
        gatewayResponse: JSON.parse(JSON.stringify(payload)),
      },
    });
    return 'fail';
  }

  const validationUrl = `${config.sslcommerz_validation_url}?val_id=${payload.val_id}&store_id=${config.ssl_commerz_store_id}&store_passwd=${config.ssl_commerz_store_password}&format=json`;

  const response = await axios.get(validationUrl);
  const validationData = response.data;

  if (
    validationData.status === 'VALID' ||
    validationData.status === 'VALIDATED'
  ) {
    await prisma.payment.update({
      where: { transactionId: tranId },
      data: {
        status: PaymentStatus.SUCCESS,
        valId: validationData.val_id,
        method: validationData.card_type,
        paidAt: new Date(),
        gatewayResponse: JSON.parse(JSON.stringify(validationData)),
      },
    });
    return 'success';
  }

  await prisma.payment.update({
    where: { transactionId: tranId },
    data: {
      status: PaymentStatus.FAILED,
      gatewayResponse: JSON.parse(JSON.stringify(validationData)),
    },
  });

  return 'fail';
};

const getPaymentsHistory = async (
  customerId: string,
  query: IGetPaymentHistoryQuery,
) => {
  const {
    status,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where: Prisma.PaymentWhereInput = {
    purchase: { customerId },
  };

  if (status) {
    where.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        purchase: {
          select: {
            id: true,
            price: true,
            assessment: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                price: true,
              },
            },
          },
        },
      },
      omit: {
        gatewayResponse: true,
        purchaseId: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: Number(limit),
    }),
    prisma.payment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / Number(limit));

  return {
    payments,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  };
};

const getPaymentById = async (paymentId: string, customerId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, purchase: { customerId } },
    include: {
      purchase: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assessment: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              price: true,
            },
          },
        },
      },
    },
    omit: {
      gatewayResponse: true,
      purchaseId: true,
    },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  return payment;
};

export const paymentServices = {
  createPaymentInDB,
  confirmPayment,
  getPaymentsHistory,
  getPaymentById,
};
