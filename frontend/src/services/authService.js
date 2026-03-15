import { api } from './api';

export const loginWithGoogleCredential = async (credential) => {
  const { data } = await api.post('/auth/google', { credential });
  return data;
};

export const loginWithAdminCredentials = async ({ username, password }) => {
  const { data } = await api.post('/auth/admin-login', { username, password });
  return data;
};

export const loginWithLocalCredentials = async ({ username, password }) => {
  const { data } = await api.post('/auth/local-login', { username, password });
  return data;
};

export const fetchCurrentUser = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};
