import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import {
  ICreateAssessmentPayload,
  IGetMyAssessmentsQuery,
  IPresignThumbnailUploadPayload,
  IUpdateAssessmentPayload,
} from './evaluator.interfaces';
import { EvaluatorServices } from './evaluator.services';
import { strict } from 'node:assert';

const presignThumbnailUpload = catchAsync(
  async (req: Request, res: Response) => {
    const result = await EvaluatorServices.presignThumbnailUpload(
      req.user!.id,
      req.body as IPresignThumbnailUploadPayload,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Presigned thumbnail upload URL generated successfully',
      data: result,
    });
  },
);

const createAssessment = catchAsync(async (req: Request, res: Response) => {
  const assessment = await EvaluatorServices.createAssessmentInDB(
    req.user!.id,
    req.body as ICreateAssessmentPayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Assessment created successfully',
    data: assessment,
  });
});

const getMyCreatedAssessments = catchAsync(
  async (req: Request, res: Response) => {
    const { assessments, meta } =
      await EvaluatorServices.getMyCreatedAssessments(
        req.user!.id,
        req.query as unknown as IGetMyAssessmentsQuery,
      );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User specific assessments retrieved successfully',
      data: assessments,
      meta,
    });
  },
);

const getSingleAssessmentByIdForEvaluatorOrAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result = await EvaluatorServices.getSingleAssessmentById(
      req.user!.id,
      req.params.assessmentId as string,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Assessment retrieved successfully',
      data: result,
    });
  },
);

const updateSingleAssessmentById = catchAsync(
  async (req: Request, res: Response) => {
    const providerId = req.user?.id as string;
    const assessmentId = req.params.assessmentId as string;
    const assessment = await EvaluatorServices.updateSingleAssessmentById(
      providerId,
      assessmentId,
      req.body as IUpdateAssessmentPayload,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Assessment is updated successfully',
      data: assessment,
    });
  },
);

const deleteSingleAssessmentById = catchAsync(
  async (req: Request, res: Response) => {
    const providerId = req.user?.id as string;
    const assessmentId = req.params.assessmentId as string;
    await EvaluatorServices.deleteSingleAssessmentById(
      providerId,
      assessmentId,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Assessment is deleted successfully',
      data: null,
    });
  },
);

export const EvaluatorControllers = {
  presignThumbnailUpload,
  createAssessment,
  getMyCreatedAssessments,
  getSingleAssessmentByIdForEvaluatorOrAdmin,
  updateSingleAssessmentById,
  deleteSingleAssessmentById,
};
