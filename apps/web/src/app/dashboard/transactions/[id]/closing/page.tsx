'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Package,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Archive,
  Send,
  ThumbsUp,
  ThumbsDown,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  List,
  Shield,
  X,
  Mail,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClosingDocument {
  id: string;
  name: string;
  type: string;
  status: 'signed' | 'unsigned' | 'not_applicable';
  included: boolean;
  order: number;
}

interface ComplianceCheckItem {
  id: string;
  label: string;
  passed: boolean;
  details: string | null;
}

interface ApprovalInfo {
  status: 'none' | 'pending' | 'approved' | 'rejected';
  approverName: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
}

interface ClosingPackage {
  id: string;
  packageName: string;
  status: 'draft' | 'assembled' | 'submitted' | 'approved' | 'rejected';
  documentOrder: ClosingDocument[];
  tableOfContents: string;
  readyForClosing: boolean;
  submittedToTitleCompany: boolean;
  submissionTimestamp: string | null;
  complianceItems: ComplianceCheckItem[];
  approval: ApprovalInfo;
  createdAt: string;
  updatedAt: string;
}

interface ClosingPageData {
  transactionId: string;
  packages: ClosingPackage[];
  availableDocuments: TransactionDocument[];
}

interface TransactionDocument {
  id: string;
  name: string;
  type: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  assembled: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Assembled' },
  submitted: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Submitted' },
  approved: { bg: 'bg-green-50', text: 'text-green-700', label: 'Approved' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
};

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

// ---------------------------------------------------------------------------
// Document Row with Drag Handle
// ---------------------------------------------------------------------------

function DocumentRow({
  doc,
  onToggleInclude,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  doc: ClosingDocument;
  onToggleInclude: (docId: string) => void;
  onMoveUp: (docId: string) => void;
  onMoveDown: (docId: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const statusIcon =
    doc.status === 'signed' ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : doc.status === 'unsigned' ? (
      <Clock className="h-4 w-4 text-amber-500" />
    ) : (
      <XCircle className="h-4 w-4 text-gray-400" />
    );

  const statusLabel =
    doc.status === 'signed'
      ? 'Signed'
      : doc.status === 'unsigned'
        ? 'Unsigned'
        : 'N/A';

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 transition-colors',
        doc.included ? 'bg-white' : 'bg-gray-50 opacity-60',
      )}
    >
      {/* Drag Handle / Reorder Buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onMoveUp(doc.id)}
          disabled={isFirst || !doc.included}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:invisible"
        >
          <ChevronRight className="h-3 w-3 -rotate-90" />
        </button>
        <GripVertical className="h-4 w-4 text-gray-300" />
        <button
          type="button"
          onClick={() => onMoveDown(doc.id)}
          disabled={isLast || !doc.included}
          className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:invisible"
        >
          <ChevronRight className="h-3 w-3 rotate-90" />
        </button>
      </div>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={doc.included}
        onChange={() => onToggleInclude(doc.id)}
        className="h-4 w-4 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
      />

      {/* Document Info */}
      <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{doc.name}</p>
        <p className="text-xs text-gray-500">{doc.type}</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1">
        {statusIcon}
        <span className="text-xs text-gray-600">{statusLabel}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Summary
// ---------------------------------------------------------------------------

function ComplianceSummary({ items }: { items: ComplianceCheckItem[] }) {
  const passedCount = items.filter((i) => i.passed).length;
  const failedCount = items.length - passedCount;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#1B3A5C]" />
          <h4 className="text-sm font-semibold text-gray-900">Compliance Checklist</h4>
        </div>
        <div className="flex items-center gap-2">
          {passedCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {passedCount}
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-red-600">
              <XCircle className="h-3.5 w-3.5" />
              {failedCount}
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-gray-50">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
            {item.passed ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm',
                  item.passed ? 'text-gray-600' : 'font-medium text-gray-900',
                )}
              >
                {item.label}
              </p>
              {item.details && (
                <p className="text-xs text-gray-400">{item.details}</p>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">
            No compliance checks configured
          </li>
        )}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approval Section
// ---------------------------------------------------------------------------

function ApprovalSection({ approval }: { approval: ApprovalInfo }) {
  if (approval.status === 'none') return null;

  const config = {
    pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Clock, iconColor: 'text-yellow-500' },
    approved: { bg: 'bg-green-50', border: 'border-green-200', icon: ThumbsUp, iconColor: 'text-green-500' },
    rejected: { bg: 'bg-red-50', border: 'border-red-200', icon: ThumbsDown, iconColor: 'text-red-500' },
  }[approval.status] ?? { bg: 'bg-gray-50', border: 'border-gray-200', icon: Clock, iconColor: 'text-gray-500' };

  const ApprovalIcon = config.icon;

  return (
    <div className={cn('rounded-lg border p-4', config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <ApprovalIcon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', config.iconColor)} />
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {approval.status === 'pending'
              ? 'Approval Pending'
              : approval.status === 'approved'
                ? 'Package Approved'
                : 'Package Rejected'}
          </h4>
          {approval.approverName && (
            <p className="mt-0.5 text-sm text-gray-600">
              By: {approval.approverName}
              {approval.approvedAt ? ` on ${formatDate(approval.approvedAt)}` : ''}
            </p>
          )}
          {approval.rejectedReason && (
            <p className="mt-1 text-sm text-red-700">
              Reason: {approval.rejectedReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table of Contents Preview
// ---------------------------------------------------------------------------

function TableOfContentsPreview({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-[#1B3A5C]" />
          <h4 className="text-sm font-semibold text-gray-900">Table of Contents</h4>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {content ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
              {content}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Table of contents will be auto-generated when the package is assembled.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submit to Title Modal
// ---------------------------------------------------------------------------

function SubmitToTitleModal({
  open,
  onClose,
  packageId,
  transactionId,
}: {
  open: boolean;
  onClose: () => void;
  packageId: string;
  transactionId: string;
}) {
  const queryClient = useQueryClient();
  const [titleEmail, setTitleEmail] = useState('');
  const [message, setMessage] = useState('');

  const submitMutation = useMutation({
    mutationFn: (payload: { titleCompanyEmail: string; message: string }) =>
      api(`/transactions/${transactionId}/closing/${packageId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Package submitted to title company' });
      queryClient.invalidateQueries({ queryKey: ['closing-packages', transactionId] });
      setTitleEmail('');
      setMessage('');
      onClose();
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Submission failed', message: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEmail.trim()) {
      addToast({ type: 'warning', title: 'Please enter a title company email' });
      return;
    }
    submitMutation.mutate({
      titleCompanyEmail: titleEmail.trim(),
      message: message.trim(),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Submit to Title Company</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="title-email" className="block text-sm font-medium text-gray-700">
              Title Company Email *
            </label>
            <div className="mt-1 flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <input
                id="title-email"
                type="email"
                value={titleEmail}
                onChange={(e) => setTitleEmail(e.target.value)}
                placeholder="closing@titlecompany.com"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="submission-message" className="block text-sm font-medium text-gray-700">
              Message (optional)
            </label>
            <textarea
              id="submission-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any additional notes for the title company..."
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
            />
          </div>
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
              disabled={submitMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              Submit Package
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Package Detail View
// ---------------------------------------------------------------------------

function PackageDetailView({
  pkg,
  transactionId,
}: {
  pkg: ClosingPackage;
  transactionId: string;
}) {
  const queryClient = useQueryClient();
  const [localDocs, setLocalDocs] = useState<ClosingDocument[]>(pkg.documentOrder);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const includedDocs = useMemo(
    () => localDocs.filter((d) => d.included).sort((a, b) => a.order - b.order),
    [localDocs],
  );

  const toggleInclude = useCallback((docId: string) => {
    setLocalDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, included: !d.included } : d)),
    );
  }, []);

  const moveUp = useCallback((docId: string) => {
    setLocalDocs((prev) => {
      const included = prev.filter((d) => d.included).sort((a, b) => a.order - b.order);
      const idx = included.findIndex((d) => d.id === docId);
      if (idx <= 0) return prev;
      const swapId = included[idx - 1].id;
      return prev.map((d) => {
        if (d.id === docId) return { ...d, order: d.order - 1 };
        if (d.id === swapId) return { ...d, order: d.order + 1 };
        return d;
      });
    });
  }, []);

  const moveDown = useCallback((docId: string) => {
    setLocalDocs((prev) => {
      const included = prev.filter((d) => d.included).sort((a, b) => a.order - b.order);
      const idx = included.findIndex((d) => d.id === docId);
      if (idx < 0 || idx >= included.length - 1) return prev;
      const swapId = included[idx + 1].id;
      return prev.map((d) => {
        if (d.id === docId) return { ...d, order: d.order + 1 };
        if (d.id === swapId) return { ...d, order: d.order - 1 };
        return d;
      });
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: (documents: ClosingDocument[]) =>
      api(`/transactions/${transactionId}/closing/${pkg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          documentOrder: documents.map((d) => ({
            id: d.id,
            included: d.included,
            order: d.order,
          })),
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Package updated' });
      queryClient.invalidateQueries({ queryKey: ['closing-packages', transactionId] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Save failed', message: err.message });
    },
  });

  const requestApprovalMutation = useMutation({
    mutationFn: () =>
      api(`/transactions/${transactionId}/closing/${pkg.id}/request-approval`, {
        method: 'POST',
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Approval requested' });
      queryClient.invalidateQueries({ queryKey: ['closing-packages', transactionId] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to request approval', message: err.message });
    },
  });

  const handleDownloadPdf = () => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/transactions/${transactionId}/closing/${pkg.id}/download?format=pdf`,
      '_blank',
    );
  };

  const handleDownloadZip = () => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/transactions/${transactionId}/closing/${pkg.id}/download?format=zip`,
      '_blank',
    );
  };

  const statusConfig = PACKAGE_STATUS_CONFIG[pkg.status] ?? PACKAGE_STATUS_CONFIG.draft;

  return (
    <div className="space-y-4">
      {/* Package Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-[#1B3A5C]" />
          <h3 className="text-lg font-bold text-gray-900">{pkg.packageName}</h3>
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              statusConfig.bg,
              statusConfig.text,
            )}
          >
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          Updated: {formatDateTime(pkg.updatedAt)}
        </div>
      </div>

      {/* Ready for Closing Indicator */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-3',
          pkg.readyForClosing
            ? 'border-green-200 bg-green-50'
            : 'border-amber-200 bg-amber-50',
        )}
      >
        {pkg.readyForClosing ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600" />
        )}
        <span
          className={cn(
            'text-sm font-medium',
            pkg.readyForClosing ? 'text-green-800' : 'text-amber-800',
          )}
        >
          {pkg.readyForClosing
            ? 'Ready for Closing -- All documents assembled and compliance checks passed'
            : 'Not Ready for Closing -- Review outstanding items below'}
        </span>
      </div>

      {/* Document List */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#1B3A5C]" />
            <h4 className="text-sm font-semibold text-gray-900">Documents</h4>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {includedDocs.length} included
            </span>
          </div>
          <button
            type="button"
            onClick={() => saveMutation.mutate(localDocs)}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Save Order
          </button>
        </div>
        <div>
          {localDocs
            .sort((a, b) => {
              // Included first, then by order
              if (a.included && !b.included) return -1;
              if (!a.included && b.included) return 1;
              return a.order - b.order;
            })
            .map((doc, idx, arr) => {
              const includedArr = arr.filter((d) => d.included);
              const includedIdx = includedArr.findIndex((d) => d.id === doc.id);
              return (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onToggleInclude={toggleInclude}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  isFirst={includedIdx === 0}
                  isLast={includedIdx === includedArr.length - 1}
                />
              );
            })}
          {localDocs.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No documents in this package
            </div>
          )}
        </div>
      </div>

      {/* Table of Contents */}
      <TableOfContentsPreview content={pkg.tableOfContents} />

      {/* Compliance Summary */}
      <ComplianceSummary items={pkg.complianceItems} />

      {/* Approval Status */}
      <ApprovalSection approval={pkg.approval} />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadZip}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Archive className="h-4 w-4" />
          Download ZIP
        </button>
        <button
          type="button"
          onClick={() => setSubmitModalOpen(true)}
          disabled={!pkg.readyForClosing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#2a4d73] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Submit to Title Company
        </button>
        <button
          type="button"
          onClick={() => requestApprovalMutation.mutate()}
          disabled={requestApprovalMutation.isPending || pkg.approval.status === 'approved'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A9D8F] bg-white px-4 py-2 text-sm font-medium text-[#2A9D8F] shadow-sm hover:bg-[#2A9D8F]/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestApprovalMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsUp className="h-4 w-4" />
          )}
          Request Approval
        </button>
      </div>

      {/* Submit to Title Modal */}
      <SubmitToTitleModal
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        packageId={pkg.id}
        transactionId={transactionId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Package List Item
// ---------------------------------------------------------------------------

function PackageListItem({
  pkg,
  isActive,
  onClick,
}: {
  pkg: ClosingPackage;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusConfig = PACKAGE_STATUS_CONFIG[pkg.status] ?? PACKAGE_STATUS_CONFIG.draft;
  const docCount = pkg.documentOrder.filter((d) => d.included).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors',
        isActive
          ? 'border-[#2A9D8F] bg-[#2A9D8F]/5'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
      )}
    >
      <div className="flex items-center gap-3">
        <Package className="h-5 w-5 text-[#1B3A5C]" />
        <div>
          <p className="text-sm font-semibold text-gray-900">{pkg.packageName}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {docCount} doc{docCount !== 1 ? 's' : ''} -- {formatDate(pkg.createdAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {pkg.readyForClosing && (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
            statusConfig.bg,
            statusConfig.text,
          )}
        >
          {statusConfig.label}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ClosingPackagePage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;
  const queryClient = useQueryClient();
  const [activePackageId, setActivePackageId] = useState<string | null>(null);

  const { data: closingData, isLoading } = useQuery({
    queryKey: ['closing-packages', transactionId],
    queryFn: () =>
      api<ClosingPageData>(`/transactions/${transactionId}/closing`),
    enabled: Boolean(transactionId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api<ClosingPackage>(`/transactions/${transactionId}/closing`, {
        method: 'POST',
        body: JSON.stringify({
          packageName: `Closing Package - ${formatDate(new Date().toISOString())}`,
        }),
      }),
    onSuccess: (data: ClosingPackage) => {
      addToast({ type: 'success', title: 'Closing package created' });
      queryClient.invalidateQueries({ queryKey: ['closing-packages', transactionId] });
      setActivePackageId(data.id);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to create package', message: err.message });
    },
  });

  const activePackage = closingData?.packages.find((p) => p.id === activePackageId) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading closing packages...</span>
      </div>
    );
  }

  if (!closingData) {
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
          <p className="text-sm text-red-600">Failed to load closing data.</p>
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['closing-packages', transactionId] })
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
            <h1 className="text-2xl font-bold text-gray-900">Closing Packages</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Assemble and manage closing document packages
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:opacity-50"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Closing Package
        </button>
      </div>

      {/* Layout: Package List + Detail */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Package List */}
        <div className="w-full space-y-2 lg:w-80 lg:flex-shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Packages ({closingData.packages.length})
          </h2>
          {closingData.packages.length > 0 ? (
            closingData.packages.map((pkg) => (
              <PackageListItem
                key={pkg.id}
                pkg={pkg}
                isActive={pkg.id === activePackageId}
                onClick={() => setActivePackageId(pkg.id)}
              />
            ))
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No closing packages yet</p>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#2A9D8F] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Create your first package
              </button>
            </div>
          )}
        </div>

        {/* Package Detail */}
        <div className="flex-1">
          {activePackage ? (
            <PackageDetailView
              pkg={activePackage}
              transactionId={transactionId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16">
              <Package className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                {closingData.packages.length > 0
                  ? 'Select a package to view details'
                  : 'Create a closing package to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
