import { supabase } from '../services/supabaseClient.js';
import { env } from '../config/env.js';
import { getProfessionalTemplates } from '../services/professionalRubricsService.js';

const requireCanvaKey = (req) => {
  if (!env.canvaDataApiKey) return false;
  const headerKey = req.headers['x-canva-api-key'];
  return headerKey === env.canvaDataApiKey;
};

export const listProfessionalMarksForCanva = async (req, res, next) => {
  try {
    if (!env.canvaDataApiKey) {
      return res.status(503).json({ message: 'Canva data API key is not configured' });
    }
    if (!requireCanvaKey(req)) {
      return res.status(401).json({ message: 'Invalid Canva API key' });
    }

    const { template_key, limit } = req.query;
    const limitValue = Math.min(500, Math.max(1, Number(limit || 200)));

    let query = supabase
      .from('professional_marks')
      .select(
        'id, student_id, template_key, template_title, candidate_name, age, streamline, assessor, level, center_code, scores, total_score, max_score, percentage, result, date, created_at',
      )
      .order('date', { ascending: false })
      .limit(limitValue);

    if (template_key) {
      query = query.eq('template_key', template_key);
    }

    const { data, error } = await query;
    if (error) throw error;

    const templates = getProfessionalTemplates();
    const itemsByKey = Object.fromEntries(
      templates.map((template) => [template.key, template.items.map((item) => item.id)]),
    );

    const rows = (data || []).map((item) => {
      const row = {
        id: item.id,
        candidate: item.candidate_name || '',
        age: item.age ?? '',
        streamline: item.streamline || '',
        assessor: item.assessor || '',
        level: item.level || '',
        center_code: item.center_code || '',
        template_title: item.template_title,
        template_key: item.template_key,
        total_score: Number(item.total_score || 0),
        max_score: Number(item.max_score || 0),
        percentage: Number(item.percentage || 0),
        result: item.result,
        date: item.date,
      };

      const scoreMap = item.scores || {};
      const templateItems = itemsByKey[item.template_key] || [];
      templateItems.forEach((key) => {
        row[key] = scoreMap[key] ?? '';
      });

      return row;
    });

    return res.json({ items: rows });
  } catch (error) {
    return next(error);
  }
};
