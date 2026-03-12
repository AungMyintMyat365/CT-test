import { Router } from 'express';
import {
  createProfessionalMark,
  listProfessionalTemplates,
} from '../controllers/professionalMarksController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/templates', authenticate, listProfessionalTemplates);
router.post('/', authenticate, createProfessionalMark);

export default router;
