import { z } from 'zod';
import { endOfMonth, formatISO, startOfDay, startOfMonth } from 'date-fns';
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
    const { search, coach, streamline, page, pageSize } = req.query;
    const pageNum = Math.max(1, Number(page || 1));
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize || 20)));
    const usePagination = Boolean(page || pageSize);

    let query = supabase.from('students');
    if (usePagination) {
      query = query.select(
        'id, name, streamline, coach, coach_email, next_assessment_type, next_assessment_date, join_date, created_at',
        { count: 'exact' },
      );
    } else {
      query = query.select(
        'id, name, streamline, coach, coach_email, next_assessment_type, next_assessment_date, join_date, created_at',
      );
    }
    query = query.order('created_at', { ascending: false });

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

    if (usePagination) {
      const from = (pageNum - 1) * pageSizeNum;
      const to = from + pageSizeNum - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

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

    if (!usePagination) {
      return res.json(payload);
    }

    const total = Number(count || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSizeNum));

    return res.json({
      items: payload,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages,
      },
    });
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

export const getStudentMarkingContext = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: student, error } = await supabase
      .from('students')
      .select(
        'id, name, streamline, coach, coach_email, next_assessment_type, next_assessment_date, join_date',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (req.user.role === 'COACH' && student.coach_email !== req.user.email) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    return res.json(student);
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

export const getDueBoard = async (req, res, next) => {
  try {
    let query = supabase
      .from('students')
      .select(
        'id, name, streamline, coach, coach_email, next_assessment_date, next_assessment_type, join_date',
      );

    if (req.user.role === 'COACH') {
      query = query.eq('coach_email', req.user.email);
    }

    const { data: students, error } = await query;
    if (error) throw error;

    const today = startOfDay(new Date());
    const dueIn7Days = new Date(today);
    dueIn7Days.setDate(today.getDate() + 7);

    const board = {
      overdue: [],
      dueThisWeek: [],
      upcoming: [],
      noDate: [],
    };

    for (const student of students || []) {
      const nextDate = student.next_assessment_date ? new Date(student.next_assessment_date) : null;
      if (!nextDate) {
        board.noDate.push(student);
        continue;
      }

      if (nextDate < today) {
        board.overdue.push(student);
      } else if (nextDate <= dueIn7Days) {
        board.dueThisWeek.push(student);
      } else {
        board.upcoming.push(student);
      }
    }

    return res.json({
      board,
      totals: {
        overdue: board.overdue.length,
        dueThisWeek: board.dueThisWeek.length,
        upcoming: board.upcoming.length,
        noDate: board.noDate.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getCoachKpi = async (req, res, next) => {
  try {
    let assessmentsQuery = supabase
      .from('assessments')
      .select('id, coach, score, date, student_id')
      .order('date', { ascending: false });

    let studentsQuery = supabase
      .from('students')
      .select('id, coach, coach_email, next_assessment_date');

    if (req.user.role === 'COACH') {
      assessmentsQuery = assessmentsQuery.eq('coach', req.user.name);
      studentsQuery = studentsQuery.eq('coach_email', req.user.email);
    }

    const [
      { data: assessments, error: assessmentsError },
      { data: students, error: studentsError },
    ] = await Promise.all([assessmentsQuery, studentsQuery]);
    if (assessmentsError) throw assessmentsError;
    if (studentsError) throw studentsError;

    const monthStart = startOfMonth(new Date()).toISOString().slice(0, 10);
    const monthEnd = endOfMonth(new Date()).toISOString().slice(0, 10);
    const todayIso = formatISO(startOfDay(new Date()), { representation: 'date' });

    const dueByCoach = {};
    for (const student of students || []) {
      if (!student.next_assessment_date || student.next_assessment_date > todayIso) continue;
      dueByCoach[student.coach] = (dueByCoach[student.coach] || 0) + 1;
    }

    const grouped = {};
    for (const item of assessments || []) {
      if (!grouped[item.coach]) {
        grouped[item.coach] = {
          coach: item.coach,
          totalAssessments: 0,
          scoreTotal: 0,
          assessmentsThisMonth: 0,
          activeStudents: new Set(),
        };
      }

      grouped[item.coach].totalAssessments += 1;
      grouped[item.coach].scoreTotal += item.score || 0;
      grouped[item.coach].activeStudents.add(item.student_id);
      if (item.date >= monthStart && item.date <= monthEnd) {
        grouped[item.coach].assessmentsThisMonth += 1;
      }
    }

    const kpis = Object.values(grouped).map((item) => ({
      coach: item.coach,
      totalAssessments: item.totalAssessments,
      avgScore: Number((item.scoreTotal / Math.max(1, item.totalAssessments)).toFixed(2)),
      assessmentsThisMonth: item.assessmentsThisMonth,
      activeStudents: item.activeStudents.size,
      dueStudents: dueByCoach[item.coach] || 0,
    }));

    return res.json(
      kpis.sort((a, b) => {
        if (b.assessmentsThisMonth !== a.assessmentsThisMonth) {
          return b.assessmentsThisMonth - a.assessmentsThisMonth;
        }
        return b.avgScore - a.avgScore;
      }),
    );
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
