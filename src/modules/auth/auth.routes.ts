import { Router } from 'express';
import { AuthControllers } from './auth.controllers';

const router = Router();

router.post('/register', AuthControllers.registerUser);

router.post('/verify-email', AuthControllers.verifyUserEmail);

export const AuthRoutes = router;
