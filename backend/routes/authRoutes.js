import { Router } from 'express';
import { googleLogin, localAdminLogin, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/google', googleLogin);
router.post('/admin-login', localAdminLogin);
router.get('/me', authenticate, me);

export default router;
