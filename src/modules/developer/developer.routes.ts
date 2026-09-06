import { Router } from 'express';
import { Role } from '../../../generated/prisma/enums';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { developerControllers } from './developer.controllers';
import {
  assessmentIdParamSchema,
  evaluateAssessmentSchema,
  getAllAttemptsQuerySchema,
  submitAssessmentSchema,
} from './developer.validators';

const router = Router();

router.get(
  '/dashboard',
  auth(Role.DEVELOPER),
  developerControllers.getDashboard,
);

router.get(
  '/assessments/:assessmentId/start',
  auth(Role.DEVELOPER),
  validate(assessmentIdParamSchema, 'params'),
  developerControllers.startAssessment,
);

router.patch(
  '/assessments/:assessmentId/submit',
  auth(Role.DEVELOPER),
  validate(assessmentIdParamSchema, 'params'),
  validate(submitAssessmentSchema),
  developerControllers.submitAssessment,
);

router.patch(
  '/assessments/:assessmentId/evaluate',
  auth(Role.DEVELOPER),
  validate(assessmentIdParamSchema, 'params'),
  validate(evaluateAssessmentSchema),
  developerControllers.evaluateAssessment,
);

router.get(
  '/assessments/:assessmentId/attempts',
  auth(Role.DEVELOPER),
  validate(assessmentIdParamSchema, 'params'),
  validate(getAllAttemptsQuerySchema, 'query'),
  developerControllers.getAllAttemptsByAssessmentId,
);

export const developerRoutes = router;
