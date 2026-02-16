'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Package,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
  Send,
  Shield,
  Download,
  Archive,
  GripVertical,
  ChevronRight,
  Eye,
  FileCheck,
  FolderOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageDocument {
  id: string;
  name: string;
  type: string;
  pageCount: number;
  isSigned: boolean;
  signingStatus: 'unsigned' | 'partially_signed' | 'fully_signed';
  order: number;
}

interface ClosingPackage {
  id: string;
  name: string;
  status: 'draft' | 'assembling' | 'ready_for_review' | 'approved' | 'submitted_to_title' | 'recorded';
  documentCount: number;
  documents: PackageDocument[];
  tableOfContents: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TransactionDocument {
  id: string;
  name: string;
  type: string;
  pageCount: number;
  isSigned: boolean;
}

interface ClosingPackagesResponse {
  packages: ClosingPackage[];
  availableDocuments: TransactionDocument[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; dotColor: string }
> = {
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Draft',
    dotColor: 'bg-gray-400',
  },
  assembling: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    label: 'Assembling',
    dotColor: 'bg-blue-400',
  },
  ready_for_review: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    label: 'Ready for Review',
    dotColor: 'bg-amber-400',
  },
  approved: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    label: 'Approved',
    dotColor: 'bg-green-400',
  },
  submitted_to_title: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    label: 'Submitted to Title',
    dotColor: 'bg-purple-400',
  },
  recorded: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Recorded',
    dotColor: 'bg-emerald-500',
  },
};

