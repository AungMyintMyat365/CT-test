import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import assessmentRuleRoutes from './routes/assessmentRuleRoutes.js';
import authRoutes from './routes/authRoutes.js';
import marksRoutes from './routes/marksRoutes.js';
import canvaRoutes from './routes/canvaRoutes.js';
import professionalMarkRoutes from './routes/professionalMarkRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', env.trustProxy);

const allowedOrigins = new Set(
  [env.frontendUrl, env.canvaAppOrigin, ...env.allowedOrigins].filter(Boolean),
);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (env.allowCanvaOrigins && origin.endsWith('.canva-apps.com')) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
app.use('/professional-marks', professionalMarkRoutes);
app.use('/canva', canvaRoutes);
app.use('/assessment-rules', assessmentRuleRoutes);
app.use('/reports', reportRoutes);
app.use('/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
