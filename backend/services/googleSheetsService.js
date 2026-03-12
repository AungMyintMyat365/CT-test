import { google } from 'googleapis';
import { env } from '../config/env.js';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getGoogleAuthClient = () => {
  if (!env.googleServiceAccountEmail || !env.googlePrivateKey || !env.googleSheetsSpreadsheetId) {
    throw new Error('Google Sheets credentials are not configured');
  }

  return new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googlePrivateKey.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });
};

const getSheetTab = (assessmentType) => {
  if (assessmentType === 'DEVELOPMENT_CT') return env.sheetTabDctMdy;
  if (assessmentType === 'PROFESSIONAL') return env.sheetTabProfessional;
  return env.sheetTabIctMdy;
};

export const appendMarkToSheet = async ({
  assessmentType,
  assessor,
  coderId,
  campusCode,
  candidate,
  age,
  email,
  level,
  sequencingDebuggingScore,
  decompositionScore,
  abstractionScore,
  patternRecognitionScore,
  totalScore,
  tpScore,
  sendReport,
  status,
  date,
}) => {
  const auth = getGoogleAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetTab = getSheetTab(assessmentType);

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSheetsSpreadsheetId,
    range: `${sheetTab}!A:P`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          date,
          assessor || '',
          coderId || '',
          campusCode || '',
          candidate || '',
          age ?? '',
          email || '',
          level || '',
          sequencingDebuggingScore,
          decompositionScore,
          abstractionScore,
          patternRecognitionScore,
          totalScore,
          tpScore,
          sendReport || 'FALSE',
          status || 'UNSEND',
        ],
      ],
    },
  });
};

export const appendProfessionalMarkToSheet = async ({
  date,
  assessor,
  candidate,
  streamline,
  templateTitle,
  totalScore,
  maxScore,
  percentage,
  result,
  scores,
}) => {
  const auth = getGoogleAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetTab = env.sheetTabProfessional;
  const scoresJson = scores ? JSON.stringify(scores) : '';

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSheetsSpreadsheetId,
    range: `${sheetTab}!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          date,
          assessor || '',
          candidate || '',
          streamline || '',
          templateTitle || '',
          totalScore,
          maxScore,
          percentage,
          result,
          scoresJson,
        ],
      ],
    },
  });
};
