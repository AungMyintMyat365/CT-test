import { z } from 'zod';
import { getNextAssessment } from '../services/assessmentLogicService.js';
import { bumpCacheVersion } from '../services/cacheService.js';
import { supabase } from '../services/supabaseClient.js';
import {
  enqueueRedisSyncJob,
  getSyncFailures,
  isRedisQueueEnabled,
  queueMarkSync,
  syncMarkNow,
} from '../services/sheetSyncQueueService.js';
import { recordMarkAudit } from '../services/auditService.js';
import { env } from '../config/env.js';

const marksSchema = z
  .object({
    student_id: z.string().uuid(),
    assessment_type: z.enum(['INITIAL_CT', 'INITIAL_CT_SECOND', 'PROFESSIONAL', 'DEVELOPMENT_CT']),
    sequencing_debugging_score: z.number().int().min(0).max(59),
    decomposition_score: z.number().int().min(0).max(59),
    abstraction_score: z.number().int().min(0).max(59),
    pattern_recognition_score: z.number().int().min(0).max(59),
    assessor: z.string().min(1).optional(),
    coach: z.string().min(1).optional(),
    coder_id: z.string().optional(),
    campus_code: z.string().optional(),
    candidate: z.string().optional(),
    age: z.number().int().min(0).max(99).optional(),
    email: z.string().email().optional(),
    level: z.string().optional(),
    send_report: z.union([z.literal('TRUE'), z.literal('FALSE')]).optional(),
    status: z.string().optional(),
    date: z.string().date().optional(),
  })
  .refine((payload) => Boolean(payload.assessor || payload.coach), {
    message: 'Assessor is required',
  });

const retrySchema = z.object({
  mark_id: z.string().uuid().optional(),
});

const insertMark = async ({ payload, assessorName, total, tpScore }) => {
  const { data: newSchemaMark, error: newSchemaError } = await supabase
    .from('marks')
    .insert({
      student_id: payload.student_id,
      assessment_type: payload.assessment_type,
      sequencing_debugging_score: payload.sequencing_debugging_score,
      decomposition_score: payload.decomposition_score,
      abstraction_score: payload.abstraction_score,
      pattern_recognition_score: payload.pattern_recognition_score,
      coach: assessorName,
      total_score: total,
      tp_score: tpScore,
      sheet_sync_status: 'PENDING',
    })
    .select('*')
    .single();

  if (!newSchemaError) {
    return newSchemaMark;
  }

  const isMissingNewScoreColumns =
    newSchemaError.code === 'PGRST204' &&
    [
      'sequencing_debugging_score',
      'decomposition_score',
      'abstraction_score',
      'pattern_recognition_score',
      'tp_score',
    ].some((column) => newSchemaError.message?.includes(column));

  if (!isMissingNewScoreColumns) {
    throw newSchemaError;
  }

  const { data: legacySchemaMark, error: legacySchemaError } = await supabase
    .from('marks')
    .insert({
      student_id: payload.student_id,
      assessment_type: payload.assessment_type,
      logic_score: payload.sequencing_debugging_score,
      pattern_score: payload.pattern_recognition_score,
      algorithm_score: payload.decomposition_score,
      problem_score: payload.abstraction_score,
      total_score: total,
      coach: assessorName,
      sheet_sync_status: 'PENDING',
    })
    .select('*')
    .single();

  if (legacySchemaError) throw legacySchemaError;
  return legacySchemaMark;
};

const refreshStudentNextAssessment = async ({ student, studentId }) => {
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId);

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

