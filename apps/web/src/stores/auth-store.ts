import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'broker' | 'agent' | 'staff';
}

interface AuthState {
  /** JWT access token kept in memory only (not localStorage) */
  accessToken: string | null;

  /** Currently authenticated user */
  user: User | null;

  /** Whether an auth operation is in progress */
  isLoading: boolean;

  /** Set the access token and user after successful login */
  login: (accessToken: string, user: User) => void;

  /** Clear auth state on logout */
  logout: () => void;

  /** Update the access token (e.g., after a silent refresh) */
  setAccessToken: (token: string) => void;

  /** Set loading state */
  setLoading: (loading: boolean) => void;
}

/**
 * Zustand auth store.
 *
 * The access token is stored in memory only -- never persisted to
 * localStorage or sessionStorage -- to reduce XSS risk.
 * Refresh tokens are handled via httpOnly cookies by the API.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isLoading: false,

  login: (accessToken, user) =>
    set({
      accessToken,
      user,
      isLoading: false,
    }),

  logout: () =>
    set({
      accessToken: null,
      user: null,
      isLoading: false,
    }),

  setAccessToken: (token) =>
    set({
      accessToken: token,
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),
}));
