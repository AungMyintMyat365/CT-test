import { Router } from 'express';
import { listProfessionalMarksForCanva } from '../controllers/canvaController.js';

const router = Router();

router.get('/professional-marks', listProfessionalMarksForCanva);

export default router;
