import {
  AssessmentStatus,
  AttemptStatus,
  PaymentStatus,
  Prisma,
} from '../../../generated/prisma/client';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import {
  IAnswerKey,
  IEvaluateAssessmentPayload,
  IGetAllAttemptsQuery,
  IQuestion,
  ISubmitAssessmentPayload,
} from './developer.interfaces';

const assessmentDetailsSelect = {
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
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.AssessmentSelect;

const attemptHistorySelect = {
  id: true,
  score: true,
  isPassed: true,
  status: true,
  startedAt: true,
  endedAt: true,
  submittedAt: true,
  evaluatedAt: true,
  createdAt: true,
} satisfies Prisma.AttemptSelect;

const verifyPurchased = async (developerId: string, assessmentId: string) => {
  const purchasedItem = await prisma.purchaseItem.findFirst({
    where: {
      assessmentId,
      purchase: {
        customerId: developerId,
        payments: { some: { status: PaymentStatus.SUCCESS } },
      },
    },
  });

  if (!purchasedItem) {
    throw new ForbiddenError(
      'You must purchase this assessment before you can access it',
    );
  }
};

const startAssessment = async (developerId: string, assessmentId: string) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, status: AssessmentStatus.PUBLISHED },
    select: { id: true, duration: true },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  await verifyPurchased(developerId, assessmentId);

  const startedAt = new Date();
  const endedAt = new Date(
    startedAt.getTime() + assessment.duration * 60 * 1000,
  );

  const attempt = await prisma.attempt.create({
    data: {
      assessmentId,
      developerId,
      status: AttemptStatus.IN_PROGRESS,
      startedAt,
      endedAt,
    },
    select: attemptHistorySelect,
  });

  return attempt;
};

const submitAssessment = async (
  developerId: string,
  assessmentId: string,
  payload: ISubmitAssessmentPayload,
) => {
  const attempt = await prisma.attempt.findFirst({
    where: { id: payload.attemptId, assessmentId, developerId },
    select: { id: true, status: true },
  });

  if (!attempt) {
    throw new NotFoundError('Attempt not found');
  }

  if (attempt.status === AttemptStatus.EVALUATED) {
    throw new BadRequestError('This attempt has already been evaluated');
  }

  const updatedAttempt = await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
    },
    select: attemptHistorySelect,
  });

  return updatedAttempt;
};

const evaluateAssessment = async (
  developerId: string,
  assessmentId: string,
  payload: IEvaluateAssessmentPayload,
) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, status: AssessmentStatus.PUBLISHED },
    select: {
      ...assessmentDetailsSelect,
      questions: true,
      answers: true,
    },
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  await verifyPurchased(developerId, assessmentId);

  const attempt = await prisma.attempt.findFirst({
    where: { id: payload.attemptId, assessmentId, developerId },
    select: { id: true, status: true },
  });

  if (!attempt) {
    throw new NotFoundError('Attempt not found');
  }

  if (attempt.status === AttemptStatus.EVALUATED) {
    throw new BadRequestError('This attempt has already been evaluated');
  }

  const questions = assessment.questions as unknown as IQuestion[];
  const answerKey = assessment.answers as unknown as IAnswerKey[];

  const questionIds = new Set(questions.map((question) => question.id));
  const selectedAnswerIds = new Set(
    payload.answers.map((answer) => answer.questionId),
  );

  const unknownAnswers = payload.answers.filter(
    (answer) => !questionIds.has(answer.questionId),
  );

  if (unknownAnswers.length) {
    throw new BadRequestError(
      `Unknown question id(s): ${unknownAnswers
        .map((answer) => answer.questionId)
        .join(', ')}`,
    );
  }

  if (selectedAnswerIds.size !== questions.length) {
    throw new BadRequestError(
      'You must answer every question in the assessment exactly once',
    );
  }

  for (const answer of payload.answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    const validOptionIds = question!.options.map((option) => option.id);

    if (!validOptionIds.includes(answer.answer)) {
      throw new BadRequestError(
        `Answer for question "${answer.questionId}" must be one of: ${validOptionIds.join(', ')}`,
      );
    }
  }

  const totalMarks = questions.reduce(
    (sum, question) => sum + question.marks,
    0,
  );

  const questionResults = questions.map((question) => {
    const correctAnswer = answerKey.find(
      (answer) => answer.questionId === question.id,
    )?.answer;
    const selected = payload.answers.find(
      (answer) => answer.questionId === question.id,
    );
    const isCorrect = !!selected && selected.answer === correctAnswer;

    return {
      questionId: question.id,
      question: question.question,
      marks: question.marks,
      selectedAnswer: selected?.answer ?? null,
      isCorrect,
      obtainedMarks: isCorrect ? question.marks : 0,
    };
  });

  const obtainedMarks = questionResults.reduce(
    (sum, result) => sum + result.obtainedMarks,
    0,
  );
  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
  const isPassed = percentage >= assessment.passingPercentage;
  const now = new Date();

  const updatedAttempt = await prisma.attempt.update({
    where: { id: attempt.id },
    data: {
      score: Math.round(obtainedMarks),
      isPassed,
      evaluatedAt: now,
      status: AttemptStatus.EVALUATED,
    },
    select: attemptHistorySelect,
  });

  const otherAttempts = await prisma.attempt.findMany({
    where: {
      assessmentId,
      developerId,
      id: { not: updatedAttempt.id },
    },
    select: attemptHistorySelect,
    orderBy: { createdAt: 'desc' },
  });

  const {
    questions: _questions,
    answers: _answers,
    ...assessmentDetails
  } = assessment;

  return {
    assessment: assessmentDetails,
    evaluation: {
      attemptId: updatedAttempt.id,
      totalMarks,
      obtainedMarks,
      percentage,
      passingPercentage: assessment.passingPercentage,
      isPassed,
      status: updatedAttempt.status,
      evaluatedAt: updatedAttempt.evaluatedAt,
      questionResults,
    },
    attemptHistory: [updatedAttempt, ...otherAttempts],
  };
};

