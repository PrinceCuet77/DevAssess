import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import {
  ICreateAssessmentPayload,
  IPresignThumbnailUploadPayload,
} from './evaluator.interfaces';
import { EvaluatorServices } from './evaluator.services';

const presignThumbnailUpload = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
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

const createAssessment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
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
  },
);

export const EvaluatorControllers = {
  presignThumbnailUpload,
  createAssessment,
};
