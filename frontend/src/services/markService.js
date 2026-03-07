import { api } from './api';

export const submitMark = async (payload) => {
  const { data } = await api.post('/marks', payload);
  return data;
};

export const getSyncFailures = async () => {
  const { data } = await api.get('/marks/sync-failures');
  return data;
};

export const retrySyncMark = async (markId) => {
  const { data } = await api.post(`/marks/${markId}/retry-sync`, {});
  return data;
};
