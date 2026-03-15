import { Router } from 'express';
import { googleLogin, localAdminLogin, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/google', authRateLimiter, googleLogin);
router.post('/admin-login', authRateLimiter, localAdminLogin);
router.get('/me', authenticate, me);

export default router;
