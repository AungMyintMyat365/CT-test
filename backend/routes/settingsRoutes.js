import { Router } from 'express';
import {
  getGoogleSheetsConfig,
  testGoogleSheetsConfig,
  updateGoogleSheetsConfig,
} from '../controllers/settingsController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/google-sheets', authenticate, authorize('ADMIN'), getGoogleSheetsConfig);
router.get('/google-sheets/test', authenticate, authorize('ADMIN'), testGoogleSheetsConfig);
router.put('/google-sheets', authenticate, authorize('ADMIN'), updateGoogleSheetsConfig);

export default router;
