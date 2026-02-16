'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  Bot,
  RefreshCw,
  Plus,
  FileText,
  Shield,
  Scale,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  Flag,
  Trash2,
  ArrowUpFromLine,
  CornerDownLeft,
  Download,
  MessageSquare,
  X,
  Search,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ReviewDetail {
  id: string;
  transactionId: string;
  propertyAddress: string;
  transactionType: string;
  transactionStatus: string;
  buyerName: string | null;
  sellerName: string | null;
  closingDate: string | null;
  readinessScore: number;
  status: 'pending' | 'in_review' | 'approved' | 'returned' | 'escalated';
  assignedReviewer: string | null;
  findings: Finding[];
  documents: ReviewDocument[];
  aiSummary: AISummary | null;
}

interface Finding {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  source: 'ai_pre_review' | 'broker_manual' | 'compliance_engine';
  documentId: string | null;
  documentName: string | null;
  ruleReference: string | null;
  jurisdiction: string | null;
  aiConfidence: number | null;
  category: string;
  resolved: boolean;
  action: 'approved' | 'flagged' | 'dismissed' | 'promoted' | null;
  brokerNotes: string | null;
  createdAt: string;
}

interface ReviewDocument {
  id: string;
  name: string;
  type: string;
  signed: boolean;
  complianceStatus: 'compliant' | 'non_compliant' | 'pending' | 'not_checked';
  findingCount: number;
}

interface AISummary {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  lastRunAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconColor: 'text-red-500',
    badgeBg: 'bg-red-100',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    iconColor: 'text-yellow-500',
    badgeBg: 'bg-yellow-100',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconColor: 'text-blue-500',
    badgeBg: 'bg-blue-100',
    label: 'Info',
  },
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  ai_pre_review: { label: 'AI Pre-Review', color: 'bg-purple-100 text-purple-700' },
  broker_manual: { label: 'Broker Manual', color: 'bg-[#1B3A5C]/10 text-[#1B3A5C]' },
  compliance_engine: { label: 'Compliance Engine', color: 'bg-[#2A9D8F]/10 text-[#2A9D8F]' },
};

const FINDING_CATEGORIES = [
  'missing_document',
  'signature_issue',
  'disclosure_violation',
  'compliance_gap',
  'data_inconsistency',
  'deadline_risk',
  'financial_discrepancy',
  'other',
];

