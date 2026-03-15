import { addMinutes } from 'date-fns';
import { Queue, JobScheduler, Worker } from 'bullmq';
import { appendMarkToSheet } from './googleSheetsService.js';
import { env } from '../config/env.js';
import { supabase } from './supabaseClient.js';
import { recordMarkAudit } from './auditService.js';
import { getRedis, isRedisEnabled } from './redisClient.js';

const QUEUE_TABLE = 'sheet_sync_jobs';
const QUEUE_NAME = 'sheet-sync';

let sheetQueue = null;
let sheetScheduler = null;
let sheetWorker = null;

export const isRedisQueueEnabled = () => env.sheetSyncQueueMode === 'redis' && isRedisEnabled();

const getSheetQueue = () => {
  if (!isRedisQueueEnabled()) return null;
  if (sheetQueue) return sheetQueue;

  const connection = getRedis();
  if (!connection) return null;

  sheetQueue = new Queue(QUEUE_NAME, { connection });
  sheetScheduler = new JobScheduler(QUEUE_NAME, { connection });
  return sheetQueue;
};

const isMissingQueueTable = (error) => {
  if (!error) return false;
  const message = `${error.message || ''} ${error.details || ''}`;
  return error.code === '42P01' || error.code === 'PGRST205' || message.includes(QUEUE_TABLE);
};

