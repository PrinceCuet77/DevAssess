import { Router } from 'express';
import { Role } from '../../../generated/prisma/enums';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { adminControllers } from './admin.controllers';
import {
  getAllAssessmentsQuerySchema,
  getAllPurchasesQuerySchema,
  getAllUsersQuerySchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './admin.validators';

const router = Router();

router.get('/dashboard', auth(Role.ADMIN), adminControllers.getDashboard);

router.get(
  '/users',
  auth(Role.ADMIN),
  validate(getAllUsersQuerySchema, 'query'),
  adminControllers.getAllUsers,
);

router.get(
  '/users/:userId',
  auth(Role.ADMIN),
  validate(userIdParamSchema, 'params'),
  adminControllers.getSingleUser,
);

router.patch(
  '/users/:userId/status',
  auth(Role.ADMIN),
  validate(userIdParamSchema, 'params'),
  validate(updateUserStatusSchema),
  adminControllers.updateUserStatus,
);

router.get(
  '/assessments',
  auth(Role.ADMIN),
  validate(getAllAssessmentsQuerySchema, 'query'),
  adminControllers.getAllAssessments,
);

router.get(
  '/purchases',
  auth(Role.ADMIN),
  validate(getAllPurchasesQuerySchema, 'query'),
  adminControllers.getAllPurchases,
);

export const adminRoutes = router;
