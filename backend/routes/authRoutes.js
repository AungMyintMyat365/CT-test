import { Router } from 'express';
import { googleLogin, localAdminLogin, localLogin, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/google', authRateLimiter, googleLogin);
router.post('/admin-login', authRateLimiter, localAdminLogin);
router.post('/local-login', authRateLimiter, localLogin);
router.get('/me', authenticate, me);

export default router;
