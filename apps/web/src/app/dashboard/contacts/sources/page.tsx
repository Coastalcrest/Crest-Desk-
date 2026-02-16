'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  Globe,
  Users,
  TrendingUp,
  Zap,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Target,
  Percent,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LeadSource {
  id: string;
  name: string;
  type: 'portal' | 'website' | 'referral' | 'social' | 'advertising';
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  isActive: boolean;
  autoResponseSequence: string | null;
  distributionRule: 'round_robin' | 'specific_agent' | 'weighted';
  assignedAgent: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TYPE_BADGE: Record<string, { bg: string; text: string; dotColor: string }> = {
  portal: { bg: 'bg-blue-50', text: 'text-blue-700', dotColor: 'bg-blue-500' },
  website: { bg: 'bg-green-50', text: 'text-green-700', dotColor: 'bg-green-500' },
  referral: { bg: 'bg-purple-50', text: 'text-purple-700', dotColor: 'bg-purple-500' },
  social: { bg: 'bg-pink-50', text: 'text-pink-700', dotColor: 'bg-pink-500' },
  advertising: { bg: 'bg-orange-50', text: 'text-orange-700', dotColor: 'bg-orange-500' },
};

const DISTRIBUTION_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  round_robin: { label: 'Round Robin', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  specific_agent: { label: 'Specific Agent', bg: 'bg-teal-50', text: 'text-teal-700' },
  weighted: { label: 'Weighted', bg: 'bg-amber-50', text: 'text-amber-700' },
};

const SOURCE_TYPES = [
  { value: 'portal', label: 'Portal (Zillow, Realtor.com, etc.)' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social Media' },
  { value: 'advertising', label: 'Advertising' },
];

const DISTRIBUTION_RULES = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'specific_agent', label: 'Specific Agent' },
  { value: 'weighted', label: 'Weighted Distribution' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Source Card
// ---------------------------------------------------------------------------
function SourceCard({ source }: { source: LeadSource }) {
  const badge = TYPE_BADGE[source.type] ?? TYPE_BADGE.website;
  const distBadge = DISTRIBUTION_BADGE[source.distributionRule] ?? DISTRIBUTION_BADGE.round_robin;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{source.name}</h3>
            <span className={cn('flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', badge.bg, badge.text)}>
              {formatTypeLabel(source.type)}
            </span>
          </div>
        </div>

        {/* Active indicator */}
        <div className="flex items-center gap-1.5">
          <div className={cn('h-2 w-2 rounded-full', source.isActive ? 'bg-green-500' : 'bg-gray-300')} />
          <span className="text-xs text-gray-500">{source.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            <span>Total</span>
          </div>
          <p className="mt-1 text-lg font-bold text-gray-900">{source.totalLeads.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <UserCheck className="h-3 w-3" />
            <span>Converted</span>
          </div>
          <p className="mt-1 text-lg font-bold text-green-600">{source.convertedLeads.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
            <Percent className="h-3 w-3" />
            <span>Rate</span>
          </div>
          <p className={cn(
            'mt-1 text-lg font-bold',
            source.conversionRate >= 20 ? 'text-green-600' :
            source.conversionRate >= 10 ? 'text-yellow-600' : 'text-red-600',
          )}>
            {source.conversionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Auto-Response */}
      {source.autoResponseSequence && (
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
          <Zap className="h-3.5 w-3.5 text-[#2A9D8F]" />
          <span>Auto-response: <span className="font-medium text-gray-700">{source.autoResponseSequence}</span></span>
        </div>
      )}

      {/* Distribution Rule */}
      <div className="flex items-center gap-2">
        <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', distBadge.bg, distBadge.text)}>
          {distBadge.label}
        </span>
        {source.assignedAgent && source.distributionRule === 'specific_agent' && (
          <span className="text-xs text-gray-500">({source.assignedAgent})</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Source Modal
// ---------------------------------------------------------------------------
function AddSourceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    type: 'website' as LeadSource['type'],
    autoResponseSequenceId: '',
    distributionRule: 'round_robin' as LeadSource['distributionRule'],
    assignedAgent: '',
  });

  const { data: sequences = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['sequences-list-active'],
    queryFn: () => api<{ id: string; name: string }[]>('/sequences?active=true'),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api<{ id: string }>('/lead-sources', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Lead source created successfully' });
      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
      onClose();
      setForm({ name: '', type: 'website', autoResponseSequenceId: '', distributionRule: 'round_robin', assignedAgent: '' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to create lead source', message: err.message });
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
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Lead Source</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Source Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Zillow Premier Agent"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>

          {/* Source Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type *</label>
            <select
              required
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Auto-Response Sequence */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Auto-Response Sequence</label>
            <select
              value={form.autoResponseSequenceId}
              onChange={(e) => updateField('autoResponseSequenceId', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              <option value="">None</option>
              {sequences.map((seq) => (
                <option key={seq.id} value={seq.id}>{seq.name}</option>
              ))}
            </select>
          </div>

          {/* Distribution Rule */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Distribution Rule *</label>
            <select
              required
              value={form.distributionRule}
              onChange={(e) => updateField('distributionRule', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              {DISTRIBUTION_RULES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Agent Assignment (shown when specific_agent selected) */}
          {form.distributionRule === 'specific_agent' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Assigned Agent</label>
              <input
                type="text"
                value={form.assignedAgent}
                onChange={(e) => updateField('assignedAgent', e.target.value)}
                placeholder="Agent name or ID"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
          )}

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
              Add Source
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance Charts Placeholder
// ---------------------------------------------------------------------------
function PerformanceCharts() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Leads Over Time */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Leads Over Time</h3>
        <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-400">Chart coming soon</p>
            <p className="mt-1 text-xs text-gray-400">Line chart showing lead volume by source over time</p>
          </div>
        </div>
      </div>

      {/* Conversion by Source */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Conversion by Source</h3>
        <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium text-gray-400">Chart coming soon</p>
            <p className="mt-1 text-xs text-gray-400">Bar chart comparing conversion rates across sources</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function LeadSourcesPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: sources = [], isLoading, error } = useQuery<LeadSource[]>({
    queryKey: ['lead-sources'],
    queryFn: () => api<LeadSource[]>('/lead-sources'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Sources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track your lead generation channels
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Source
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading lead sources...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load lead sources.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['lead-sources'] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <Target className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-900">No lead sources configured</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
            Add your lead sources to track where your contacts are coming from and measure ROI.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e]"
          >
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        </div>
      ) : (
        <>
          {/* Source Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>

          {/* Performance Charts */}
          <PerformanceCharts />
        </>
      )}

      {/* Add Source Modal */}
      <AddSourceModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
