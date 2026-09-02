import { Router } from 'express';
import { AuthControllers } from './auth.controllers';

const router = Router();

router.post('/register', AuthControllers.registerUser);

router.post('/verify-email', AuthControllers.verifyUserEmail);

router.post('/login', AuthControllers.loginUser);

export const AuthRoutes = router;
