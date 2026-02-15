'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Calendar,
  Upload,
  CreditCard,
  Share2,
  Palette,
  ShieldCheck,
  Bell,
  PartyPopper,
  Check,
  ChevronRight,
  ChevronLeft,
  Camera,
  Phone,
  X,
  Sun,
  Moon,
  Smartphone,
  FileText,
  Users,
  Megaphone,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { api } from '../../lib/api';
import { addToast } from '../../hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OnboardingData {
  // Step 1 - Profile
  firstName: string;
  lastName: string;
  phone: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  // Step 2 - Email
  emailProvider: 'gmail' | 'outlook' | null;
  emailConnected: boolean;
  // Step 3 - Calendar
  calendarProvider: 'google' | 'outlook' | null;
  calendarConnected: boolean;
  // Step 4 - Contacts
  contactImportMethod: 'csv' | 'crm' | null;
  crmProvider: string;
  csvFile: File | null;
  csvPreview: string[][] | null;
  // Step 5 - QuickBooks
  quickbooksConnected: boolean;
  // Step 6 - Social Media
  socialConnections: { facebook: boolean; instagram: boolean; linkedin: boolean };
  // Step 7 - Marketing
  marketingTone: 'formal' | 'casual' | 'enthusiastic';
  emojiUsage: 'always' | 'sometimes' | 'never';
  preferredPlatforms: string[];
  publishingMode: 'auto' | 'approval';
  // Step 8 - License
  licensedStates: string[];
  licenseNumbers: Record<string, string>;
  // Step 9 - Notifications
  notifications: {
    email: { transactions: boolean; leads: boolean; documents: boolean; marketing: boolean };
    push: { transactions: boolean; leads: boolean; documents: boolean; marketing: boolean };
    sms: { transactions: boolean; leads: boolean; documents: boolean; marketing: boolean };
  };
  quietHoursStart: string;
  quietHoursEnd: string;
  weekendDnd: boolean;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------
const STEPS = [
  { label: 'Profile', icon: User },
  { label: 'Email', icon: Mail },
  { label: 'Calendar', icon: Calendar },
  { label: 'Contacts', icon: Upload },
  { label: 'QuickBooks', icon: CreditCard },
  { label: 'Social', icon: Share2 },
  { label: 'Marketing', icon: Palette },
  { label: 'License', icon: ShieldCheck },
  { label: 'Notifications', icon: Bell },
  { label: 'Complete', icon: PartyPopper },
] as const;

// US states for license selection
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC',
];

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const CRM_OPTIONS = [
  { value: 'followupboss', label: 'Follow Up Boss' },
  { value: 'kvcore', label: 'KVCore' },
  { value: 'liondesk', label: 'LionDesk' },
  { value: 'boomtown', label: 'BoomTown' },
];

const NOTIFICATION_TYPES = [
  { key: 'transactions', label: 'Transactions', icon: FileText },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'marketing', label: 'Marketing', icon: Megaphone },
] as const;

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

/** Custom toggle switch */
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        checked ? 'bg-[var(--color-secondary)]' : 'bg-gray-200',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

/** Styled radio card */
function RadioCard({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-150',
        selected
          ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/5 text-[var(--color-primary)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected
            ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]'
            : 'border-gray-300 bg-white',
        )}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
      <span className="flex-1">{children}</span>
    </button>
  );
}

/** Checkbox card for multi-select */
function CheckboxCard({
  checked,
  onClick,
  children,
  className,
}: {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-150',
        checked
          ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/5 text-[var(--color-primary)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked
            ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]'
            : 'border-gray-300 bg-white',
        )}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <span className="flex-1">{children}</span>
    </button>
  );
}

