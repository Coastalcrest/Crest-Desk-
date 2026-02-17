'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../hooks/use-auth';
import { addToast } from '../../../hooks/use-toast';
import { cn } from '../../../lib/utils';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();

  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Redirect countdown after success
  useEffect(() => {
    if (!isSuccess) return;

    if (redirectCountdown <= 0) {
      router.push('/auth/login');
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isSuccess, redirectCountdown, router]);

  const handleSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(token, data.password);
      setIsSuccess(true);
      addToast({
        type: 'success',
        title: 'Password reset successfully',
        message: 'You can now sign in with your new password.',
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // No token in URL
  if (!token) {
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

        <div className="text-center">
          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(192, 57, 43, 0.1)' }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Invalid reset link
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">
            This password reset link is invalid or has expired. Please request a
            new one.
          </p>

          <div className="space-y-3">
            <Link
              href="/auth/forgot-password"
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2.5"
            >
              Request new reset link
            </Link>
            <p className="text-sm text-[var(--color-text-secondary)]">
              or{' '}
              <Link
                href="/auth/login"
                className="font-medium text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] transition-colors"
              >
                return to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
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

        <div className="text-center">
          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(39, 174, 96, 0.1)' }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Password reset successful
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">
            Your password has been updated. Redirecting to sign in
            in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
          </p>

          <Link
            href="/auth/login"
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2.5"
          >
            Sign in now
          </Link>
        </div>
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
          Set new password
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Choose a strong password for your account.
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

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {/* New Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            New password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              placeholder="Enter new password"
              {...form.register('password')}
              className={cn(
                'block w-full rounded-md border px-3 py-2.5 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
                form.formState.errors.password
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
          {form.formState.errors.password && (
            <p className="mt-1.5 text-xs text-[var(--color-danger)]">
              {form.formState.errors.password.message}
            </p>
          )}
          <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
            Must be at least 10 characters with uppercase, lowercase, and a number.
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-[var(--color-text-primary)]"
          >
            Confirm new password
          </label>
          <div className="relative mt-1">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              {...form.register('confirmPassword')}
              className={cn(
                'block w-full rounded-md border px-3 py-2.5 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
                form.formState.errors.confirmPassword
                  ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                  : 'border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
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
          {form.formState.errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-[var(--color-danger)]">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Resetting password...
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
        Remember your password?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
