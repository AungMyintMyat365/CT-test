import { env } from '../config/env.js';
import { bumpCacheVersion, withCache } from './cacheService.js';
import { supabase } from './supabaseClient.js';

const GOOGLE_SHEETS_KEYS = {
  spreadsheetId: 'google_sheets_spreadsheet_id',
  tabIctMdy: 'google_sheet_tab_ict_mdy',
  tabDctMdy: 'google_sheet_tab_dct_mdy',
  tabProfessional: 'google_sheet_tab_professional',
  professionalSheetMode: 'professional_sheet_mode',
};

const SETTINGS_TABLE = 'app_settings';

const normalizeValue = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const loadSettingsByKeys = async (keys) => {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('key,value')
    .in('key', keys);
  if (error) throw error;
  const map = {};
  for (const row of data || []) {
    map[row.key] = row.value;
  }
  return map;
};

export const getGoogleSheetsSettings = async () => {
  const stored = await withCache({
    namespace: 'settings:google-sheets',
    identity: 'global',
    params: {},
    compute: async () => {
      const values = await loadSettingsByKeys(Object.values(GOOGLE_SHEETS_KEYS));
      return {
        spreadsheet_id: normalizeValue(values[GOOGLE_SHEETS_KEYS.spreadsheetId]),
        tab_ict_mdy: normalizeValue(values[GOOGLE_SHEETS_KEYS.tabIctMdy]),
        tab_dct_mdy: normalizeValue(values[GOOGLE_SHEETS_KEYS.tabDctMdy]),
        tab_professional: normalizeValue(values[GOOGLE_SHEETS_KEYS.tabProfessional]),
        professional_sheet_mode: normalizeValue(values[GOOGLE_SHEETS_KEYS.professionalSheetMode]),
      };
    },
  });

  const effective = {
    spreadsheet_id: stored.spreadsheet_id || env.googleSheetsSpreadsheetId || '',
    tab_ict_mdy: stored.tab_ict_mdy || env.sheetTabIctMdy,
    tab_dct_mdy: stored.tab_dct_mdy || env.sheetTabDctMdy,
    tab_professional: stored.tab_professional || env.sheetTabProfessional,
    professional_sheet_mode: stored.professional_sheet_mode || env.professionalSheetMode || 'total_only',
  };

  return { stored, effective };
};

export const getEffectiveGoogleSheetsSettings = async () => {
  const { effective } = await getGoogleSheetsSettings();
  return {
    spreadsheetId: effective.spreadsheet_id,
    tabIctMdy: effective.tab_ict_mdy,
    tabDctMdy: effective.tab_dct_mdy,
    tabProfessional: effective.tab_professional,
    professionalSheetMode: effective.professional_sheet_mode,
  };
};

export const updateGoogleSheetsSettings = async (patch) => {
  const entries = [
    { key: GOOGLE_SHEETS_KEYS.spreadsheetId, value: patch.spreadsheet_id },
    { key: GOOGLE_SHEETS_KEYS.tabIctMdy, value: patch.tab_ict_mdy },
    { key: GOOGLE_SHEETS_KEYS.tabDctMdy, value: patch.tab_dct_mdy },
    { key: GOOGLE_SHEETS_KEYS.tabProfessional, value: patch.tab_professional },
    { key: GOOGLE_SHEETS_KEYS.professionalSheetMode, value: patch.professional_sheet_mode },
  ].filter((entry) => entry.value !== undefined);

  if (!entries.length) return getGoogleSheetsSettings();

  for (const entry of entries) {
    const value = normalizeValue(entry.value);
    if (value === null) {
      const { error } = await supabase.from(SETTINGS_TABLE).delete().eq('key', entry.key);
      if (error) throw error;
      continue;
    }

    const { error } = await supabase.from(SETTINGS_TABLE).upsert({ key: entry.key, value });
    if (error) throw error;
  }

  await bumpCacheVersion();
  return getGoogleSheetsSettings();
};
