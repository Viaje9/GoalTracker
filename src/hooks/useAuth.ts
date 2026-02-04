import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '../types';
import * as api from '../api';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .fetchMe()
      .then(setUser)
      .catch(() => {
        api.clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener(api.AUTH_EVENT, handleExpired);
    return () => window.removeEventListener(api.AUTH_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.login(username, password);
    api.setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const result = await api.register(username, password);
    api.setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors; session may already be expired.
    }
    api.clearToken();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    login,
    register,
    logout,
  };
}
