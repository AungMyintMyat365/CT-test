import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import marksRoutes from './routes/marksRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CIY.club Assessment System API' });
});

app.use('/auth', authRoutes);
app.use('/students', studentRoutes);
app.use('/assessments', assessmentRoutes);
app.use('/marks', marksRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
