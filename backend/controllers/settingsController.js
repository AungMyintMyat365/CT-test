import { z } from 'zod';
import {
  getGoogleSheetsSettings,
  updateGoogleSheetsSettings,
} from '../services/settingsService.js';

const googleSheetsSchema = z
  .object({
    spreadsheet_id: z.string().min(1).optional(),
    tab_ict_mdy: z.string().min(1).optional(),
    tab_dct_mdy: z.string().min(1).optional(),
    tab_professional: z.string().min(1).optional(),
    professional_sheet_mode: z.enum(['total_only', 'full']).optional(),
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: 'At least one setting is required.',
  });

export const getGoogleSheetsConfig = async (_req, res, next) => {
  try {
    const payload = await getGoogleSheetsSettings();
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

export const updateGoogleSheetsConfig = async (req, res, next) => {
  try {
    const patch = googleSheetsSchema.parse(req.body);
    const payload = await updateGoogleSheetsSettings(patch);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};
