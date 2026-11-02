import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  quickLogin: (role: 'admin' | 'chef' | 'depo') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      if (!getAuthToken()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const res = await api.auth.getMe();
      if (res?.success && res.data) {
        setUser(res.data);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch current user', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.auth.login({ username, password });
    if (res?.success && res.data?.token) {
      setAuthToken(res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    } else {
      throw new Error(res?.message || 'Giriş yapılamadı');
    }
  };

  const quickLogin = async (role: 'admin' | 'chef' | 'depo') => {
    const passwords: Record<string, string> = {
      admin: 'admin123',
      chef: 'chef123',
      depo: 'depo123',
    };
    await login(role, passwords[role]);
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        quickLogin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

