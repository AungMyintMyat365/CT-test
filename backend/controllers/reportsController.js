import { supabase } from '../services/supabaseClient.js';

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((key) => escapeCell(row[key])).join(','));
  }
  return `${lines.join('\n')}\n`;
};

export const exportStudentsCsv = async (req, res, next) => {
  try {
    let query = supabase
      .from('students')
      .select('id,name,join_date,streamline,coach,coach_email,next_assessment_type,next_assessment_date,created_at')
      .order('created_at', { ascending: false });

    if (req.user.role === 'COACH') {
      query = query.eq('coach_email', req.user.email);
    }

    const { data, error } = await query;
    if (error) throw error;

    const csv = toCsv(data || []);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="students-report.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};

export const exportAssessmentsCsv = async (req, res, next) => {
  try {
    let query = supabase
      .from('assessments')
      .select('id,student_id,assessment_type,date,score,coach,created_at')
      .order('date', { ascending: false });

    if (req.user.role === 'COACH') {
      query = query.eq('coach', req.user.name);
    }

    const { data, error } = await query;
    if (error) throw error;

    const csv = toCsv(data || []);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="assessments-report.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};
