'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
  Mail,
  MessageSquare,
  Phone,
  Edit,
  Eye,
  Trash2,
  ArrowUp,
  ArrowDown,
  ListChecks,
  Users,
  BarChart3,
  ChevronRight,
  Zap,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SequenceStep {
  order: number;
  delayDays: number;
  channel: 'email' | 'sms' | 'phone_task';
  subject: string;
  templateBody: string;
}

interface Sequence {
  id: string;
  name: string;
  type: 'lead_nurture' | 'active_transaction' | 'post_close' | 're_engagement' | 'custom';
  description: string | null;
  steps: SequenceStep[];
  activeEnrollments: number;
  openRate: number | null;
  replyRate: number | null;
  isActive: boolean;
  targetContactTypes: string[];
  triggerEvent: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'lead_nurture', label: 'Lead Nurture' },
  { value: 'active_transaction', label: 'Active Transaction' },
  { value: 'post_close', label: 'Post-Close' },
  { value: 're_engagement', label: 'Re-Engagement' },
  { value: 'custom', label: 'Custom' },
];

const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  lead_nurture: { bg: 'bg-blue-50', text: 'text-blue-700' },
  active_transaction: { bg: 'bg-orange-50', text: 'text-orange-700' },
  post_close: { bg: 'bg-green-50', text: 'text-green-700' },
  re_engagement: { bg: 'bg-purple-50', text: 'text-purple-700' },
  custom: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const CHANNEL_ICON: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  phone_task: Phone,
};

const CHANNEL_COLOR: Record<string, string> = {
  email: 'text-blue-500',
  sms: 'text-purple-500',
  phone_task: 'text-green-500',
};

const TRIGGER_EVENTS = [
  { value: '', label: 'None (Manual)' },
  { value: 'lead_created', label: 'New Lead Created' },
  { value: 'showing_completed', label: 'Showing Completed' },
  { value: 'offer_accepted', label: 'Offer Accepted' },
  { value: 'transaction_closed', label: 'Transaction Closed' },
  { value: 'anniversary', label: 'Anniversary Date' },
  { value: 'no_activity_30_days', label: 'No Activity (30 days)' },
];

