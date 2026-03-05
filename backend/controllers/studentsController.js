import { z } from 'zod';
import { getNextAssessment } from '../services/assessmentLogicService.js';
import { supabase } from '../services/supabaseClient.js';

const createStudentSchema = z.object({
  name: z.string().min(2),
  join_date: z.string().date(),
  streamline: z.string().min(1),
  coach: z.string().min(1),
  coach_email: z.string().email(),
  professional_level_completed_at: z.string().date().optional(),
});

const withNextAssessment = async (student) => {
  const { data: assessments, error: assessmentError } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', student.id);

  if (assessmentError) throw assessmentError;

  const next = getNextAssessment({
    joinDate: student.join_date,
    professionalLevelCompletedAt: student.professional_level_completed_at,
    assessments: assessments || [],
  });

  const { data: updatedStudent, error: updateError } = await supabase
    .from('students')
    .update({
      next_assessment_date: next.nextAssessmentDate
        ? new Date(next.nextAssessmentDate).toISOString().slice(0, 10)
        : null,
      next_assessment_type: next.nextAssessmentType,
    })
    .eq('id', student.id)
    .select('*')
    .single();

  if (updateError) throw updateError;

  return {
    ...updatedStudent,
    next_assessment_status: next.status,
  };
};

export const getStudents = async (req, res, next) => {
  try {
    const { search, coach, streamline } = req.query;

    let query = supabase
      .from('students')
      .select('*, assessments(id, assessment_type, date, score), marks(*)')
      .order('created_at', { ascending: false });

    if (req.user.role === 'COACH') {
      query = query.eq('coach_email', req.user.email);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (coach) {
      query = query.eq('coach', coach);
    }

    if (streamline) {
      query = query.eq('streamline', streamline);
    }

    const { data, error } = await query;

    if (error) throw error;

    const today = new Date();
    const payload = (data || []).map((student) => {
      const nextDate = student.next_assessment_date ? new Date(student.next_assessment_date) : null;
      const status = !nextDate ? 'UNKNOWN' : nextDate > today ? 'UPCOMING' : 'DUE';
      return {
        ...student,
        status,
      };
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const body = createStudentSchema.parse(req.body);

    const { data: coachUser, error: coachError } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.coach_email.toLowerCase())
      .maybeSingle();
    if (coachError) throw coachError;

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        ...body,
        coach_email: body.coach_email.toLowerCase(),
        coach_id: coachUser?.id || null,
        next_assessment_type: 'INITIAL_CT',
        next_assessment_date: body.join_date,
      })
      .select('*')
      .single();

    if (error) throw error;

    const updated = await withNextAssessment(student);

    return res.status(201).json(updated);
  } catch (error) {
    return next(error);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: student, error } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (req.user.role === 'COACH' && student.coach_email !== req.user.email) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    const [{ data: assessments, error: assessmentError }, { data: marks, error: marksError }] = await Promise.all([
      supabase
        .from('assessments')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: true }),
      supabase.from('marks').select('*').eq('student_id', id).order('created_at', { ascending: true }),
    ]);

    if (assessmentError) throw assessmentError;
    if (marksError) throw marksError;

    const next = getNextAssessment({
      joinDate: student.join_date,
      professionalLevelCompletedAt: student.professional_level_completed_at,
      assessments: assessments || [],
    });

    return res.json({
      ...student,
      assessments: assessments || [],
      marks: marks || [],
      next_assessment_status: next.status,
      next_assessment_type: next.nextAssessmentType,
      next_assessment_date: next.nextAssessmentDate
        ? new Date(next.nextAssessmentDate).toISOString().slice(0, 10)
        : null,
    });
  } catch (error) {
    return next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    let totalStudentsQuery = supabase.from('students').select('*', { count: 'exact', head: true });
    let studentsQuery = supabase.from('students').select('id, next_assessment_date');
    let totalAssessmentsQuery = supabase.from('assessments').select('*', { count: 'exact', head: true });

    if (req.user.role === 'COACH') {
      totalStudentsQuery = totalStudentsQuery.eq('coach_email', req.user.email);
      studentsQuery = studentsQuery.eq('coach_email', req.user.email);
      totalAssessmentsQuery = totalAssessmentsQuery.eq('coach', req.user.name);
    }

    const [
      { count: totalStudents, error: totalError },
      { data: students, error: studentsError },
      { count: totalAssessments, error: assessmentError },
    ] = await Promise.all([totalStudentsQuery, studentsQuery, totalAssessmentsQuery]);

    if (totalError) throw totalError;
    if (studentsError) throw studentsError;
    if (assessmentError) throw assessmentError;

    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const dueCount = (students || []).filter((student) => {
      if (!student.next_assessment_date) return false;
      return new Date(student.next_assessment_date) <= today;
    }).length;

    const upcomingCount = (students || []).filter((student) => {
      if (!student.next_assessment_date) return false;
      const nextDate = new Date(student.next_assessment_date);
      return nextDate > today && nextDate <= in30Days;
    }).length;

    return res.json({
      totalStudents: totalStudents || 0,
      completedAssessments: totalAssessments || 0,
      dueAssessments: dueCount,
      upcomingAssessments: upcomingCount,
    });
  } catch (error) {
    return next(error);
  }
};
