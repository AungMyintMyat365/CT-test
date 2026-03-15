import { api } from './api';

export const getGoogleSheetsSettings = async () => {
  const { data } = await api.get('/settings/google-sheets');
  return data;
};

export const updateGoogleSheetsSettings = async (payload) => {
  const { data } = await api.put('/settings/google-sheets', payload);
  return data;
};

export const testGoogleSheetsSettings = async () => {
  const { data } = await api.get('/settings/google-sheets/test');
  return data;
};
