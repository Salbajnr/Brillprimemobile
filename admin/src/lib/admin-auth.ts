import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../client/src/lib/api';

export function useAdminAuth() {
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.auth.getCurrentUser();
      if (res.success && res.data && res.data.role === 'ADMIN') {
        setAdmin(res.data);
      } else {
        setAdmin(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch admin');
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    const res = await apiClient.auth.login(credentials);
    if (res.success && res.data?.role === 'ADMIN') {
      setAdmin(res.data);
    } else {
      setError('Not an admin account');
      setAdmin(null);
    }
    setIsLoading(false);
    return res;
  };

  const logout = async () => {
    await apiClient.auth.logout();
    setAdmin(null);
  };

  return {
    admin,
    isAuthenticated: !!admin,
    isLoading,
    error,
    login,
    logout,
    refresh: fetchAdmin,
  };
}
