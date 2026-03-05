import { Router } from 'express';
import {
  createStudent,
  getDashboardStats,
  getStudentById,
  getStudents,
} from '../controllers/studentsController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getStudents);
router.post('/', authenticate, authorize('ADMIN'), createStudent);
router.get('/dashboard/stats', authenticate, getDashboardStats);
router.get('/:id', authenticate, getStudentById);

export default router;
