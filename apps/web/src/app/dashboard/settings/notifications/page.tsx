'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock, Loader2, Moon } from 'lucide-react';
import { api } from '../../../../lib/api';
import { addToast } from '../../../../hooks/use-toast';

/* ─── Types ─── */

const NOTIFICATION_TYPES = [
  { key: 'transactions', label: 'Transactions', description: 'Updates on transaction status changes and milestones' },
  { key: 'leads', label: 'Leads', description: 'New lead assignments and lead activity alerts' },
  { key: 'documents', label: 'Documents', description: 'Document signing requests and completion notices' },
  { key: 'marketing', label: 'Marketing', description: 'Campaign performance and content approval requests' },
  { key: 'compliance_alerts', label: 'Compliance Alerts', description: 'Compliance violations and deadline warnings' },
  { key: 'team_updates', label: 'Team Updates', description: 'Team member activity and brokerage announcements' },
] as const;

const CHANNELS = ['email', 'push', 'sms'] as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[number]['key'];
type Channel = (typeof CHANNELS)[number];

type ChannelPreferences = Record<Channel, boolean>;
type NotificationPreferences = Record<NotificationType, ChannelPreferences>;

const notificationPrefsSchema = z.object({
  preferences: z.record(
    z.string(),
    z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
    }),
  ),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  }),
  weekendDnd: z.boolean(),
});

type NotificationFormData = z.infer<typeof notificationPrefsSchema>;

interface NotificationSettings {
  preferences: NotificationPreferences;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  weekendDnd: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  transactions: { email: true, push: true, sms: false },
  leads: { email: true, push: true, sms: true },
  documents: { email: true, push: true, sms: false },
  marketing: { email: true, push: false, sms: false },
  compliance_alerts: { email: true, push: true, sms: true },
  team_updates: { email: true, push: false, sms: false },
};

/* ─── Toggle Component ─── */

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B3A5C] ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'bg-[#2A9D8F]' : 'bg-gray-300'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/* ─── Page Component ─── */

export default function NotificationsSettingsPage() {
  const queryClient = useQueryClient();

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<NotificationSettings>({
    queryKey: ['notification-settings'],
    queryFn: () => api<NotificationSettings>('/users/me/notifications'),
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<NotificationFormData>({
    resolver: zodResolver(notificationPrefsSchema),
    defaultValues: {
      preferences: DEFAULT_PREFERENCES,
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
      weekendDnd: false,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        preferences: settings.preferences,
        quietHours: settings.quietHours,
        weekendDnd: settings.weekendDnd,
      });
    }
  }, [settings, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: NotificationFormData) =>
      api<NotificationSettings>('/users/me/notifications', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['notification-settings'], updated);
      addToast({ type: 'success', title: 'Notification preferences saved.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to save preferences', message: err.message });
    },
  });

  const onSubmit = useCallback(
    (data: NotificationFormData) => {
      saveMutation.mutate(data);
    },
    [saveMutation],
  );

  const preferences = watch('preferences');
  const quietHours = watch('quietHours');
  const weekendDnd = watch('weekendDnd');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading preferences...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-red-600">Failed to load notification settings.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['notification-settings'] })}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Notification Preferences Grid */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-[#1B3A5C]" />
          <h2 className="text-lg font-semibold text-gray-900">Notification Channels</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Choose how you want to be notified for each type of event.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-8 text-left text-sm font-medium text-gray-500">
                  Notification Type
                </th>
                {CHANNELS.map((channel) => (
                  <th
                    key={channel}
                    className="pb-3 px-4 text-center text-sm font-medium text-gray-500 capitalize"
                  >
                    {channel === 'sms' ? 'SMS' : channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {NOTIFICATION_TYPES.map((type) => (
                <tr key={type.key}>
                  <td className="py-4 pr-8">
                    <p className="text-sm font-medium text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                  </td>
                  {CHANNELS.map((channel) => (
                    <td key={channel} className="py-4 px-4 text-center">
                      <Controller
                        control={control}
                        name={`preferences.${type.key}.${channel}`}
                        render={({ field }) => (
                          <Toggle
                            checked={!!field.value}
                            onChange={field.onChange}
                            label={`${type.label} ${channel}`}
                          />
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-[#1B3A5C]" />
          <h2 className="text-lg font-semibold text-gray-900">Quiet Hours</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Pause non-urgent notifications during specified hours.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Enable Quiet Hours</label>
            <Controller
              control={control}
              name="quietHours.enabled"
              render={({ field }) => (
                <Toggle
                  checked={!!field.value}
                  onChange={field.onChange}
                  label="Enable quiet hours"
                />
              )}
            />
          </div>

          {quietHours.enabled && (
            <div className="flex items-center gap-4 pl-4 border-l-2 border-[#2A9D8F]/30">
              <div>
                <label htmlFor="quietStart" className="block text-xs font-medium text-gray-500 mb-1">
                  Start Time
                </label>
                <Controller
                  control={control}
                  name="quietHours.start"
                  render={({ field }) => (
                    <input
                      id="quietStart"
                      type="time"
                      value={field.value}
                      onChange={field.onChange}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
                    />
                  )}
                />
              </div>
              <span className="mt-5 text-sm text-gray-400">to</span>
              <div>
                <label htmlFor="quietEnd" className="block text-xs font-medium text-gray-500 mb-1">
                  End Time
                </label>
                <Controller
                  control={control}
                  name="quietHours.end"
                  render={({ field }) => (
                    <input
                      id="quietEnd"
                      type="time"
                      value={field.value}
                      onChange={field.onChange}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
                    />
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekend DND */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Moon className="h-5 w-5 text-[#1B3A5C]" />
          <h2 className="text-lg font-semibold text-gray-900">Weekend Do Not Disturb</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Pause all non-urgent notifications on weekends
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Critical compliance alerts will still be delivered.
            </p>
          </div>
          <Controller
            control={control}
            name="weekendDnd"
            render={({ field }) => (
              <Toggle
                checked={!!field.value}
                onChange={field.onChange}
                label="Weekend do not disturb"
              />
            )}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isDirty || saveMutation.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Preferences
        </button>
      </div>
    </form>
  );
}
