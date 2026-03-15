import { google } from 'googleapis';
import { env } from '../config/env.js';
import { getEffectiveGoogleSheetsSettings } from './settingsService.js';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getGoogleAuthClient = () => {
  if (!env.googleServiceAccountEmail || !env.googlePrivateKey) {
    throw new Error('Google Sheets credentials are not configured');
  }

  return new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googlePrivateKey.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });
};

const getSheetTab = (assessmentType, tabs) => {
  if (assessmentType === 'DEVELOPMENT_CT') return tabs.tabDctMdy;
  if (assessmentType === 'PROFESSIONAL') return tabs.tabProfessional;
  return tabs.tabIctMdy;
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
  const settings = await getEffectiveGoogleSheetsSettings();
  if (!settings.spreadsheetId) {
    throw new Error('Google Sheets spreadsheet ID is not configured');
  }

  const auth = getGoogleAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetTab = getSheetTab(assessmentType, settings);

  await sheets.spreadsheets.values.append({
    spreadsheetId: settings.spreadsheetId,
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
  const settings = await getEffectiveGoogleSheetsSettings();
  if (!settings.spreadsheetId) {
    throw new Error('Google Sheets spreadsheet ID is not configured');
  }

  const auth = getGoogleAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetTab = settings.tabProfessional;
  const mode = (settings.professionalSheetMode || 'total_only').toLowerCase();
  const scoresJson = scores ? JSON.stringify(scores) : '';

  if (mode === 'full') {
    await sheets.spreadsheets.values.append({
      spreadsheetId: settings.spreadsheetId,
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
    return;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: settings.spreadsheetId,
    range: `${sheetTab}!A:D`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[date, candidate || '', templateTitle || '', totalScore]],
    },
  });
};

export const verifyGoogleSheetsConnection = async () => {
  const settings = await getEffectiveGoogleSheetsSettings();
  if (!settings.spreadsheetId) {
    throw new Error('Google Sheets spreadsheet ID is not configured');
  }

  const auth = getGoogleAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId: settings.spreadsheetId,
  });

  const sheetTitles = (response.data.sheets || [])
    .map((sheet) => sheet.properties?.title)
    .filter(Boolean);

  const requiredTabs = [settings.tabIctMdy, settings.tabDctMdy, settings.tabProfessional].filter(Boolean);
  const missingTabs = requiredTabs.filter((tab) => !sheetTitles.includes(tab));

  return {
    ok: missingTabs.length === 0,
    spreadsheetId: settings.spreadsheetId,
    spreadsheetTitle: response.data.properties?.title || '',
    sheetTitles,
    missingTabs,
  };
};
