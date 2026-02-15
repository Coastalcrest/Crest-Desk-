'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '../../../hooks/use-auth';
import { cn } from '../../../lib/utils';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(data.email);
      setIsSubmitted(true);
    } catch (error: unknown) {
      // Always show success message to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
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
          {/* Success icon */}
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
            Check your email
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">
            If an account exists with that email, we&apos;ve sent a password
            reset link. Please check your inbox and spam folder.
          </p>

          <Link
            href="/auth/login"
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to sign in
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
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Enter the email address associated with your account and we&apos;ll
          send you a link to reset your password.
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
            {...form.register('email')}
            className={cn(
              'mt-1 block w-full rounded-md border px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
              form.formState.errors.email
                ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                : 'border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
            )}
          />
          {form.formState.errors.email && (
            <p className="mt-1.5 text-xs text-[var(--color-danger)]">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

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
              Sending reset link...
            </>
          ) : (
            'Send reset link'
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
