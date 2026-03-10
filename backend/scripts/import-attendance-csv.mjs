import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  AssessmentType,
  buildAssessmentSeed,
  deriveJoinDate,
} from '../services/assessmentSeedService.js';
import { getNextAssessment } from '../services/assessmentLogicService.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error('Usage: node scripts/import-attendance-csv.mjs <csv_path>');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ALLOWED_TYPES = new Set(Object.values(AssessmentType));

const parseLatestDate = (value) => {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;

  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;

  if (iso.test(s)) return s;

  const m = s.match(dmy);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
};

const raw = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parse(raw, {
  relax_column_count: true,
  bom: true,
  skip_empty_lines: false,
});

const headerIndex = rows.findIndex((row) => (row?.[0] || '').trim() === 'Coder ID');
if (headerIndex === -1) {
  console.error('Could not find header row containing "Coder ID".');
  process.exit(1);
}

const header = rows[headerIndex].map((h) => (h || '').trim());
const payloadRows = rows
  .slice(headerIndex + 1)
  .filter((row) => row.some((cell) => (cell || '').trim().length > 0))
  .map((row) => {
    const obj = {};
    for (let i = 0; i < header.length; i += 1) {
      obj[header[i]] = (row[i] || '').trim();
    }
    return obj;
  });

const { data: existingStudents, error: existingError } = await supabase
  .from('students')
  .select('id, name, coach_email');
if (existingError) throw existingError;

const existingKey = new Set(
  (existingStudents || []).map((s) => `${(s.name || '').toLowerCase()}|${(s.coach_email || '').toLowerCase()}`),
);

let inserted = 0;
let skippedExisting = 0;
let skippedInvalid = 0;
const errors = [];

for (const row of payloadRows) {
  const coderId = row['Coder ID'];
  const coderName = row['Coder name'];
  const latestDate = parseLatestDate(row['Lastest Assessment Date']);
  const latestType = (row['Lastest Assessment Type'] || '').toUpperCase();
  const className = row['Class'] || 'Unknown Class';
  const coachName = row['Coach name'] || 'Unknown Coach';
  const coachEmail = (row['coach_email'] || '').toLowerCase();

  if (!coderName || !latestDate || !ALLOWED_TYPES.has(latestType) || !coachEmail) {
    skippedInvalid += 1;
    continue;
  }

  const studentName = coderId ? `${coderId} - ${coderName}` : coderName;
  const key = `${studentName.toLowerCase()}|${coachEmail}`;

  if (existingKey.has(key)) {
    skippedExisting += 1;
    continue;
  }

  const joinDate = deriveJoinDate(latestType, latestDate) || latestDate;
  const seed = buildAssessmentSeed({ latestType, latestDate });
  const next = getNextAssessment({
    joinDate,
    professionalLevelCompletedAt: latestType === AssessmentType.PROFESSIONAL ? latestDate : null,
    assessments: seed,
  });

  const { data: insertedStudent, error: studentInsertError } = await supabase
    .from('students')
    .insert({
      name: studentName,
      join_date: joinDate,
      streamline: className,
      coach: coachName,
      coach_email: coachEmail,
      next_assessment_type: next.nextAssessmentType,
      next_assessment_date: next.nextAssessmentDate ? String(next.nextAssessmentDate).slice(0, 10) : null,
      professional_level_completed_at:
        latestType === AssessmentType.PROFESSIONAL ? latestDate : null,
    })
    .select('*')
    .single();

  if (studentInsertError) {
    errors.push({ studentName, stage: 'student_insert', error: studentInsertError.message });
    continue;
  }

  if (seed.length > 0) {
    const { error: assessmentInsertError } = await supabase.from('assessments').insert(
      seed.map((item) => ({
        student_id: insertedStudent.id,
        assessment_type: item.assessment_type,
        date: item.date,
        score: 0,
        coach: coachName,
      })),
    );

    if (assessmentInsertError) {
      errors.push({ studentName, stage: 'assessment_insert', error: assessmentInsertError.message });
      continue;
    }
  }

  inserted += 1;
  existingKey.add(key);
}

console.log(
  JSON.stringify(
    {
      csvPath: CSV_PATH,
      totalRows: payloadRows.length,
      inserted,
      skippedExisting,
      skippedInvalid,
      errors: errors.slice(0, 10),
    },
    null,
    2,
  ),
);
