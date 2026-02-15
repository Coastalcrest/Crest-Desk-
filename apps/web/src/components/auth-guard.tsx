'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth-store';
import { api } from '../lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ROLE_HIERARCHY: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { user, accessToken, isLoading, setLoading, login, logout } = useAuthStore();

  useEffect(() => {
    async function checkAuth() {
      if (user && accessToken) {
        // Already authenticated
        if (requiredRole) {
          const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
          const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? Infinity;
          if (userLevel < requiredLevel) {
            router.push('/dashboard');
            return;
          }
        }
        return;
      }

      // Try to restore session via refresh token
      setLoading(true);
      try {
        const refreshRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/refresh`,
          { method: 'POST', credentials: 'include' },
        );

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const token = refreshData.data?.accessToken;
          if (token) {
            useAuthStore.getState().setAccessToken(token);
            // Fetch user profile
            const userRes = await api<any>('/users/me');
            if (userRes) {
              login(token, userRes);
              return;
            }
          }
        }

        // No valid session
        router.push('/login');
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [user, accessToken, router, requiredRole, setLoading, login]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return <>{children}</>;
}