const COMPLIANCE_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  compliant: { bg: 'bg-green-50', text: 'text-green-700', label: 'Compliant' },
  non_compliant: { bg: 'bg-red-50', text: 'text-red-700', label: 'Non-Compliant' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Pending' },
  not_checked: { bg: 'bg-gray-50', text: 'text-gray-500', label: 'Not Checked' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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

function getScoreColor(score: number): string {
  if (score < 50) return 'text-red-600';
  if (score < 80) return 'text-yellow-600';
  return 'text-green-600';
}

function getScoreStrokeColor(score: number): string {
  if (score < 50) return 'stroke-red-500';
  if (score < 80) return 'stroke-yellow-500';
  return 'stroke-green-500';
}

function getScoreTrackColor(score: number): string {
  if (score < 50) return 'stroke-red-100';
  if (score < 80) return 'stroke-yellow-100';
  return 'stroke-green-100';
}

function getStatusBadge(status: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    in_review: { bg: 'bg-blue-50', text: 'text-blue-700' },
    approved: { bg: 'bg-green-50', text: 'text-green-700' },
    returned: { bg: 'bg-orange-50', text: 'text-orange-700' },
    escalated: { bg: 'bg-red-50', text: 'text-red-700' },
  };
  return map[status] ?? map.pending;
}

// ---------------------------------------------------------------------------
// Large Circular Score
// ---------------------------------------------------------------------------
function LargeCircularScore({ score }: { score: number }) {
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={getScoreTrackColor(score)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-700', getScoreStrokeColor(score))}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('text-3xl font-bold', getScoreColor(score))}>{score}</span>
        <span className="text-xs text-gray-500">Readiness</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finding Card
// ---------------------------------------------------------------------------
function FindingCard({
  finding,
  onAction,
  isActioning,
}: {
  finding: Finding;
  onAction: (findingId: string, action: string, notes?: string) => void;
  isActioning: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(finding.brokerNotes ?? '');
  const config = SEVERITY_CONFIG[finding.severity];
  const SeverityIcon = config.icon;
  const source = SOURCE_LABELS[finding.source] ?? { label: finding.source, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className={cn('rounded-lg border p-4', finding.resolved ? 'border-green-200 bg-green-50/30' : config.border, finding.resolved ? '' : config.bg)}>
      <div className="flex items-start gap-3">
        <SeverityIcon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', config.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900">{finding.title}</h4>
            {finding.resolved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </span>
            )}
            {finding.action && !finding.resolved && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 capitalize">
                {finding.action}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">{finding.description}</p>

          {/* Metadata row */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', source.color)}>
              {source.label}
            </span>
            {finding.category && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {formatStatusLabel(finding.category)}
              </span>
            )}
            {finding.documentName && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <FileText className="h-3 w-3" />
                {finding.documentName}
              </span>
            )}
            {finding.ruleReference && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Scale className="h-3 w-3" />
                {finding.ruleReference}
              </span>
            )}
            {finding.jurisdiction && (
              <span className="text-xs text-gray-500">
                {finding.jurisdiction}
              </span>
            )}
            {finding.aiConfidence !== null && (
              <span className="text-xs text-purple-600">
                AI Confidence: {Math.round(finding.aiConfidence * 100)}%
              </span>
            )}
          </div>

          {/* Expand / Notes Section */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#1B3A5C] hover:text-[#2a4d73]"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Collapse' : 'Actions & Notes'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
              {/* Broker notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Broker Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add review notes..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onAction(finding.id, 'approved', notes)}
                  disabled={isActioning}
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => onAction(finding.id, 'flagged', notes)}
                  disabled={isActioning}
                  className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Flag
                </button>
                <button
                  onClick={() => onAction(finding.id, 'dismissed', notes)}
                  disabled={isActioning}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Dismiss
                </button>
                <button
                  onClick={() => onAction(finding.id, 'promoted', notes)}
                  disabled={isActioning}
                  className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                  Promote to Rule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Finding Modal
// ---------------------------------------------------------------------------
function AddFindingModal({
  open,
  onClose,
  onSubmit,
  documents,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NewFindingData) => void;
  documents: ReviewDocument[];
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<NewFindingData>({
    category: 'other',
    severity: 'warning',
    title: '',
    description: '',
    documentId: '',
    ruleReference: '',
  });

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Manual Finding</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
              <select
                required
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              >
                {FINDING_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {formatStatusLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Severity *</label>
              <select
                required
                value={form.severity}
                onChange={(e) => updateField('severity', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              >
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Brief description of the finding"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Detailed explanation of the issue..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Document (optional)</label>
            <select
              value={form.documentId}
              onChange={(e) => updateField('documentId', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              <option value="">None</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Rule Reference (optional)</label>
            <input
              type="text"
              value={form.ruleReference}
              onChange={(e) => updateField('ruleReference', e.target.value)}
              placeholder="e.g., TREC 535.1(b)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
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
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Finding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface NewFindingData {
  category: string;
  severity: string;
  title: string;
  description: string;
  documentId: string;
  ruleReference: string;
}

// ---------------------------------------------------------------------------
// Return to Agent Modal
// ---------------------------------------------------------------------------
function ReturnModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Return to Agent</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason for Return *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explain what the agent needs to correct or complete..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(reason)}
              disabled={!reason.trim() || isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <CornerDownLeft className="h-4 w-4" />
              Return File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document Checklist
// ---------------------------------------------------------------------------
function DocumentChecklist({ documents }: { documents: ReviewDocument[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Document Checklist</h3>
      </div>
      {documents.length > 0 ? (
        <ul className="divide-y divide-gray-50">
          {documents.map((doc) => {
            const compliance = COMPLIANCE_STATUS_BADGE[doc.complianceStatus] ?? COMPLIANCE_STATUS_BADGE.not_checked;
            return (
              <li key={doc.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Signed indicator */}
                  {doc.signed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-300" />
                  )}
                  {/* Compliance badge */}
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', compliance.bg, compliance.text)}>
                    {compliance.label}
                  </span>
                  {/* Finding count */}
                  {doc.findingCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      <AlertCircle className="h-3 w-3" />
                      {doc.findingCount}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          No documents in this transaction
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TransactionReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [addFindingOpen, setAddFindingOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [actioningFindingId, setActioningFindingId] = useState<string | null>(null);
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>('all');

  // ---- Load review data ----
  const { data: review, isLoading, error } = useQuery<ReviewDetail>({
    queryKey: ['review-detail', id],
    queryFn: () => api<ReviewDetail>(`/review-queue/${id}`),
    enabled: !!id,
  });

  // ---- AI Pre-Review mutation ----
  const preReviewMutation = useMutation({
    mutationFn: () =>
      api(`/ai-review/pre-review/${review?.transactionId}`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'AI pre-review completed' });
      queryClient.invalidateQueries({ queryKey: ['review-detail', id] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'AI pre-review failed', message: err.message });
    },
  });

  // ---- Add finding mutation ----
  const addFindingMutation = useMutation({
    mutationFn: (data: NewFindingData) =>
      api(`/review-queue/${id}/findings`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Finding added' });
      queryClient.invalidateQueries({ queryKey: ['review-detail', id] });
      setAddFindingOpen(false);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to add finding', message: err.message });
    },
  });

  // ---- Finding action mutation ----
  const findingActionMutation = useMutation({
    mutationFn: ({ findingId, action, notes }: { findingId: string; action: string; notes?: string }) =>
      api(`/review-queue/${id}/findings/${findingId}/action`, {
        method: 'PATCH',
        body: JSON.stringify({ action, brokerNotes: notes }),
      }),
    onMutate: ({ findingId }) => {
      setActioningFindingId(findingId);
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Finding updated' });
      queryClient.invalidateQueries({ queryKey: ['review-detail', id] });
      setActioningFindingId(null);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Action failed', message: err.message });
      setActioningFindingId(null);
    },
  });

  // ---- Approve mutation ----
  const approveMutation = useMutation({
    mutationFn: () =>
      api(`/review-queue/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'File approved successfully' });
      queryClient.invalidateQueries({ queryKey: ['review-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Approval failed', message: err.message });
    },
  });

  // ---- Return mutation ----
  const returnMutation = useMutation({
    mutationFn: (reason: string) =>
      api(`/review-queue/${id}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'File returned to agent' });
      queryClient.invalidateQueries({ queryKey: ['review-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      setReturnModalOpen(false);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Return failed', message: err.message });
    },
  });

  // ---- Escalate mutation ----
  const escalateMutation = useMutation({
    mutationFn: () =>
      api(`/review-queue/${id}/escalate`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'File escalated' });
      queryClient.invalidateQueries({ queryKey: ['review-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Escalation failed', message: err.message });
    },
  });

  // ---- Export handler ----
  const handleExport = useCallback(async () => {
    try {
      const blob = await api<Blob>(`/review-queue/${id}/export`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `review-${id}-export.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'Export downloaded' });
    } catch (err) {
      addToast({ type: 'error', title: 'Export failed', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }, [id]);

  const handleFindingAction = useCallback(
    (findingId: string, action: string, notes?: string) => {
      findingActionMutation.mutate({ findingId, action, notes });
    },
    [findingActionMutation],
  );

  // ---- Loading / Error states ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading review...</span>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard/review')}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Review Queue
        </button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load review details.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['review-detail', id] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(review.status);

  // Group findings by severity and filter
  const allFindings = review.findings;
  const filteredFindings =
    findingSeverityFilter === 'all'
      ? allFindings
      : allFindings.filter((f) => f.severity === findingSeverityFilter);

  const criticalFindings = filteredFindings.filter((f) => f.severity === 'critical');
  const warningFindings = filteredFindings.filter((f) => f.severity === 'warning');
  const infoFindings = filteredFindings.filter((f) => f.severity === 'info');

  const hasUnresolvedCritical = allFindings.some((f) => f.severity === 'critical' && !f.resolved);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/review')}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{review.propertyAddress}</h1>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadge.bg, statusBadge.text)}>
                {formatStatusLabel(review.status)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {formatStatusLabel(review.transactionType)} -- Closing: {formatDate(review.closingDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Readiness Score Hero + AI Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Readiness Score */}
        <div className="flex items-center gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <LargeCircularScore score={review.readinessScore} />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">File Readiness</h2>
            <p className="mt-1 text-sm text-gray-500">
              {review.readinessScore >= 80
                ? 'This file appears ready for approval.'
                : review.readinessScore >= 50
                  ? 'Some issues need attention before approval.'
                  : 'Significant issues must be resolved before approval.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              {review.buyerName && <span>Buyer: {review.buyerName}</span>}
              {review.sellerName && <span>Seller: {review.sellerName}</span>}
            </div>
          </div>
        </div>

        {/* AI Pre-Review Summary */}
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Bot className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">AI Pre-Review</h3>
              {review.aiSummary ? (
                <>
                  <p className="mt-1 text-xs text-gray-500">
                    AI has pre-scanned this file -- Last run: {formatDateTime(review.aiSummary.lastRunAt)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    {review.aiSummary.criticalCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        <AlertCircle className="h-3 w-3" />
                        {review.aiSummary.criticalCount} critical
                      </span>
                    )}
                    {review.aiSummary.warningCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        <AlertTriangle className="h-3 w-3" />
                        {review.aiSummary.warningCount} warnings
                      </span>
                    )}
                    {review.aiSummary.infoCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <Info className="h-3 w-3" />
                        {review.aiSummary.infoCount} info
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  No AI pre-review has been run yet. Click below to start.
                </p>
              )}
              <button
                onClick={() => preReviewMutation.mutate()}
                disabled={preReviewMutation.isPending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {preReviewMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {review.aiSummary ? 'Re-run AI Pre-Review' : 'Run AI Pre-Review'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Findings Section */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Findings</h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {allFindings.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Severity filter */}
            <div className="flex gap-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'critical', label: 'Critical' },
                { value: 'warning', label: 'Warning' },
                { value: 'info', label: 'Info' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFindingSeverityFilter(opt.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    findingSeverityFilter === opt.value
                      ? 'bg-[#1B3A5C] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAddFindingOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A9D8F] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Finding
            </button>
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12">
            <Search className="mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {findingSeverityFilter !== 'all'
                ? `No ${findingSeverityFilter} findings found.`
                : 'No findings yet. Run AI Pre-Review or add a manual finding.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Critical */}
            {criticalFindings.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Critical ({criticalFindings.length})
                </h3>
                <div className="space-y-2">
                  {criticalFindings.map((f) => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      onAction={handleFindingAction}
                      isActioning={actioningFindingId === f.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Warning */}
            {warningFindings.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-yellow-700">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({warningFindings.length})
                </h3>
                <div className="space-y-2">
                  {warningFindings.map((f) => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      onAction={handleFindingAction}
                      isActioning={actioningFindingId === f.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            {infoFindings.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Info className="h-4 w-4" />
                  Info ({infoFindings.length})
                </h3>
                <div className="space-y-2">
                  {infoFindings.map((f) => (
                    <FindingCard
                      key={f.id}
                      finding={f}
                      onAction={handleFindingAction}
                      isActioning={actioningFindingId === f.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Checklist */}
      <DocumentChecklist documents={review.documents} />

      {/* Action Bar (sticky bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-6 py-4 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="text-sm text-gray-500">
            {allFindings.filter((f) => f.resolved).length}/{allFindings.length} findings resolved
          </div>
          <div className="flex items-center gap-3">
            {review.status === 'approved' && (
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export File
              </button>
            )}
            <button
              onClick={() => escalateMutation.mutate()}
              disabled={escalateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {escalateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              Escalate
            </button>
            <button
              onClick={() => setReturnModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition-colors"
            >
              <CornerDownLeft className="h-4 w-4" />
              Return to Agent
            </button>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || hasUnresolvedCritical}
              title={hasUnresolvedCritical ? 'Resolve all critical findings before approving' : undefined}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve File
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddFindingModal
        open={addFindingOpen}
        onClose={() => setAddFindingOpen(false)}
        onSubmit={(data) => addFindingMutation.mutate(data)}
        documents={review.documents}
        isSubmitting={addFindingMutation.isPending}
      />
      <ReturnModal
        open={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onSubmit={(reason) => returnMutation.mutate(reason)}
        isSubmitting={returnMutation.isPending}
      />
    </div>
  );
}
