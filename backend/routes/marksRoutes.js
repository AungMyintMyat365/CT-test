import { Router } from 'express';
import { createMark, listSyncFailures, retryMarkSync } from '../controllers/marksController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createMark);
router.get('/sync-failures', authenticate, listSyncFailures);
router.post('/:id/retry-sync', authenticate, retryMarkSync);

export default router;
