import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import {
  ICreateAssessmentPayload,
  IGetMyAssessmentsQuery,
  IPresignThumbnailUploadPayload,
} from './evaluator.interfaces';
import { EvaluatorServices } from './evaluator.services';

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

export const EvaluatorControllers = {
  presignThumbnailUpload,
  createAssessment,
  getMyCreatedAssessments,
};
