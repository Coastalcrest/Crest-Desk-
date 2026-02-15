// Authentication & authorization types

import type { Role, UUID } from './common';

export interface JwtPayload {
  sub: UUID;
  tid: UUID;
  role: Role;
  perms: string[];
  iat: number;
  exp: number;
  iss: 'crestdesk';
  jti: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  mfaRequired?: boolean;
  mfaToken?: string;
}

export interface MfaVerifyRequest {
  mfaToken: string;
  code: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface MfaConfirmRequest {
  code: string;
}

export interface MfaConfirmResponse {
  backupCodes: string[];
}

export interface Session {
  id: UUID;
  userId: UUID;
  deviceInfo: {
    browser?: string;
    os?: string;
    deviceType?: string;
  };
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
}

export interface Permission {
  id: UUID;
  userId: UUID;
  resource: string;
  action: string;
  scope: 'own' | 'team' | 'office' | 'brokerage';
  granted: boolean;
}