const buildFallbackPayload = (mark, student) => {
  const sequencing = mark.sequencing_debugging_score ?? mark.logic_score ?? 0;
  const decomposition = mark.decomposition_score ?? mark.algorithm_score ?? 0;
  const abstraction = mark.abstraction_score ?? mark.problem_score ?? 0;
  const pattern = mark.pattern_recognition_score ?? mark.pattern_score ?? 0;
  const total = mark.total_score ?? sequencing + decomposition + abstraction + pattern;
  const tp = mark.tp_score ?? Number(((total / 59) * 100).toFixed(2));

  return {
    assessmentType: mark.assessment_type,
    date: mark.created_at ? String(mark.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    assessor: mark.coach || student?.coach || '',
    coderId: '',
    campusCode: '',
    candidate: student?.name || '',
    age: '',
    email: student?.coach_email || '',
    level: student?.streamline || '',
    sequencingDebuggingScore: sequencing,
    decompositionScore: decomposition,
    abstractionScore: abstraction,
    patternRecognitionScore: pattern,
    totalScore: total,
    tpScore: tp,
    sendReport: 'FALSE',
    status: 'UNSEND',
  };
};

const updateMarkSyncState = async ({ markId, status, errorMessage = null }) => {
  const patch = {
    sheet_sync_status: status,
    sheet_sync_error: errorMessage,
    sheet_synced_at: status === 'SYNCED' ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from('marks').update(patch).eq('id', markId);
  if (error && error.code !== 'PGRST204') {
    throw error;
  }
};

export const queueMarkSync = async ({ markId, payload, maxAttempts = 5 }) => {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(QUEUE_TABLE)
    .upsert(
      {
        mark_id: markId,
        payload,
        status: 'PENDING',
        attempt_count: 0,
        max_attempts: maxAttempts,
        last_error: null,
        next_retry_at: nowIso,
        locked_at: null,
      },
      { onConflict: 'mark_id' },
    )
    .select('*')
    .single();

  if (error) {
    if (isMissingQueueTable(error)) return null;
    throw error;
  }

  return data;
};

export const enqueueRedisSyncJob = async ({ markId, attemptsRemaining }) => {
  if (!isRedisQueueEnabled()) return null;

  const queue = getSheetQueue();
  if (!queue) return null;

  const attempts = Math.max(1, Number(attemptsRemaining || env.sheetSyncMaxAttempts));
  const delayMs = env.sheetSyncRetryDelayMinutes * 60 * 1000;

  return queue.add(
    'sync',
    { markId },
    {
      jobId: markId,
      attempts,
      backoff: { type: 'exponential', delay: delayMs },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
};

const getJobWithDependencies = async (markId) => {
  const [{ data: job, error: jobError }, { data: mark, error: markError }] = await Promise.all([
    supabase.from(QUEUE_TABLE).select('*').eq('mark_id', markId).maybeSingle(),
    supabase.from('marks').select('*').eq('id', markId).maybeSingle(),
  ]);

  if (jobError && !isMissingQueueTable(jobError)) throw jobError;
  if (markError) throw markError;
  if (!mark) throw new Error('Mark not found for sync');

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, name, streamline, coach, coach_email')
    .eq('id', mark.student_id)
    .maybeSingle();

  if (studentError) throw studentError;

  return {
    job,
    mark,
    student,
  };
};

const upsertJobResult = async ({
  existingJob,
  markId,
  status,
  attemptCount,
  maxAttempts,
  lastError,
  payload,
  nextRetryAt,
}) => {
  const { error } = await supabase.from(QUEUE_TABLE).upsert(
    {
      id: existingJob?.id,
      mark_id: markId,
      payload,
      status,
      attempt_count: attemptCount,
      max_attempts: maxAttempts,
      last_error: lastError,
      next_retry_at: nextRetryAt,
      locked_at: null,
    },
    { onConflict: 'mark_id' },
  );

  if (error && !isMissingQueueTable(error)) throw error;
};

export const syncMarkNow = async ({
  markId,
  payload,
  actorName,
  actorEmail,
  maxAttempts = 5,
  retryDelayMinutes = 5,
}) => {
  const { job, mark, student } = await getJobWithDependencies(markId);

  const currentAttempt = (job?.attempt_count || 0) + 1;
  const limitAttempts = job?.max_attempts || maxAttempts;
  const sheetPayload = payload || job?.payload || buildFallbackPayload(mark, student);

  await upsertJobResult({
    existingJob: job,
    markId,
    status: 'RUNNING',
    attemptCount: currentAttempt,
    maxAttempts: limitAttempts,
    lastError: null,
    payload: sheetPayload,
    nextRetryAt: null,
  });

  try {
    await appendMarkToSheet(sheetPayload);
    await updateMarkSyncState({
      markId,
      status: 'SYNCED',
      errorMessage: null,
    });

    await upsertJobResult({
      existingJob: job,
      markId,
      status: 'SUCCESS',
      attemptCount: currentAttempt,
      maxAttempts: limitAttempts,
      lastError: null,
      payload: sheetPayload,
      nextRetryAt: null,
    });

    await recordMarkAudit({
      markId,
      studentId: mark.student_id,
      action: 'SHEET_SYNC_SUCCESS',
      newPayload: { attempt: currentAttempt },
      actorName,
      actorEmail,
    });

    return {
      synced: true,
      status: 'SYNCED',
      attemptCount: currentAttempt,
    };
  } catch (error) {
    const willRetry = currentAttempt < limitAttempts;
    const nextRetry = willRetry
      ? addMinutes(new Date(), retryDelayMinutes * currentAttempt).toISOString()
      : null;

    await updateMarkSyncState({
      markId,
      status: 'FAILED',
      errorMessage: error.message?.slice(0, 500) || 'Unknown Google Sheets error',
    });

    await upsertJobResult({
      existingJob: job,
      markId,
      status: 'FAILED',
      attemptCount: currentAttempt,
      maxAttempts: limitAttempts,
      lastError: error.message?.slice(0, 500) || 'Unknown Google Sheets error',
      payload: sheetPayload,
      nextRetryAt: nextRetry,
    });

    await recordMarkAudit({
      markId,
      studentId: mark.student_id,
      action: 'SHEET_SYNC_FAILED',
      newPayload: {
        attempt: currentAttempt,
        willRetry,
        error: error.message?.slice(0, 500) || 'Unknown Google Sheets error',
      },
      actorName,
      actorEmail,
    });

    return {
      synced: false,
      status: 'FAILED',
      attemptCount: currentAttempt,
      willRetry,
      errorMessage: error.message,
    };
  }
};

export const startRedisSyncWorker = () => {
  if (!isRedisQueueEnabled()) return null;
  if (sheetWorker) return sheetWorker;

  const connection = getRedis();
  if (!connection) return null;

  getSheetQueue();

  sheetWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const result = await syncMarkNow({
        markId: job.data.markId,
        actorName: 'REDIS_WORKER',
        actorEmail: 'system@local',
        maxAttempts: env.sheetSyncMaxAttempts,
        retryDelayMinutes: env.sheetSyncRetryDelayMinutes,
      });

      if (!result.synced) {
        throw new Error(result.errorMessage || 'Sheet sync failed');
      }

      return result;
    },
    { connection, concurrency: env.sheetSyncWorkerConcurrency },
  );

  sheetWorker.on('failed', (job, error) => {
    // eslint-disable-next-line no-console
    console.error(`Sheet sync job ${job?.id || 'unknown'} failed`, error?.message);
  });

  return sheetWorker;
};

export const processPendingSyncJobs = async ({ limit = 10, retryDelayMinutes = 5 } = {}) => {
  if (isRedisQueueEnabled()) {
    return { processed: 0, success: 0, failed: 0 };
  }

  const nowIso = new Date().toISOString();
  const { data: jobs, error } = await supabase
    .from(QUEUE_TABLE)
    .select('*')
    .in('status', ['PENDING', 'FAILED'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) {
    if (isMissingQueueTable(error)) return { processed: 0, success: 0, failed: 0 };
    throw error;
  }

  let success = 0;
  let failed = 0;

  for (const job of jobs || []) {
    const result = await syncMarkNow({
      markId: job.mark_id,
      retryDelayMinutes,
      maxAttempts: job.max_attempts || 5,
      actorName: 'SYNC_WORKER',
      actorEmail: 'system@local',
    });

    if (result.synced) success += 1;
    else failed += 1;
  }

  return {
    processed: (jobs || []).length,
    success,
    failed,
  };
};

export const getSyncFailures = async ({ coachEmail, role }) => {
  const { data: jobs, error } = await supabase
    .from(QUEUE_TABLE)
    .select('id, mark_id, status, attempt_count, max_attempts, last_error, next_retry_at, updated_at')
    .eq('status', 'FAILED')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingQueueTable(error)) return [];
    throw error;
  }

  const markIds = (jobs || []).map((job) => job.mark_id);
  if (!markIds.length) return [];

  let marksQuery = supabase
    .from('marks')
    .select('id, student_id, assessment_type, total_score, coach, created_at, sheet_sync_error')
    .in('id', markIds);

  const { data: marks, error: marksError } = await marksQuery;
  if (marksError) throw marksError;

  const studentIds = [...new Set((marks || []).map((item) => item.student_id))];
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, coach_email')
    .in('id', studentIds);
  if (studentsError) throw studentsError;

  const studentsById = Object.fromEntries((students || []).map((item) => [item.id, item]));
  const marksById = Object.fromEntries((marks || []).map((item) => [item.id, item]));

  return (jobs || [])
    .map((job) => {
      const mark = marksById[job.mark_id];
      if (!mark) return null;
      const student = studentsById[mark.student_id];
      if (role === 'COACH' && student?.coach_email !== coachEmail) return null;

      return {
        ...job,
        mark,
        student,
      };
    })
    .filter(Boolean);
};
