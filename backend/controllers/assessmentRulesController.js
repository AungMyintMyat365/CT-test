import { z } from 'zod';
import { supabase } from '../services/supabaseClient.js';

const ruleSchema = z.object({
  months_interval: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const assessmentTypeSchema = z.enum([
  'INITIAL_CT',
  'INITIAL_CT_SECOND',
  'PROFESSIONAL',
  'DEVELOPMENT_CT',
]);

export const getAssessmentRules = async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('assessment_rules')
      .select('*')
      .order('assessment_type', { ascending: true });

    if (error) throw error;
    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
};

export const upsertAssessmentRule = async (req, res, next) => {
  try {
    const assessment_type = assessmentTypeSchema.parse(req.params.assessment_type);
    const payload = ruleSchema.parse(req.body);

    const { data, error } = await supabase
      .from('assessment_rules')
      .upsert({
        assessment_type,
        ...payload,
      }, { onConflict: 'assessment_type' })
      .select('*')
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};
