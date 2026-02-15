'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';

type VerifyState = 'loading' | 'success' | 'error' | 'no-token';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'no-token');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token || hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        await api('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
          skipAuth: true,
        });
        setState('success');
      } catch (error: unknown) {
        setState('error');
        const message =
          error instanceof Error
            ? error.message
            : 'Email verification failed. The link may have expired.';
        setErrorMessage(message);
      }
    };

    verify();
  }, [token]);

  // Loading state
  if (state === 'loading') {
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
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center">
            <svg
              className="animate-spin h-10 w-10"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="var(--color-primary)"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="var(--color-primary)"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Verifying your email
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
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
            Email verified
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">
            Your email address has been verified successfully. You can now
            access all features of CrestDesk.
          </p>

          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2.5"
            >
              Go to dashboard
            </Link>
            <p className="text-sm text-[var(--color-text-secondary)]">
              or{' '}
              <Link
                href="/auth/login"
                className="font-medium text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] transition-colors"
              >
                sign in to another account
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (includes no-token)
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
          Verification failed
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">
          {state === 'no-token'
            ? 'No verification token found. Please use the link from your email.'
            : errorMessage || 'Email verification failed. The link may have expired.'}
        </p>

        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2.5"
          >
            Go to sign in
          </Link>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Need help?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-[var(--color-secondary)] hover:text-[var(--color-secondary-dark)] transition-colors"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
