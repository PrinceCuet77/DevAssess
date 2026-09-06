/**
 * Development seed script.
 *
 * Creates a repeatable demo dataset: 2 EVALUATORs, 2 DEVELOPERs, a handful of
 * assessments across every status, purchases with SSLCommerz-shaped payments,
 * EVALUATED attempts and reviews.
 *
 * Every row uses a fixed id (or a naturally unique key) and is written with
 * `upsert`, so `npm run seed` is idempotent — re-running it refreshes the demo
 * data instead of duplicating it. The ADMIN is not seeded here; the server
 * seeds it at startup from env vars (`src/utils/seed.ts`).
 *
 * Run with: npm run seed
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import {
  AssessmentStatus,
  AttemptStatus,
  AuthProvider,
  PaymentStatus,
  Prisma,
  Role,
  UserStatus,
} from '../generated/prisma/client';
import { prisma } from '../src/lib/prisma';

/* -------------------------------------------------------------------------- */
/* Types (mirrors src/modules/evaluator/evaluator.interfaces.ts)              */
/* -------------------------------------------------------------------------- */

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

interface IAnswer {
  questionId: string;
  answer: string;
}

interface ISeedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  profession: string;
  company: string;
  experience: number;
  skills: string[];
}

interface ISeedAssessment {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  tags: string[];
  duration: number;
  price: number;
  passingPercentage: number;
  status: AssessmentStatus;
  questions: IQuestion[];
  answers: IAnswer[];
}

interface ISeedPayment {
  id: string;
  transactionId: string;
  valId: string | null;
  status: PaymentStatus;
  method: string | null;
  paidAt: Date | null;
}

interface ISeedPurchase {
  id: string;
  customerId: string;
  /** A purchase is an order — it can carry more than one assessment. */
  assessmentIds: string[];
  payments: ISeedPayment[];
}

interface ISeedAttempt {
  id: string;
  assessmentId: string;
  developerId: string;
  /** Answers the developer picked — scored against the assessment answer key. */
  selectedAnswer: IAnswer[];
  daysAgo: number;
}

interface ISeedReview {
  id: string;
  developerId: string;
  assessmentId: string;
  rating: number;
  comment: string;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SEED_PASSWORD = 'Password123!';

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

const EVALUATOR_ONE = '11111111-1111-4111-8111-111111111111';
const EVALUATOR_TWO = '22222222-2222-4222-8222-222222222222';
const DEVELOPER_ONE = '33333333-3333-4333-8333-333333333333';
const DEVELOPER_TWO = '44444444-4444-4444-8444-444444444444';

const users: ISeedUser[] = [
  {
    id: EVALUATOR_ONE,
    name: 'Nusrat Jahan',
    email: 'evaluator.one@devassess.test',
    role: Role.EVALUATOR,
    bio: 'Backend architect who writes hiring assessments for Node.js teams.',
    profession: 'Principal Backend Engineer',
    company: 'BJIT Group',
    experience: 11,
    skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'System Design'],
  },
  {
    id: EVALUATOR_TWO,
    name: 'Tanvir Hasan',
    email: 'evaluator.two@devassess.test',
    role: Role.EVALUATOR,
    bio: 'Frontend lead focused on React performance and accessibility.',
    profession: 'Lead Frontend Engineer',
    company: 'Brain Station 23',
    experience: 8,
    skills: ['React', 'Next.js', 'TypeScript', 'Accessibility'],
  },
  {
    id: DEVELOPER_ONE,
    name: 'Arif Chowdhury',
    email: 'developer.one@devassess.test',
    role: Role.DEVELOPER,
    bio: 'Full-stack developer working mostly in the Node + React stack.',
    profession: 'Software Engineer',
    company: 'Freelance',
    experience: 3,
    skills: ['JavaScript', 'Express', 'React', 'Prisma'],
  },
  {
    id: DEVELOPER_TWO,
    name: 'Sadia Rahman',
    email: 'developer.two@devassess.test',
    role: Role.DEVELOPER,
    bio: 'Junior developer preparing for backend interviews.',
    profession: 'Junior Software Engineer',
    company: 'Kaz Software',
    experience: 1,
    skills: ['TypeScript', 'Node.js', 'SQL'],
  },
];

