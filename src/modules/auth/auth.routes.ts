import { Router } from 'express';
import { AuthControllers } from './auth.controllers';
import { validate } from '../../middlewares/validator';
import { AuthValidators } from './auth.validator';

const router = Router();

router.post(
  '/register',
  validate(AuthValidators.registerUserSchema),
  AuthControllers.registerUser,
);

router.post(
  '/verify-email',
  validate(AuthValidators.verifyUserEmailSchema),
  AuthControllers.verifyUserEmail,
);

router.post(
  '/login',
  validate(AuthValidators.loginUserSchema),
  AuthControllers.loginUser,
);

export const AuthRoutes = router;
