import { Router } from 'express';
import { exportAssessmentsCsv, exportStudentsCsv } from '../controllers/reportsController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/students.csv', authenticate, exportStudentsCsv);
router.get('/assessments.csv', authenticate, exportAssessmentsCsv);

export default router;
