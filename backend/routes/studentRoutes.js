import { Router } from 'express';
import {
  createStudent,
  getDashboardStats,
  getDueBoard,
  getStudentById,
  getStudentMarkingContext,
  getStudents,
  updateStudent,
  deleteStudent,
} from '../controllers/studentsController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getStudents);
router.post('/', authenticate, authorize('ADMIN'), createStudent);
router.get('/dashboard/stats', authenticate, getDashboardStats);
router.get('/due-board', authenticate, getDueBoard);
router.get('/:id/marking-context', authenticate, getStudentMarkingContext);
router.get('/:id', authenticate, getStudentById);
router.patch('/:id', authenticate, authorize('ADMIN'), updateStudent);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteStudent);

export default router;
