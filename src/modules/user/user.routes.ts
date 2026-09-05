import { Router } from 'express';
import { UserControllers } from './user.controllers';

import { Role } from '../../../generated/prisma/client';
import { auth } from '../../middlewares/auth';

const router = Router();
const authenticatedRoles = [Role.DEVELOPER, Role.EVALUATOR, Role.ADMIN];

router.get('/me', auth(...authenticatedRoles), UserControllers.getUserProfile);

export const UserRoutes = router;