/** OAuth-style connection card */
function ConnectionCard({
  label,
  description,
  icon: Icon,
  connected,
  onClick,
  color,
}: {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border-2 p-4 transition-all duration-200',
        connected
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
      )}
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color }}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={connected}
        className={cn(
          'flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
          connected
            ? 'cursor-default bg-green-100 text-green-700'
            : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]',
        )}
      >
        {connected ? (
          <span className="flex items-center gap-1.5">
            <Check className="h-4 w-4" />
            Connected
          </span>
        ) : (
          'Connect'
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confetti animation component for Step 10
// ---------------------------------------------------------------------------
function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 2.5 + Math.random() * 2;
        const size = 6 + Math.random() * 8;
        const colors = [
          'var(--color-primary)',
          'var(--color-secondary)',
          '#F39C12',
          '#E74C3C',
          '#9B59B6',
          '#3498DB',
        ];
        const color = colors[i % colors.length];
        const rotate = Math.random() * 360;

        return (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${left}%`,
              top: '-10%',
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: color,
              borderRadius: '2px',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rotate}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg) scale(0.5);
          }
        }
        .animate-confetti-fall {
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-fill-mode: forwards;
          animation-iteration-count: 1;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main onboarding page
// ---------------------------------------------------------------------------
export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<OnboardingData>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    avatarFile: null,
    avatarPreview: user?.avatarUrl ?? null,
    emailProvider: null,
    emailConnected: false,
    calendarProvider: null,
    calendarConnected: false,
    contactImportMethod: null,
    crmProvider: '',
    csvFile: null,
    csvPreview: null,
    quickbooksConnected: false,
    socialConnections: { facebook: false, instagram: false, linkedin: false },
    marketingTone: 'casual',
    emojiUsage: 'sometimes',
    preferredPlatforms: [],
    publishingMode: 'approval',
    licensedStates: user?.licensedStates ?? [],
    licenseNumbers: {},
    notifications: {
      email: { transactions: true, leads: true, documents: true, marketing: true },
      push: { transactions: true, leads: true, documents: false, marketing: false },
      sms: { transactions: false, leads: true, documents: false, marketing: false },
    },
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    weekendDnd: false,
  });

  // Convenience updater
  const update = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ---------------------------------------------------------------------------
  // Step validation
  // ---------------------------------------------------------------------------
  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // Profile
        return data.firstName.trim().length > 0 && data.lastName.trim().length > 0;
      case 1: // Email - optional
      case 2: // Calendar - optional
      case 3: // Contacts - optional
      case 4: // QuickBooks - optional
      case 5: // Social - optional
        return true;
      case 6: // Marketing
        return data.preferredPlatforms.length > 0;
      case 7: // License
        return true;
      case 8: // Notifications
        return true;
      case 9: // Complete
        return true;
      default:
        return true;
    }
  }, [currentStep, data]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, canProceed]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  // ---------------------------------------------------------------------------
  // Avatar handling
  // ---------------------------------------------------------------------------
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update('avatarFile', file);
    const reader = new FileReader();
    reader.onload = () => {
      update('avatarPreview', reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [update]);

  // ---------------------------------------------------------------------------
  // CSV handling
  // ---------------------------------------------------------------------------
  const handleCsvChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    update('csvFile', file);
    update('contactImportMethod', 'csv');

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const rows = lines.slice(0, 6).map((line) => {
        // Simple CSV parse (handles basic cases)
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim());
        return cells;
      });
      update('csvPreview', rows);
    };
    reader.readAsText(file);
  }, [update]);

  // ---------------------------------------------------------------------------
  // Mock OAuth connection
  // ---------------------------------------------------------------------------
  const mockConnect = useCallback((callback: () => void) => {
    // Simulate an OAuth flow
    setTimeout(() => {
      callback();
      addToast({ type: 'success', title: 'Connected successfully' });
    }, 800);
  }, []);

  // ---------------------------------------------------------------------------
  // Platform toggle
  // ---------------------------------------------------------------------------
  const togglePlatform = useCallback((platform: string) => {
    setData((prev) => {
      const platforms = prev.preferredPlatforms.includes(platform)
        ? prev.preferredPlatforms.filter((p) => p !== platform)
        : [...prev.preferredPlatforms, platform];
      return { ...prev, preferredPlatforms: platforms };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // State toggle for license
  // ---------------------------------------------------------------------------
  const toggleState = useCallback((state: string) => {
    setData((prev) => {
      const states = prev.licensedStates.includes(state)
        ? prev.licensedStates.filter((s) => s !== state)
        : [...prev.licensedStates, state];
      // Clean up removed license numbers
      const numbers = { ...prev.licenseNumbers };
      if (!states.includes(state)) {
        delete numbers[state];
      }
      return { ...prev, licensedStates: states, licenseNumbers: numbers };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Notification toggle
  // ---------------------------------------------------------------------------
  const toggleNotification = useCallback(
    (channel: 'email' | 'push' | 'sms', type: 'transactions' | 'leads' | 'documents' | 'marketing') => {
      setData((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [channel]: {
            ...prev.notifications[channel],
            [type]: !prev.notifications[channel][type],
          },
        },
      }));
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Final submission
  // ---------------------------------------------------------------------------
  const handleComplete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        onboardingCompleted: true,
        preferences: {
          marketing: {
            tone: data.marketingTone,
            emojiUsage: data.emojiUsage,
            preferredPlatforms: data.preferredPlatforms,
            publishingMode: data.publishingMode,
          },
          notifications: data.notifications,
          quietHours: {
            start: data.quietHoursStart,
            end: data.quietHoursEnd,
            weekendDnd: data.weekendDnd,
          },
          licensedStates: data.licensedStates,
          licenseNumbers: data.licenseNumbers,
          connections: {
            email: data.emailConnected ? data.emailProvider : null,
            calendar: data.calendarConnected ? data.calendarProvider : null,
            quickbooks: data.quickbooksConnected,
            social: data.socialConnections,
          },
        },
      };

      const updatedUser = await api<typeof user>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (updatedUser && user) {
        setUser({ ...user, ...updatedUser, onboardingCompleted: true });
      }

      setShowConfetti(true);
      setCurrentStep(9);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to save settings',
        message: 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [data, user, setUser]);

  // Trigger confetti when reaching step 10
  useEffect(() => {
    if (currentStep === 9 && !showConfetti) {
      setShowConfetti(true);
    }
  }, [currentStep, showConfetti]);

  // ---------------------------------------------------------------------------
  // Step indicator
  // ---------------------------------------------------------------------------
  const completedSteps = new Set(
    Array.from({ length: currentStep }, (_, i) => i),
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderStepContent = () => {
    switch (currentStep) {
      // =====================================================================
      // STEP 1: Profile
      // =====================================================================
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome! Let's set up your profile
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Tell us a little about yourself to personalize your experience.
              </p>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-4 ring-white shadow-md">
                  {data.avatarPreview ? (
                    <img
                      src={data.avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-md transition-transform hover:scale-110"
                  aria-label="Upload photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Profile photo</p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, or GIF. Max 5MB.
                </p>
              </div>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={data.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20 focus:outline-none transition-colors"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={data.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20 focus:outline-none transition-colors"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={data.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20 focus:outline-none transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // STEP 2: Email Connection
      // =====================================================================
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Connect your email
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Sync your inbox to manage leads and communications from one place.
                You can skip this and connect later.
              </p>
            </div>

            <div className="space-y-3">
              <ConnectionCard
                label="Gmail"
                description="Connect your Google Workspace or personal Gmail"
                icon={Mail}
                color="#EA4335"
                connected={data.emailConnected && data.emailProvider === 'gmail'}
                onClick={() =>
                  mockConnect(() => {
                    update('emailProvider', 'gmail');
                    update('emailConnected', true);
                  })
                }
              />
              <ConnectionCard
                label="Outlook"
                description="Connect your Microsoft 365 or Outlook.com account"
                icon={Mail}
                color="#0078D4"
                connected={data.emailConnected && data.emailProvider === 'outlook'}
                onClick={() =>
                  mockConnect(() => {
                    update('emailProvider', 'outlook');
                    update('emailConnected', true);
                  })
                }
              />
            </div>

            {data.emailConnected && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-green-800">
                  <Check className="h-4 w-4" />
                  Your {data.emailProvider === 'gmail' ? 'Gmail' : 'Outlook'} account has been connected.
                </p>
              </div>
            )}
          </div>
        );

      // =====================================================================
      // STEP 3: Calendar Connection
      // =====================================================================
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Connect your calendar
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Sync your calendar for scheduling showings, inspections, and closings.
                You can skip this and connect later.
              </p>
            </div>

            <div className="space-y-3">
              <ConnectionCard
                label="Google Calendar"
                description="Sync events from Google Calendar"
                icon={Calendar}
                color="#4285F4"
                connected={data.calendarConnected && data.calendarProvider === 'google'}
                onClick={() =>
                  mockConnect(() => {
                    update('calendarProvider', 'google');
                    update('calendarConnected', true);
                  })
                }
              />
              <ConnectionCard
                label="Outlook Calendar"
                description="Sync events from Microsoft Outlook"
                icon={Calendar}
                color="#0078D4"
                connected={data.calendarConnected && data.calendarProvider === 'outlook'}
                onClick={() =>
                  mockConnect(() => {
                    update('calendarProvider', 'outlook');
                    update('calendarConnected', true);
                  })
                }
              />
            </div>

            {data.calendarConnected && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-green-800">
                  <Check className="h-4 w-4" />
                  Your {data.calendarProvider === 'google' ? 'Google' : 'Outlook'} calendar has been connected.
                </p>
              </div>
            )}
          </div>
        );

      // =====================================================================
      // STEP 4: Import Contacts
      // =====================================================================
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Import your contacts
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Bring in your existing contacts so CrestDesk can help you stay on top of every relationship.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* CSV Upload */}
              <button
                type="button"
                onClick={() => {
                  update('contactImportMethod', 'csv');
                  csvInputRef.current?.click();
                }}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all',
                  data.contactImportMethod === 'csv'
                    ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/5'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
                  <Upload className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Upload CSV</p>
                  <p className="mt-0.5 text-xs text-gray-500">Upload a spreadsheet of contacts</p>
                </div>
              </button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvChange}
                className="hidden"
              />

              {/* CRM Import */}
              <button
                type="button"
                onClick={() => update('contactImportMethod', 'crm')}
                className={cn(
                  'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all',
                  data.contactImportMethod === 'crm'
                    ? 'border-[var(--color-secondary)] bg-[var(--color-secondary)]/5'
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50',
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-secondary)]/10">
                  <Users className="h-6 w-6 text-[var(--color-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Import from CRM</p>
                  <p className="mt-0.5 text-xs text-gray-500">Connect your existing CRM system</p>
                </div>
              </button>
            </div>

            {/* CRM selection dropdown */}
            {data.contactImportMethod === 'crm' && (
              <div>
                <label htmlFor="crmProvider" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select your CRM
                </label>
                <select
                  id="crmProvider"
                  value={data.crmProvider}
                  onChange={(e) => update('crmProvider', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20 focus:outline-none transition-colors"
                >
                  <option value="">Choose a CRM...</option>
                  {CRM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CSV preview */}
            {data.csvPreview && data.csvPreview.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">
                    Preview ({data.csvFile?.name})
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      update('csvFile', null);
                      update('csvPreview', null);
                      update('contactImportMethod', null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        {data.csvPreview[0]?.map((header, i) => (
                          <th
                            key={i}
                            className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-600"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.csvPreview.slice(1, 6).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-gray-100 last:border-0">
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="whitespace-nowrap px-3 py-2 text-gray-700"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Showing first 5 rows</p>
              </div>
            )}
          </div>
        );

      // =====================================================================
      // STEP 5: QuickBooks
      // =====================================================================
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Connect QuickBooks
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Link your QuickBooks account to automatically track commissions, expenses, and financials.
                You can skip this and connect later.
              </p>
            </div>

            <ConnectionCard
              label="QuickBooks Online"
              description="Sync transactions, invoices, and commission tracking"
              icon={CreditCard}
              color="#2CA01C"
              connected={data.quickbooksConnected}
              onClick={() =>
                mockConnect(() => {
                  update('quickbooksConnected', true);
                })
              }
            />

            {data.quickbooksConnected && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-green-800">
                  <Check className="h-4 w-4" />
                  QuickBooks has been connected. Commissions will sync automatically.
                </p>
              </div>
            )}
          </div>
        );

      // =====================================================================
      // STEP 6: Social Media
      // =====================================================================
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Connect social media
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Connect your social accounts to publish listing announcements,
                market updates, and branded content directly from CrestDesk.
                All connections are optional.
              </p>
            </div>

            <div className="space-y-3">
              <ConnectionCard
                label="Facebook"
                description="Publish to your Facebook page or profile"
                icon={Share2}
                color="#1877F2"
                connected={data.socialConnections.facebook}
                onClick={() =>
                  mockConnect(() => {
                    update('socialConnections', { ...data.socialConnections, facebook: true });
                  })
                }
              />
              <ConnectionCard
                label="Instagram"
                description="Share photos, reels, and stories"
                icon={Camera}
                color="#E4405F"
                connected={data.socialConnections.instagram}
                onClick={() =>
                  mockConnect(() => {
                    update('socialConnections', { ...data.socialConnections, instagram: true });
                  })
                }
              />
              <ConnectionCard
                label="LinkedIn"
                description="Share professional updates and listings"
                icon={Share2}
                color="#0A66C2"
                connected={data.socialConnections.linkedin}
                onClick={() =>
                  mockConnect(() => {
                    update('socialConnections', { ...data.socialConnections, linkedin: true });
                  })
                }
              />
            </div>
          </div>
        );

      // =====================================================================
      // STEP 7: Marketing Preferences
      // =====================================================================
      case 6:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Marketing preferences
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Customize how CrestDesk generates and publishes marketing content for you.
              </p>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Communication tone
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <RadioCard
                  selected={data.marketingTone === 'formal'}
                  onClick={() => update('marketingTone', 'formal')}
                >
                  <span className="font-semibold">Formal</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Professional and polished</span>
                </RadioCard>
                <RadioCard
                  selected={data.marketingTone === 'casual'}
                  onClick={() => update('marketingTone', 'casual')}
                >
                  <span className="font-semibold">Casual</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Friendly and approachable</span>
                </RadioCard>
                <RadioCard
                  selected={data.marketingTone === 'enthusiastic'}
                  onClick={() => update('marketingTone', 'enthusiastic')}
                >
                  <span className="font-semibold">Enthusiastic</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Energetic and exciting</span>
                </RadioCard>
              </div>
            </div>

            {/* Emoji usage */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Emoji usage
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <RadioCard
                  selected={data.emojiUsage === 'always'}
                  onClick={() => update('emojiUsage', 'always')}
                >
                  Always
                </RadioCard>
                <RadioCard
                  selected={data.emojiUsage === 'sometimes'}
                  onClick={() => update('emojiUsage', 'sometimes')}
                >
                  Sometimes
                </RadioCard>
                <RadioCard
                  selected={data.emojiUsage === 'never'}
                  onClick={() => update('emojiUsage', 'never')}
                >
                  Never
                </RadioCard>
              </div>
            </div>

            {/* Preferred platforms */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Preferred platforms
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['Instagram', 'Facebook', 'TikTok', 'LinkedIn'].map((platform) => (
                  <CheckboxCard
                    key={platform}
                    checked={data.preferredPlatforms.includes(platform)}
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </CheckboxCard>
                ))}
              </div>
              {data.preferredPlatforms.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Please select at least one platform to continue.
                </p>
              )}
            </div>

            {/* Publishing mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Publishing mode
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <RadioCard
                  selected={data.publishingMode === 'auto'}
                  onClick={() => update('publishingMode', 'auto')}
                >
                  <span className="font-semibold">Auto-publish</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Content publishes automatically after compliance review
                  </span>
                </RadioCard>
                <RadioCard
                  selected={data.publishingMode === 'approval'}
                  onClick={() => update('publishingMode', 'approval')}
                >
                  <span className="font-semibold">Require approval</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    You review and approve before publishing
                  </span>
                </RadioCard>
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // STEP 8: License Confirmation
      // =====================================================================
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                License information
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Verify your licensed states and enter your license numbers. This information
                is used for compliance and disclosure on marketing materials.
              </p>
            </div>

            {/* State selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Licensed states
              </label>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {US_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    onClick={() => toggleState(state)}
                    className={cn(
                      'flex items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold transition-all',
                      data.licensedStates.includes(state)
                        ? 'bg-[var(--color-secondary)] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                    title={US_STATE_NAMES[state]}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            {/* License numbers for selected states */}
            {data.licensedStates.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  License numbers
                </label>
                <div className="space-y-3">
                  {data.licensedStates.map((state) => (
                    <div key={state} className="flex items-center gap-3">
                      <span className="flex h-9 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-xs font-bold text-[var(--color-primary)]">
                        {state}
                      </span>
                      <input
                        type="text"
                        value={data.licenseNumbers[state] ?? ''}
                        onChange={(e) =>
                          update('licenseNumbers', {
                            ...data.licenseNumbers,
                            [state]: e.target.value,
                          })
                        }
                        className="block w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20 focus:outline-none transition-colors"
                        placeholder={`${US_STATE_NAMES[state]} license number`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleState(state)}
                        className="flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${state}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.licensedStates.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  Select at least one state above where you hold a real estate license.
                  You can update this later in Settings.
                </p>
              </div>
            )}
          </div>
        );

      // =====================================================================
      // STEP 9: Notifications
      // =====================================================================
      case 8:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Notification preferences
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose how and when you want to be notified about activity on your account.
              </p>
            </div>

            {/* Notification grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left font-semibold text-gray-900 pr-4">
                      Notification type
                    </th>
                    <th className="pb-3 text-center font-semibold text-gray-900 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>Email</span>
                      </div>
                    </th>
                    <th className="pb-3 text-center font-semibold text-gray-900 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <Smartphone className="h-4 w-4 text-gray-500" />
                        <span>Push</span>
                      </div>
                    </th>
                    <th className="pb-3 text-center font-semibold text-gray-900 px-4">
                      <div className="flex flex-col items-center gap-1">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>SMS</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {NOTIFICATION_TYPES.map(({ key, label, icon: NIcon }) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2.5">
                          <NIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-700">{label}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <Toggle
                            checked={data.notifications.email[key]}
                            onChange={() => toggleNotification('email', key)}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <Toggle
                            checked={data.notifications.push[key]}
                            onChange={() => toggleNotification('push', key)}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <Toggle
                            checked={data.notifications.sms[key]}
                            onChange={() => toggleNotification('sms', key)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quiet hours */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
                  <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Quiet hours</p>
                  <p className="text-xs text-gray-500">
                    Pause non-urgent notifications during these hours
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="quietStart" className="block text-xs font-medium text-gray-600 mb-1">
                    Start time
                  </label>
                  <div className="relative">
                    <Moon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="quietStart"
                      type="time"
                      value={data.quietHoursStart}
                      onChange={(e) => update('quietHoursStart', e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3.5 text-sm text-gray-900 shadow-sm focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="quietEnd" className="block text-xs font-medium text-gray-600 mb-1">
                    End time
                  </label>
                  <div className="relative">
                    <Sun className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="quietEnd"
                      type="time"
                      value={data.quietHoursEnd}
                      onChange={(e) => update('quietHoursEnd', e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3.5 text-sm text-gray-900 shadow-sm focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Weekend DND */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Weekend Do Not Disturb</p>
                  <p className="text-xs text-gray-500">
                    Silence all non-urgent notifications on weekends
                  </p>
                </div>
                <Toggle
                  checked={data.weekendDnd}
                  onChange={(val) => update('weekendDnd', val)}
                />
              </div>
            </div>
          </div>
        );

      // =====================================================================
      // STEP 10: Complete
      // =====================================================================
      case 9:
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {showConfetti && <Confetti />}

            <div className="relative mb-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-secondary)]/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-secondary)]">
                  <Check className="h-8 w-8 text-white" />
                </div>
              </div>
              {/* Pulse ring animation */}
              <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-secondary)]/20" style={{ animationDuration: '2s' }} />
            </div>

            <h2 className="text-3xl font-bold text-gray-900">
              You're all set!
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Your CrestDesk account is fully configured. You can update any of these settings
              later from the Settings page.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/25 transition-all hover:bg-[var(--color-primary-light)] hover:shadow-xl"
              >
                Start Using CrestDesk
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  // Placeholder for tour functionality
                  addToast({ type: 'info', title: 'Tour coming soon!' });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-8 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                Take a Tour
              </button>
            </div>

            {/* Summary cards */}
            <div className="mt-10 w-full max-w-lg">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Setup Summary
              </p>
              <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
                {[
                  { label: 'Email', done: data.emailConnected },
                  { label: 'Calendar', done: data.calendarConnected },
                  { label: 'Contacts', done: data.contactImportMethod !== null },
                  { label: 'QuickBooks', done: data.quickbooksConnected },
                  { label: 'Social', done: Object.values(data.socialConnections).some(Boolean) },
                  { label: 'License', done: data.licensedStates.length > 0 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium',
                      item.done
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500',
                    )}
                  >
                    {item.done ? (
                      <Check className="h-3.5 w-3.5 flex-shrink-0" />
                    ) : (
                      <span className="h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-gray-300" />
                    )}
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col">
      {/* ------------------------------------------------------------------- */}
      {/* Header */}
      {/* ------------------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-xs font-bold text-white">
              CD
            </div>
            <span className="text-lg font-semibold text-[var(--color-primary)]">
              CrestDesk
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* Step indicator */}
      {/* ------------------------------------------------------------------- */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          {/* Desktop step indicator */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = completedSteps.has(idx);
                const isCurrent = idx === currentStep;
                const isUpcoming = idx > currentStep;

                return (
                  <div key={idx} className="flex items-center">
                    {/* Connector line (before) */}
                    {idx > 0 && (
                      <div
                        className={cn(
                          'h-0.5 w-6 lg:w-10 transition-colors duration-300',
                          isCompleted || isCurrent
                            ? 'bg-[var(--color-secondary)]'
                            : 'bg-gray-200',
                        )}
                      />
                    )}

                    {/* Step circle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted || isCurrent) {
                          setCurrentStep(idx);
                        }
                      }}
                      disabled={isUpcoming}
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                        isCurrent &&
                          'bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/20 shadow-md',
                        isCompleted &&
                          'bg-[var(--color-secondary)] text-white cursor-pointer hover:ring-2 hover:ring-[var(--color-secondary)]/30',
                        isUpcoming &&
                          'bg-gray-100 text-gray-400 cursor-default',
                      )}
                      aria-label={`Step ${idx + 1}: ${step.label}`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </button>

                    {/* Connector line (after) */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 w-6 lg:w-10 transition-colors duration-300',
                          idx < currentStep
                            ? 'bg-[var(--color-secondary)]'
                            : 'bg-gray-200',
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Labels */}
            <div className="mt-2 flex items-center justify-between">
              {STEPS.map((step, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'text-center text-[10px] font-medium transition-colors',
                    idx === currentStep
                      ? 'text-[var(--color-primary)]'
                      : completedSteps.has(idx)
                        ? 'text-[var(--color-secondary)]'
                        : 'text-gray-400',
                  )}
                  style={{ width: '72px' }}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile step indicator */}
          <div className="md:hidden">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    idx < currentStep
                      ? 'bg-[var(--color-secondary)]'
                      : idx === currentStep
                        ? 'bg-[var(--color-primary)]'
                        : 'bg-gray-200',
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-center text-xs font-medium text-gray-500">
              {STEPS[currentStep].label}
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Content */}
      {/* ------------------------------------------------------------------- */}
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
          {renderStepContent()}
        </div>
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* Footer navigation */}
      {/* ------------------------------------------------------------------- */}
      {currentStep < 9 && (
        <footer className="sticky bottom-0 border-t border-gray-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={goBack}
              disabled={currentStep === 0}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                currentStep === 0
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              {/* Skip button for optional steps */}
              {[1, 2, 3, 4, 5].includes(currentStep) && (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  Skip
                </button>
              )}

              {currentStep === 8 ? (
                /* Final step before completion - Save & Finish */
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all',
                    isSubmitting
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-dark)] hover:shadow-lg',
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              ) : (
                /* Regular next button */
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canProceed()}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all',
                    canProceed()
                      ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] hover:shadow-lg'
                      : 'cursor-not-allowed bg-gray-300',
                  )}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
