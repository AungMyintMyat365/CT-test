import { api } from './api';

export const getProfessionalTemplates = async () => {
  const { data } = await api.get('/professional-marks/templates');
  return data;
};

export const submitProfessionalMark = async (payload) => {
  const { data } = await api.post('/professional-marks', payload);
  return data;
};
