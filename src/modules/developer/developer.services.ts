import {
  AssessmentStatus,
  AttemptStatus,
  PaymentStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import {
  IEvaluateAssessmentPayload,
  IGetAllAttemptsQuery,
} from './developer.interfaces';

interface IOption {
  id: string;
  text: string;
}

interface IQuestion {
  id: string;
  question: string;
  options: IOption[];
  marks: number;
}

interface IAnswerKey {
  questionId: string;
  answer: string;
}

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
  passed: true,
  status: true,
  startedAt: true,
  endedAt: true,
  submittedAt: true,
  evaluatedAt: true,
  createdAt: true,
} satisfies Prisma.AttemptSelect;

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

  const purchase = await prisma.purchase.findFirst({
    where: {
      assessmentId,
      customerId: developerId,
      payments: { some: { status: PaymentStatus.SUCCESS } },
    },
  });

  if (!purchase) {
    throw new ForbiddenError(
      'You must purchase this assessment before you can evaluate it',
    );
  }

  const questions = assessment.questions as unknown as IQuestion[];
  const answerKey = assessment.answers as unknown as IAnswerKey[];

  const questionIds = new Set(questions.map((question) => question.id));
  const selectedAnswerIds = new Set(
    payload.selectedAnswer.map((answer) => answer.questionId),
  );

  const unknownAnswers = payload.selectedAnswer.filter(
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

  for (const answer of payload.selectedAnswer) {
    const question = questions.find((q) => q.id === answer.questionId);
    const validOptionIds = question!.options.map((option) => option.id);

    if (!validOptionIds.includes(answer.answer)) {
      throw new BadRequestError(
        `Answer for question "${answer.questionId}" must be one of: ${validOptionIds.join(', ')}`,
      );
    }
  }

  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);

  const questionResults = questions.map((question) => {
    const correctAnswer = answerKey.find(
      (answer) => answer.questionId === question.id,
    )?.answer;
    const selected = payload.selectedAnswer.find(
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

  const attempt = await prisma.attempt.create({
    data: {
      assessmentId,
      developerId,
      score: Math.round(obtainedMarks),
      isPassed,
      startedAt: now,
      endedAt: now,
      submittedAt: now,
      evaluatedAt: now,
      status: AttemptStatus.EVALUATED,
    },
  });

  const attemptHistory = await prisma.attempt.findMany({
    where: {
      assessmentId,
      developerId,
      id: { not: attempt.id },
    },
    select: attemptHistorySelect,
    orderBy: { createdAt: 'desc' },
  });

  const { questions: _questions, answers: _answers, ...assessmentDetails } =
    assessment;

  return {
    assessment: assessmentDetails,
    evaluation: {
      attemptId: attempt.id,
      totalMarks,
      obtainedMarks,
      percentage,
      passingPercentage: assessment.passingPercentage,
      isPassed,
      status: attempt.status,
      evaluatedAt: attempt.evaluatedAt,
      questionResults,
    },
    attemptHistory,
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
    totalPurchasedAssessments,
    totalAttempts,
    evaluatedAttempts,
    totalReviewsGiven,
    recentAttempts,
    recentPurchases,
    purchasedAssessmentRows,
    attemptedAssessmentRows,
  ] = await Promise.all([
    prisma.purchase.count({
      where: {
        customerId: developerId,
        payments: { some: { status: PaymentStatus.SUCCESS } },
      },
    }),
    prisma.attempt.count({ where: { developerId } }),
    prisma.attempt.findMany({
      where: { developerId, status: AttemptStatus.EVALUATED },
      select: {
        score: true,
        passed: true,
        assessment: { select: { questions: true } },
      },
    }),
    prisma.review.count({ where: { developerId, deletedAt: null } }),
    prisma.attempt.findMany({
      where: { developerId },
      select: {
        id: true,
        score: true,
        passed: true,
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
        assessment: {
          select: { id: true, title: true, thumbnailUrl: true, price: true },
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
    prisma.purchase.findMany({
      where: {
        customerId: developerId,
        payments: { some: { status: PaymentStatus.SUCCESS } },
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
    const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);

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
    (attempt) => attempt.passed,
  ).length;
  const passRate =
    evaluatedAttempts.length > 0
      ? Math.round((passedAttemptsCount / evaluatedAttempts.length) * 10000) / 100
      : 0;

  const attemptedAssessmentIds = new Set(
    attemptedAssessmentRows.map((row) => row.assessmentId),
  );
  const pendingAssessmentsToAttempt = purchasedAssessmentRows.filter(
    (row) => !attemptedAssessmentIds.has(row.assessmentId),
  ).length;

  return {
    stats: {
      totalPurchasedAssessments,
      totalAttempts,
      totalEvaluatedAttempts: evaluatedAttempts.length,
      passedAttemptsCount,
      passRate,
      averageScorePercentage,
      totalReviewsGiven,
      pendingAssessmentsToAttempt,
    },
    recentAttempts,
    recentPurchases,
  };
};

export const developerServices = {
  evaluateAssessment,
  getAllAttemptsByAssessmentId,
  getDashboard,
};
