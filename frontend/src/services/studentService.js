import { api } from './api';

export const getStudents = async (params = {}) => {
  const { data } = await api.get('/students', { params });
  return data;
};

export const getStudentById = async (id) => {
  const { data } = await api.get(`/students/${id}`);
  return data;
};

export const createStudent = async (payload) => {
  const { data } = await api.post('/students', payload);
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await api.get('/students/dashboard/stats');
  return data;
};
