import { Prisma } from '../../../generated/prisma/client';
import {
  AssessmentStatus,
  PaymentStatus,
  Role,
} from '../../../generated/prisma/enums';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import {
  ICreatePurchasePayload,
  IGetAllPurchasesQuery,
  PurchaseQueryRole,
} from './purchases.interfaces';

const purchaseInclude = {
  assessment: {
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      price: true,
      duration: true,
      passingPercentage: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  payments: {
    select: {
      id: true,
      transactionId: true,
      amount: true,
      currency: true,
      status: true,
      method: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.PurchaseInclude;

const createPurchase = async (
  customerId: string,
  payload: ICreatePurchasePayload,
) => {
  const assessmentIds = Array.from(new Set(payload.assessmentIds));

  const assessments = await prisma.assessment.findMany({
    where: { id: { in: assessmentIds } },
  });

  if (assessments.length !== assessmentIds.length) {
    const foundIds = assessments.map((assessment) => assessment.id);
    const missingIds = assessmentIds.filter((id) => !foundIds.includes(id));
    throw new NotFoundError(
      `Assessment(s) not found: ${missingIds.join(', ')}`,
    );
  }

  const unpublished = assessments.filter(
    (assessment) => assessment.status !== AssessmentStatus.PUBLISHED,
  );

  if (unpublished.length) {
    throw new BadRequestError(
      `Assessment(s) not available for purchase: ${unpublished
        .map((assessment) => assessment.title)
        .join(', ')}`,
    );
  }

  const alreadyPurchased = await prisma.purchase.findMany({
    where: {
      customerId,
      assessmentId: { in: assessmentIds },
      payments: { some: { status: PaymentStatus.SUCCESS } },
    },
    select: { assessmentId: true },
  });

  if (alreadyPurchased.length) {
    const purchasedTitles = assessments
      .filter((assessment) =>
        alreadyPurchased.some((p) => p.assessmentId === assessment.id),
      )
      .map((assessment) => assessment.title);
    throw new ConflictError(
      `You have already purchased: ${purchasedTitles.join(', ')}`,
    );
  }

  const purchases = await prisma.$transaction(
    assessments.map((assessment) =>
      prisma.purchase.create({
        data: {
          customerId,
          assessmentId: assessment.id,
          price: assessment.price,
        },
        include: purchaseInclude,
      }),
    ),
  );

  return purchases;
};

const getAllPurchasesByUserId = async (
  userId: string,
  role: PurchaseQueryRole,
  query: IGetAllPurchasesQuery,
) => {
  const {
    paymentStatus,
    assessmentId,
    customerId,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where: Prisma.PurchaseWhereInput = role === Role.ADMIN ? {} : { customerId: userId };

  // Admins can narrow the list down to a specific developer's purchases.
  if (role === Role.ADMIN && customerId) {
    where.customerId = customerId;
  }

  if (assessmentId) {
    where.assessmentId = assessmentId;
  }

  if (paymentStatus) {
    where.payments = { some: { status: paymentStatus } };
  }

  if (search) {
    where.assessment = {
      title: { contains: search, mode: 'insensitive' },
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: purchaseInclude,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: Number(limit),
    }),
    prisma.purchase.count({ where }),
  ]);

  return {
    purchases,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getSinglePurchaseById = async (
  purchaseId: string,
  userId: string,
  role: PurchaseQueryRole,
) => {
  // Combine id + customerId so a purchase belonging to someone else 404s
  // instead of leaking its existence.
  const where: Prisma.PurchaseWhereInput =
    role === Role.ADMIN
      ? { id: purchaseId }
      : { id: purchaseId, customerId: userId };

  const purchase = await prisma.purchase.findFirst({
    where,
    include: {
      ...purchaseInclude,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!purchase) {
    throw new NotFoundError('Purchase not found');
  }

  return purchase;
};

export const purchasesServices = {
  getAllPurchasesByUserId,
  getSinglePurchaseById,
  createPurchase,
};
