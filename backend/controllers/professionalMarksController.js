import { z } from 'zod';
import { supabase } from '../services/supabaseClient.js';
import { getProfessionalTemplate, getProfessionalTemplates } from '../services/professionalRubricsService.js';
import { appendProfessionalMarkToSheet } from '../services/googleSheetsService.js';

const professionalMarkSchema = z.object({
  student_id: z.string().uuid(),
  template_key: z.string().min(1),
  scores: z.record(z.number().min(0)),
  candidate_name: z.string().min(1).optional(),
  age: z.number().int().min(0).max(120).optional(),
  streamline: z.string().optional(),
  level: z.string().optional(),
  center_code: z.string().optional(),
  assessor: z.string().min(1).optional(),
  coach: z.string().min(1).optional(),
  date: z.string().date().optional(),
});

export const listProfessionalTemplates = (_req, res) => {
  res.json(getProfessionalTemplates());
};

export const createProfessionalMark = async (req, res, next) => {
  try {
    const payload = professionalMarkSchema.parse(req.body);
    const template = getProfessionalTemplate(payload.template_key);
    if (!template) {
      return res.status(400).json({ message: 'Invalid professional assessment template.' });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, streamline, coach, coach_email')
      .eq('id', payload.student_id)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (req.user.role === 'COACH' && student.coach_email !== req.user.email) {
      return res.status(403).json({ message: 'You are not assigned to this student' });
    }

    const scores = {};
    let total = 0;
    for (const item of template.items) {
      const raw = payload.scores?.[item.id];
      if (raw === undefined || raw === null || Number.isNaN(Number(raw))) {
        return res.status(400).json({ message: `Missing score for ${item.label}` });
      }
      const value = Number(raw);
      if (value < 0 || value > item.max) {
        return res
          .status(400)
          .json({ message: `Score for ${item.label} must be between 0 and ${item.max}` });
      }
      scores[item.id] = value;
      total += value;
    }

    const maxScore = template.maxScore || template.items.reduce((sum, item) => sum + Number(item.max || 0), 0);
    const percentage = Number(((total / maxScore) * 100).toFixed(2));
    const passing = Number(template.passingScore || 0);
    const result = total >= passing ? 'MET' : 'NOT_MET';
    const date = payload.date || new Date().toISOString().slice(0, 10);
    const assessorName = payload.assessor || payload.coach || req.user.name;
    const candidateName = payload.candidate_name || student.name;
    const streamline = payload.streamline || student.streamline;

    const { data: mark, error: markError } = await supabase
      .from('professional_marks')
      .insert({
        student_id: payload.student_id,
        template_key: template.key,
        template_title: template.title,
        candidate_name: candidateName,
        age: payload.age ?? null,
        streamline,
        assessor: assessorName,
        level: payload.level ?? null,
        center_code: payload.center_code ?? null,
        scores,
        total_score: total,
        max_score: maxScore,
        percentage,
        result,
        coach: assessorName,
        date,
        sheet_sync_status: 'PENDING',
      })
      .select('*')
      .single();
    if (markError) throw markError;

    const { error: assessmentError } = await supabase.from('assessments').insert({
      student_id: payload.student_id,
      assessment_type: 'PROFESSIONAL',
      date,
      score: Math.round(percentage),
      coach: assessorName,
    });
    if (assessmentError) throw assessmentError;

    let syncStatus = 'SYNCED';
    let syncError = null;

    try {
      await appendProfessionalMarkToSheet({
        date,
        assessor: assessorName,
        candidate: candidateName,
        streamline,
        templateTitle: template.title,
        totalScore: total,
        maxScore,
        percentage,
        result,
        scores,
      });
    } catch (error) {
      syncStatus = 'FAILED';
      syncError = error.message?.slice(0, 500) || 'Unknown Google Sheets error';
    }

    await supabase
      .from('professional_marks')
      .update({
        sheet_sync_status: syncStatus,
        sheet_sync_error: syncError,
        sheet_synced_at: syncStatus === 'SYNCED' ? new Date().toISOString() : null,
      })
      .eq('id', mark.id);

    return res.status(syncStatus === 'SYNCED' ? 201 : 202).json({
      ...mark,
      sheet_sync_status: syncStatus,
      sheet_sync_error: syncError,
      percentage,
      result,
    });
  } catch (error) {
    return next(error);
  }
};