export const createMark = async (req, res, next) => {
  try {
    const payload = marksSchema.parse(req.body);

    const total =
      payload.sequencing_debugging_score +
      payload.decomposition_score +
      payload.abstraction_score +
      payload.pattern_recognition_score;
    const tpScore = Number(((total / 59) * 100).toFixed(2));
    const date = payload.date || new Date().toISOString().slice(0, 10);
    const assessorName = payload.assessor || payload.coach;

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', payload.student_id)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    if (req.user.role === 'COACH' && student.coach_email !== req.user.email) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    const mark = await insertMark({
      payload,
      assessorName,
      total,
      tpScore,
    });

    const { error: assessmentError } = await supabase.from('assessments').insert({
      student_id: payload.student_id,
      assessment_type: payload.assessment_type,
      date,
      score: Math.round(tpScore),
      coach: assessorName,
    });

    if (assessmentError) throw assessmentError;

    const sheetPayload = {
      assessmentType: payload.assessment_type,
      assessor: assessorName,
      coderId: payload.coder_id,
      campusCode: payload.campus_code,
      candidate: payload.candidate || student.name,
      age: payload.age,
      email: payload.email,
      level: payload.level || student.streamline,
      sequencingDebuggingScore: payload.sequencing_debugging_score,
      decompositionScore: payload.decomposition_score,
      abstractionScore: payload.abstraction_score,
      patternRecognitionScore: payload.pattern_recognition_score,
      totalScore: total,
      tpScore,
      sendReport: payload.send_report || 'FALSE',
      status: payload.status || 'UNSEND',
      date,
    };

    await queueMarkSync({
      markId: mark.id,
      payload: sheetPayload,
      maxAttempts: env.sheetSyncMaxAttempts,
    });

    const syncResult = await syncMarkNow({
      markId: mark.id,
      payload: sheetPayload,
      actorName: req.user.name,
      actorEmail: req.user.email,
      maxAttempts: env.sheetSyncMaxAttempts,
      retryDelayMinutes: env.sheetSyncRetryDelayMinutes,
    });

    if (!syncResult.synced && syncResult.willRetry && isRedisQueueEnabled()) {
      const remainingAttempts = Math.max(0, env.sheetSyncMaxAttempts - syncResult.attemptCount);
      if (remainingAttempts > 0) {
        try {
          await enqueueRedisSyncJob({ markId: mark.id, attemptsRemaining: remainingAttempts });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to enqueue Redis sync job', error.message);
        }
      }
    }

    await recordMarkAudit({
      markId: mark.id,
      studentId: payload.student_id,
      action: 'MARK_CREATED',
      newPayload: {
        assessment_type: payload.assessment_type,
        total_score: total,
        tp_score: tpScore,
        sheet_status: syncResult.status,
      },
      actorName: req.user.name,
      actorEmail: req.user.email,
    });

    await refreshStudentNextAssessment({
      student,
      studentId: payload.student_id,
    });

    await bumpCacheVersion();
    return res.status(syncResult.synced ? 201 : 202).json({
      ...mark,
      total_score: total,
      tp_score: tpScore,
      sheet_status: syncResult.status,
      sheet_error: syncResult.errorMessage || null,
      queued_retry: !syncResult.synced,
    });
  } catch (error) {
    return next(error);
  }
};

export const listSyncFailures = async (req, res, next) => {
  try {
    const failures = await getSyncFailures({
      role: req.user.role,
      coachEmail: req.user.email,
    });

    return res.json(failures);
  } catch (error) {
    return next(error);
  }
};

export const retryMarkSync = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = retrySchema.parse(req.body || {});
    const markId = body.mark_id || id;

    const { data: mark, error: markError } = await supabase
      .from('marks')
      .select('id, student_id')
      .eq('id', markId)
      .maybeSingle();
    if (markError) throw markError;
    if (!mark) return res.status(404).json({ message: 'Mark not found' });

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, coach_email')
      .eq('id', mark.student_id)
      .maybeSingle();
    if (studentError) throw studentError;
    if (req.user.role === 'COACH' && student?.coach_email !== req.user.email) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    const result = await syncMarkNow({
      markId,
      actorName: req.user.name,
      actorEmail: req.user.email,
      maxAttempts: env.sheetSyncMaxAttempts,
      retryDelayMinutes: env.sheetSyncRetryDelayMinutes,
    });

    if (!result.synced && result.willRetry && isRedisQueueEnabled()) {
      const remainingAttempts = Math.max(0, env.sheetSyncMaxAttempts - result.attemptCount);
      if (remainingAttempts > 0) {
        try {
          await enqueueRedisSyncJob({ markId, attemptsRemaining: remainingAttempts });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to enqueue Redis sync job', error.message);
        }
      }
    }

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};
