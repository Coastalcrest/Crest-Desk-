'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  FolderInput,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Tag,
  Plus,
  X,
  Clock,
  User,
  Loader2,
  AlertCircle,
  Shield,
  Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DocumentDetail {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  status: 'compliant' | 'flagged' | 'unsigned' | 'signed';
  classificationConfidence: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
  transactionId: string | null;
  transactionAddress: string | null;
  tags: string[];
  extractedData: Record<string, string> | null;
  complianceIssues: string[];
  versions: DocumentVersion[];
}

interface DocumentVersion {
  id: string;
  versionNumber: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  size: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  compliant: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Compliant' },
  signed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Signed' },
  flagged: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Flagged' },
  unsigned: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Unsigned' },
};

// ---------------------------------------------------------------------------
// Confidence Badge
// ---------------------------------------------------------------------------
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  let color = 'text-green-700 bg-green-50 border-green-200';
  if (pct < 70) color = 'text-red-700 bg-red-50 border-red-200';
  else if (pct < 85) color = 'text-yellow-700 bg-yellow-50 border-yellow-200';

  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', color)}>
      {pct}% confidence
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const {
    data: doc,
    isLoading,
    error,
  } = useQuery<DocumentDetail>({
    queryKey: ['document', id],
    queryFn: () => api<DocumentDetail>(`/documents/${id}`),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Document deleted' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.push('/dashboard/documents');
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Delete failed', message: err.message });
    },
  });

  const reclassifyMutation = useMutation({
    mutationFn: () => api(`/documents/${id}/reclassify`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Document reclassification started' });
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Reclassification failed', message: err.message });
    },
  });

  const addTagMutation = useMutation({
    mutationFn: (tag: string) =>
      api(`/documents/${id}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tag }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      setNewTag('');
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to add tag', message: err.message });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) =>
      api(`/documents/${id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading document...</span>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard/documents')}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load document details.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['document', id] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.compliant;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/documents')}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </button>

      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-[#1B3A5C]/10 p-2.5">
            <FileText className="h-6 w-6 text-[#1B3A5C]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{doc.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>{doc.type}</span>
              <span className="text-gray-300">|</span>
              <span>{formatFileSize(doc.size)}</span>
              <span className="text-gray-300">|</span>
              <ConfidenceBadge confidence={doc.classificationConfidence} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.open(`/api/v1/documents/${id}/download`, '_blank')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={() => reclassifyMutation.mutate()}
            disabled={reclassifyMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', reclassifyMutation.isPending && 'animate-spin')} />
            Reclassify
          </button>
          <button
            onClick={() => setShowMoveModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FolderInput className="h-4 w-4" />
            Move
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Preview + Metadata */}
        <div className="space-y-6 lg:col-span-2">
          {/* Document Preview */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Document Preview
            </h3>
            <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
              <div className="text-center">
                <Eye className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">{doc.name}</p>
                <p className="mt-1 text-xs text-gray-400">{doc.mimeType}</p>
                <button className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]">
                  Open Full Preview
                </button>
              </div>
            </div>
          </div>

          {/* Extracted Data */}
          {doc.extractedData && Object.keys(doc.extractedData).length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Extracted Data
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries(doc.extractedData).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-gray-50 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      {key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Version History */}
          {doc.versions.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Version History
              </h3>
              <div className="space-y-3">
                {doc.versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3A5C]/10 text-xs font-semibold text-[#1B3A5C]">
                        v{v.versionNumber}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Version {v.versionNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {v.uploadedByName} -- {formatShortDate(v.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{formatFileSize(v.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Metadata, Compliance, Tags */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Details
            </h3>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium text-gray-900">{doc.type}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">Uploaded By</dt>
                <dd className="flex items-center gap-1 text-sm font-medium text-gray-900">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  {doc.uploadedByName}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">Date</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDate(doc.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-500">Size</dt>
                <dd className="text-sm font-medium text-gray-900">{formatFileSize(doc.size)}</dd>
              </div>
              {doc.transactionAddress && (
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-500">Transaction</dt>
                  <dd className="max-w-[160px] truncate text-sm font-medium text-[#2A9D8F]">
                    {doc.transactionAddress}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Compliance Status */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <Shield className="h-4 w-4" />
              Compliance
            </h3>
            <div className={cn('mb-3 flex items-center gap-2 rounded-lg px-3 py-2.5', statusCfg.bg)}>
              <StatusIcon className={cn('h-5 w-5', statusCfg.color)} />
              <span className={cn('text-sm font-medium', statusCfg.color)}>{statusCfg.label}</span>
            </div>
            {doc.complianceIssues.length > 0 ? (
              <ul className="space-y-2">
                {doc.complianceIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                    <span className="text-gray-700">{issue}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No compliance issues detected.</p>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <Tag className="h-4 w-4" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1B3A5C]/10 px-2.5 py-0.5 text-xs font-medium text-[#1B3A5C]"
                >
                  {tag}
                  <button
                    onClick={() => removeTagMutation.mutate(tag)}
                    className="ml-0.5 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {doc.tags.length === 0 && (
                <p className="text-sm text-gray-400">No tags added yet.</p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    e.preventDefault();
                    addTagMutation.mutate(newTag.trim());
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
              <button
                onClick={() => {
                  if (newTag.trim()) addTagMutation.mutate(newTag.trim());
                }}
                disabled={!newTag.trim() || addTagMutation.isPending}
                className="rounded-md bg-[#1B3A5C] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2a4d73] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Document</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete &quot;{doc.name}&quot;? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Transaction Modal */}
      {showMoveModal && (
        <MoveToTransactionModal
          documentId={doc.id}
          currentTransactionId={doc.transactionId}
          onClose={() => setShowMoveModal(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Move to Transaction Modal
// ---------------------------------------------------------------------------
function MoveToTransactionModal({
  documentId,
  currentTransactionId,
  onClose,
}: {
  documentId: string;
  currentTransactionId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedTxn, setSelectedTxn] = useState(currentTransactionId ?? '');

  interface Transaction {
    id: string;
    propertyAddress: string;
  }

  const { data } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['transactions-list'],
    queryFn: () => api<{ transactions: Transaction[] }>('/transactions?pageSize=100'),
  });

  const moveMutation = useMutation({
    mutationFn: () =>
      api(`/documents/${documentId}/move`, {
        method: 'POST',
        body: JSON.stringify({ transactionId: selectedTxn || null }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Document moved successfully' });
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
      onClose();
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Move failed', message: err.message });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900">Move to Transaction</h3>
        <div className="mt-4">
          <select
            value={selectedTxn}
            onChange={(e) => setSelectedTxn(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          >
            <option value="">No transaction (unlinked)</option>
            {(data?.transactions ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.propertyAddress}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => moveMutation.mutate()}
            disabled={moveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e] disabled:opacity-50"
          >
            {moveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
