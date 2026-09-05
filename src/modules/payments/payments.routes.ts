import { Router } from 'express';
import { Role } from '../../../generated/prisma/enums';
import {
  createPaymentSchema,
  confirmPaymentQuerySchema,
  getPaymentHistoryQuerySchema,
  getPaymentByIdParamsSchema,
} from './payments.validators';
import { paymentController } from './payments.controllers';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';

const router = Router();

router.post(
  '/create',
  auth(Role.DEVELOPER),
  validate(createPaymentSchema),
  paymentController.createPayment,
);

router.post(
  '/confirm',
  validate(confirmPaymentQuerySchema, 'query'),
  paymentController.confirmPayment,
);

router.get(
  '/',
  auth(Role.DEVELOPER),
  validate(getPaymentHistoryQuerySchema, 'query'),
  paymentController.getPaymentsHistory,
);

router.get(
  '/:paymentId',
  auth(Role.DEVELOPER),
  validate(getPaymentByIdParamsSchema, 'params'),
  paymentController.getPaymentById,
);

export const paymentRoutes = router;
