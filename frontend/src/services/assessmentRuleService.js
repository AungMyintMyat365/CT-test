import { api } from './api';

export const getAssessmentRules = async () => {
  const { data } = await api.get('/assessment-rules');
  return data;
};

export const updateAssessmentRule = async (assessmentType, payload) => {
  const { data } = await api.put(`/assessment-rules/${assessmentType}`, payload);
  return data;
};
