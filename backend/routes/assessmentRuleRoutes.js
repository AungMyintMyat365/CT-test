import { Router } from 'express';
import { getAssessmentRules, upsertAssessmentRule } from '../controllers/assessmentRulesController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getAssessmentRules);
router.put('/:assessment_type', authenticate, authorize('ADMIN'), upsertAssessmentRule);

export default router;
