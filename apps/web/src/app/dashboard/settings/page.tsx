'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Loader2, Plus, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/auth-store';
import { addToast } from '../../../hooks/use-toast';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Enter a valid phone number')
    .or(z.literal('')),
  licensedStates: z.array(z.string()).default([]),
  licenseNumbers: z.record(z.string(), z.string()).default({}),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string | null;
  licensedStates: string[];
  licenseNumbers: Record<string, string>;
}

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const currentUser = useAuthStore((s) => s.user);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: () => api<UserProfile>('/users/me'),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      licensedStates: [],
      licenseNumbers: {},
    },
  });

  const licensedStates = watch('licensedStates');
  const licenseNumbers = watch('licenseNumbers');

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? '',
        licensedStates: profile.licensedStates ?? [],
        licenseNumbers: profile.licenseNumbers ?? {},
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      api<UserProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['user-profile'], updatedProfile);
      if (currentUser) {
        setUser({
          ...currentUser,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          phone: updatedProfile.phone ?? undefined,
          licensedStates: updatedProfile.licensedStates,
        });
      }
      addToast({ type: 'success', title: 'Profile updated successfully.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to update profile', message: err.message });
    },
  });

  const onSubmit = useCallback(
    (data: ProfileFormData) => {
      updateMutation.mutate(data);
    },
    [updateMutation],
  );

  const addState = useCallback(
    (state: string) => {
      if (!licensedStates.includes(state)) {
        setValue('licensedStates', [...licensedStates, state], { shouldDirty: true });
      }
      setStateDropdownOpen(false);
      setStateSearch('');
    },
    [licensedStates, setValue],
  );

  const removeState = useCallback(
    (state: string) => {
      setValue(
        'licensedStates',
        licensedStates.filter((s) => s !== state),
        { shouldDirty: true },
      );
      const updated = { ...licenseNumbers };
      delete updated[state];
      setValue('licenseNumbers', updated, { shouldDirty: true });
    },
    [licensedStates, licenseNumbers, setValue],
  );

  const filteredStates = US_STATES.filter(
    (s) =>
      !licensedStates.includes(s) &&
      s.toLowerCase().includes(stateSearch.toLowerCase()),
  );

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading profile...</span>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-red-600">Failed to load profile. Please try again.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['user-profile'] })}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-gray-500">
                  {profile?.firstName?.[0] ?? ''}
                  {profile?.lastName?.[0] ?? ''}
                </span>
              )}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3A5C] text-white shadow-md hover:bg-[#2A5A8C] transition-colors"
              title="Upload photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Upload a profile photo. JPG, PNG, or GIF. Max 2MB.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Photo upload will be available soon.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              {...register('lastName')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="+15551234567"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={profile?.email ?? ''}
              readOnly
              disabled
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-400">
              Contact support to change your email address.
            </p>
          </div>
        </div>
      </div>

      {/* Licensed States & License Numbers */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Licensing</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Licensed States
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add State
              </button>

              {stateDropdownOpen && (
                <div className="absolute z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search states..."
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <ul className="max-h-40 overflow-y-auto">
                    {filteredStates.map((state) => (
                      <li key={state}>
                        <button
                          type="button"
                          onClick={() => addState(state)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {state}
                        </button>
                      </li>
                    ))}
                    {filteredStates.length === 0 && (
                      <li className="px-4 py-2 text-sm text-gray-400">No states found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {licensedStates.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {licensedStates.map((state) => (
                  <span
                    key={state}
                    className="inline-flex items-center gap-1 rounded-full bg-[#1B3A5C]/10 px-3 py-1 text-sm font-medium text-[#1B3A5C]"
                  >
                    {state}
                    <button
                      type="button"
                      onClick={() => removeState(state)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {licensedStates.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                License Numbers
              </label>
              {licensedStates.map((state) => (
                <div key={state} className="flex items-center gap-3">
                  <span className="w-10 text-sm font-medium text-gray-600">{state}</span>
                  <input
                    type="text"
                    value={licenseNumbers[state] ?? ''}
                    onChange={(e) => {
                      setValue(
                        'licenseNumbers',
                        { ...licenseNumbers, [state]: e.target.value },
                        { shouldDirty: true },
                      );
                    }}
                    placeholder={`License number for ${state}`}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isDirty || updateMutation.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}
