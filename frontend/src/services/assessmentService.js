import { api } from './api';

export const getAssessments = async () => {
  const { data } = await api.get('/assessments');
  return data;
};

export const createAssessment = async (payload) => {
  const { data } = await api.post('/assessments', payload);
  return data;
};
