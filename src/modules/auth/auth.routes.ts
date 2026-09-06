import { Router } from 'express';
import { AuthControllers } from './auth.controllers';
import { validate } from '../../middlewares/validator';
import { forgotPasswordSchema, loginUserSchema, registerUserSchema, resetPasswordSchema, verifyUserEmailSchema } from './auth.validators';
import passport from 'passport';

const router = Router();

router.post(
  '/register',
  validate(registerUserSchema),
  AuthControllers.registerUser,
);

router.post(
  '/verify-email',
  validate(verifyUserEmailSchema),
  AuthControllers.verifyUserEmail,
);

router.post(
  '/login',
  validate(loginUserSchema),
  AuthControllers.loginUser,
);

router.get('/logout', AuthControllers.logoutUser);

router.post('/refresh-token', AuthControllers.refreshToken);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get('/google/callback', AuthControllers.googleCallback);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  AuthControllers.forgotPassword,
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  AuthControllers.resetPassword,
);

export const AuthRoutes = router;
