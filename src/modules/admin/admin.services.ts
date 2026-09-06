import { Prisma } from '../../../generated/prisma/client';
import {
  AttemptStatus,
  PaymentStatus,
  UserStatus,
} from '../../../generated/prisma/enums';
import { NotFoundError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import {
  IGetAllAssessmentsQuery,
  IGetAllPurchasesQuery,
  IGetAllUsersQuery,
  IUpdateUserStatusPayload,
} from './admin.interfaces';

const userListSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  profession: true,
  company: true,
  avatarUrl: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      assessments: true,
      purchaseAssessments: true,
      reviews: true,
      attempts: true,
    },
  },
} satisfies Prisma.UserSelect;

const assessmentAdminSelect = {
  id: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  tags: true,
  duration: true,
  price: true,
  passingPercentage: true,
  status: true,
  publishedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: { id: true, name: true, email: true, status: true },
  },
  _count: {
    select: { purchases: true, reviews: true, attempts: true },
  },
} satisfies Prisma.AssessmentSelect;

const purchaseAdminInclude = {
  customer: { select: { id: true, name: true, email: true } },
  assessment: {
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      creator: { select: { id: true, name: true, email: true } },
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

const getAllUsers = async (query: IGetAllUsersQuery) => {
  const {
    role,
    status,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // No status/deletedAt filter by default so deleted users are still visible to admins.
  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userListSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getSingleUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    omit: { password: true },
    include: {
      auths: {
        select: { id: true, provider: true, createdAt: true },
      },
      _count: {
        select: {
          assessments: true,
          purchaseAssessments: true,
          reviews: true,
          attempts: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

const updateUserStatus = async (
  userId: string,
  payload: IUpdateUserStatusPayload,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      status: payload.status,
      deletedAt: payload.status === UserStatus.DELETED ? new Date() : null,
    },
    omit: { password: true },
  });

  return updatedUser;
};

const getAllAssessments = async (query: IGetAllAssessmentsQuery) => {
  const {
    status,
    creatorId,
    tags,
    search,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // No status filter by default so drafts/archived/deleted assessments stay visible to admins.
  const where: Prisma.AssessmentWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (creatorId) {
    where.creatorId = creatorId;
  }

  if (tags && tags.length) {
    where.tags = { hasSome: tags };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { hasSome: [search.trim().toLowerCase()] } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [assessments, total] = await Promise.all([
    prisma.assessment.findMany({
      where,
      select: assessmentAdminSelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: Number(limit),
    }),
    prisma.assessment.count({ where }),
  ]);

  return {
    assessments,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getAllPurchases = async (query: IGetAllPurchasesQuery) => {
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

  const where: Prisma.PurchaseWhereInput = {};

  if (customerId) {
    where.customerId = customerId;
  }

  if (assessmentId) {
    where.assessmentId = assessmentId;
  }

  if (paymentStatus) {
    where.payments = { some: { status: paymentStatus } };
  }

  if (search) {
    where.assessment = { title: { contains: search, mode: 'insensitive' } };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: purchaseAdminInclude,
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

// Turns a groupBy result (e.g. [{ role: 'ADMIN', _count: { _all: 2 } }]) into { ADMIN: 2 }.
const groupCounts = (
  rows: Array<Record<string, unknown> & { _count: { _all: number } }>,
  key: string,
) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    acc[String(row[key])] = row._count._all;
    return acc;
  }, {});

const getDashboard = async () => {
  const [
    totalUsers,
    totalAssessments,
    totalPurchases,
    totalAttempts,
    totalReviews,
    usersByRole,
    usersByStatus,
    assessmentsByStatus,
    attemptsByStatus,
    revenueAgg,
    totalEvaluatedAttempts,
    totalPassedAttempts,
    recentUsers,
    recentAssessments,
    recentPurchases,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.assessment.count(),
    prisma.purchase.count(),
    prisma.attempt.count(),
    prisma.review.count({ where: { deletedAt: null } }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.assessment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.attempt.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCESS },
      _sum: { amount: true },
    }),
    prisma.attempt.count({ where: { status: AttemptStatus.EVALUATED } }),
    prisma.attempt.count({
      where: { status: AttemptStatus.EVALUATED, isPassed: true },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.assessment.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        createdAt: true,
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.purchase.findMany({
      select: {
        id: true,
        price: true,
        createdAt: true,
        customer: { select: { id: true, name: true, email: true } },
        assessment: { select: { id: true, title: true } },
        payments: {
          select: { status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const passRate =
    totalEvaluatedAttempts > 0
      ? Math.round((totalPassedAttempts / totalEvaluatedAttempts) * 10000) /
        100
      : 0;

  return {
    stats: {
      totalUsers,
      totalAssessments,
      totalPurchases,
      totalAttempts,
      totalReviews,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      totalEvaluatedAttempts,
      totalPassedAttempts,
      passRate,
      usersByRole: groupCounts(usersByRole, 'role'),
      usersByStatus: groupCounts(usersByStatus, 'status'),
      assessmentsByStatus: groupCounts(assessmentsByStatus, 'status'),
      attemptsByStatus: groupCounts(attemptsByStatus, 'status'),
    },
    recentUsers,
    recentAssessments,
    recentPurchases,
  };
};

export const adminServices = {
  getAllUsers,
  getSingleUser,
  updateUserStatus,
  getAllAssessments,
  getAllPurchases,
  getDashboard,
};