/* -------------------------------------------------------------------------- */
/* Assessments                                                                */
/* -------------------------------------------------------------------------- */

const NODE_ASSESSMENT = 'a1111111-1111-4111-8111-111111111111';
const SQL_ASSESSMENT = 'a2222222-2222-4222-8222-222222222222';
const REACT_ASSESSMENT = 'a3333333-3333-4333-8333-333333333333';
const TS_ASSESSMENT = 'a4444444-4444-4444-8444-444444444444';
const DRAFT_ASSESSMENT = 'a5555555-5555-4555-8555-555555555555';
const ARCHIVED_ASSESSMENT = 'a6666666-6666-4666-8666-666666666666';

const assessments: ISeedAssessment[] = [
  {
    id: NODE_ASSESSMENT,
    creatorId: EVALUATOR_ONE,
    title: 'Node.js & Express Fundamentals',
    description:
      'Covers the event loop, middleware ordering, error handling and streams in an Express application.',
    tags: ['nodejs', 'express', 'backend'],
    duration: 30,
    price: 1500,
    passingPercentage: 60,
    status: AssessmentStatus.PUBLISHED,
    questions: [
      {
        id: 'q1',
        question: 'Which phase of the Node.js event loop runs `setImmediate` callbacks?',
        options: [
          { id: 'o1', text: 'timers' },
          { id: 'o2', text: 'check' },
          { id: 'o3', text: 'poll' },
          { id: 'o4', text: 'close callbacks' },
        ],
        marks: 5,
      },
      {
        id: 'q2',
        question: 'In Express 5, how is an error from an async handler forwarded to the error middleware?',
        options: [
          { id: 'o1', text: 'It is swallowed silently' },
          { id: 'o2', text: 'A rejected promise is forwarded to `next()` automatically' },
          { id: 'o3', text: 'Only via `process.on("uncaughtException")`' },
          { id: 'o4', text: 'Express restarts the request' },
        ],
        marks: 5,
      },
      {
        id: 'q3',
        question: 'How many arguments does an Express error-handling middleware take?',
        options: [
          { id: 'o1', text: 'Two' },
          { id: 'o2', text: 'Three' },
          { id: 'o3', text: 'Four' },
          { id: 'o4', text: 'It varies' },
        ],
        marks: 5,
      },
      {
        id: 'q4',
        question: 'Which stream type would you use to transform data as it passes through?',
        options: [
          { id: 'o1', text: 'Readable' },
          { id: 'o2', text: 'Writable' },
          { id: 'o3', text: 'Duplex' },
          { id: 'o4', text: 'Transform' },
        ],
        marks: 5,
      },
    ],
    answers: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o2' },
      { questionId: 'q3', answer: 'o3' },
      { questionId: 'q4', answer: 'o4' },
    ],
  },
  {
    id: SQL_ASSESSMENT,
    creatorId: EVALUATOR_ONE,
    title: 'PostgreSQL for Application Developers',
    description:
      'Indexing strategy, transaction isolation and the query patterns that show up in day-to-day API work.',
    tags: ['postgresql', 'sql', 'database', 'backend'],
    duration: 45,
    price: 2000,
    passingPercentage: 70,
    status: AssessmentStatus.PUBLISHED,
    questions: [
      {
        id: 'q1',
        question: 'Which index type does PostgreSQL use for array `hasSome`-style containment lookups?',
        options: [
          { id: 'o1', text: 'B-tree' },
          { id: 'o2', text: 'GIN' },
          { id: 'o3', text: 'Hash' },
          { id: 'o4', text: 'BRIN' },
        ],
        marks: 10,
      },
      {
        id: 'q2',
        question: 'What happens to a PostgreSQL transaction after one statement inside it fails?',
        options: [
          { id: 'o1', text: 'The failed statement is skipped and the rest continue' },
          { id: 'o2', text: 'The transaction is aborted until ROLLBACK' },
          { id: 'o3', text: 'It commits everything before the failure' },
          { id: 'o4', text: 'The connection is closed' },
        ],
        marks: 10,
      },
      {
        id: 'q3',
        question: 'A composite index on `(status, created_at)` can efficiently serve a query filtering only on:',
        options: [
          { id: 'o1', text: 'created_at' },
          { id: 'o2', text: 'status' },
          { id: 'o3', text: 'Neither column alone' },
          { id: 'o4', text: 'Any column in any order' },
        ],
        marks: 10,
      },
    ],
    answers: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o2' },
      { questionId: 'q3', answer: 'o2' },
    ],
  },
  {
    id: REACT_ASSESSMENT,
    creatorId: EVALUATOR_TWO,
    title: 'React Performance Deep Dive',
    description:
      'Reconciliation, memoisation, and the rendering traps that make React apps feel slow.',
    tags: ['react', 'frontend', 'performance'],
    duration: 40,
    price: 1800,
    passingPercentage: 65,
    status: AssessmentStatus.PUBLISHED,
    questions: [
      {
        id: 'q1',
        question: 'What does `React.memo` compare by default?',
        options: [
          { id: 'o1', text: 'Deep equality of props' },
          { id: 'o2', text: 'Shallow equality of props' },
          { id: 'o3', text: 'Reference equality of the component' },
          { id: 'o4', text: 'Nothing — it always re-renders' },
        ],
        marks: 5,
      },
      {
        id: 'q2',
        question: 'Which hook lets you keep a mutable value across renders without triggering one?',
        options: [
          { id: 'o1', text: 'useState' },
          { id: 'o2', text: 'useMemo' },
          { id: 'o3', text: 'useRef' },
          { id: 'o4', text: 'useEffect' },
        ],
        marks: 5,
      },
      {
        id: 'q3',
        question: 'Using an array index as a list `key` is problematic mainly because:',
        options: [
          { id: 'o1', text: 'Indexes are slow to hash' },
          { id: 'o2', text: 'React forbids numeric keys' },
          { id: 'o3', text: 'Reordering or insertion remaps state to the wrong items' },
          { id: 'o4', text: 'It disables strict mode' },
        ],
        marks: 5,
      },
      {
        id: 'q4',
        question: 'Which API defers a low-priority state update so urgent input stays responsive?',
        options: [
          { id: 'o1', text: 'useTransition' },
          { id: 'o2', text: 'useLayoutEffect' },
          { id: 'o3', text: 'useReducer' },
          { id: 'o4', text: 'useContext' },
        ],
        marks: 5,
      },
    ],
    answers: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o3' },
      { questionId: 'q3', answer: 'o3' },
      { questionId: 'q4', answer: 'o1' },
    ],
  },
  {
    id: TS_ASSESSMENT,
    creatorId: EVALUATOR_TWO,
    title: 'TypeScript Type System Essentials',
    description:
      'Generics, narrowing, and the utility types you reach for while modelling API payloads.',
    tags: ['typescript', 'frontend', 'backend'],
    duration: 25,
    price: 1200,
    passingPercentage: 50,
    status: AssessmentStatus.PUBLISHED,
    questions: [
      {
        id: 'q1',
        question: 'Which utility type makes every property of `T` optional?',
        options: [
          { id: 'o1', text: 'Required<T>' },
          { id: 'o2', text: 'Partial<T>' },
          { id: 'o3', text: 'Readonly<T>' },
          { id: 'o4', text: 'Pick<T, K>' },
        ],
        marks: 10,
      },
      {
        id: 'q2',
        question: 'What does the `unknown` type give you over `any`?',
        options: [
          { id: 'o1', text: 'Nothing — they are aliases' },
          { id: 'o2', text: 'It must be narrowed before use' },
          { id: 'o3', text: 'It is assignable to every type' },
          { id: 'o4', text: 'It disables strict mode' },
        ],
        marks: 10,
      },
    ],
    answers: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o2' },
    ],
  },
  {
    id: DRAFT_ASSESSMENT,
    creatorId: EVALUATOR_ONE,
    title: 'Docker & Deployment Basics (Draft)',
    description:
      'Work in progress — images, layers and container networking. Not visible in the public catalog.',
    tags: ['docker', 'devops'],
    duration: 20,
    price: 900,
    passingPercentage: 50,
    status: AssessmentStatus.DRAFT,
    questions: [
      {
        id: 'q1',
        question: 'Which Dockerfile instruction creates a new image layer?',
        options: [
          { id: 'o1', text: 'RUN' },
          { id: 'o2', text: 'ARG' },
          { id: 'o3', text: 'EXPOSE' },
          { id: 'o4', text: 'LABEL' },
        ],
        marks: 10,
      },
    ],
    answers: [{ questionId: 'q1', answer: 'o1' }],
  },
  {
    id: ARCHIVED_ASSESSMENT,
    creatorId: EVALUATOR_TWO,
    title: 'AngularJS 1.x Fundamentals (Archived)',
    description: 'Retired assessment kept for historical purchase records.',
    tags: ['angularjs', 'frontend', 'legacy'],
    duration: 30,
    price: 700,
    passingPercentage: 60,
    status: AssessmentStatus.ARCHIVED,
    questions: [
      {
        id: 'q1',
        question: 'What does the AngularJS digest cycle do?',
        options: [
          { id: 'o1', text: 'Compiles templates to WebAssembly' },
          { id: 'o2', text: 'Runs watchers until the scope stabilises' },
          { id: 'o3', text: 'Fetches data from the server' },
          { id: 'o4', text: 'Minifies the bundle' },
        ],
        marks: 10,
      },
    ],
    answers: [{ questionId: 'q1', answer: 'o2' }],
  },
];

