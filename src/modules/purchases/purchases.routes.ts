import { Router } from 'express';
import { Role } from '../../../generated/prisma/enums';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { purchasesControllers } from './purchases.controllers';
import {
  createPurchaseSchema,
  getAllPurchasesQuerySchema,
  purchaseParamsSchema,
} from './purchases.validators';

const router = Router();

router.post(
  '/',
  auth(Role.DEVELOPER),
  validate(createPurchaseSchema),
  purchasesControllers.createPurchase,
);

router.get(
  '/',
  auth(Role.DEVELOPER, Role.ADMIN),
  validate(getAllPurchasesQuerySchema, 'query'),
  purchasesControllers.getAllPurchasesByUserId,
);

router.get(
  '/:purchaseId',
  auth(Role.DEVELOPER, Role.ADMIN),
  validate(purchaseParamsSchema, 'params'),
  purchasesControllers.getSinglePurchaseById,
);

export const purchasesRoutes = router;
