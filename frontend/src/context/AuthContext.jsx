/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchCurrentUser,
  loginWithAdminCredentials,
  loginWithGoogleCredential,
  loginWithLocalCredentials,
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('ciy_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        localStorage.removeItem('ciy_token');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (credential) => {
    const data = await loginWithGoogleCredential(credential);
    localStorage.setItem('ciy_token', data.token);
    setUser(data.user);
  };

  const loginAdmin = async ({ username, password }) => {
    const data = await loginWithAdminCredentials({ username, password });
    localStorage.setItem('ciy_token', data.token);
    setUser(data.user);
  };

  const loginLocal = async ({ username, password }) => {
    const data = await loginWithLocalCredentials({ username, password });
    localStorage.setItem('ciy_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('ciy_token');
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginAdmin,
      loginLocal,
      logout,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
