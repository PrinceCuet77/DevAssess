import { Router } from 'express';
import { userControllers } from './user.controllers';

import { Role } from '../../../generated/prisma/client';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import {
  confirmAvatarUploadSchema,
  presignAvatarUploadSchema,
  updateUserProfileSchema,
} from './user.validators';

const router = Router();
const authenticatedRoles = [Role.DEVELOPER, Role.EVALUATOR, Role.ADMIN];

router.get('/me', auth(...authenticatedRoles), userControllers.getUserProfile);

router.patch(
  '/me',
  auth(...authenticatedRoles),
  validate(updateUserProfileSchema),
  userControllers.updateUserProfile,
);

router.post(
  '/me/avatar/presign',
  auth(...authenticatedRoles),
  validate(presignAvatarUploadSchema),
  userControllers.presignAvatarUpload,
);

router.patch(
  '/me/avatar',
  auth(...authenticatedRoles),
  validate(confirmAvatarUploadSchema),
  userControllers.updateUserAvatarUrl,
);

router.delete(
  '/me/avatar',
  auth(...authenticatedRoles),
  userControllers.deleteUserAvatar,
);

router.delete(
  '/me',
  auth(...authenticatedRoles),
  userControllers.deleteUserAccount,
);

export const UserRoutes = router;
