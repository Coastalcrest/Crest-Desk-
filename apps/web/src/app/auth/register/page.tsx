'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/use-auth';
import { addToast } from '../../../hooks/use-toast';
import { cn } from '../../../lib/utils';

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be 50 characters or less'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be 50 characters or less'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
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

type RegisterFormData = z.infer<typeof registerSchema>;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: '', color: '', bgColor: '' };
  }

  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      score,
      label: 'Weak',
      color: 'var(--color-danger)',
      bgColor: 'rgba(192, 57, 43, 0.15)',
    };
  }
  if (score <= 4) {
    return {
      score,
      label: 'Fair',
      color: 'var(--color-warning)',
      bgColor: 'rgba(243, 156, 18, 0.15)',
    };
  }
  return {
    score,
    label: 'Strong',
    color: 'var(--color-success)',
    bgColor: 'rgba(39, 174, 96, 0.15)',
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = form.watch('password');
  const strength = useMemo(
    () => getPasswordStrength(watchedPassword),
    [watchedPassword],
  );

  const handleSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      addToast({
        type: 'success',
        title: 'Account created!',
        message: 'Let\'s get your workspace set up.',
      });
      router.push('/setup');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.';
      setServerError(message);
    }
  };

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
          Create your account
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Get started with CrestDesk in minutes
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
        {/* Name fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              autoFocus
              placeholder="Jane"
              {...form.register('firstName')}
              className={cn(
                'mt-1 block w-full rounded-md border px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
                form.formState.errors.firstName
                  ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                  : 'border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
              )}
            />
            {form.formState.errors.firstName && (
              <p className="mt-1.5 text-xs text-[var(--color-danger)]">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-[var(--color-text-primary)]"
            >
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Doe"
              {...form.register('lastName')}
              className={cn(
                'mt-1 block w-full rounded-md border px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
                form.formState.errors.lastName
                  ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                  : 'border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]',
              )}
            />
            {form.formState.errors.lastName && (
              <p className="mt-1.5 text-xs text-[var(--color-danger)]">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>

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
              autoComplete="new-password"
              placeholder="Create a strong password"
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

          {/* Password strength indicator */}
          {watchedPassword && (
            <div className="mt-2">
              <div className="flex gap-1.5 mb-1.5">
                {[1, 2, 3, 4, 5, 6].map((segment) => (
                  <div
                    key={segment}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        segment <= strength.score
                          ? strength.color
                          : 'var(--color-border)',
                    }}
                  />
                ))}
              </div>
              <p
                className="text-xs font-medium"
                style={{ color: strength.color }}
              >
                {strength.label}
              </p>
            </div>
          )}

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
            Confirm password
          </label>
          <div className="relative mt-1">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
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
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-8 text-center text-sm text-[var(--color-text-secondary)]">
        Already have an account?{' '}
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
