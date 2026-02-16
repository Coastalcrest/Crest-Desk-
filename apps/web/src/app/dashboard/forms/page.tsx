'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Filter,
  Plus,
  Search,
  ChevronDown,
  Calendar,
  Tag,
  MapPin,
  Star,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormTemplate {
  id: string;
  name: string;
  type: 'agreement' | 'disclosure' | 'addendum';
  jurisdiction: string;
  version: string;
  effectiveDate: string;
  category: 'standard' | 'custom';
  description?: string;
  updatedAt: string;
}

interface FormsResponse {
  forms: FormTemplate[];
  total: number;
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

const ROLE_LEVEL: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const US_STATES = [
  'All States',
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

const FORM_TYPES = ['All Types', 'agreement', 'disclosure', 'addendum'];

// ---------------------------------------------------------------------------
// External Forms Providers
// ---------------------------------------------------------------------------

interface ExternalProvider {
  name: string;
  description: string;
  url: string;
  category: 'forms' | 'platform';
  logo?: string;
}

const EXTERNAL_PROVIDERS: ExternalProvider[] = [
  // Oregon form libraries
  {
    name: 'OREF — Oregon Real Estate Forms',
    description:
      'Official Oregon real estate forms library with 200+ residential and commercial forms. Requires annual subscription ($89–$198/yr).',
    url: 'https://orefonline.com/oref-library/',
    category: 'forms',
  },
  {
    name: 'Oregon REALTORS Forms',
    description:
      'State association forms library included free with Oregon REALTORS membership. Includes clause library and Spanish translations.',
    url: 'https://www.orforms.org/',
    category: 'forms',
  },
  // Transaction management platforms
  {
    name: 'SkySlope Forms',
    description:
      'OREF-authorized platform included free with OREF subscription. Includes DigiSign e-signatures and SkySlope Breeze.',
    url: 'https://skyslope.com/',
    category: 'platform',
  },
  {
    name: 'Dotloop',
    description:
      'Transaction management platform hosting OREF and Oregon REALTORS forms. Dotloop Essentials included with Oregon REALTORS membership.',
    url: 'https://www.dotloop.com/',
    category: 'platform',
  },
  {
    name: 'Lone Wolf Transactions (zipForm Edition)',
    description:
      'Widely used national platform hosting both OREF and Oregon REALTORS forms with e-signature capabilities.',
    url: 'https://www.lwolf.com/products/transactions-zipform-edition',
    category: 'platform',
  },
  {
    name: 'DocuSign',
    description:
      'OREF-authorized e-signature platform. Use with OREF forms for legally binding digital signatures.',
    url: 'https://www.docusign.com/',
    category: 'platform',
  },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  agreement: 'bg-blue-100 text-blue-800',
  disclosure: 'bg-amber-100 text-amber-800',
  addendum: 'bg-purple-100 text-purple-800',
};

// ---------------------------------------------------------------------------
// Form Template Card
// ---------------------------------------------------------------------------

function FormCard({
  form,
  onClick,
}: {
  form: FormTemplate;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-[#2A9D8F] hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#1B3A5C]" />
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
            {form.name}
          </h3>
        </div>
        {form.category === 'custom' && (
          <Star className="h-4 w-4 text-amber-400 fill-amber-400 flex-shrink-0" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            TYPE_BADGE_COLORS[form.type] ?? 'bg-gray-100 text-gray-700',
          )}
        >
          {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          <MapPin className="h-3 w-3" />
          {form.jurisdiction}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Tag className="h-3 w-3" />
          v{form.version}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(form.effectiveDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      {form.description && (
        <p className="mt-3 text-xs text-gray-500 line-clamp-2">
          {form.description}
        </p>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FormsLibraryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedType, setSelectedType] = useState('All Types');

  const { data, isLoading } = useQuery({
    queryKey: ['forms', selectedState, selectedType, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedState !== 'All States') params.set('jurisdiction', selectedState);
      if (selectedType !== 'All Types') params.set('type', selectedType);
      if (searchQuery) params.set('search', searchQuery);
      const qs = params.toString();
      return api<FormsResponse>(`/forms${qs ? `?${qs}` : ''}`);
    },
  });

  const forms = data?.forms ?? [];
  const standardForms = forms.filter((f) => f.category === 'standard');
  const customForms = forms.filter((f) => f.category === 'custom');

  const canCreateCustom =
    user !== null && hasMinRole(user.role, 'principal_broker');

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A5C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms Library</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse, search, and fill real estate forms and documents
          </p>
        </div>
        {canCreateCustom && (
          <button
            type="button"
            onClick={() => router.push('/dashboard/forms/create')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1B3A5C] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#2A4F7A]"
          >
            <Plus className="h-4 w-4" />
            Create Custom Form
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms by name..."
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
          />
        </div>

        {/* State filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="appearance-none rounded-md border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-700 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
          >
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Type filter */}
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="appearance-none rounded-md border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-700 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
          >
            {FORM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'All Types'
                  ? type
                  : type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* ── Custom Forms Section ── */}
      {customForms.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 px-1">
            <Star className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Custom Forms
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {customForms.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customForms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onClick={() =>
                  router.push(`/dashboard/forms/${form.id}/fill`)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Standard Forms Section ── */}
      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <FileText className="h-4 w-4 text-[#1B3A5C]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Standard Forms
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {standardForms.length}
          </span>
        </div>
        {standardForms.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {standardForms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onClick={() =>
                  router.push(`/dashboard/forms/${form.id}/fill`)
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-12">
            <FileText className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">
              No forms found
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </div>

      {/* ── External Forms & Resources ── */}
      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <ExternalLink className="h-4 w-4 text-[#1B3A5C]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            External Forms &amp; Resources
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-500 px-1">
          Access official state form libraries and authorized transaction platforms. An active subscription or membership may be required.
        </p>

        {/* Form Libraries */}
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Official Form Libraries
        </h3>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {EXTERNAL_PROVIDERS.filter((p) => p.category === 'forms').map(
            (provider) => (
              <a
                key={provider.name}
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#2A9D8F] hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#2A9D8F]">
                    {provider.name}
                  </h3>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-[#2A9D8F]" />
                </div>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                  {provider.description}
                </p>
                <span className="mt-3 text-xs font-medium text-[#2A9D8F]">
                  Open library &rarr;
                </span>
              </a>
            ),
          )}
        </div>

        {/* Transaction Platforms */}
        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Authorized Transaction Platforms
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXTERNAL_PROVIDERS.filter((p) => p.category === 'platform').map(
            (provider) => (
              <a
                key={provider.name}
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#2A9D8F] hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#2A9D8F]">
                    {provider.name}
                  </h3>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 group-hover:text-[#2A9D8F]" />
                </div>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {provider.description}
                </p>
              </a>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
