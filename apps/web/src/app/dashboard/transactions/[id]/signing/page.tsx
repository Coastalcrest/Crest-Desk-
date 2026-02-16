'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Send,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  FileText,
  Users,
  Loader2,
  X,
  Calendar,
  ChevronDown,
  ChevronRight,
  Pen,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignerProgress {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'sent' | 'opened' | 'signed' | 'declined';
  signedAt: string | null;
  sentAt: string | null;
}

interface SigningEnvelope {
  id: string;
  envelopeName: string;
  status: 'draft' | 'sent' | 'in_progress' | 'fully_signed' | 'cancelled';
  documentCount: number;
  documentIds: string[];
  signingDeadline: string;
  completedAt: string | null;
  signers: SignerProgress[];
  createdAt: string;
}

interface SigningEvent {
  id: string;
  action: string;
  description: string;
  signerName: string | null;
  createdAt: string;
}

interface TransactionDocument {
  id: string;
  name: string;
  type: string;
}

interface SigningDashboardData {
  transactionId: string;
  envelopes: SigningEnvelope[];
  events: SigningEvent[];
  availableDocuments: TransactionDocument[];
}

interface NewSigner {
  email: string;
  name: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENVELOPE_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Sent' },
  in_progress: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'In Progress' },
  fully_signed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Fully Signed' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' },
};

const SIGNER_STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-400', label: 'Pending' },
  sent: { icon: Mail, color: 'text-blue-500', label: 'Sent' },
  opened: { icon: Eye, color: 'text-purple-500', label: 'Opened' },
  signed: { icon: CheckCircle2, color: 'text-green-500', label: 'Signed' },
  declined: { icon: AlertCircle, color: 'text-red-500', label: 'Declined' },
};

