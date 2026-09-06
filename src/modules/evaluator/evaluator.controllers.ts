import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import {
  ICreateAssessmentPayload,
  IGetMyAssessmentPurchasesQuery,
  IGetMyAssessmentsQuery,
  IPresignThumbnailUploadPayload,
  IUpdateAssessmentPayload,
  IUpdateMyAssessmentPurchasePayload,
} from './evaluator.interfaces';
import { evaluatorServices } from './evaluator.services';

const presignThumbnailUpload = catchAsync(
  async (req: Request, res: Response) => {
    const result = await evaluatorServices.presignThumbnailUpload(
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
  const assessment = await evaluatorServices.createAssessmentInDB(
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
      await evaluatorServices.getMyCreatedAssessments(
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
    const result = await evaluatorServices.getSingleAssessmentById(
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
    const assessment = await evaluatorServices.updateSingleAssessmentById(
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
    await evaluatorServices.deleteSingleAssessmentById(
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

const getMyAssessmentPurchaseList = catchAsync(
  async (req: Request, res: Response) => {
    const { purchases, meta } =
      await evaluatorServices.getMyAssessmentPurchaseList(
        req.user!.id,
        req.query as unknown as IGetMyAssessmentPurchasesQuery,
      );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Assessment purchases retrieved successfully',
      data: purchases,
      meta,
    });
  },
);

const getMyAssessmentPurchaseByPurchaseId = catchAsync(
  async (req: Request, res: Response) => {
    const purchase = await evaluatorServices.getMyAssessmentPurchaseByPurchaseId(
      req.user!.id,
      req.params.purchaseId as string,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Assessment purchase retrieved successfully',
      data: purchase,
    });
  },
);

const updateMyAssessmentPurchaseByPurchaseId = catchAsync(
  async (req: Request, res: Response) => {
    const purchase =
      await evaluatorServices.updateMyAssessmentPurchaseByPurchaseId(
        req.user!.id,
        req.params.purchaseId as string,
        req.body as IUpdateMyAssessmentPurchasePayload,
      );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Assessment purchase updated successfully',
      data: purchase,
    });
  },
);

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const dashboard = await evaluatorServices.getDashboard(req.user!.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Dashboard retrieved successfully',
    data: dashboard,
  });
});

export const evaluatorControllers = {
  presignThumbnailUpload,
  createAssessment,
  getMyCreatedAssessments,
  getSingleAssessmentByIdForEvaluatorOrAdmin,
  updateSingleAssessmentById,
  deleteSingleAssessmentById,
  getMyAssessmentPurchaseList,
  getMyAssessmentPurchaseByPurchaseId,
  updateMyAssessmentPurchaseByPurchaseId,
  getDashboard,
};
