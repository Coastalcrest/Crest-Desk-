'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Smartphone,
  Globe,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../stores/auth-store';
import { addToast } from '../../../../hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

/* ─── Password Change ─── */

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/,
        'Password must include uppercase, lowercase, number, and special character',
      ),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

/* ─── MFA ─── */

const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type MfaDisableFormData = z.infer<typeof mfaDisableSchema>;

/* ─── Sessions ─── */

interface Session {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
}

interface MfaSetupData {
  qrCodeUrl: string;
  secret: string;
}

export default function AccountSecurityPage() {
  return (
    <div className="space-y-6">
      <ChangePasswordSection />
      <MfaSection />
      <ActiveSessionsSection />
    </div>
  );
}

/* ─── Change Password Section ─── */

function ChangePasswordSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      api('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Password updated successfully.' });
      reset();
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to change password', message: err.message });
    },
  });

  const onSubmit = useCallback(
    (data: PasswordFormData) => {
      mutation.mutate(data);
    },
    [mutation],
  );

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="h-5 w-5 text-[#1B3A5C]" />
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              {...register('currentPassword')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              {...register('newPassword')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
}

/* ─── MFA Section ─── */

function MfaSection() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const mfaEnabled = user?.mfaEnabled ?? false;

  const [setupStep, setSetupStep] = useState<'idle' | 'qr' | 'verify'>('idle');
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  const enableMutation = useMutation({
    mutationFn: () => api<MfaSetupData>('/auth/mfa/setup', { method: 'POST' }),
    onSuccess: (data) => {
      setMfaSetupData(data);
      setSetupStep('qr');
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to start MFA setup', message: err.message });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (code: string) =>
      api('/auth/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, mfaEnabled: true });
      }
      setSetupStep('idle');
      setMfaSetupData(null);
      setVerifyCode('');
      addToast({ type: 'success', title: 'MFA enabled successfully.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Invalid verification code', message: err.message });
    },
  });

  const {
    register: registerDisable,
    handleSubmit: handleDisableSubmit,
    reset: resetDisable,
    formState: { errors: disableErrors },
  } = useForm<MfaDisableFormData>({
    resolver: zodResolver(mfaDisableSchema),
  });

  const disableMutation = useMutation({
    mutationFn: (data: MfaDisableFormData) =>
      api('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: data.password }),
      }),
    onSuccess: () => {
      if (user) {
        setUser({ ...user, mfaEnabled: false });
      }
      setShowDisableForm(false);
      resetDisable();
      addToast({ type: 'success', title: 'MFA disabled.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to disable MFA', message: err.message });
    },
  });

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        {mfaEnabled ? (
          <ShieldCheck className="h-5 w-5 text-green-600" />
        ) : (
          <ShieldOff className="h-5 w-5 text-amber-500" />
        )}
        <h2 className="text-lg font-semibold text-gray-900">
          Multi-Factor Authentication
        </h2>
        <span
          className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            mfaEnabled
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {mfaEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {mfaEnabled
          ? 'Your account is secured with multi-factor authentication.'
          : 'Add an extra layer of security to your account by enabling multi-factor authentication.'}
      </p>

      {/* Enable Flow */}
      {!mfaEnabled && setupStep === 'idle' && (
        <button
          type="button"
          onClick={() => enableMutation.mutate()}
          disabled={enableMutation.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {enableMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Enable MFA
        </button>
      )}

      {setupStep === 'qr' && mfaSetupData && (
        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-gray-50 p-6">
            <p className="text-sm text-gray-600 mb-4 text-center">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <img
                src={mfaSetupData.qrCodeUrl}
                alt="MFA QR Code"
                className="h-48 w-48"
              />
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Or enter this code manually:</p>
              <code className="rounded bg-gray-100 px-3 py-1 text-sm font-mono text-gray-800 select-all">
                {mfaSetupData.secret}
              </code>
            </div>
          </div>

          <div className="max-w-xs">
            <label htmlFor="mfaVerifyCode" className="block text-sm font-medium text-gray-700 mb-1">
              Enter verification code
            </label>
            <input
              id="mfaVerifyCode"
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-center tracking-widest font-mono focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => confirmMutation.mutate(verifyCode)}
              disabled={verifyCode.length !== 6 || confirmMutation.isPending}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & Enable
            </button>
            <button
              type="button"
              onClick={() => {
                setSetupStep('idle');
                setMfaSetupData(null);
                setVerifyCode('');
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Disable Flow */}
      {mfaEnabled && !showDisableForm && (
        <button
          type="button"
          onClick={() => setShowDisableForm(true)}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Disable MFA
        </button>
      )}

      {mfaEnabled && showDisableForm && (
        <form
          onSubmit={handleDisableSubmit((d) => disableMutation.mutate(d))}
          className="max-w-md space-y-4 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700 font-medium">
            Enter your password to confirm disabling MFA.
          </p>
          <div>
            <label htmlFor="disablePassword" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="disablePassword"
              type="password"
              {...registerDisable('password')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            {disableErrors.password && (
              <p className="mt-1 text-xs text-red-600">{disableErrors.password.message}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={disableMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {disableMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Disable
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDisableForm(false);
                resetDisable();
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ─── Active Sessions Section ─── */

function ActiveSessionsSection() {
  const queryClient = useQueryClient();

  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery<Session[]>({
    queryKey: ['user-sessions'],
    queryFn: () => api<Session[]>('/users/me/sessions'),
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api(`/users/me/sessions/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-sessions'] });
      addToast({ type: 'success', title: 'Session revoked.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to revoke session', message: err.message });
    },
  });

  const getDeviceIcon = (deviceInfo: string) => {
    const lower = deviceInfo.toLowerCase();
    if (lower.includes('mobile') || lower.includes('phone') || lower.includes('android') || lower.includes('iphone')) {
      return Smartphone;
    }
    if (lower.includes('api') || lower.includes('bot')) {
      return Globe;
    }
    return Monitor;
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <Monitor className="h-5 w-5 text-[#1B3A5C]" />
        <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading sessions...</span>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-600">Failed to load sessions.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['user-sessions'] })}
            className="mt-2 text-sm font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {sessions && sessions.length === 0 && (
        <p className="text-sm text-gray-500">No active sessions found.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className="divide-y divide-gray-100">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.deviceInfo);
            return (
              <div
                key={session.id}
                className={`flex items-center justify-between py-3 ${
                  session.isCurrent ? 'bg-[#1B3A5C]/5 -mx-6 px-6 first:rounded-t-lg' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DeviceIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.deviceInfo}
                      </p>
                      {session.isCurrent && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {session.ipAddress} &middot;{' '}
                      {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate(session.id)}
                    disabled={revokeMutation.isPending}
                    className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