const SIGNER_ROLES = ['buyer', 'seller', 'buyer_agent', 'seller_agent', 'attorney', 'witness', 'other'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatRoleLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Signer Card
// ---------------------------------------------------------------------------

function SignerCard({ signer }: { signer: SignerProgress }) {
  const config = SIGNER_STATUS_CONFIG[signer.status] ?? SIGNER_STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1B3A5C]/10">
        <User className="h-4 w-4 text-[#1B3A5C]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{signer.name}</p>
        <p className="truncate text-xs text-gray-500">{signer.email}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          <StatusIcon className={cn('h-3.5 w-3.5', config.color)} />
          <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
        </div>
        <span className="text-[10px] text-gray-400">{formatRoleLabel(signer.role)}</span>
        {signer.signedAt && (
          <span className="text-[10px] text-green-600">{formatDateTime(signer.signedAt)}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Envelope Card
// ---------------------------------------------------------------------------

function EnvelopeCard({
  envelope,
  transactionId,
  onSendReminder,
  onResendLink,
}: {
  envelope: SigningEnvelope;
  transactionId: string;
  onSendReminder: (envelopeId: string) => void;
  onResendLink: (envelopeId: string, signerEmail: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = ENVELOPE_STATUS_CONFIG[envelope.status] ?? ENVELOPE_STATUS_CONFIG.draft;

  const signedCount = envelope.signers.filter((s) => s.status === 'signed').length;
  const totalSigners = envelope.signers.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Envelope Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#1B3A5C]/10 p-2">
            <Pen className="h-4 w-4 text-[#1B3A5C]" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">{envelope.envelopeName}</h3>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <FileText className="h-3 w-3" />
                {envelope.documentCount} doc{envelope.documentCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                {signedCount}/{totalSigners} signed
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              statusConfig.bg,
              statusConfig.text,
            )}
          >
            {statusConfig.label}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Deadline */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            Deadline: {formatDate(envelope.signingDeadline)}
            {envelope.completedAt && (
              <span className="ml-2 text-green-600">
                Completed: {formatDate(envelope.completedAt)}
              </span>
            )}
          </div>

          {/* Signer Progress */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Signers
            </h4>
            <div className="space-y-2">
              {envelope.signers.map((signer) => (
                <SignerCard key={signer.id} signer={signer} />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          {envelope.status !== 'fully_signed' && envelope.status !== 'cancelled' && (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSendReminder(envelope.id);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Send className="h-3 w-3" />
                Send Reminder
              </button>
              {envelope.signers
                .filter((s) => s.status === 'pending' || s.status === 'sent')
                .slice(0, 1)
                .map((signer) => (
                  <button
                    key={signer.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResendLink(envelope.id, signer.email);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Resend Link
                  </button>
                ))}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `/api/v1/transactions/${transactionId}/signing/${envelope.id}/download`,
                    '_blank',
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-3 w-3" />
                View Signed Doc
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Envelope Modal
// ---------------------------------------------------------------------------

function CreateEnvelopeModal({
  open,
  onClose,
  availableDocuments,
  transactionId,
}: {
  open: boolean;
  onClose: () => void;
  availableDocuments: TransactionDocument[];
  transactionId: string;
}) {
  const queryClient = useQueryClient();
  const [envelopeName, setEnvelopeName] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [signers, setSigners] = useState<NewSigner[]>([]);
  const [newSignerEmail, setNewSignerEmail] = useState('');
  const [newSignerName, setNewSignerName] = useState('');
  const [newSignerRole, setNewSignerRole] = useState('buyer');

  const createMutation = useMutation({
    mutationFn: (payload: {
      envelopeName: string;
      documentIds: string[];
      signingDeadline: string;
      signers: NewSigner[];
    }) =>
      api(`/transactions/${transactionId}/signing/envelopes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Envelope created' });
      queryClient.invalidateQueries({ queryKey: ['signing-dashboard', transactionId] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to create envelope', message: err.message });
    },
  });

  const resetForm = () => {
    setEnvelopeName('');
    setSelectedDocIds([]);
    setDeadline('');
    setSigners([]);
    setNewSignerEmail('');
    setNewSignerName('');
    setNewSignerRole('buyer');
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

  const addSigner = () => {
    if (!newSignerEmail.trim() || !newSignerName.trim()) return;
    setSigners((prev) => [
      ...prev,
      { email: newSignerEmail.trim(), name: newSignerName.trim(), role: newSignerRole },
    ]);
    setNewSignerEmail('');
    setNewSignerName('');
    setNewSignerRole('buyer');
  };

  const removeSigner = (idx: number) => {
    setSigners((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!envelopeName.trim() || selectedDocIds.length === 0 || !deadline || signers.length === 0) {
      addToast({ type: 'warning', title: 'Please fill all required fields' });
      return;
    }
    createMutation.mutate({
      envelopeName: envelopeName.trim(),
      documentIds: selectedDocIds,
      signingDeadline: deadline,
      signers,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Create New Envelope</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Envelope Name */}
          <div>
            <label htmlFor="envelope-name" className="block text-sm font-medium text-gray-700">
              Envelope Name *
            </label>
            <input
              id="envelope-name"
              type="text"
              value={envelopeName}
              onChange={(e) => setEnvelopeName(e.target.value)}
              placeholder="e.g., Purchase Agreement Signing"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
            />
          </div>

          {/* Document Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Documents *
            </label>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {availableDocuments.length > 0 ? (
                availableDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="h-4 w-4 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                    />
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{doc.name}</span>
                    <span className="ml-auto text-xs text-gray-400">{doc.type}</span>
                  </label>
                ))
              ) : (
                <p className="px-2 py-4 text-center text-sm text-gray-400">
                  No documents available. Upload documents first.
                </p>
              )}
            </div>
            {selectedDocIds.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedDocIds.length} document{selectedDocIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
              Signing Deadline *
            </label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
            />
          </div>

          {/* Signer List */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Signers *</label>

            {/* Existing Signers */}
            {signers.length > 0 && (
              <div className="mt-2 space-y-1">
                {signers.map((signer, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900">{signer.name}</span>
                      <span className="text-xs text-gray-500">({signer.email})</span>
                      <span className="rounded bg-[#1B3A5C]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#1B3A5C]">
                        {formatRoleLabel(signer.role)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSigner(idx)}
                      className="rounded-md p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Signer Form */}
            <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-dashed border-gray-300 p-3 sm:grid-cols-4">
              <input
                type="text"
                placeholder="Name"
                value={newSignerName}
                onChange={(e) => setNewSignerName(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              />
              <input
                type="email"
                placeholder="Email"
                value={newSignerEmail}
                onChange={(e) => setNewSignerEmail(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              />
              <select
                value={newSignerRole}
                onChange={(e) => setNewSignerRole(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              >
                {SIGNER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {formatRoleLabel(role)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addSigner}
                disabled={!newSignerName.trim() || !newSignerEmail.trim()}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-[#1B3A5C] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2a4d73] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
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
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Envelope
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signing Event Timeline
// ---------------------------------------------------------------------------

function SigningTimeline({ events }: { events: SigningEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
        <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-400">No signing events yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 h-full w-px bg-gray-200" />
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="relative flex gap-4 pl-1">
            <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#1B3A5C]/10">
              <Pen className="h-4 w-4 text-[#1B3A5C]" />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm text-gray-700">{event.description}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {event.signerName ? `${event.signerName} -- ` : ''}
                {formatDateTime(event.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SigningDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['signing-dashboard', transactionId],
    queryFn: () =>
      api<SigningDashboardData>(`/transactions/${transactionId}/signing`),
    enabled: Boolean(transactionId),
  });

  const reminderMutation = useMutation({
    mutationFn: (envelopeId: string) =>
      api(`/transactions/${transactionId}/signing/${envelopeId}/remind`, {
        method: 'POST',
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Reminder sent' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to send reminder', message: err.message });
    },
  });

  const resendMutation = useMutation({
    mutationFn: ({ envelopeId, signerEmail }: { envelopeId: string; signerEmail: string }) =>
      api(`/transactions/${transactionId}/signing/${envelopeId}/resend`, {
        method: 'POST',
        body: JSON.stringify({ signerEmail }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Signing link resent' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to resend link', message: err.message });
    },
  });

  const handleSendReminder = (envelopeId: string) => {
    reminderMutation.mutate(envelopeId);
  };

  const handleResendLink = (envelopeId: string, signerEmail: string) => {
    resendMutation.mutate({ envelopeId, signerEmail });
  };

  // Envelope counts by status
  const statusCounts = useMemo(() => {
    if (!dashboard) return { draft: 0, sent: 0, in_progress: 0, fully_signed: 0 };
    return {
      draft: dashboard.envelopes.filter((e) => e.status === 'draft').length,
      sent: dashboard.envelopes.filter((e) => e.status === 'sent').length,
      in_progress: dashboard.envelopes.filter((e) => e.status === 'in_progress').length,
      fully_signed: dashboard.envelopes.filter((e) => e.status === 'fully_signed').length,
    };
  }, [dashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading signing dashboard...</span>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/transactions/${transactionId}`)}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transaction
        </button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load signing data.</p>
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['signing-dashboard', transactionId] })
            }
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/transactions/${transactionId}`)}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Signing Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Manage signing envelopes and track progress
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e]"
        >
          <Plus className="h-4 w-4" />
          Create New Envelope
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Draft', count: statusCounts.draft, bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
          { label: 'Sent', count: statusCounts.sent, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
          { label: 'In Progress', count: statusCounts.in_progress, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
          { label: 'Fully Signed', count: statusCounts.fully_signed, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn('rounded-lg border p-4', stat.bg, stat.border)}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {stat.label}
            </p>
            <p className={cn('mt-1 text-2xl font-bold', stat.text)}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Envelope List */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Envelopes ({dashboard.envelopes.length})
        </h2>
        {dashboard.envelopes.length > 0 ? (
          <div className="space-y-3">
            {dashboard.envelopes.map((envelope) => (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                transactionId={transactionId}
                onSendReminder={handleSendReminder}
                onResendLink={handleResendLink}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
            <Pen className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No signing envelopes yet</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#2A9D8F] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Create your first envelope
            </button>
          </div>
        )}
      </div>

      {/* Signing Event Timeline */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Signing Timeline
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <SigningTimeline events={dashboard.events} />
        </div>
      </div>

      {/* Create Envelope Modal */}
      <CreateEnvelopeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        availableDocuments={dashboard.availableDocuments}
        transactionId={transactionId}
      />
    </div>
  );
}
