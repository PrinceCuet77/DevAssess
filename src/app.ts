import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { notFound } from './middlewares/notFound';
import { globalErrorHandler } from './middlewares/globalErrorHandler';
import { AuthRoutes } from './modules/auth/auth.routes';

const app: Application = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
  res.send('Developer Assessment Platform is running...');
});

app.use('/api/v1/auth', AuthRoutes);

app.use(notFound);

app.use(globalErrorHandler);

export default app;
