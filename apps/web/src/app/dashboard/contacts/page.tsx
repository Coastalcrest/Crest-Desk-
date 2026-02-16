'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Upload,
  Phone,
  Mail,
  Eye,
  X,
  Loader2,
  AlertCircle,
  Users,
  UserPlus,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Tag,
  Filter,
  FileSpreadsheet,
  MapPin,
} from 'lucide-react';
import { api, apiPaginated, type PaginatedResponse } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  contactType: 'lead' | 'prospect' | 'active_client' | 'past_client' | 'vendor';
  source: string | null;
  tags: string[];
  relationshipScore: number;
  leadScore: number | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  mailingAddress: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingZip: string | null;
  createdAt: string;
}

interface ContactStats {
  totalContacts: number;
  newThisMonth: number;
  needsFollowUp: number;
  activeSequences: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CONTACT_TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'lead', label: 'Leads' },
  { value: 'prospect', label: 'Prospects' },
  { value: 'active_client', label: 'Active Clients' },
  { value: 'past_client', label: 'Past Clients' },
  { value: 'vendor', label: 'Vendors' },
];

const TYPE_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  lead: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  prospect: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  active_client: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  past_client: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  vendor: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
};

const AVATAR_COLORS: Record<string, string> = {
  lead: 'bg-red-500',
  prospect: 'bg-orange-500',
  active_client: 'bg-blue-500',
  past_client: 'bg-green-500',
  vendor: 'bg-purple-500',
};

