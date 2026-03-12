import { supabase } from '../services/supabaseClient.js';
import { env } from '../config/env.js';

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
        'id, student_id, template_key, template_title, total_score, max_score, percentage, result, date, created_at, students(name,streamline)',
      )
      .order('date', { ascending: false })
      .limit(limitValue);

    if (template_key) {
      query = query.eq('template_key', template_key);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((item) => ({
      id: item.id,
      candidate: item.students?.name || '',
      streamline: item.students?.streamline || '',
      template_title: item.template_title,
      total_score: Number(item.total_score || 0),
      max_score: Number(item.max_score || 0),
      percentage: Number(item.percentage || 0),
      result: item.result,
      date: item.date,
    }));

    return res.json({ items: rows });
  } catch (error) {
    return next(error);
  }
};
