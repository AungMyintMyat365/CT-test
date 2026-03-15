import { z } from 'zod';
import { formatISO, startOfDay } from 'date-fns';
import { getNextAssessment } from '../services/assessmentLogicService.js';
import {
  AssessmentType,
  buildAssessmentSeed,
  deriveJoinDate,
} from '../services/assessmentSeedService.js';
import { bumpCacheVersion, withCache } from '../services/cacheService.js';
import { supabase } from '../services/supabaseClient.js';

const assessmentTypeSchema = z.enum([
  'INITIAL_CT',
  'INITIAL_CT_SECOND',
  'PROFESSIONAL',
  'DEVELOPMENT_CT',
]);

const createStudentSchema = z
  .object({
    name: z.string().min(2),
    join_date: z.string().date().optional(),
    latest_assessment_date: z.string().date().optional(),
    latest_assessment_type: assessmentTypeSchema.optional(),
    streamline: z.string().min(1),
    coach: z.string().min(1),
    coach_email: z.string().email(),
    professional_level_completed_at: z.string().date().optional(),
  })
  .refine((data) => data.join_date || data.latest_assessment_date, {
    message: 'Join date or latest assessment date is required.',
    path: ['join_date'],
  })
  .refine((data) => !data.latest_assessment_date || data.latest_assessment_type, {
    message: 'Latest assessment type is required when date is provided.',
    path: ['latest_assessment_type'],
  })
  .refine((data) => !data.latest_assessment_type || data.latest_assessment_date, {
    message: 'Latest assessment date is required when type is provided.',
    path: ['latest_assessment_date'],
  });

const updateStudentSchema = z.object({
  professional_level_completed_at: z.string().date().nullable().optional(),
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
    const { search, coach, streamline, page, pageSize, status } = req.query;
    const pageNum = Math.max(1, Number(page || 1));
    const pageSizeNum = Math.min(100, Math.max(1, Number(pageSize || 20)));
    const usePagination = Boolean(page || pageSize);
    const statusFilter = String(status || '').trim().toUpperCase();

    const cacheIdentity = `${req.user.role}:${req.user.email || ''}`;
    const payload = await withCache({
      namespace: 'students:list',
      identity: cacheIdentity,
      params: { search, coach, streamline, page: pageNum, pageSize: pageSizeNum, status: statusFilter },
      compute: async () => {
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

        if (statusFilter) {
          const todayIso = new Date().toISOString().slice(0, 10);
          if (statusFilter === 'DUE') {
            query = query.lte('next_assessment_date', todayIso);
          } else if (statusFilter === 'UPCOMING') {
            query = query.gt('next_assessment_date', todayIso);
          } else if (statusFilter === 'UNKNOWN') {
            query = query.is('next_assessment_date', null);
          }
        }

        if (usePagination) {
          const from = (pageNum - 1) * pageSizeNum;
          const to = from + pageSizeNum - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const today = new Date();
        const items = (data || []).map((student) => {
          const nextDate = student.next_assessment_date ? new Date(student.next_assessment_date) : null;
          const statusValue = !nextDate ? 'UNKNOWN' : nextDate > today ? 'UPCOMING' : 'DUE';
          return {
            ...student,
            status: statusValue,
          };
        });

        if (!usePagination) {
          return items;
        }

        const total = Number(count || 0);
        const totalPages = Math.max(1, Math.ceil(total / pageSizeNum));

        return {
          items,
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            total,
            totalPages,
          },
        };
      },
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const body = createStudentSchema.parse(req.body);
    const latestAssessmentType = body.latest_assessment_type;
    const latestAssessmentDate = body.latest_assessment_date;

    let joinDate = body.join_date;
    if (!joinDate && latestAssessmentType && latestAssessmentDate) {
      joinDate = deriveJoinDate(latestAssessmentType, latestAssessmentDate);
    }
    if (!joinDate) {
      return res.status(400).json({ message: 'Join date is required.' });
    }

    const { data: coachUser, error: coachError } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.coach_email.toLowerCase())
      .maybeSingle();
    if (coachError) throw coachError;

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        name: body.name,
        join_date: joinDate,
        streamline: body.streamline,
        coach: body.coach,
        coach_email: body.coach_email.toLowerCase(),
        coach_id: coachUser?.id || null,
        next_assessment_type: latestAssessmentType ? null : 'INITIAL_CT',
        next_assessment_date: latestAssessmentType ? null : joinDate,
        professional_level_completed_at:
          body.professional_level_completed_at ||
          (latestAssessmentType === AssessmentType.PROFESSIONAL ? latestAssessmentDate : null),
      })
      .select('*')
      .single();

    if (error) throw error;

    if (latestAssessmentType && latestAssessmentDate) {
      const seed = buildAssessmentSeed({
        latestType: latestAssessmentType,
        latestDate: latestAssessmentDate,
      });

      if (seed.length > 0) {
        const { error: seedError } = await supabase.from('assessments').insert(
          seed.map((item) => ({
            student_id: student.id,
            assessment_type: item.assessment_type,
            date: item.date,
            score: 0,
            coach: body.coach,
          })),
        );
        if (seedError) throw seedError;
      }
    }

    const updated = await withNextAssessment(student);
    await bumpCacheVersion();

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
        'id, name, streamline, coach, coach_email, next_assessment_type, next_assessment_date, join_date, professional_level_completed_at',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (req.user.role === 'COACH' && student.coach_email !== req.user.email) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    const { data: assessments, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('student_id', id);
    if (assessmentError) throw assessmentError;

    const next = getNextAssessment({
      joinDate: student.join_date,
      professionalLevelCompletedAt: student.professional_level_completed_at,
      assessments: assessments || [],
    });

    return res.json({
      ...student,
      next_assessment_type: next.nextAssessmentType,
      next_assessment_date: next.nextAssessmentDate
        ? new Date(next.nextAssessmentDate).toISOString().slice(0, 10)
        : null,
    });
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

export const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase.from('students').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await bumpCacheVersion();
    return res.json({ id });
  } catch (error) {
    return next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = updateStudentSchema.parse(req.body);

    const { data: student, error } = await supabase
      .from('students')
      .update({
        professional_level_completed_at: payload.professional_level_completed_at ?? null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const updated = await withNextAssessment(student);
    await bumpCacheVersion();
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

export const getDueBoard = async (req, res, next) => {
  try {
    const cacheIdentity = `${req.user.role}:${req.user.email || ''}`;
    const payload = await withCache({
      namespace: 'students:due-board',
      identity: cacheIdentity,
      params: {},
      compute: async () => {
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

        return {
          board,
          totals: {
            overdue: board.overdue.length,
            dueThisWeek: board.dueThisWeek.length,
            upcoming: board.upcoming.length,
            noDate: board.noDate.length,
          },
        };
      },
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const cacheIdentity = `${req.user.role}:${req.user.email || ''}`;
    const payload = await withCache({
      namespace: 'students:dashboard',
      identity: cacheIdentity,
      params: {},
      compute: async () => {
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

        return {
          totalStudents: totalStudents || 0,
          completedAssessments: totalAssessments || 0,
          dueAssessments: dueCount,
          upcomingAssessments: upcomingCount,
        };
      },
    });

    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};