/* -------------------------------------------------------------------------- */
/* Purchases + payments                                                       */
/* -------------------------------------------------------------------------- */

const PURCHASE_DEV1_NODE = 'b1111111-1111-4111-8111-111111111111';
const PURCHASE_DEV1_SQL = 'b2222222-2222-4222-8222-222222222222';
const PURCHASE_DEV1_REACT = 'b3333333-3333-4333-8333-333333333333';
const PURCHASE_DEV2_NODE = 'b4444444-4444-4444-8444-444444444444';
const PURCHASE_DEV2_TS = 'b5555555-5555-4555-8555-555555555555';
const PURCHASE_DEV2_SQL = 'b6666666-6666-4666-8666-666666666666';

const purchases: ISeedPurchase[] = [
  {
    id: PURCHASE_DEV1_NODE,
    customerId: DEVELOPER_ONE,
    assessmentIds: [NODE_ASSESSMENT],
    payments: [
      {
        id: 'c1111111-1111-4111-8111-111111111111',
        transactionId: `TRNX_${PURCHASE_DEV1_NODE}_1757000000000`,
        valId: 'SEED_VAL_DEV1_NODE',
        status: PaymentStatus.SUCCESS,
        method: 'VISA',
        paidAt: daysAgo(20),
      },
    ],
  },
  {
    id: PURCHASE_DEV1_SQL,
    customerId: DEVELOPER_ONE,
    assessmentIds: [SQL_ASSESSMENT],
    payments: [
      // First attempt failed at the gateway, the retry succeeded.
      {
        id: 'c2222222-2222-4222-8222-222222222221',
        transactionId: `TRNX_${PURCHASE_DEV1_SQL}_1757100000000`,
        valId: null,
        status: PaymentStatus.FAILED,
        method: null,
        paidAt: null,
      },
      {
        id: 'c2222222-2222-4222-8222-222222222222',
        transactionId: `TRNX_${PURCHASE_DEV1_SQL}_1757100600000`,
        valId: 'SEED_VAL_DEV1_SQL',
        status: PaymentStatus.SUCCESS,
        method: 'bKash',
        paidAt: daysAgo(14),
      },
    ],
  },
  {
    id: PURCHASE_DEV1_REACT,
    customerId: DEVELOPER_ONE,
    assessmentIds: [REACT_ASSESSMENT],
    payments: [
      {
        id: 'c3333333-3333-4333-8333-333333333333',
        transactionId: `TRNX_${PURCHASE_DEV1_REACT}_1757200000000`,
        valId: 'SEED_VAL_DEV1_REACT',
        status: PaymentStatus.SUCCESS,
        method: 'MasterCard',
        paidAt: daysAgo(9),
      },
    ],
  },
  {
    id: PURCHASE_DEV2_NODE,
    customerId: DEVELOPER_TWO,
    assessmentIds: [NODE_ASSESSMENT],
    payments: [
      {
        id: 'c4444444-4444-4444-8444-444444444444',
        transactionId: `TRNX_${PURCHASE_DEV2_NODE}_1757300000000`,
        valId: 'SEED_VAL_DEV2_NODE',
        status: PaymentStatus.SUCCESS,
        method: 'Nagad',
        paidAt: daysAgo(7),
      },
    ],
  },
  {
    // One checkout covering two assessments — the shape the API now returns.
    id: PURCHASE_DEV2_TS,
    customerId: DEVELOPER_TWO,
    assessmentIds: [TS_ASSESSMENT, REACT_ASSESSMENT],
    payments: [
      {
        id: 'c5555555-5555-4555-8555-555555555555',
        transactionId: `TRNX_${PURCHASE_DEV2_TS}_1757400000000`,
        valId: 'SEED_VAL_DEV2_TS',
        status: PaymentStatus.SUCCESS,
        method: 'VISA',
        paidAt: daysAgo(4),
      },
    ],
  },
  {
    // Checkout started but never settled — this purchase must NOT grant access.
    id: PURCHASE_DEV2_SQL,
    customerId: DEVELOPER_TWO,
    assessmentIds: [SQL_ASSESSMENT],
    payments: [
      {
        id: 'c6666666-6666-4666-8666-666666666666',
        transactionId: `TRNX_${PURCHASE_DEV2_SQL}_1757500000000`,
        valId: null,
        status: PaymentStatus.PENDING,
        method: null,
        paidAt: null,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Attempts                                                                   */
/* -------------------------------------------------------------------------- */

const attempts: ISeedAttempt[] = [
  {
    // Developer one, first go at Node: two of four correct -> 50%, fails (60% needed).
    id: 'd1111111-1111-4111-8111-111111111111',
    assessmentId: NODE_ASSESSMENT,
    developerId: DEVELOPER_ONE,
    selectedAnswer: [
      { questionId: 'q1', answer: 'o1' },
      { questionId: 'q2', answer: 'o2' },
      { questionId: 'q3', answer: 'o3' },
      { questionId: 'q4', answer: 'o3' },
    ],
    daysAgo: 18,
  },
  {
    // Retake, all correct -> 100%, passes.
    id: 'd1111111-1111-4111-8111-111111111112',
    assessmentId: NODE_ASSESSMENT,
    developerId: DEVELOPER_ONE,
    selectedAnswer: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o2' },
      { questionId: 'q3', answer: 'o3' },
      { questionId: 'q4', answer: 'o4' },
    ],
    daysAgo: 16,
  },
  {
    // Developer one on SQL: all correct -> 100%, passes.
    id: 'd2222222-2222-4222-8222-222222222222',
    assessmentId: SQL_ASSESSMENT,
    developerId: DEVELOPER_ONE,
    selectedAnswer: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o2' },
      { questionId: 'q3', answer: 'o2' },
    ],
    daysAgo: 12,
  },
  {
    // Developer one on React: three of four -> 75%, passes (65% needed).
    id: 'd3333333-3333-4333-8333-333333333333',
    assessmentId: REACT_ASSESSMENT,
    developerId: DEVELOPER_ONE,
    selectedAnswer: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o3' },
      { questionId: 'q3', answer: 'o3' },
      { questionId: 'q4', answer: 'o2' },
    ],
    daysAgo: 6,
  },
  {
    // Developer two on Node: one of four -> 25%, fails.
    id: 'd4444444-4444-4444-8444-444444444444',
    assessmentId: NODE_ASSESSMENT,
    developerId: DEVELOPER_TWO,
    selectedAnswer: [
      { questionId: 'q1', answer: 'o3' },
      { questionId: 'q2', answer: 'o1' },
      { questionId: 'q3', answer: 'o3' },
      { questionId: 'q4', answer: 'o1' },
    ],
    daysAgo: 5,
  },
  {
    // Developer two on TypeScript: all correct -> 100%, passes.
    id: 'd5555555-5555-4555-8555-555555555555',
    assessmentId: TS_ASSESSMENT,
    developerId: DEVELOPER_TWO,
    selectedAnswer: [
      { questionId: 'q1', answer: 'o2' },
      { questionId: 'q2', answer: 'o2' },
    ],
    daysAgo: 2,
  },
];

/* -------------------------------------------------------------------------- */
/* Reviews (one per developer per assessment, only after an EVALUATED attempt) */
/* -------------------------------------------------------------------------- */

const reviews: ISeedReview[] = [
  {
    id: 'e1111111-1111-4111-8111-111111111111',
    developerId: DEVELOPER_ONE,
    assessmentId: NODE_ASSESSMENT,
    rating: 5,
    comment:
      'The event-loop questions were genuinely tricky. Took two attempts, learned a lot from the breakdown.',
  },
  {
    id: 'e2222222-2222-4222-8222-222222222222',
    developerId: DEVELOPER_ONE,
    assessmentId: SQL_ASSESSMENT,
    rating: 4,
    comment:
      'Solid coverage of indexing and transactions. Would have liked a couple more query-plan questions.',
  },
  {
    id: 'e3333333-3333-4333-8333-333333333333',
    developerId: DEVELOPER_ONE,
    assessmentId: REACT_ASSESSMENT,
    rating: 4,
    comment: 'Good practical questions — the keys question caught me out.',
  },
  {
    id: 'e4444444-4444-4444-8444-444444444444',
    developerId: DEVELOPER_TWO,
    assessmentId: NODE_ASSESSMENT,
    rating: 3,
    comment:
      'Harder than I expected as a junior, but the explanations pointed me at what to study next.',
  },
  {
    id: 'e5555555-5555-4555-8555-555555555555',
    developerId: DEVELOPER_TWO,
    assessmentId: TS_ASSESSMENT,
    rating: 5,
    comment: 'Short, focused and fair. A good warm-up before the bigger backend assessments.',
  },
];

/* -------------------------------------------------------------------------- */
/* Seeding                                                                    */
/* -------------------------------------------------------------------------- */

const assessmentById = new Map(assessments.map((a) => [a.id, a]));

/** Scores a set of selected answers the same way the evaluate service does. */
const scoreAttempt = (assessment: ISeedAssessment, selected: IAnswer[]) => {
  const totalMarks = assessment.questions.reduce((sum, q) => sum + q.marks, 0);

  const obtainedMarks = assessment.questions.reduce((sum, question) => {
    const correct = assessment.answers.find(
      (a) => a.questionId === question.id,
    )?.answer;
    const picked = selected.find((a) => a.questionId === question.id)?.answer;

    return sum + (picked !== undefined && picked === correct ? question.marks : 0);
  }, 0);

  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;

  return {
    score: Math.round(obtainedMarks),
    percentage,
    isPassed: percentage >= assessment.passingPercentage,
  };
};

const seedUsers = async (hashedPassword: string) => {
  for (const user of users) {
    const { id, ...profile } = user;

    await prisma.user.upsert({
      where: { id },
      update: {
        ...profile,
        password: hashedPassword,
        status: UserStatus.VERIFIED,
        deletedAt: null,
      },
      create: {
        id,
        ...profile,
        password: hashedPassword,
        status: UserStatus.VERIFIED,
        auths: {
          create: {
            provider: AuthProvider.CREDENTIALS,
            providerId: profile.email,
          },
        },
      },
    });
  }

  console.log(`✔ Users: ${users.length} (2 evaluators, 2 developers)`);
};

const seedAssessments = async () => {
  for (const assessment of assessments) {
    const { id, questions, answers, price, status, ...rest } = assessment;

    const data = {
      ...rest,
      price: new Prisma.Decimal(price),
      status,
      publishedAt:
        status === AssessmentStatus.PUBLISHED ||
        status === AssessmentStatus.ARCHIVED
          ? daysAgo(30)
          : null,
      deletedAt: null,
      questions: questions as unknown as Prisma.InputJsonValue,
      answers: answers as unknown as Prisma.InputJsonValue,
    };

    await prisma.assessment.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  console.log(
    `✔ Assessments: ${assessments.length} (4 published, 1 draft, 1 archived)`,
  );
};

const seedPurchases = async () => {
  let paymentCount = 0;

  for (const purchase of purchases) {
    const items = purchase.assessmentIds.map((assessmentId) => ({
      assessmentId,
      price: new Prisma.Decimal(assessmentById.get(assessmentId)!.price),
    }));

    // The order total is the sum of its lines.
    const price = items.reduce(
      (sum, item) => sum.plus(item.price),
      new Prisma.Decimal(0),
    );

    await prisma.purchase.upsert({
      where: { id: purchase.id },
      update: { price, customerId: purchase.customerId },
      create: { id: purchase.id, price, customerId: purchase.customerId },
    });

    // Drop any line a previous seed left behind before re-writing this one's.
    await prisma.purchaseItem.deleteMany({
      where: {
        purchaseId: purchase.id,
        assessmentId: { notIn: purchase.assessmentIds },
      },
    });

    for (const item of items) {
      await prisma.purchaseItem.upsert({
        where: {
          purchaseId_assessmentId: {
            purchaseId: purchase.id,
            assessmentId: item.assessmentId,
          },
        },
        update: { price: item.price },
        create: { purchaseId: purchase.id, ...item },
      });
    }

    for (const payment of purchase.payments) {
      const { id, ...paymentData } = payment;

      const data = {
        ...paymentData,
        amount: price,
        currency: 'BDT',
        purchaseId: purchase.id,
        gatewayResponse:
          payment.status === PaymentStatus.SUCCESS
            ? ({
                status: 'VALID',
                tran_id: payment.transactionId,
                val_id: payment.valId,
                currency: 'BDT',
                card_type: payment.method,
              } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      };

      await prisma.payment.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });

      paymentCount += 1;
    }
  }

  const itemCount = purchases.reduce(
    (sum, purchase) => sum + purchase.assessmentIds.length,
    0,
  );

  console.log(
    `✔ Purchases: ${purchases.length} orders covering ${itemCount} assessments (one order holds two) with ${paymentCount} payments (5 paid, 1 pending, 1 failed retry)`,
  );
};

const seedAttempts = async () => {
  for (const attempt of attempts) {
    const assessment = assessmentById.get(attempt.assessmentId)!;
    const { score, isPassed } = scoreAttempt(assessment, attempt.selectedAnswer);
    const at = daysAgo(attempt.daysAgo);

    const data = {
      assessmentId: attempt.assessmentId,
      developerId: attempt.developerId,
      score,
      isPassed,
      startedAt: at,
      endedAt: at,
      submittedAt: at,
      evaluatedAt: at,
      status: AttemptStatus.EVALUATED,
    };

    await prisma.attempt.upsert({
      where: { id: attempt.id },
      update: data,
      create: { id: attempt.id, ...data },
    });
  }

  console.log(`✔ Attempts: ${attempts.length} (all EVALUATED)`);
};

const seedReviews = async () => {
  for (const review of reviews) {
    const { id, ...data } = review;

    await prisma.review.upsert({
      where: { id },
      update: { ...data, deletedAt: null },
      create: { id, ...data },
    });
  }

  console.log(`✔ Reviews: ${reviews.length}`);
};

const main = async () => {
  const saltRounds = Number(process.env['BCRYPT_SALT_ROUNDS'] ?? 10);
  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, saltRounds);

  console.log('Seeding DevAssess demo data...\n');

  // Order matters: assessments reference users, purchases reference both, and
  // payments/attempts/reviews hang off those.
  await seedUsers(hashedPassword);
  await seedAssessments();
  await seedPurchases();
  await seedAttempts();
  await seedReviews();

  console.log('\nSeed complete. Login with password:', SEED_PASSWORD);
  for (const user of users) {
    console.log(`  ${user.role.padEnd(9)} ${user.email}`);
  }
};

main()
  .catch((error) => {
    console.error('\nSeeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
