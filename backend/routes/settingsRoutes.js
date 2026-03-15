import { Router } from 'express';
import {
  getGoogleSheetsConfig,
  updateGoogleSheetsConfig,
} from '../controllers/settingsController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/google-sheets', authenticate, authorize('ADMIN'), getGoogleSheetsConfig);
router.put('/google-sheets', authenticate, authorize('ADMIN'), updateGoogleSheetsConfig);

export default router;
