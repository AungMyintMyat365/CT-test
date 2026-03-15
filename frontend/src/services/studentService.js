import { api } from './api';

export const getStudents = async (params = {}) => {
  const { data } = await api.get('/students', { params });
  return data;
};

export const getStudentById = async (id) => {
  const { data } = await api.get(`/students/${id}`);
  return data;
};

export const deleteStudent = async (id) => {
  const { data } = await api.delete(`/students/${id}`);
  return data;
};

export const getStudentForMarking = async (id) => {
  const { data } = await api.get(`/students/${id}/marking-context`);
  return data;
};

export const createStudent = async (payload) => {
  const { data } = await api.post('/students', payload);
  return data;
};

export const updateStudent = async (id, payload) => {
  const { data } = await api.patch(`/students/${id}`, payload);
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await api.get('/students/dashboard/stats');
  return data;
};

export const getDueBoard = async () => {
  const { data } = await api.get('/students/due-board');
  return data;
};

export const importStudentsCsv = async (csvText) => {
  const { data } = await api.post('/students/import-csv', { csvText });
  return data;
};