const SIGNING_STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  unsigned: { icon: Clock, color: 'text-gray-400', label: 'Unsigned' },
  partially_signed: { icon: AlertCircle, color: 'text-amber-500', label: 'Partial' },
  fully_signed: { icon: CheckCircle2, color: 'text-green-500', label: 'Signed' },
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

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config = PACKAGE_STATUS_CONFIG[status] ?? PACKAGE_STATUS_CONFIG.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        config.bg,
        config.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  count,
  icon: Icon,
  bgColor,
  borderColor,
  textColor,
  iconColor,
}: {
  label: string;
  count: number;
  icon: typeof Package;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
}) {
  return (
    <div className={cn('rounded-lg border p-4', bgColor, borderColor)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <p className={cn('mt-1 text-2xl font-bold', textColor)}>{count}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document Order Row
// ---------------------------------------------------------------------------

function DocumentOrderRow({ doc }: { doc: PackageDocument }) {
  const signingConfig =
    SIGNING_STATUS_CONFIG[doc.signingStatus] ?? SIGNING_STATUS_CONFIG.unsigned;
  const SigningIcon = signingConfig.icon;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5 transition-colors hover:bg-gray-50">
      <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-300" />
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[#1B3A5C]/10 text-xs font-semibold text-[#1B3A5C]">
        {doc.order}
      </div>
      <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{doc.name}</p>
        <p className="text-xs text-gray-400">{doc.type}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">{doc.pageCount} pg</span>
        <div className="flex items-center gap-1">
          <SigningIcon className={cn('h-3.5 w-3.5', signingConfig.color)} />
          <span className={cn('text-xs font-medium', signingConfig.color)}>
            {signingConfig.label}
          </span>
        </div>
        {doc.isSigned && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Package Detail Panel
// ---------------------------------------------------------------------------

function PackageDetailPanel({
  pkg,
  onClose,
  onSubmitToTitle,
  onApprove,
  isSubmitting,
  isApproving,
}: {
  pkg: ClosingPackage;
  onClose: () => void;
  onSubmitToTitle: (packageId: string) => void;
  onApprove: (packageId: string) => void;
  isSubmitting: boolean;
  isApproving: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-[#1B3A5C]" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">{pkg.name}</h3>
            <div className="mt-0.5 flex items-center gap-2">
              <StatusBadge status={pkg.status} />
              <span className="text-xs text-gray-400">
                {pkg.documentCount} document{pkg.documentCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Document Order */}
      <div className="px-5 py-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Document Order
        </h4>
        {pkg.documents.length > 0 ? (
          <div className="space-y-1.5">
            {[...pkg.documents]
              .sort((a, b) => a.order - b.order)
              .map((doc) => (
                <DocumentOrderRow key={doc.id} doc={doc} />
              ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
            <FileText className="mx-auto mb-2 h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-400">No documents in this package</p>
          </div>
        )}
      </div>

      {/* Table of Contents */}
      {pkg.tableOfContents && (
        <div className="border-t border-gray-100 px-5 py-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Table of Contents
          </h4>
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
            {pkg.tableOfContents}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-4">
        {/* Download PDF */}
        <a
          href={`/api/v1/closing-packages/${pkg.id}/download-pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-3 w-3" />
          Download PDF
        </a>

        {/* Download ZIP */}
        <a
          href={`/api/v1/closing-packages/${pkg.id}/download-zip`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Archive className="h-3 w-3" />
          Download ZIP
        </a>

        {/* Conditional Actions */}
        {pkg.status === 'ready_for_review' && (
          <button
            type="button"
            onClick={() => onSubmitToTitle(pkg.id)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#2A9D8F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#238b7e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Submit to Title
          </button>
        )}

        {pkg.status === 'submitted_to_title' && (
          <button
            type="button"
            onClick={() => onApprove(pkg.id)}
            disabled={isApproving}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1B3A5C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2a4d73] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApproving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Shield className="h-3 w-3" />
            )}
            Approve Package
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Package Card
// ---------------------------------------------------------------------------

function PackageCard({
  pkg,
  onSelect,
  onAssemble,
  onSubmitToTitle,
  onApprove,
  isSubmitting,
  isApproving,
}: {
  pkg: ClosingPackage;
  onSelect: (pkg: ClosingPackage) => void;
  onAssemble: (packageId: string) => void;
  onSubmitToTitle: (packageId: string) => void;
  onApprove: (packageId: string) => void;
  isSubmitting: boolean;
  isApproving: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => onSelect(pkg)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#1B3A5C]/10 p-2">
            <Package className="h-4 w-4 text-[#1B3A5C]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{pkg.name}</h3>
            <div className="mt-0.5 flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <FileText className="h-3 w-3" />
                {pkg.documentCount} doc{pkg.documentCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {formatDate(pkg.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={pkg.status} />
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </button>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3">
        <button
          type="button"
          onClick={() => onSelect(pkg)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Eye className="h-3 w-3" />
          View Details
        </button>

        {pkg.status === 'draft' && (
          <button
            type="button"
            onClick={() => onAssemble(pkg.id)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#2A9D8F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#238b7e]"
          >
            <FileCheck className="h-3 w-3" />
            Assemble
          </button>
        )}

        {pkg.status === 'ready_for_review' && (
          <button
            type="button"
            onClick={() => onSubmitToTitle(pkg.id)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#2A9D8F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#238b7e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Submit to Title
          </button>
        )}

        {pkg.status === 'submitted_to_title' && (
          <button
            type="button"
            onClick={() => onApprove(pkg.id)}
            disabled={isApproving}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1B3A5C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2a4d73] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApproving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Shield className="h-3 w-3" />
            )}
            Approve
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Package Modal
// ---------------------------------------------------------------------------

function CreatePackageModal({
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
  const [packageName, setPackageName] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [tableOfContents, setTableOfContents] = useState('');

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      transactionId: string;
      documentIds: string[];
      tableOfContents: string | null;
    }) =>
      api('/closing-packages', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Closing package created' });
      queryClient.invalidateQueries({ queryKey: ['closing-packages', transactionId] });
      resetForm();
      onClose();
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to create package',
        message: err.message,
      });
    },
  });

  const resetForm = () => {
    setPackageName('');
    setSelectedDocIds([]);
    setTableOfContents('');
  };

  const toggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

  const selectAll = () => {
    if (selectedDocIds.length === availableDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(availableDocuments.map((d) => d.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) {
      addToast({ type: 'warning', title: 'Please enter a package name' });
      return;
    }
    if (selectedDocIds.length === 0) {
      addToast({ type: 'warning', title: 'Please select at least one document' });
      return;
    }
    createMutation.mutate({
      name: packageName.trim(),
      transactionId,
      documentIds: selectedDocIds,
      tableOfContents: tableOfContents.trim() || null,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Create Closing Package</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Package Name */}
          <div>
            <label
              htmlFor="package-name"
              className="block text-sm font-medium text-gray-700"
            >
              Package Name *
            </label>
            <input
              id="package-name"
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g., 123 Main St - Closing Package"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
            />
          </div>

          {/* Document Selector */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Select Documents *
              </label>
              {availableDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-medium text-[#2A9D8F] hover:underline"
                >
                  {selectedDocIds.length === availableDocuments.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              )}
            </div>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
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
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                      {doc.name}
                    </span>
                    <span className="text-xs text-gray-400">{doc.type}</span>
                    <span className="text-xs text-gray-400">{doc.pageCount} pg</span>
                    {doc.isSigned && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </label>
                ))
              ) : (
                <p className="px-2 py-6 text-center text-sm text-gray-400">
                  No documents available. Upload documents to this transaction first.
                </p>
              )}
            </div>
            {selectedDocIds.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedDocIds.length} document
                {selectedDocIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Table of Contents */}
          <div>
            <label htmlFor="toc" className="block text-sm font-medium text-gray-700">
              Table of Contents{' '}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="toc"
              rows={4}
              value={tableOfContents}
              onChange={(e) => setTableOfContents(e.target.value)}
              placeholder="Enter an optional table of contents for this package..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
            />
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
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Package
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

export default function ClosingPackagePage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ClosingPackage | null>(null);

  // ---- Data Fetching ----

  const { data, isLoading, isError } = useQuery({
    queryKey: ['closing-packages', transactionId],
    queryFn: () =>
      api<ClosingPackagesResponse>(
        `/closing-packages?transactionId=${transactionId}`,
      ),
    enabled: Boolean(transactionId),
  });

  // ---- Mutations ----

  const assembleMutation = useMutation({
    mutationFn: (packageId: string) =>
      api(`/closing-packages/${packageId}/assemble`, {
        method: 'POST',
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Package assembly started' });
      queryClient.invalidateQueries({
        queryKey: ['closing-packages', transactionId],
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to assemble package',
        message: err.message,
      });
    },
  });

  const submitToTitleMutation = useMutation({
    mutationFn: (packageId: string) =>
      api(`/closing-packages/${packageId}/submit-to-title`, {
        method: 'POST',
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Package submitted to title company' });
      queryClient.invalidateQueries({
        queryKey: ['closing-packages', transactionId],
      });
      setSelectedPackage(null);
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to submit to title',
        message: err.message,
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (packageId: string) =>
      api(`/closing-packages/${packageId}/approve`, {
        method: 'POST',
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Package approved successfully' });
      queryClient.invalidateQueries({
        queryKey: ['closing-packages', transactionId],
      });
      setSelectedPackage(null);
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to approve package',
        message: err.message,
      });
    },
  });

  // ---- Computed Stats ----

  const packages = data?.packages ?? [];
  const availableDocuments = data?.availableDocuments ?? [];

  const statusCounts = useMemo(() => {
    return {
      total: packages.length,
      readyForClosing: packages.filter(
        (p) => p.status === 'ready_for_review' || p.status === 'approved',
      ).length,
      submittedToTitle: packages.filter(
        (p) => p.status === 'submitted_to_title',
      ).length,
      finalApproved: packages.filter(
        (p) => p.status === 'approved' || p.status === 'recorded',
      ).length,
    };
  }, [packages]);

  // ---- Handlers ----

  const handleAssemble = (packageId: string) => {
    assembleMutation.mutate(packageId);
  };

  const handleSubmitToTitle = (packageId: string) => {
    submitToTitleMutation.mutate(packageId);
  };

  const handleApprove = (packageId: string) => {
    approveMutation.mutate(packageId);
  };

  const handleSelectPackage = (pkg: ClosingPackage) => {
    setSelectedPackage(selectedPackage?.id === pkg.id ? null : pkg);
  };

  // ---- Loading State ----

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">
          Loading closing packages...
        </span>
      </div>
    );
  }

  // ---- Error State ----

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() =>
            router.push(`/dashboard/transactions/${transactionId}`)
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transaction
        </button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-red-600">
            Failed to load closing packages
          </p>
          <p className="mt-1 text-xs text-red-400">
            There was an error retrieving data. Please try again.
          </p>
          <button
            type="button"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ['closing-packages', transactionId],
              })
            }
            className="mt-4 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---- Main Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/transactions/${transactionId}`)
            }
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Closing Package
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Assemble and manage closing document packages
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e]"
        >
          <Plus className="h-4 w-4" />
          Create Package
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Packages"
          count={statusCounts.total}
          icon={Package}
          bgColor="bg-slate-50"
          borderColor="border-slate-200"
          textColor="text-[#1B3A5C]"
          iconColor="text-[#1B3A5C]"
        />
        <StatCard
          label="Ready for Closing"
          count={statusCounts.readyForClosing}
          icon={FileCheck}
          bgColor="bg-amber-50"
          borderColor="border-amber-200"
          textColor="text-amber-700"
          iconColor="text-amber-500"
        />
        <StatCard
          label="Submitted to Title"
          count={statusCounts.submittedToTitle}
          icon={Send}
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          textColor="text-purple-700"
          iconColor="text-purple-500"
        />
        <StatCard
          label="Final Approved"
          count={statusCounts.finalApproved}
          icon={CheckCircle2}
          bgColor="bg-green-50"
          borderColor="border-green-200"
          textColor="text-green-700"
          iconColor="text-green-500"
        />
      </div>

      {/* Package List */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Packages ({packages.length})
        </h2>
        {packages.length > 0 ? (
          <div className="space-y-3">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onSelect={handleSelectPackage}
                onAssemble={handleAssemble}
                onSubmitToTitle={handleSubmitToTitle}
                onApprove={handleApprove}
                isSubmitting={submitToTitleMutation.isPending}
                isApproving={approveMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
            <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No closing packages yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Create a package to assemble your closing documents
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#2A9D8F] hover:underline"
            >
              <Plus className="h-4 w-4" />
              Create your first package
            </button>
          </div>
        )}
      </div>

      {/* Selected Package Detail Panel */}
      {selectedPackage && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Package Details
          </h2>
          <PackageDetailPanel
            pkg={selectedPackage}
            onClose={() => setSelectedPackage(null)}
            onSubmitToTitle={handleSubmitToTitle}
            onApprove={handleApprove}
            isSubmitting={submitToTitleMutation.isPending}
            isApproving={approveMutation.isPending}
          />
        </div>
      )}

      {/* Create Package Modal */}
      <CreatePackageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        availableDocuments={availableDocuments}
        transactionId={transactionId}
      />
    </div>
  );
}
