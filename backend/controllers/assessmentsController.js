import { z } from 'zod';
import { getNextAssessment } from '../services/assessmentLogicService.js';
import { supabase } from '../services/supabaseClient.js';

const assessmentSchema = z.object({
  student_id: z.string().uuid(),
  assessment_type: z.enum(['INITIAL_CT', 'INITIAL_CT_SECOND', 'PROFESSIONAL', 'DEVELOPMENT_CT']),
  date: z.string().date(),
  score: z.number().int().min(0).max(100),
  coach: z.string().min(1),
});

const refreshStudentNextAssessment = async (studentId) => {
  const [{ data: student, error: studentError }, { data: assessments, error: assessmentsError }] =
    await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('assessments').select('*').eq('student_id', studentId),
    ]);

  if (studentError) throw studentError;
  if (assessmentsError) throw assessmentsError;

  const next = getNextAssessment({
    joinDate: student.join_date,
    professionalLevelCompletedAt: student.professional_level_completed_at,
    assessments,
  });

  const { error: updateError } = await supabase
    .from('students')
    .update({
      next_assessment_type: next.nextAssessmentType,
      next_assessment_date: next.nextAssessmentDate
        ? new Date(next.nextAssessmentDate).toISOString().slice(0, 10)
        : null,
    })
    .eq('id', studentId);

  if (updateError) throw updateError;
};

export const getAssessments = async (req, res, next) => {
  try {
    let query = supabase
      .from('assessments')
      .select('*, students!inner(id, name, streamline, coach, coach_email)')
      .order('date', { ascending: false });

    if (req.user.role === 'COACH') {
      query = query.eq('students.coach_email', req.user.email);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
};

export const createAssessment = async (req, res, next) => {
  try {
    const payload = assessmentSchema.parse(req.body);

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, coach_email')
      .eq('id', payload.student_id)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (req.user.role === 'COACH' && student.coach_email !== req.user.email) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    const { data, error } = await supabase.from('assessments').insert(payload).select('*').single();

    if (error) throw error;

    await refreshStudentNextAssessment(payload.student_id);

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
};
