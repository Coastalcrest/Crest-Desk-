import { z } from 'zod';

// ------------------------------------------------------------------ //
//  Auth schemas                                                       //
//  Note: auth.ts route already defines inline schemas. These are      //
//  exported here for reuse in tests and documentation.                //
// ------------------------------------------------------------------ //

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA token is required'),
  code: z.string().min(1, 'MFA code is required'),
});

export const mfaConfirmSchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters').max(8),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(1, 'Password is required'),
});
