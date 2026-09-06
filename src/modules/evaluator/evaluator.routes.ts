import { Router } from 'express';

import { Role } from '../../../generated/prisma/client';
import { auth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validator';
import { evaluatorControllers } from './evaluator.controllers';
import {
  createAssessmentSchema,
  getAssessmentByIdParamSchema,
  getMyAssessmentPurchasesQuerySchema,
  getMyAssessmentsSchema,
  presignThumbnailUploadSchema,
  purchaseIdParamSchema,
  updateAssessmentSchema,
  updateMyAssessmentPurchaseSchema,
} from './evaluator.validators';

const router = Router();

router.get(
  '/dashboard',
  auth(Role.EVALUATOR),
  evaluatorControllers.getDashboard,
);

router.post(
  '/assessment/thumbnail/presign',
  auth(Role.EVALUATOR),
  validate(presignThumbnailUploadSchema),
  evaluatorControllers.presignThumbnailUpload,
);

router.post(
  '/assessment',
  auth(Role.EVALUATOR),
  validate(createAssessmentSchema),
  evaluatorControllers.createAssessment,
);

router.get(
  '/assessments',
  auth(Role.EVALUATOR),
  validate(getMyAssessmentsSchema, 'query'),
  evaluatorControllers.getMyCreatedAssessments,
);

router.get(
  '/assessments/:assessmentId',
  auth(Role.EVALUATOR, Role.ADMIN),
  validate(getAssessmentByIdParamSchema, 'params'),
  evaluatorControllers.getSingleAssessmentByIdForEvaluatorOrAdmin,
);

router.patch(
  '/assessments/:assessmentId',
  auth(Role.EVALUATOR),
  validate(getAssessmentByIdParamSchema, 'params'),
  validate(updateAssessmentSchema),
  evaluatorControllers.updateSingleAssessmentById,
);

router.delete(
  '/assessments/:assessmentId',
  auth(Role.EVALUATOR),
  validate(getAssessmentByIdParamSchema, 'params'),
  evaluatorControllers.deleteSingleAssessmentById,
);

router.get(
  '/purchases',
  auth(Role.EVALUATOR),
  validate(getMyAssessmentPurchasesQuerySchema, 'query'),
  evaluatorControllers.getMyAssessmentPurchaseList,
);

router.get(
  '/purchases/:purchaseId',
  auth(Role.EVALUATOR),
  validate(purchaseIdParamSchema, 'params'),
  evaluatorControllers.getMyAssessmentPurchaseByPurchaseId,
);

router.patch(
  '/purchases/:purchaseId',
  auth(Role.EVALUATOR),
  validate(purchaseIdParamSchema, 'params'),
  validate(updateMyAssessmentPurchaseSchema),
  evaluatorControllers.updateMyAssessmentPurchaseByPurchaseId,
);

export const evaluatorRoutes = router;
