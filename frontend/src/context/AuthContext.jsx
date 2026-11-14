import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('jms_token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('jms_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Initialize and verify token on initial mount
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      const storedToken = localStorage.getItem('jms_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const res = await authApi.me();
        if (isMounted && res.data && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('jms_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        // Token invalid or expired
        if (isMounted) {
          localStorage.removeItem('jms_token');
          localStorage.removeItem('jms_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('jms_token', receivedToken);
    localStorage.setItem('jms_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  }, []);

  const register = useCallback(async (userData) => {
    const res = await authApi.register(userData);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jms_token');
    localStorage.removeItem('jms_user');
    sessionStorage.removeItem('jms_token');
    sessionStorage.removeItem('jms_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