const getAllAttemptsByAssessmentId = async (
  developerId: string,
  assessmentId: string,
  query: IGetAllAttemptsQuery,
) => {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: assessmentDetailsSelect,
  });

  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  const {
    page = 1,
    limit = 10,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const where: Prisma.AttemptWhereInput = { assessmentId, developerId };

  if (status) {
    where.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [attempts, total] = await Promise.all([
    prisma.attempt.findMany({
      where,
      select: attemptHistorySelect,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: Number(limit),
    }),
    prisma.attempt.count({ where }),
  ]);

  return {
    assessment,
    attempts,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const getDashboard = async (developerId: string) => {
  const [
    totalAttempts,
    evaluatedAttempts,
    totalReviewsGiven,
    recentAttempts,
    recentPurchases,
    purchasedAssessmentRows,
    attemptedAssessmentRows,
  ] = await Promise.all([
    prisma.attempt.count({ where: { developerId } }),
    prisma.attempt.findMany({
      where: { developerId, status: AttemptStatus.EVALUATED },
      select: {
        score: true,
        isPassed: true,
        assessment: { select: { questions: true } },
      },
    }),
    prisma.review.count({ where: { developerId, deletedAt: null } }),
    prisma.attempt.findMany({
      where: { developerId },
      select: {
        id: true,
        score: true,
        isPassed: true,
        status: true,
        evaluatedAt: true,
        createdAt: true,
        assessment: {
          select: { id: true, title: true, thumbnailUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.purchase.findMany({
      where: { customerId: developerId },
      select: {
        id: true,
        price: true,
        createdAt: true,
        items: {
          select: {
            assessment: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          select: { status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.purchaseItem.findMany({
      where: {
        purchase: {
          customerId: developerId,
          payments: { some: { status: PaymentStatus.SUCCESS } },
        },
      },
      select: { assessmentId: true },
      distinct: ['assessmentId'],
    }),
    prisma.attempt.findMany({
      where: { developerId },
      select: { assessmentId: true },
      distinct: ['assessmentId'],
    }),
  ]);

  const percentages = evaluatedAttempts.map((attempt) => {
    const questions = attempt.assessment.questions as unknown as IQuestion[];
    const totalMarks = questions.reduce(
      (sum, question) => sum + question.marks,
      0,
    );

    return totalMarks > 0 ? ((attempt.score ?? 0) / totalMarks) * 100 : 0;
  });

  const averageScorePercentage =
    percentages.length > 0
      ? Math.round(
          (percentages.reduce((sum, percentage) => sum + percentage, 0) /
            percentages.length) *
            100,
        ) / 100
      : 0;

  const passedAttemptsCount = evaluatedAttempts.filter(
    (attempt) => attempt.isPassed,
  ).length;
  const passRate =
    evaluatedAttempts.length > 0
      ? Math.round((passedAttemptsCount / evaluatedAttempts.length) * 10000) /
        100
      : 0;

  const attemptedAssessmentIds = new Set(
    attemptedAssessmentRows.map((row) => row.assessmentId),
  );
  const pendingAssessmentsToAttempt = purchasedAssessmentRows.filter(
    (row) => !attemptedAssessmentIds.has(row.assessmentId),
  ).length;

  return {
    stats: {
      // Counts assessments, not orders — one order can carry several of them.
      totalPurchasedAssessments: purchasedAssessmentRows.length,
      totalAttempts,
      totalEvaluatedAttempts: evaluatedAttempts.length,
      passedAttemptsCount,
      passRate,
      averageScorePercentage,
      totalReviewsGiven,
      pendingAssessmentsToAttempt,
    },
    recentAttempts,
    recentPurchases: recentPurchases.map(({ items, ...purchase }) => ({
      ...purchase,
      assessments: items.map((item) => item.assessment),
    })),
  };
};

export const developerServices = {
  startAssessment,
  submitAssessment,
  evaluateAssessment,
  getAllAttemptsByAssessmentId,
  getDashboard,
};
