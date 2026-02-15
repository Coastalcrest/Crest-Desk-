import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'agent' | 'managing_broker' | 'principal_broker' | 'owner';
  tenantId: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  avatarUrl?: string;
  phone?: string;
  licensedStates?: string[];
  preferences?: Record<string, unknown>;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isLoading: false,

  login: (accessToken, user) =>
    set({ accessToken, user, isLoading: false }),

  logout: () =>
    set({ accessToken: null, user: null, isLoading: false }),

  setAccessToken: (token) =>
    set({ accessToken: token }),

  setUser: (user) =>
    set({ user }),

  setLoading: (loading) =>
    set({ isLoading: loading }),
}));
