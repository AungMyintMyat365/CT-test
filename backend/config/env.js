import dotenv from 'dotenv';

dotenv.config();

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_JWT_SECRET',
  'GOOGLE_CLIENT_ID',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(`Missing required environment variables: ${missing.join(', ')}`);
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  appJwtSecret: process.env.APP_JWT_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY,
  googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetTabIctMdy: process.env.GOOGLE_SHEET_TAB_ICT_MDY || 'ICT-MDY',
  sheetTabDctMdy: process.env.GOOGLE_SHEET_TAB_DCT_MDY || 'DCT-MDY',
  sheetTabProfessional: process.env.GOOGLE_SHEET_TAB_PROFESSIONAL || 'PROFESSIONAL-MDY',
  approvedCoachEmails: (process.env.APPROVED_COACH_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  adminLocalUsername: process.env.ADMIN_LOCAL_USERNAME || '',
  adminLocalPasswordHash: process.env.ADMIN_LOCAL_PASSWORD_HASH || '',
};