const SOURCE_OPTIONS = [
  'All Sources',
  'Website',
  'Zillow',
  'Realtor.com',
  'Referral',
  'Social Media',
  'Open House',
  'Cold Call',
  'Walk-In',
  'Other',
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const PAGE_SIZE = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ---------------------------------------------------------------------------
// Stats Row
// ---------------------------------------------------------------------------
function StatsRow({ stats, isLoading }: { stats: ContactStats | undefined; isLoading: boolean }) {
  const cards = [
    { label: 'Total Contacts', value: stats?.totalContacts ?? 0, icon: Users, color: 'text-[#1B3A5C]', bgColor: 'bg-[#1B3A5C]/10' },
    { label: 'New This Month', value: stats?.newThisMonth ?? 0, icon: UserPlus, color: 'text-[#2A9D8F]', bgColor: 'bg-[#2A9D8F]/10' },
    { label: 'Needs Follow-Up', value: stats?.needsFollowUp ?? 0, icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'Active Sequences', value: stats?.activeSequences ?? 0, icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', card.bgColor)}>
                <Icon className={cn('h-5 w-5', card.color)} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                {isLoading ? (
                  <div className="mt-1 h-6 w-12 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className="text-xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact Card
// ---------------------------------------------------------------------------
function ContactCard({ contact, onView }: { contact: Contact; onView: () => void }) {
  const badge = TYPE_BADGE[contact.contactType] ?? TYPE_BADGE.lead;
  const avatarColor = AVATAR_COLORS[contact.contactType] ?? 'bg-gray-500';
  const overdue = isOverdue(contact.nextFollowUpAt);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      {/* Top section */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white', avatarColor)}>
            {getInitials(contact.firstName, contact.lastName)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {contact.firstName} {contact.lastName}
            </h3>
            {contact.email && (
              <p className="truncate text-xs text-gray-500">{contact.email}</p>
            )}
            {contact.phone && (
              <p className="text-xs text-gray-500">{contact.phone}</p>
            )}
          </div>
        </div>
        <span className={cn('flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', badge.bg, badge.text)}>
          {formatTypeLabel(contact.contactType)}
        </span>
      </div>

      {/* Source & Tags */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {contact.source && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {contact.source}
          </span>
        )}
        {contact.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-xs font-medium text-[#2A9D8F]">
            {tag}
          </span>
        ))}
        {contact.tags.length > 3 && (
          <span className="text-xs text-gray-400">+{contact.tags.length - 3}</span>
        )}
      </div>

      {/* Relationship Score */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-gray-500">Relationship Score</span>
          <span className="text-xs font-medium text-gray-700">{contact.relationshipScore}/100</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className={cn(
              'h-1.5 rounded-full transition-all',
              contact.relationshipScore >= 70 ? 'bg-green-500' :
              contact.relationshipScore >= 40 ? 'bg-yellow-500' : 'bg-red-500',
            )}
            style={{ width: `${contact.relationshipScore}%` }}
          />
        </div>
      </div>

      {/* Lead Score (for leads) */}
      {contact.contactType === 'lead' && contact.leadScore !== null && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Lead Score:</span>
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            contact.leadScore >= 80 ? 'bg-green-100 text-green-700' :
            contact.leadScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700',
          )}>
            {contact.leadScore}
          </span>
        </div>
      )}

      {/* Dates */}
      <div className="mb-3 space-y-1 border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Last Contacted</span>
          <span className="text-gray-700">{formatDate(contact.lastContactedAt)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Next Follow-Up</span>
          <span className={cn(overdue ? 'font-semibold text-red-600' : 'text-gray-700')}>
            {formatDate(contact.nextFollowUpAt)}
            {overdue && ' (Overdue)'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <button
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); addToast({ type: 'info', title: 'Initiating call...' }); }}
        >
          <Phone className="h-3 w-3" />
          Call
        </button>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); addToast({ type: 'info', title: 'Opening email composer...' }); }}
        >
          <Mail className="h-3 w-3" />
          Email
        </button>
        <button
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#1B3A5C] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#2a4d73] transition-colors"
          onClick={onView}
        >
          <Eye className="h-3 w-3" />
          View
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Contact Modal
// ---------------------------------------------------------------------------
function AddContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    contactType: 'lead' as Contact['contactType'],
    source: '',
    mailingAddress: '',
    mailingCity: '',
    mailingState: '',
    mailingZip: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api<{ id: string }>('/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Contact created successfully' });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      onClose();
      setForm({
        firstName: '', lastName: '', email: '', phone: '',
        contactType: 'lead', source: '', mailingAddress: '', mailingCity: '', mailingState: '', mailingZip: '',
      });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to create contact', message: err.message });
    },
  });

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Contact</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="John"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Doe"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          {/* Contact Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contact Type *</label>
            <select
              required
              value={form.contactType}
              onChange={(e) => updateField('contactType', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="active_client">Active Client</option>
              <option value="past_client">Past Client</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Source</label>
            <select
              value={form.source}
              onChange={(e) => updateField('source', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              <option value="">Select source...</option>
              {SOURCE_OPTIONS.slice(1).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mailing Address</label>
            <input
              type="text"
              value={form.mailingAddress}
              onChange={(e) => updateField('mailingAddress', e.target.value)}
              placeholder="123 Main Street"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={form.mailingCity}
                onChange={(e) => updateField('mailingCity', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
              <select
                value={form.mailingState}
                onChange={(e) => updateField('mailingState', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ZIP</label>
              <input
                type="text"
                value={form.mailingZip}
                onChange={(e) => updateField('mailingZip', e.target.value)}
                maxLength={10}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import Modal
// ---------------------------------------------------------------------------
function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Import Contacts</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Upload Area */}
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="text-sm font-medium text-gray-900">Upload CSV File</p>
            <p className="mt-1 text-xs text-gray-500">Drag and drop or click to browse</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-3 text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-[#2A9D8F]/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#2A9D8F] hover:file:bg-[#2A9D8F]/20"
            />
          </div>

          {file && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700">Selected: {file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          )}

          {/* Field Mapping Placeholder */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Field Mapping</h3>
            <p className="text-xs text-gray-500">
              After uploading, you will be able to map CSV columns to contact fields:
              First Name, Last Name, Email, Phone, Contact Type, Source, Address, City, State, ZIP.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={!file}
              onClick={() => {
                addToast({ type: 'info', title: 'Import feature coming soon' });
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (typeFilter !== 'all') queryParams.set('contactType', typeFilter);
  if (sourceFilter !== 'All Sources') queryParams.set('source', sourceFilter);
  if (tagFilter) queryParams.set('tag', tagFilter);

  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', page, search, typeFilter, sourceFilter, tagFilter],
    queryFn: () => apiPaginated<Contact>(`/contacts?${queryParams.toString()}`),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ContactStats>({
    queryKey: ['contact-stats'],
    queryFn: () => api<ContactStats>('/contacts/stats'),
  });

  const contacts = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your contacts, leads, and client relationships
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Contact type tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
          {CONTACT_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setTypeFilter(tab.value); setPage(1); }}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                typeFilter === tab.value
                  ? 'border-[#2A9D8F] text-[#2A9D8F]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source & Tag filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="appearance-none rounded-md border border-gray-300 py-1.5 pl-8 pr-8 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
              className="w-36 rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <StatsRow stats={stats} isLoading={statsLoading} />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading contacts...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load contacts.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <Users className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-900">No contacts found</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
            {search || typeFilter !== 'all' || sourceFilter !== 'All Sources'
              ? 'No contacts match your current filters. Try adjusting your search criteria.'
              : 'Get started by adding your first contact or importing from a CSV file.'}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e]"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Contact Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onView={() => router.push(`/dashboard/contacts/${contact.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, total)} of {total} contacts
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
