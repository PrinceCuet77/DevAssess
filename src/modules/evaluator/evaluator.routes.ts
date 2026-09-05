import { Router } from 'express';

import { Role } from '../../../generated/prisma/client';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { EvaluatorControllers } from './evaluator.controllers';
import {
  createAssessmentSchema,
  getMyAssessmentsSchema,
  presignThumbnailUploadSchema,
} from './evaluator.validators';

const router = Router();

router.post(
  '/assessment/thumbnail/presign',
  auth(Role.EVALUATOR),
  validate(presignThumbnailUploadSchema),
  EvaluatorControllers.presignThumbnailUpload,
);

router.post(
  '/assessment',
  auth(Role.EVALUATOR),
  validate(createAssessmentSchema),
  EvaluatorControllers.createAssessment,
);

router.get(
  '/assessments',
  auth(Role.EVALUATOR),
  validate(getMyAssessmentsSchema, 'query'),
  EvaluatorControllers.getMyCreatedAssessments,
);

export const EvaluatorRoutes = router;
