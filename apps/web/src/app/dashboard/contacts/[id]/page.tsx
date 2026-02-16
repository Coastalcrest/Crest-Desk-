'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MessageSquare,
  ListChecks,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  Home,
  FileUp,
  Tag,
  Clock,
  User,
  MapPin,
  Globe,
  DollarSign,
  Pause,
  XCircle,
  CheckCircle,
  ChevronRight,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  contactType: 'lead' | 'prospect' | 'active_client' | 'past_client' | 'vendor';
  source: string | null;
  tags: string[];
  relationshipScore: number;
  leadScore: number | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  company: string | null;
  title: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  notes: string | null;
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  type: 'email_sent' | 'call_made' | 'sms_sent' | 'meeting' | 'note_added' | 'showing' | 'document_sent';
  subject: string;
  description: string | null;
  channel: string | null;
  createdAt: string;
  createdBy: string;
}

interface FollowUpSequenceEnrollment {
  id: string;
  sequenceName: string;
  currentStep: number;
  totalSteps: number;
  nextStepDate: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

interface LinkedDeal {
  id: string;
  name: string;
  stage: string;
  value: number;
  expectedCloseDate: string | null;
  probability: number;
}

interface LinkedTransaction {
  id: string;
  propertyAddress: string;
  status: string;
  transactionType: string;
  closingDate: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  lead: { bg: 'bg-red-50', text: 'text-red-700' },
  prospect: { bg: 'bg-orange-50', text: 'text-orange-700' },
  active_client: { bg: 'bg-blue-50', text: 'text-blue-700' },
  past_client: { bg: 'bg-green-50', text: 'text-green-700' },
  vendor: { bg: 'bg-purple-50', text: 'text-purple-700' },
};

const ACTIVITY_CONFIG: Record<string, { icon: typeof Mail; color: string; bgColor: string; label: string }> = {
  email_sent: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Email Sent' },
  call_made: { icon: Phone, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Call Made' },
  sms_sent: { icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'SMS Sent' },
  meeting: { icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Meeting' },
  note_added: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50', label: 'Note Added' },
  showing: { icon: Home, color: 'text-[#2A9D8F]', bgColor: 'bg-[#2A9D8F]/10', label: 'Showing' },
  document_sent: { icon: FileUp, color: 'text-indigo-600', bgColor: 'bg-indigo-50', label: 'Document Sent' },
};

const ACTIVITY_TYPES = [
  { value: 'call_made', label: 'Call' },
  { value: 'email_sent', label: 'Email' },
  { value: 'note_added', label: 'Note' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'sms_sent', label: 'SMS' },
  { value: 'showing', label: 'Showing' },
];

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

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Contact Info Card
// ---------------------------------------------------------------------------
function ContactInfoCard({ contact }: { contact: ContactDetail }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
      </div>
      <div className="space-y-5 p-5">
        {/* Personal */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Personal</h4>
          <div className="space-y-2">
            <InfoRow label="Full Name" value={`${contact.firstName} ${contact.lastName}`} />
            {contact.company && <InfoRow label="Company" value={contact.company} />}
            {contact.title && <InfoRow label="Title" value={contact.title} />}
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Contact</h4>
          <div className="space-y-2">
            <InfoRow label="Email" value={contact.email} icon={<Mail className="h-3.5 w-3.5 text-gray-400" />} />
            <InfoRow label="Phone" value={contact.phone} icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} />
            {contact.mobilePhone && (
              <InfoRow label="Mobile" value={contact.mobilePhone} icon={<Phone className="h-3.5 w-3.5 text-gray-400" />} />
            )}
          </div>
        </div>

        {/* Address */}
        {(contact.address || contact.city || contact.state) && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Address</h4>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <div className="text-sm text-gray-700">
                {contact.address && <p>{contact.address}</p>}
                <p>{[contact.city, contact.state, contact.zipCode].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Social */}
        {(contact.website || contact.facebook || contact.instagram || contact.linkedin) && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Social</h4>
            <div className="space-y-2">
              {contact.website && <InfoRow label="Website" value={contact.website} icon={<Globe className="h-3.5 w-3.5 text-gray-400" />} />}
              {contact.facebook && <InfoRow label="Facebook" value={contact.facebook} />}
              {contact.instagram && <InfoRow label="Instagram" value={contact.instagram} />}
              {contact.linkedin && <InfoRow label="LinkedIn" value={contact.linkedin} />}
            </div>
          </div>
        )}

        {/* Custom Fields */}
        {Object.keys(contact.customFields).length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Custom Fields</h4>
            <div className="space-y-2">
              {Object.entries(contact.customFields).map(([key, value]) => (
                <InfoRow key={key} label={key} value={value} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm text-gray-700">{value ?? '--'}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline
// ---------------------------------------------------------------------------
function ActivityTimeline({ activities, isLoading }: { activities: Activity[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#1B3A5C]" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center">
        <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No activities recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical timeline line */}
      <div className="absolute left-5 top-0 h-full w-px bg-gray-200" />

      {activities.map((activity, idx) => {
        const config = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.note_added;
        const Icon = config.icon;

        return (
          <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Icon */}
            <div className={cn('relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                  {activity.description && (
                    <p className="mt-0.5 text-sm text-gray-600">{activity.description}</p>
                  )}
                </div>
                {activity.channel && (
                  <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {activity.channel}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">{formatDateTime(activity.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Sequences Section
// ---------------------------------------------------------------------------
function ActiveSequences({
  enrollments,
  isLoading,
  contactId,
}: {
  enrollments: FollowUpSequenceEnrollment[];
  isLoading: boolean;
  contactId: string;
}) {
  const queryClient = useQueryClient();

  const pauseMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      api(`/contacts/${contactId}/sequences/${enrollmentId}/pause`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Sequence paused' });
      queryClient.invalidateQueries({ queryKey: ['contact-sequences', contactId] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to pause sequence', message: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (enrollmentId: string) =>
      api(`/contacts/${contactId}/sequences/${enrollmentId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Sequence cancelled' });
      queryClient.invalidateQueries({ queryKey: ['contact-sequences', contactId] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to cancel sequence', message: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#1B3A5C]" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="py-6 text-center">
        <ListChecks className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">Not enrolled in any sequences.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {enrollments.map((enrollment) => (
        <div key={enrollment.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">{enrollment.sequenceName}</h4>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              enrollment.status === 'active' ? 'bg-green-100 text-green-700' :
              enrollment.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
              enrollment.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700',
            )}>
              {formatTypeLabel(enrollment.status)}
            </span>
          </div>

          {/* Progress */}
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Step {enrollment.currentStep} of {enrollment.totalSteps}</span>
              <span>{Math.round((enrollment.currentStep / enrollment.totalSteps) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200">
              <div
                className="h-1.5 rounded-full bg-[#2A9D8F] transition-all"
                style={{ width: `${(enrollment.currentStep / enrollment.totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {enrollment.nextStepDate && (
            <p className="mb-2 text-xs text-gray-500">
              Next step: {formatDate(enrollment.nextStepDate)}
            </p>
          )}

          {enrollment.status === 'active' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => pauseMutation.mutate(enrollment.id)}
                disabled={pauseMutation.isPending}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-white"
              >
                <Pause className="h-3 w-3" />
                Pause
              </button>
              <button
                onClick={() => cancelMutation.mutate(enrollment.id)}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-3 w-3" />
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linked Deals
// ---------------------------------------------------------------------------
function LinkedDeals({ deals, isLoading }: { deals: LinkedDeal[]; isLoading: boolean }) {
  const router = useRouter();

  if (isLoading) {
    return <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#1B3A5C]" /></div>;
  }

  if (deals.length === 0) {
    return (
      <div className="py-6 text-center">
        <DollarSign className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No linked deals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => (
        <div
          key={deal.id}
          onClick={() => router.push(`/dashboard/pipeline?deal=${deal.id}`)}
          className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-gray-300"
        >
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">{deal.name}</h4>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="rounded-full bg-[#1B3A5C]/10 px-2 py-0.5 font-medium text-[#1B3A5C]">
              {deal.stage}
            </span>
            <span className="font-medium text-gray-700">{formatCurrency(deal.value)}</span>
            <span>Close: {formatDate(deal.expectedCloseDate)}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
              {deal.probability}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linked Transactions
// ---------------------------------------------------------------------------
function LinkedTransactions({ transactions, isLoading }: { transactions: LinkedTransaction[]; isLoading: boolean }) {
  const router = useRouter();

  if (isLoading) {
    return <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#1B3A5C]" /></div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="py-6 text-center">
        <Home className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No linked transactions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((txn) => (
        <div
          key={txn.id}
          onClick={() => router.push(`/dashboard/transactions/${txn.id}`)}
          className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all hover:border-gray-300"
        >
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">{txn.propertyAddress}</h4>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className={cn(
              'rounded-full px-2 py-0.5 font-medium',
              txn.status === 'active' ? 'bg-blue-50 text-blue-700' :
              txn.status === 'closed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600',
            )}>
              {formatTypeLabel(txn.status)}
            </span>
            <span>{formatTypeLabel(txn.transactionType)}</span>
            {txn.closingDate && <span>Close: {formatDate(txn.closingDate)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log Activity Form
// ---------------------------------------------------------------------------
function LogActivityForm({ contactId }: { contactId: string }) {
  const queryClient = useQueryClient();
  const [activityType, setActivityType] = useState('note_added');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');

  const logMutation = useMutation({
    mutationFn: (data: { type: string; subject: string; description: string }) =>
      api(`/contacts/${contactId}/activities`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Activity logged' });
      queryClient.invalidateQueries({ queryKey: ['contact-activities', contactId] });
      setSubject('');
      setNotes('');
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to log activity', message: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    logMutation.mutate({ type: activityType, subject, description: notes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {ACTIVITY_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setActivityType(t.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activityType === t.value
                ? 'bg-[#1B3A5C] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Subject *"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
      />

      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
      />

      <button
        type="submit"
        disabled={logMutation.isPending || !subject.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e] disabled:opacity-50"
      >
        {logMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Log Activity
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tags Section
// ---------------------------------------------------------------------------
function TagsSection({ contactId, tags }: { contactId: string; tags: string[] }) {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const addTagMutation = useMutation({
    mutationFn: (tag: string) =>
      api(`/contacts/${contactId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-detail', contactId] });
      setNewTag('');
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to add tag', message: err.message });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) =>
      api(`/contacts/${contactId}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-detail', contactId] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to remove tag', message: err.message });
    },
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#2A9D8F]/10 px-2.5 py-1 text-xs font-medium text-[#2A9D8F]"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              onClick={() => removeTagMutation.mutate(tag)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-[#2A9D8F]/20"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Add tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTag.trim()) {
              e.preventDefault();
              addTagMutation.mutate(newTag.trim());
            }
          }}
          className="w-40 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
        />
        <button
          onClick={() => { if (newTag.trim()) addTagMutation.mutate(newTag.trim()); }}
          disabled={!newTag.trim() || addTagMutation.isPending}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enroll in Sequence Modal
// ---------------------------------------------------------------------------
function EnrollSequenceModal({ open, onClose, contactId }: { open: boolean; onClose: () => void; contactId: string }) {
  const queryClient = useQueryClient();
  const [selectedSequence, setSelectedSequence] = useState('');

  const { data: sequences } = useQuery<{ id: string; name: string; type: string }[]>({
    queryKey: ['sequences-list'],
    queryFn: () => api<{ id: string; name: string; type: string }[]>('/sequences?active=true'),
    enabled: open,
  });

  const enrollMutation = useMutation({
    mutationFn: (sequenceId: string) =>
      api(`/contacts/${contactId}/sequences`, {
        method: 'POST',
        body: JSON.stringify({ sequenceId }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Contact enrolled in sequence' });
      queryClient.invalidateQueries({ queryKey: ['contact-sequences', contactId] });
      onClose();
      setSelectedSequence('');
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to enroll', message: err.message });
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Enroll in Sequence</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Select Sequence *</label>
            <select
              value={selectedSequence}
              onChange={(e) => setSelectedSequence(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              <option value="">Choose a sequence...</option>
              {(sequences ?? []).map((seq) => (
                <option key={seq.id} value={seq.id}>{seq.name} ({formatTypeLabel(seq.type)})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => { if (selectedSequence) enrollMutation.mutate(selectedSequence); }}
              disabled={!selectedSequence || enrollMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e] disabled:opacity-50"
            >
              {enrollMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enroll
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
export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const [enrollOpen, setEnrollOpen] = useState(false);

  const { data: contact, isLoading, error } = useQuery<ContactDetail>({
    queryKey: ['contact-detail', contactId],
    queryFn: () => api<ContactDetail>(`/contacts/${contactId}`),
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['contact-activities', contactId],
    queryFn: () => api<Activity[]>(`/contacts/${contactId}/activities`),
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<FollowUpSequenceEnrollment[]>({
    queryKey: ['contact-sequences', contactId],
    queryFn: () => api<FollowUpSequenceEnrollment[]>(`/contacts/${contactId}/sequences`),
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery<LinkedDeal[]>({
    queryKey: ['contact-deals', contactId],
    queryFn: () => api<LinkedDeal[]>(`/contacts/${contactId}/deals`),
  });

  const { data: transactions = [], isLoading: txnLoading } = useQuery<LinkedTransaction[]>({
    queryKey: ['contact-transactions', contactId],
    queryFn: () => api<LinkedTransaction[]>(`/contacts/${contactId}/transactions`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading contact...</span>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
        <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">Failed to load contact details.</p>
        <button
          onClick={() => router.push('/dashboard/contacts')}
          className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
        >
          Back to Contacts
        </button>
      </div>
    );
  }

  const badge = TYPE_BADGE[contact.contactType] ?? TYPE_BADGE.lead;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/contacts')}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white',
              contact.contactType === 'lead' ? 'bg-red-500' :
              contact.contactType === 'prospect' ? 'bg-orange-500' :
              contact.contactType === 'active_client' ? 'bg-blue-500' :
              contact.contactType === 'past_client' ? 'bg-green-500' : 'bg-purple-500',
            )}>
              {getInitials(contact.firstName, contact.lastName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{contact.firstName} {contact.lastName}</h1>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', badge.bg, badge.text)}>
                  {formatTypeLabel(contact.contactType)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                <span>Relationship: {contact.relationshipScore}/100</span>
                <div className="h-1.5 w-20 rounded-full bg-gray-200">
                  <div
                    className={cn(
                      'h-1.5 rounded-full',
                      contact.relationshipScore >= 70 ? 'bg-green-500' :
                      contact.relationshipScore >= 40 ? 'bg-yellow-500' : 'bg-red-500',
                    )}
                    style={{ width: `${contact.relationshipScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Edit mode coming soon' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => addToast({ type: 'info', title: 'Initiating call...' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Phone className="h-4 w-4" />
            Call
          </button>
          <button
            onClick={() => addToast({ type: 'info', title: 'Opening email composer...' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            onClick={() => addToast({ type: 'info', title: 'Opening SMS...' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <MessageSquare className="h-4 w-4" />
            SMS
          </button>
          <button
            onClick={() => setEnrollOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A9D8F] px-3 py-2 text-sm font-medium text-white hover:bg-[#238b7e]"
          >
            <ListChecks className="h-4 w-4" />
            Enroll in Sequence
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Contact Info */}
        <div className="space-y-6 lg:col-span-1">
          <ContactInfoCard contact={contact} />

          {/* Tags */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Tags</h3>
            </div>
            <div className="p-5">
              <TagsSection contactId={contactId} tags={contact.tags} />
            </div>
          </div>
        </div>

        {/* Right column — Timeline, Sequences, Deals, Transactions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Log Activity */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Log Activity</h3>
            </div>
            <div className="p-5">
              <LogActivityForm contactId={contactId} />
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Activity Timeline</h3>
            </div>
            <div className="p-5">
              <ActivityTimeline activities={activities} isLoading={activitiesLoading} />
            </div>
          </div>

          {/* Active Follow-Up Sequences */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Active Follow-Up Sequences</h3>
            </div>
            <div className="p-5">
              <ActiveSequences enrollments={enrollments} isLoading={enrollmentsLoading} contactId={contactId} />
            </div>
          </div>

          {/* Linked Deals */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Linked Deals</h3>
            </div>
            <div className="p-5">
              <LinkedDeals deals={deals} isLoading={dealsLoading} />
            </div>
          </div>

          {/* Linked Transactions */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Linked Transactions</h3>
            </div>
            <div className="p-5">
              <LinkedTransactions transactions={transactions} isLoading={txnLoading} />
            </div>
          </div>
        </div>
      </div>

      {/* Enroll in Sequence Modal */}
      <EnrollSequenceModal open={enrollOpen} onClose={() => setEnrollOpen(false)} contactId={contactId} />
    </div>
  );
}
