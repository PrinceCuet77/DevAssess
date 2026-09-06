import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { developerServices } from './developer.services';
import {
  IEvaluateAssessmentPayload,
  IGetAllAttemptsQuery,
  ISubmitAssessmentPayload,
} from './developer.interfaces';

const startAssessment = catchAsync(async (req: Request, res: Response) => {
  const attempt = await developerServices.startAssessment(
    req.user!.id,
    req.params.assessmentId as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Assessment attempt started successfully',
    data: attempt,
  });
});

const submitAssessment = catchAsync(async (req: Request, res: Response) => {
  const attempt = await developerServices.submitAssessment(
    req.user!.id,
    req.params.assessmentId as string,
    req.body as ISubmitAssessmentPayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Assessment attempt submitted successfully',
    data: attempt,
  });
});

const evaluateAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await developerServices.evaluateAssessment(
    req.user!.id,
    req.params.assessmentId as string,
    req.body as IEvaluateAssessmentPayload,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Assessment is evaluated successfully',
    data: result,
  });
});

const getAllAttemptsByAssessmentId = catchAsync(
  async (req: Request, res: Response) => {
    const { assessment, attempts, meta } =
      await developerServices.getAllAttemptsByAssessmentId(
        req.user!.id,
        req.params.assessmentId as string,
        req.query as unknown as IGetAllAttemptsQuery,
      );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Attempts is retrieved successfully',
      data: { assessment, attempts },
      meta,
    });
  },
);

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const dashboard = await developerServices.getDashboard(req.user!.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Dashboard is retrieved successfully',
    data: dashboard,
  });
});

export const developerControllers = {
  startAssessment,
  submitAssessment,
  evaluateAssessment,
  getAllAttemptsByAssessmentId,
  getDashboard,
};
