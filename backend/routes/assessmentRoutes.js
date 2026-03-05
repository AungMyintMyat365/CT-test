import { Router } from 'express';
import { createAssessment, getAssessments } from '../controllers/assessmentsController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getAssessments);
router.post('/', authenticate, createAssessment);

export default router;
