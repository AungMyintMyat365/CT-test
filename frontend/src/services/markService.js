import { api } from './api';

export const submitMark = async (payload) => {
  const { data } = await api.post('/marks', payload);
  return data;
};
