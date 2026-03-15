import { Router } from 'express';
import { createMark, listSyncFailures, retryMarkSync, updateMark } from '../controllers/marksController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authenticate, createMark);
router.patch('/:id', authenticate, updateMark);
router.get('/sync-failures', authenticate, listSyncFailures);
router.post('/:id/retry-sync', authenticate, retryMarkSync);

export default router;
