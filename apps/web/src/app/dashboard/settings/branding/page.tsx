'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Check,
  FileText,
  Home,
  Loader2,
  Palette,
  Type,
  Upload,
  Users,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import { addToast } from '../../../../hooks/use-toast';

/* ─── Schema ─── */

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const brandingSchema = z.object({
  primaryColor: z
    .string()
    .regex(hexColorRegex, 'Enter a valid hex color (e.g. #1B3A5C)'),
  secondaryColor: z
    .string()
    .regex(hexColorRegex, 'Enter a valid hex color (e.g. #2A9D8F)'),
  fontFamily: z.string().min(1, 'Select a font'),
});

type BrandingFormData = z.infer<typeof brandingSchema>;

interface BrandingSettings {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
];

/* ─── Color Input Component ─── */

function ColorInput({
  label,
  value,
  onChange,
  error,
  id,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg border border-gray-300 shadow-sm flex-shrink-0"
          style={{ backgroundColor: hexColorRegex.test(value) ? value : '#ffffff' }}
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1B3A5C"
          maxLength={7}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
        />
        <input
          type="color"
          value={hexColorRegex.test(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
          title="Pick a color"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ─── Preview Panel ─── */

function BrandingPreview({
  primaryColor,
  secondaryColor,
  fontFamily,
  logoUrl,
}: {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl: string | null;
}) {
  const safePrimary = hexColorRegex.test(primaryColor) ? primaryColor : '#1B3A5C';
  const safeSecondary = hexColorRegex.test(secondaryColor) ? secondaryColor : '#2A9D8F';

  return (
    <div
      className="rounded-lg border border-gray-200 overflow-hidden shadow-sm"
      style={{ fontFamily: `${fontFamily}, system-ui, sans-serif` }}
    >
      {/* Mock sidebar + content */}
      <div className="flex h-[340px]">
        {/* Mini sidebar */}
        <div
          className="w-40 flex flex-col p-3 text-white"
          style={{ backgroundColor: safePrimary }}
        >
          <div className="mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-6 object-contain" />
            ) : (
              <span className="text-sm font-bold opacity-90">CrestDesk</span>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              { icon: Home, label: 'Dashboard', active: true },
              { icon: Users, label: 'Leads', active: false },
              { icon: FileText, label: 'Transactions', active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                  item.active ? 'bg-white/20 font-medium' : 'opacity-70'
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Mini content */}
        <div className="flex-1 bg-gray-50 p-4">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Dashboard</h3>
            <div
              className="h-6 w-6 rounded-full"
              style={{ backgroundColor: safeSecondary }}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {['Leads', 'Active', 'Revenue'].map((label) => (
              <div key={label} className="rounded-md bg-white p-2 border border-gray-100">
                <p className="text-[10px] text-gray-500">{label}</p>
                <p
                  className="text-sm font-bold"
                  style={{ color: safePrimary }}
                >
                  --
                </p>
              </div>
            ))}
          </div>

          {/* Mock chart area */}
          <div className="rounded-md bg-white border border-gray-100 p-3">
            <p className="text-[10px] text-gray-500 mb-2">Monthly Overview</p>
            <div className="flex items-end gap-1 h-16">
              {[40, 65, 45, 80, 55, 70, 60].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${h}%`,
                    backgroundColor: i % 2 === 0 ? safePrimary : safeSecondary,
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mock button */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded px-3 py-1 text-[10px] font-medium text-white"
              style={{ backgroundColor: safePrimary }}
            >
              Primary
            </button>
            <button
              type="button"
              className="rounded px-3 py-1 text-[10px] font-medium text-white"
              style={{ backgroundColor: safeSecondary }}
            >
              Secondary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page Component ─── */

export default function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const {
    data: branding,
    isLoading,
    error,
  } = useQuery<BrandingSettings>({
    queryKey: ['tenant-branding'],
    queryFn: () => api<BrandingSettings>('/tenant/branding'),
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: '#1B3A5C',
      secondaryColor: '#2A9D8F',
      fontFamily: 'Inter',
    },
  });

  useEffect(() => {
    if (branding) {
      reset({
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        fontFamily: branding.fontFamily,
      });
      setLogoUrl(branding.logoUrl);
    }
  }, [branding, reset]);

  const primaryColor = watch('primaryColor');
  const secondaryColor = watch('secondaryColor');
  const fontFamily = watch('fontFamily');

  const saveMutation = useMutation({
    mutationFn: (data: BrandingFormData) =>
      api<BrandingSettings>('/tenant/branding', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tenant-branding'], updated);
      addToast({ type: 'success', title: 'Branding updated successfully.' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to save branding', message: err.message });
    },
  });

  const onSubmit = useCallback(
    (data: BrandingFormData) => {
      saveMutation.mutate(data);
    },
    [saveMutation],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading branding settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-red-600">Failed to load branding settings.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['tenant-branding'] })}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="h-5 w-5 text-[#1B3A5C]" />
              <h2 className="text-lg font-semibold text-gray-900">Logo</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-16 w-40 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Upload className="h-5 w-5 mx-auto text-gray-400" />
                    <p className="text-[10px] text-gray-400 mt-1">Upload logo</p>
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  PNG or SVG, max 1MB. Recommended: 200x60px.
                </p>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="h-5 w-5 text-[#1B3A5C]" />
              <h2 className="text-lg font-semibold text-gray-900">Colors</h2>
            </div>
            <div className="space-y-4">
              <Controller
                control={control}
                name="primaryColor"
                render={({ field }) => (
                  <ColorInput
                    id="primaryColor"
                    label="Primary Color"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.primaryColor?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="secondaryColor"
                render={({ field }) => (
                  <ColorInput
                    id="secondaryColor"
                    label="Secondary Color"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.secondaryColor?.message}
                  />
                )}
              />
            </div>
          </div>

          {/* Font */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Type className="h-5 w-5 text-[#1B3A5C]" />
              <h2 className="text-lg font-semibold text-gray-900">Typography</h2>
            </div>
            <div>
              <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-1">
                Font Family
              </label>
              <Controller
                control={control}
                name="fontFamily"
                render={({ field }) => (
                  <select
                    id="fontFamily"
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] focus:outline-none"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.fontFamily && (
                <p className="mt-1 text-xs text-red-600">{errors.fontFamily.message}</p>
              )}
              <p
                className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
                style={{ fontFamily: `${fontFamily}, system-ui, sans-serif` }}
              >
                The quick brown fox jumps over the lazy dog. 0123456789
              </p>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h2>
            <BrandingPreview
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              fontFamily={fontFamily}
              logoUrl={logoUrl}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!isDirty || saveMutation.isPending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Branding
        </button>
      </div>
    </form>
  );
}
