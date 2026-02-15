'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth-store';
import { api, ApiError } from '../lib/api';

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginResult {
  mfaRequired?: boolean;
  mfaToken?: string;
}

export function useAuth() {
  const router = useRouter();
  const { user, accessToken, isLoading, login: setAuth, logout: clearAuth, setLoading } = useAuthStore();

  const login = useCallback(async (params: LoginParams): Promise<LoginResult> => {
    setLoading(true);
    try {
      const data = await api<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(params),
        skipAuth: true,
      });

      if (data.mfaRequired) {
        return { mfaRequired: true, mfaToken: data.mfaToken };
      }

      setAuth(data.accessToken, data.user);
      return {};
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

  const verifyMfa = useCallback(async (mfaToken: string, code: string) => {
    setLoading(true);
    try {
      const data = await api<any>('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ mfaToken, code }),
        skipAuth: true,
      });
      setAuth(data.accessToken, data.user);
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

  const register = useCallback(async (params: RegisterParams) => {
    setLoading(true);
    try {
      const data = await api<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
        skipAuth: true,
      });
      setAuth(data.accessToken, data.user);
    } finally {
      setLoading(false);
    }
  }, [setAuth, setLoading]);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // ignore - clear state regardless
    }
    clearAuth();
    router.push('/login');
  }, [clearAuth, router]);

  const forgotPassword = useCallback(async (email: string) => {
    await api('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await api('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
      skipAuth: true,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api<any>('/users/me');
      if (data) {
        const currentToken = useAuthStore.getState().accessToken;
        if (currentToken) {
          setAuth(currentToken, data);
        }
      }
    } catch {
      // silent fail
    }
  }, [setAuth]);

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken && !!user,
    login,
    verifyMfa,
    register,
    logout,
    forgotPassword,
    resetPassword,
    refreshUser,
  };
}
