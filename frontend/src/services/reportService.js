import { api } from './api';

const getEndpoint = (type) => (type === 'students' ? '/reports/students.csv' : '/reports/assessments.csv');

export const downloadReport = async (type) => {
  const response = await api.get(getEndpoint(type), {
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'] || '';
  const fallbackName = `${type}-report.csv`;
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackName;

  return {
    blob: response.data,
    filename,
  };
};
