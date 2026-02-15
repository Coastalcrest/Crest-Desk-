'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/use-auth';
import { addToast } from '../../../hooks/use-toast';
import { cn } from '../../../lib/utils';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const mfaSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
});

type MfaFormData = z.infer<typeof mfaSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, verifyMfa, isLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [mfaState, setMfaState] = useState<{
    required: boolean;
    token: string;
  } | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mfaForm = useForm<MfaFormData>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const result = await login(data);
      if (result.mfaRequired && result.mfaToken) {
        setMfaState({ required: true, token: result.mfaToken });
      } else {
        addToast({ type: 'success', title: 'Welcome back!' });
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.';
      setServerError(message);
    }
  };

  const handleMfaVerify = async (data: MfaFormData) => {
    if (!mfaState) return;
    setServerError(null);
    try {
      await verifyMfa(mfaState.token, data.code);
      addToast({ type: 'success', title: 'Welcome back!' });
      router.push('/dashboard');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid verification code. Please try again.';
      setServerError(message);
      mfaForm.setValue('code', '');
    }
  };

  const handleBackToLogin = () => {
    setMfaState(null);
    setServerError(null);
    mfaForm.reset();
  };

  if (mfaState?.required) {
    return (
      <div>
        {/* Mobile-only branding */}
        <div className="lg:hidden text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--color-primary)' }}
          >
            CrestDesk
          </h1>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Two-factor authentication
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {serverError && (
          <div
            className="mb-6 rounded-md border px-4 py-3 text-sm"
            style={{
              backgroundColor: 'rgba(192, 57, 43, 0.08)',
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
            }}
            role="alert"
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
              </svg>
              <span>{serverError}</span>
            </div>
          </div>
        )}

        <form onSubmit={mfaForm.handleSubmit(handleMfaVerify)} className="space-y-6">
          <div>
            <label
              htmlFor="mfa-code"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Verification code
            </label>
            <input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              {...mfaForm.register('code')}
              className={cn(
                'mt-1 block w-full rounded-md border px-3 py-2.5 text-sm text-center tracking-[0.3em] font-mono shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
                mfaForm.formState.errors.code
                  ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                  : 'border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
              )}
            />
            {mfaForm.formState.errors.code && (
              <p className="mt-1.5 text-xs text-[var(--color-danger)]">
                {mfaForm.formState.errors.code.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full text-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile-only branding */}
      <div className="lg:hidden text-center mb-8">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: 'var(--color-primary)' }}
        >
          CrestDesk
        </h1>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Sign in to your account
        </p>
      </div>

      {serverError && (
        <div
          className="mb-6 rounded-md border px-4 py-3 text-sm"
          style={{
            backgroundColor: 'rgba(192, 57, 43, 0.08)',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
          }}
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
            </svg>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            {...loginForm.register('email')}
            className={cn(
              'mt-1 block w-full rounded-md border px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
              loginForm.formState.errors.email
                ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                : 'border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
            )}
          />
          {loginForm.formState.errors.email && (
            <p className="mt-1.5 text-xs text-[var(--color-danger)]">
              {loginForm.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              {...loginForm.register('password')}
              className={cn(
                'block w-full rounded-md border px-3 py-2.5 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
                loginForm.formState.errors.password
                  ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                  : 'border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <path d="M14.12 14.12a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="mt-1.5 text-xs text-[var(--color-danger)]">
              {loginForm.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Forgot password link */}
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {/* Register link */}
      <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="font-medium text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] transition-colors"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
