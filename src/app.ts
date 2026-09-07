import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { notFound } from './middlewares/notFound';
import { globalErrorHandler } from './middlewares/globalErrorHandler';
import { AuthRoutes } from './modules/auth/auth.routes';
import { UserRoutes } from './modules/user/user.routes';
import passport from 'passport';
import './config/passport';
import { evaluatorRoutes } from './modules/evaluator/evaluator.routes';
import { reviewsRoutes } from './modules/reviews/reviews.routes';
import { assessmentsRoutes } from './modules/assessments/assessments.routes';
import { paymentRoutes } from './modules/payments/payments.routes';
import { purchasesRoutes } from './modules/purchases/purchases.routes';
import { developerRoutes } from './modules/developer/developer.routes';
import { adminRoutes } from './modules/admin/admin.routes';

const app: Application = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    errorSources: [],
  },
});

app.use(helmet());
app.use(limiter);

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.get('/', (req: Request, res: Response) => {
  res.send('Developer Assessment Platform is running...');
});

app.use('/api/v1/auth', AuthRoutes);
app.use('/api/v1/users', UserRoutes);
app.use('/api/v1/evaluator', evaluatorRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/assessments', assessmentsRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/purchases', purchasesRoutes);
app.use('/api/v1/developer', developerRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);

app.use(globalErrorHandler);

export default app;
