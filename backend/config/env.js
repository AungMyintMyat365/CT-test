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
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  canvaAppOrigin: process.env.CANVA_APP_ORIGIN || '',
  allowCanvaOrigins: String(process.env.ALLOW_CANVA_ORIGINS || '').toLowerCase() === 'true',
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
  canvaDataApiKey: process.env.CANVA_DATA_API_KEY || '',
  professionalSheetMode: process.env.PROFESSIONAL_SHEET_MODE || 'total_only',
  sheetSyncRetryIntervalSeconds: Number(process.env.SHEET_SYNC_RETRY_INTERVAL_SECONDS || 120),
  sheetSyncRetryDelayMinutes: Number(process.env.SHEET_SYNC_RETRY_DELAY_MINUTES || 5),
  sheetSyncBatchSize: Number(process.env.SHEET_SYNC_BATCH_SIZE || 10),
  sheetSyncMaxAttempts: Number(process.env.SHEET_SYNC_MAX_ATTEMPTS || 5),
};