const CONTACT_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'active_client', label: 'Active Client' },
  { value: 'past_client', label: 'Past Client' },
  { value: 'vendor', label: 'Vendor' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Sequence Card
// ---------------------------------------------------------------------------
function SequenceCard({
  sequence,
  onToggle,
  onView,
}: {
  sequence: Sequence;
  onToggle: () => void;
  onView: () => void;
}) {
  const badge = TYPE_BADGE[sequence.type] ?? TYPE_BADGE.custom;
  const channelsUsed = new Set(sequence.steps.map((s) => s.channel));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{sequence.name}</h3>
            <span className={cn('flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', badge.bg, badge.text)}>
              {formatTypeLabel(sequence.type)}
            </span>
          </div>
          {sequence.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{sequence.description}</p>
          )}
        </div>

        {/* Active toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors',
            sequence.isActive ? 'bg-[#2A9D8F]' : 'bg-gray-300',
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform mt-0.5',
              sequence.isActive ? 'translate-x-4 ml-0.5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      {/* Steps & Channels */}
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ListChecks className="h-3.5 w-3.5" />
          <span>{sequence.steps.length} steps</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from(channelsUsed).map((channel) => {
            const Icon = CHANNEL_ICON[channel] ?? Mail;
            return (
              <Icon key={channel} className={cn('h-3.5 w-3.5', CHANNEL_COLOR[channel] ?? 'text-gray-400')} />
            );
          })}
        </div>
      </div>

      {/* Enrollments */}
      <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
        <Users className="h-3.5 w-3.5" />
        <span>{sequence.activeEnrollments} active enrollments</span>
      </div>

      {/* Performance */}
      {(sequence.openRate !== null || sequence.replyRate !== null) && (
        <div className="mb-3 flex items-center gap-4">
          {sequence.openRate !== null && (
            <div className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-500">Open Rate:</span>
              <span className="font-medium text-gray-700">{sequence.openRate.toFixed(1)}%</span>
            </div>
          )}
          {sequence.replyRate !== null && (
            <div className="flex items-center gap-1.5 text-xs">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-500">Reply Rate:</span>
              <span className="font-medium text-gray-700">{sequence.replyRate.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <button
          onClick={() => addToast({ type: 'info', title: 'Edit sequence coming soon' })}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Edit className="h-3 w-3" />
          Edit
        </button>
        <button
          onClick={onView}
          className="inline-flex items-center gap-1 rounded-md bg-[#1B3A5C] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#2a4d73] transition-colors"
        >
          <Eye className="h-3 w-3" />
          View
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sequence Detail View (Step Flow)
// ---------------------------------------------------------------------------
function SequenceDetailView({ sequence, onClose }: { sequence: Sequence; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{sequence.name}</h2>
            {sequence.description && (
              <p className="mt-0.5 text-sm text-gray-500">{sequence.description}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Flow */}
        <div className="space-y-0">
          {sequence.steps.map((step, idx) => {
            const Icon = CHANNEL_ICON[step.channel] ?? Mail;
            const channelColor = CHANNEL_COLOR[step.channel] ?? 'text-gray-500';

            return (
              <div key={idx}>
                {/* Delay indicator */}
                {idx > 0 && (
                  <div className="flex items-center gap-2 py-3 pl-5">
                    <div className="h-6 w-px bg-gray-300" />
                    <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      Wait {step.delayDays} day{step.delayDays !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}

                {/* Step card */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('rounded-full bg-white p-1.5 shadow-sm')}>
                        <Icon className={cn('h-4 w-4', channelColor)} />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Step {step.order}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                        step.channel === 'email' ? 'bg-blue-100 text-blue-700' :
                        step.channel === 'sms' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700',
                      )}>
                        {formatTypeLabel(step.channel)}
                      </span>
                    </div>
                    {idx === 0 && (
                      <span className="rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-xs font-medium text-[#2A9D8F]">
                        Start
                      </span>
                    )}
                  </div>
                  <h4 className="mb-1 text-sm font-medium text-gray-900">{step.subject}</h4>
                  <p className="text-xs text-gray-500 line-clamp-3">{step.templateBody}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Sequence Modal
// ---------------------------------------------------------------------------
function CreateSequenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    type: 'lead_nurture' as Sequence['type'],
    triggerEvent: '',
    targetContactTypes: [] as string[],
  });
  const [steps, setSteps] = useState<SequenceStep[]>([
    { order: 1, delayDays: 0, channel: 'email', subject: '', templateBody: '' },
  ]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: string; triggerEvent: string; targetContactTypes: string[]; steps: SequenceStep[] }) =>
      api<{ id: string }>('/sequences', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Sequence created successfully' });
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      onClose();
      setForm({ name: '', type: 'lead_nurture', triggerEvent: '', targetContactTypes: [] });
      setSteps([{ order: 1, delayDays: 0, channel: 'email', subject: '', templateBody: '' }]);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to create sequence', message: err.message });
    },
  });

  const updateField = useCallback((field: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateStep = useCallback((index: number, field: string, value: string | number) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    );
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      { order: prev.length + 1, delayDays: 3, channel: 'email', subject: '', templateBody: '' },
    ]);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((step, i) => ({ ...step, order: i + 1 })),
    );
  }, []);

  const toggleContactType = useCallback((type: string) => {
    setForm((prev) => ({
      ...prev,
      targetContactTypes: prev.targetContactTypes.includes(type)
        ? prev.targetContactTypes.filter((t) => t !== type)
        : [...prev.targetContactTypes, type],
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, steps });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Sequence</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sequence Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., New Lead Follow-Up"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type *</label>
              <select
                required
                value={form.type}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              >
                {TYPE_TABS.slice(1).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger & Target */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Trigger Event</label>
            <select
              value={form.triggerEvent}
              onChange={(e) => updateField('triggerEvent', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              {TRIGGER_EVENTS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Target Contact Types</label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => toggleContactType(ct.value)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    form.targetContactTypes.includes(ct.value)
                      ? 'bg-[#1B3A5C] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Steps</h3>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                <Plus className="h-3 w-3" />
                Add Step
              </button>
            </div>

            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Step {step.order}
                    </span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="rounded-md p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Delay (days)</label>
                      <input
                        type="number"
                        min="0"
                        value={step.delayDays}
                        onChange={(e) => updateStep(idx, 'delayDays', parseInt(e.target.value) || 0)}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Channel *</label>
                      <select
                        value={step.channel}
                        onChange={(e) => updateStep(idx, 'channel', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="phone_task">Phone Task</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Subject *</label>
                    <input
                      type="text"
                      required
                      value={step.subject}
                      onChange={(e) => updateStep(idx, 'subject', e.target.value)}
                      placeholder="e.g., Checking in on your home search"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Template Body</label>
                    <textarea
                      value={step.templateBody}
                      onChange={(e) => updateStep(idx, 'templateBody', e.target.value)}
                      rows={3}
                      placeholder="Hi {{first_name}}, ..."
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
                    />
                  </div>
                </div>
              ))}
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
              Create Sequence
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SequencesPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingSequence, setViewingSequence] = useState<Sequence | null>(null);

  const queryParams = new URLSearchParams();
  if (typeFilter !== 'all') queryParams.set('type', typeFilter);

  const { data: sequences = [], isLoading, error } = useQuery<Sequence[]>({
    queryKey: ['sequences', typeFilter],
    queryFn: () => api<Sequence[]>(`/sequences?${queryParams.toString()}`),
  });

  const toggleMutation = useMutation({
    mutationFn: (sequenceId: string) =>
      api(`/sequences/${sequenceId}/toggle`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Sequence status updated' });
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to update sequence', message: err.message });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-Up Sequences</h1>
          <p className="mt-1 text-sm text-gray-500">
            Automate your follow-up communications with multi-step sequences
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Sequence
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTypeFilter(tab.value)}
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading sequences...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load sequences.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['sequences'] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <Zap className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-900">No sequences found</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
            {typeFilter !== 'all'
              ? 'No sequences match this filter. Try selecting a different type.'
              : 'Create your first follow-up sequence to automate your outreach.'}
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e]"
          >
            <Plus className="h-4 w-4" />
            Create Sequence
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              onToggle={() => toggleMutation.mutate(seq.id)}
              onView={() => setViewingSequence(seq)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateSequenceModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {viewingSequence && (
        <SequenceDetailView
          sequence={viewingSequence}
          onClose={() => setViewingSequence(null)}
        />
      )}
    </div>
  );
}
