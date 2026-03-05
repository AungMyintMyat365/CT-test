import { z } from 'zod';
import { appendMarkToSheet } from '../services/googleSheetsService.js';
import { getNextAssessment } from '../services/assessmentLogicService.js';
import { supabase } from '../services/supabaseClient.js';

const marksSchema = z.object({
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
}).refine((payload) => Boolean(payload.assessor || payload.coach), {
  message: 'Assessor is required',
});

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

    let mark;
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

    if (newSchemaError) {
      const isMissingNewScoreColumns =
        newSchemaError.code === 'PGRST204' &&
        ['sequencing_debugging_score', 'decomposition_score', 'abstraction_score', 'pattern_recognition_score', 'tp_score'].some(
          (column) => newSchemaError.message?.includes(column),
        );

      if (!isMissingNewScoreColumns) {
        throw newSchemaError;
      }

      // Backward compatibility for old schema (logic/pattern/algorithm/problem).
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
      mark = legacySchemaMark;
    } else {
      mark = newSchemaMark;
    }

    const { error: assessmentError } = await supabase.from('assessments').insert({
      student_id: payload.student_id,
      assessment_type: payload.assessment_type,
      date,
      score: Math.round(tpScore),
      coach: assessorName,
    });

    if (assessmentError) throw assessmentError;

    try {
      await appendMarkToSheet({
        studentName: student.name,
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
      });

      const { error: syncUpdateError } = await supabase.from('marks').update({
        sheet_sync_status: 'SYNCED',
        sheet_sync_error: null,
        sheet_synced_at: new Date().toISOString(),
      }).eq('id', mark.id);

      if (syncUpdateError && syncUpdateError.code !== 'PGRST204') throw syncUpdateError;
    } catch (sheetError) {
      await supabase
        .from('marks')
        .update({
          sheet_sync_status: 'FAILED',
          sheet_sync_error: sheetError.message?.slice(0, 500) || 'Unknown Google Sheets error',
          sheet_synced_at: null,
        })
        .eq('id', mark.id);

      return res.status(502).json({
        message: 'Mark saved in database, but failed to sync to Google Sheets',
        mark_id: mark.id,
      });
    }

    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessments')
      .select('*')
      .eq('student_id', payload.student_id);

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
      .eq('id', payload.student_id);

    if (updateError) throw updateError;

    return res.status(201).json({
      ...mark,
      total_score: total,
      tp_score: tpScore,
      sheet_status: 'SYNCED',
    });
  } catch (error) {
    return next(error);
  }
};
