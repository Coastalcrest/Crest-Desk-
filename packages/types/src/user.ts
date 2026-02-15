// User types

import type { Role, UUID } from './common';

export interface User {
  id: UUID;
  tenantId: UUID;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  licensedStates: string[];
  licenseNumbers: Record<string, string>;
  mfaEnabled: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  preferences: UserPreferences;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark';
  fontSize?: 'sm' | 'base' | 'lg';
  language?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  notifications?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
  };
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  licensedStates?: string[];
  licenseNumbers?: Record<string, string>;
  preferences?: Partial<UserPreferences>;
}

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface UserListItem {
  id: UUID;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
