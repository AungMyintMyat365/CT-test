import { Router } from 'express';
import { createMark } from '../controllers/marksController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createMark);

export default router;
