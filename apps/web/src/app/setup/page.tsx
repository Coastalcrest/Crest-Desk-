'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardData {
  // Step 1 - Welcome
  brokerageName: string;
  contactName: string;
  // Step 2 - License & Compliance
  licensedStates: string[];
  licenseNumbers: Record<string, string>;
  // Step 3 - Branding
  logoFile: File | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  // Step 4 - Email
  emailProvider: 'gmail' | 'outlook' | null;
  emailConnected: boolean;
  // Step 5 - MLS
  mlsBoardName: string;
  mlsUrl: string;
  mlsUsername: string;
  mlsPassword: string;
  mlsConnected: boolean;
  // Step 6 - QuickBooks
  quickbooksConnected: boolean;
  // Step 7 - Social Media
  socialConnections: { facebook: boolean; instagram: boolean; linkedin: boolean };
  // Step 8 - Invite Agents
  invites: Array<{ firstName: string; lastName: string; email: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 9;

const STEP_LABELS = [
  'Welcome',
  'License',
  'Branding',
  'Email',
  'MLS',
  'QuickBooks',
  'Social',
  'Invite',
  'Review',
];

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter (Default)' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'open-sans', label: 'Open Sans' },
  { value: 'lato', label: 'Lato' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'montserrat', label: 'Montserrat' },
];

