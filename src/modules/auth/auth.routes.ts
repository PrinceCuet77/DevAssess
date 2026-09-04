import { Router } from 'express';
import { AuthControllers } from './auth.controllers';
import { validate } from '../../middlewares/validator';
import { AuthValidators } from './auth.validator';
import passport from 'passport';

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

router.get('/logout', AuthControllers.logoutUser);

router.post('/refresh-token', AuthControllers.refreshToken);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get('/google/callback', AuthControllers.googleCallback);

export const AuthRoutes = router;