const SKIPPABLE_STEPS = [3, 4, 5, 6]; // Email, MLS, QuickBooks, Social (0-indexed)

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  totalSteps,
  stepLabels,
}: {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      {stepLabels.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200',
                i < currentStep
                  ? 'bg-[#2A9D8F] text-white'
                  : i === currentStep
                    ? 'bg-[#1B3A5C] text-white'
                    : 'bg-gray-200 text-gray-500',
              )}
            >
              {i < currentStep ? '\u2713' : i + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium hidden sm:block',
                i === currentStep ? 'text-[#1B3A5C]' : 'text-gray-400',
              )}
            >
              {label}
            </span>
          </div>
          {i < totalSteps - 1 && (
            <div
              className={cn(
                'w-12 h-0.5 mx-1 mt-[-18px] sm:mt-[-18px] transition-colors duration-200',
                i < currentStep ? 'bg-[#2A9D8F]' : 'bg-gray-200',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const pct = Math.round(((currentStep + 1) / totalSteps) * 100);
  return (
    <div className="w-full bg-gray-100 h-1">
      <div
        className="h-1 bg-[#2A9D8F] transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-full bg-[#1B3A5C] flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#1B3A5C] mb-2">Welcome to CrestDesk</h1>
        <p className="text-gray-500 text-lg">
          Let&apos;s get your brokerage set up. This wizard will walk you through the essentials in
          just a few minutes.
        </p>
      </div>

      <div className="space-y-4 text-left">
        <div>
          <label htmlFor="brokerageName" className="block text-sm font-medium text-gray-700 mb-1">
            Brokerage Name
          </label>
          <input
            id="brokerageName"
            type="text"
            value={data.brokerageName}
            onChange={(e) => onChange({ brokerageName: e.target.value })}
            placeholder="e.g. Coastal Crest Realty LLC"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none transition-colors"
          />
        </div>
        <div>
          <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1">
            Primary Contact Name
          </label>
          <input
            id="contactName"
            type="text"
            value={data.contactName}
            onChange={(e) => onChange({ contactName: e.target.value })}
            placeholder="Your full name"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: License & Compliance
// ---------------------------------------------------------------------------

function StepLicense({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const toggleState = (code: string) => {
    const next = data.licensedStates.includes(code)
      ? data.licensedStates.filter((s) => s !== code)
      : [...data.licensedStates, code];
    const nextNumbers = { ...data.licenseNumbers };
    if (!next.includes(code)) {
      delete nextNumbers[code];
    }
    onChange({ licensedStates: next, licenseNumbers: nextNumbers });
  };

  const setLicense = (code: string, value: string) => {
    onChange({ licenseNumbers: { ...data.licenseNumbers, [code]: value } });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">License & Compliance</h2>
        <p className="text-gray-500">Select every state where your brokerage holds a license.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-2">
        {US_STATES.map((st) => {
          const checked = data.licensedStates.includes(st.code);
          return (
            <div
              key={st.code}
              className={cn(
                'rounded-lg border p-3 transition-colors cursor-pointer',
                checked ? 'border-[#2A9D8F] bg-[#2A9D8F]/5' : 'border-gray-200 hover:border-gray-300',
              )}
              onClick={() => toggleState(st.code)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleState(st.code);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                    checked ? 'bg-[#2A9D8F] border-[#2A9D8F]' : 'border-gray-300',
                  )}
                >
                  {checked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {st.code} &mdash; {st.name}
                </span>
              </div>
              {checked && (
                <input
                  type="text"
                  value={data.licenseNumbers[st.code] ?? ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    setLicense(st.code, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="License #"
                  className="mt-2 w-full rounded border border-gray-300 px-2.5 py-1.5 text-xs focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]/20 outline-none"
                />
              )}
            </div>
          );
        })}
      </div>

      {data.licensedStates.length > 0 && (
        <p className="text-sm text-[#2A9D8F] font-medium mt-4 text-center">
          {data.licensedStates.length} state{data.licensedStates.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Branding
// ---------------------------------------------------------------------------

function StepBranding({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">Branding</h2>
        <p className="text-gray-500">Customize CrestDesk to match your brokerage brand.</p>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Brokerage Logo</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1B3A5C] transition-colors">
            {data.logoFile ? (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-[#2A9D8F]/10 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-[#2A9D8F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-700 font-medium">{data.logoFile.name}</p>
                <button
                  type="button"
                  onClick={() => onChange({ logoFile: null })}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="cursor-pointer space-y-2 block">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">
                  <span className="text-[#1B3A5C] font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PNG, JPG, or SVG up to 2 MB</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    onChange({ logoFile: file });
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: data.primaryColor || '#1B3A5C' }}
              />
              <input
                id="primaryColor"
                type="text"
                value={data.primaryColor}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                placeholder="#1B3A5C"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: data.secondaryColor || '#2A9D8F' }}
              />
              <input
                id="secondaryColor"
                type="text"
                value={data.secondaryColor}
                onChange={(e) => onChange({ secondaryColor: e.target.value })}
                placeholder="#2A9D8F"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Font */}
        <div>
          <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-1">
            Font Family
          </label>
          <select
            id="fontFamily"
            value={data.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none bg-white"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Email
// ---------------------------------------------------------------------------

function StepEmail({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const connect = (provider: 'gmail' | 'outlook') => {
    onChange({ emailProvider: provider, emailConnected: true });
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">Connect Email</h2>
        <p className="text-gray-500">
          Link your brokerage email to send and receive messages from CrestDesk.
        </p>
      </div>

      {data.emailConnected ? (
        <div className="rounded-xl border border-[#2A9D8F] bg-[#2A9D8F]/5 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#2A9D8F] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[#1B3A5C]">
            {data.emailProvider === 'gmail' ? 'Gmail' : 'Outlook'} Connected
          </p>
          <p className="text-sm text-gray-500 mt-1">Your email account has been linked successfully.</p>
          <button
            type="button"
            onClick={() => onChange({ emailProvider: null, emailConnected: false })}
            className="mt-4 text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => connect('gmail')}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 p-6 hover:border-[#1B3A5C] hover:bg-gray-50 transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">Connect Gmail</span>
          </button>
          <button
            type="button"
            onClick={() => connect('outlook')}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 p-6 hover:border-[#1B3A5C] hover:bg-gray-50 transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 5H3a2 2 0 00-2 2v10a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zm0 12H3V9.23l9 4.5 9-4.5V17zM3 7h18l-9 4.5L3 7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">Connect Outlook</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5: MLS
// ---------------------------------------------------------------------------

function StepMLS({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const [testing, setTesting] = useState(false);

  const testConnection = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      onChange({ mlsConnected: true });
    }, 1500);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">MLS Integration</h2>
        <p className="text-gray-500">
          Connect to your MLS board for automatic listing data sync.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="mlsBoardName" className="block text-sm font-medium text-gray-700 mb-1">
            MLS Board Name
          </label>
          <input
            id="mlsBoardName"
            type="text"
            value={data.mlsBoardName}
            onChange={(e) => onChange({ mlsBoardName: e.target.value })}
            placeholder="e.g. Bright MLS, CRMLS, Stellar MLS"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
          />
        </div>

        <div>
          <label htmlFor="mlsUrl" className="block text-sm font-medium text-gray-700 mb-1">
            RETS / RESO URL
          </label>
          <input
            id="mlsUrl"
            type="url"
            value={data.mlsUrl}
            onChange={(e) => onChange({ mlsUrl: e.target.value })}
            placeholder="https://rets.yourmls.com/rets/login"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="mlsUsername" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="mlsUsername"
              type="text"
              value={data.mlsUsername}
              onChange={(e) => onChange({ mlsUsername: e.target.value })}
              placeholder="MLS username"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
            />
          </div>
          <div>
            <label htmlFor="mlsPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="mlsPassword"
              type="password"
              value={data.mlsPassword}
              onChange={(e) => onChange({ mlsPassword: e.target.value })}
              placeholder="MLS password"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
            />
          </div>
        </div>

        {data.mlsConnected ? (
          <div className="rounded-lg border border-[#2A9D8F] bg-[#2A9D8F]/5 p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2A9D8F] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B3A5C]">Connection Successful</p>
              <p className="text-xs text-gray-500">MLS data feed is ready to sync.</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={testConnection}
            disabled={testing || !data.mlsUrl || !data.mlsUsername || !data.mlsPassword}
            className={cn(
              'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              testing || !data.mlsUrl || !data.mlsUsername || !data.mlsPassword
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#1B3A5C] text-white hover:bg-[#1B3A5C]/90',
            )}
          >
            {testing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing Connection...
              </span>
            ) : (
              'Test Connection'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6: QuickBooks
// ---------------------------------------------------------------------------

function StepQuickBooks({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">QuickBooks Integration</h2>
        <p className="text-gray-500">
          Connect QuickBooks to automatically sync commissions, expenses, and invoices.
        </p>
      </div>

      {data.quickbooksConnected ? (
        <div className="rounded-xl border border-[#2A9D8F] bg-[#2A9D8F]/5 p-6">
          <div className="w-12 h-12 rounded-full bg-[#2A9D8F] flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[#1B3A5C]">QuickBooks Connected</p>
          <p className="text-sm text-gray-500 mt-1">Financial data will sync automatically.</p>
          <button
            type="button"
            onClick={() => onChange({ quickbooksConnected: false })}
            className="mt-4 text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange({ quickbooksConnected: true })}
          className="inline-flex items-center gap-3 rounded-xl border-2 border-gray-200 px-8 py-5 hover:border-[#1B3A5C] hover:bg-gray-50 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-700">Connect QuickBooks</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 7: Social Media
// ---------------------------------------------------------------------------

function StepSocial({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const toggle = (platform: keyof WizardData['socialConnections']) => {
    onChange({
      socialConnections: {
        ...data.socialConnections,
        [platform]: !data.socialConnections[platform],
      },
    });
  };

  const platforms: Array<{
    key: keyof WizardData['socialConnections'];
    label: string;
    color: string;
    bgColor: string;
  }> = [
    { key: 'facebook', label: 'Facebook', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { key: 'instagram', label: 'Instagram', color: 'text-pink-600', bgColor: 'bg-pink-50' },
    { key: 'linkedin', label: 'LinkedIn', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">Social Media</h2>
        <p className="text-gray-500">
          Connect your social accounts to schedule and publish posts from CrestDesk.
        </p>
      </div>

      <div className="space-y-3">
        {platforms.map(({ key, label, color, bgColor }) => (
          <div
            key={key}
            className={cn(
              'flex items-center justify-between rounded-xl border-2 p-4 transition-all',
              data.socialConnections[key]
                ? 'border-[#2A9D8F] bg-[#2A9D8F]/5'
                : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', bgColor)}>
                <svg className={cn('w-5 h-5', color)} fill="currentColor" viewBox="0 0 24 24">
                  {key === 'facebook' && (
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  )}
                  {key === 'instagram' && (
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  )}
                  {key === 'linkedin' && (
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  )}
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">
                  {data.socialConnections[key] ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                data.socialConnections[key]
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-[#1B3A5C] text-white hover:bg-[#1B3A5C]/90',
              )}
            >
              {data.socialConnections[key] ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 8: Invite Agents
// ---------------------------------------------------------------------------

function StepInvite({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const addInvite = () => {
    onChange({ invites: [...data.invites, { firstName: '', lastName: '', email: '' }] });
  };

  const removeInvite = (idx: number) => {
    onChange({ invites: data.invites.filter((_, i) => i !== idx) });
  };

  const updateInvite = (idx: number, field: 'firstName' | 'lastName' | 'email', value: string) => {
    const next = data.invites.map((inv, i) => (i === idx ? { ...inv, [field]: value } : inv));
    onChange({ invites: next });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">Invite Your Agents</h2>
        <p className="text-gray-500">
          Add your team members now or skip and invite them later from the dashboard.
        </p>
      </div>

      <div className="space-y-3">
        {data.invites.map((inv, idx) => (
          <div key={idx} className="flex items-start gap-2 rounded-lg border border-gray-200 p-3">
            <div className="grid grid-cols-3 gap-2 flex-1">
              <input
                type="text"
                value={inv.firstName}
                onChange={(e) => updateInvite(idx, 'firstName', e.target.value)}
                placeholder="First name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
              />
              <input
                type="text"
                value={inv.lastName}
                onChange={(e) => updateInvite(idx, 'lastName', e.target.value)}
                placeholder="Last name"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
              />
              <input
                type="email"
                value={inv.email}
                onChange={(e) => updateInvite(idx, 'email', e.target.value)}
                placeholder="Email address"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/20 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => removeInvite(idx)}
              className="mt-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              aria-label="Remove invite"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addInvite}
        className="mt-4 w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 hover:border-[#1B3A5C] hover:text-[#1B3A5C] transition-colors"
      >
        + Add Another Agent
      </button>

      {data.invites.length === 0 && (
        <p className="text-center text-sm text-gray-400 mt-4">
          No agents added yet. You can always invite agents later from the dashboard.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 9: Review & Launch
// ---------------------------------------------------------------------------

function StepReview({ data }: { data: WizardData }) {
  const sections: Array<{
    label: string;
    completed: boolean;
    summary: string;
  }> = [
    {
      label: 'Welcome',
      completed: Boolean(data.brokerageName && data.contactName),
      summary: data.brokerageName || 'Not provided',
    },
    {
      label: 'License & Compliance',
      completed: data.licensedStates.length > 0,
      summary:
        data.licensedStates.length > 0
          ? `${data.licensedStates.length} state${data.licensedStates.length !== 1 ? 's' : ''} licensed`
          : 'No states selected',
    },
    {
      label: 'Branding',
      completed: Boolean(data.primaryColor || data.secondaryColor || data.logoFile),
      summary: data.logoFile ? 'Logo uploaded, colors configured' : 'Colors configured',
    },
    {
      label: 'Email',
      completed: data.emailConnected,
      summary: data.emailConnected
        ? `${data.emailProvider === 'gmail' ? 'Gmail' : 'Outlook'} connected`
        : 'Skipped',
    },
    {
      label: 'MLS',
      completed: data.mlsConnected,
      summary: data.mlsConnected ? `${data.mlsBoardName} connected` : 'Skipped',
    },
    {
      label: 'QuickBooks',
      completed: data.quickbooksConnected,
      summary: data.quickbooksConnected ? 'Connected' : 'Skipped',
    },
    {
      label: 'Social Media',
      completed:
        data.socialConnections.facebook ||
        data.socialConnections.instagram ||
        data.socialConnections.linkedin,
      summary: (() => {
        const connected = Object.entries(data.socialConnections)
          .filter(([, v]) => v)
          .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
        return connected.length > 0 ? connected.join(', ') : 'Skipped';
      })(),
    },
    {
      label: 'Invite Agents',
      completed: data.invites.length > 0 && data.invites.some((i) => i.email),
      summary:
        data.invites.length > 0
          ? `${data.invites.length} agent${data.invites.length !== 1 ? 's' : ''} invited`
          : 'No agents invited',
    },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#1B3A5C] mb-1">Review & Launch</h2>
        <p className="text-gray-500">Everything looks good. Review your setup and launch CrestDesk.</p>
      </div>

      <div className="space-y-2">
        {sections.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
          >
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                s.completed ? 'bg-[#2A9D8F]' : 'bg-amber-400',
              )}
            >
              {s.completed ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-700">{s.label}</p>
              <p className="text-xs text-gray-500 truncate">{s.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard Page
// ---------------------------------------------------------------------------

const INITIAL_DATA: WizardData = {
  brokerageName: '',
  contactName: '',
  licensedStates: [],
  licenseNumbers: {},
  logoFile: null,
  primaryColor: '#1B3A5C',
  secondaryColor: '#2A9D8F',
  fontFamily: 'inter',
  emailProvider: null,
  emailConnected: false,
  mlsBoardName: '',
  mlsUrl: '',
  mlsUsername: '',
  mlsPassword: '',
  mlsConnected: false,
  quickbooksConnected: false,
  socialConnections: { facebook: false, instagram: false, linkedin: false },
  invites: [],
};

export default function SetupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => ({
    ...INITIAL_DATA,
    contactName: user ? `${user.firstName} ${user.lastName}` : '',
  }));
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchData = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const canSkip = SKIPPABLE_STEPS.includes(currentStep);

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);

    try {
      // Update tenant settings
      await api('/tenant', {
        method: 'PATCH',
        body: JSON.stringify({
          name: data.brokerageName,
          licensedStates: data.licensedStates,
          licenseNumbers: data.licenseNumbers,
        }),
      });

      // Update branding
      await api('/tenant/branding', {
        method: 'PATCH',
        body: JSON.stringify({
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          fontFamily: data.fontFamily,
        }),
      });

      // Send invites
      const validInvites = data.invites.filter((inv) => inv.email.trim());
      for (const invite of validInvites) {
        await api('/users/invite', {
          method: 'POST',
          body: JSON.stringify({
            firstName: invite.firstName,
            lastName: invite.lastName,
            email: invite.email,
          }),
        });
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
      setLaunching(false);
    }
  };

  // Determine whether the "Next" button should be disabled on mandatory steps
  const isNextDisabled = (() => {
    if (currentStep === 0) {
      return !data.brokerageName.trim() || !data.contactName.trim();
    }
    if (currentStep === 1) {
      return data.licensedStates.length === 0;
    }
    return false;
  })();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress bar */}
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <StepIndicator
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            stepLabels={STEP_LABELS}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full">
          {currentStep === 0 && <StepWelcome data={data} onChange={patchData} />}
          {currentStep === 1 && <StepLicense data={data} onChange={patchData} />}
          {currentStep === 2 && <StepBranding data={data} onChange={patchData} />}
          {currentStep === 3 && <StepEmail data={data} onChange={patchData} />}
          {currentStep === 4 && <StepMLS data={data} onChange={patchData} />}
          {currentStep === 5 && <StepQuickBooks data={data} onChange={patchData} />}
          {currentStep === 6 && <StepSocial data={data} onChange={patchData} />}
          {currentStep === 7 && <StepInvite data={data} onChange={patchData} />}
          {currentStep === 8 && <StepReview data={data} />}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4">
          <div className="max-w-lg mx-auto mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="border-t border-gray-100 bg-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 mr-2">
              Step {currentStep + 1} of {TOTAL_STEPS}
            </span>

            {canSkip && currentStep < TOTAL_STEPS - 1 && (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            )}

            {currentStep < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={isNextDisabled}
                className={cn(
                  'rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
                  isNextDisabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#1B3A5C] text-white hover:bg-[#1B3A5C]/90',
                )}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunch}
                disabled={launching}
                className={cn(
                  'rounded-lg px-8 py-2.5 text-sm font-semibold transition-colors',
                  launching
                    ? 'bg-[#2A9D8F]/70 text-white cursor-not-allowed'
                    : 'bg-[#2A9D8F] text-white hover:bg-[#2A9D8F]/90',
                )}
              >
                {launching ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Launching...
                  </span>
                ) : (
                  'Launch CrestDesk'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
