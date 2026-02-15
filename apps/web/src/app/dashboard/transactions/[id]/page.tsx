'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  FolderOpen,
  ClipboardList,
  Shield,
  Activity,
  Loader2,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
  Home,
  File,
  BarChart3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TransactionDetail {
  id: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
  transactionType: string;
  buyerName: string | null;
  sellerName: string | null;
  listPrice: number | null;
  salePrice: number | null;
  closingDate: string | null;
  listingDate: string | null;
  createdAt: string;
  updatedAt: string;
  documents: TransactionDocument[];
  complianceChecklist: ComplianceItem[];
  availableForms: FormTemplate[];
  filledForms: FilledForm[];
  activityLog: ActivityEvent[];
}

interface TransactionDocument {
  id: string;
  name: string;
  type: string;
  folder: string;
  status: string;
  size: number;
  createdAt: string;
}

interface ComplianceItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  documentId: string | null;
}

interface FormTemplate {
  id: string;
  name: string;
  description: string;
  state: string;
}

interface FilledForm {
  id: string;
  templateName: string;
  status: 'draft' | 'completed' | 'signed';
  updatedAt: string;
}

interface ActivityEvent {
  id: string;
  type: 'upload' | 'edit' | 'form_fill' | 'status_change' | 'compliance' | 'comment';
  description: string;
  userName: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DOCUMENT_FOLDERS = [
  { key: 'agreements', label: 'Agreements', icon: FileText },
  { key: 'disclosures', label: 'Disclosures', icon: ClipboardList },
  { key: 'inspections', label: 'Inspections', icon: Shield },
  { key: 'closing', label: 'Closing', icon: CheckCircle2 },
  { key: 'other', label: 'Other', icon: FolderOpen },
];

const STATUS_OPTIONS = [
  'draft', 'active', 'under_contract', 'pending', 'closed', 'cancelled',
];

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  active: { bg: 'bg-blue-50', text: 'text-blue-700' },
  under_contract: { bg: 'bg-purple-50', text: 'text-purple-700' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  closed: { bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
};

const TAB_ITEMS = [
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'forms', label: 'Forms', icon: ClipboardList },
  { key: 'compliance', label: 'Compliance', icon: Shield },
  { key: 'activity', label: 'Activity', icon: Activity },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number | null): string {
  if (amount === null) return '--';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------
function DocumentsTab({
  documents,
  transactionId,
}: {
  documents: TransactionDocument[];
  transactionId: string;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFolder, setUploadFolder] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ files, folder }: { files: File[]; folder: string }) => {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('transactionId', transactionId);
      formData.append('folder', folder);
      return api('/documents/upload', { method: 'POST', body: formData });
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Document uploaded' });
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      setUploadFolder(null);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Upload failed', message: err.message });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && uploadFolder) {
      uploadMutation.mutate({ files: Array.from(e.target.files), folder: uploadFolder });
    }
  };

  const triggerUpload = (folder: string) => {
    setUploadFolder(folder);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {DOCUMENT_FOLDERS.map((folder) => {
        const FolderIcon = folder.icon;
        const folderDocs = documents.filter((d) => d.folder === folder.key);

        return (
          <div key={folder.key} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4 text-[#1B3A5C]" />
                <span className="text-sm font-semibold text-gray-900">{folder.label}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {folderDocs.length}
                </span>
              </div>
              <button
                onClick={() => triggerUpload(folder.key)}
                disabled={uploadMutation.isPending}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Upload className="h-3 w-3" />
                Upload
              </button>
            </div>
            {folderDocs.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {folderDocs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate text-sm text-gray-700">{doc.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{formatFileSize(doc.size)}</span>
                      <span className="text-xs text-gray-400">{formatDate(doc.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No documents in this folder
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forms Tab
// ---------------------------------------------------------------------------
function FormsTab({
  availableForms,
  filledForms,
}: {
  availableForms: FormTemplate[];
  filledForms: FilledForm[];
}) {
  return (
    <div className="space-y-6">
      {/* Available Forms */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Available Forms
        </h3>
        {availableForms.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {availableForms.map((form) => (
              <div
                key={form.id}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-[#2A9D8F] hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{form.name}</h4>
                    <p className="mt-1 text-xs text-gray-500">{form.description}</p>
                  </div>
                  <span className="rounded bg-[#1B3A5C]/10 px-2 py-0.5 text-xs font-medium text-[#1B3A5C]">
                    {form.state}
                  </span>
                </div>
                <button className="mt-3 text-sm font-medium text-[#2A9D8F] hover:text-[#238b7e]">
                  Fill Out Form
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            No forms available for this state
          </div>
        )}
      </div>

      {/* Filled Forms */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Filled Forms
        </h3>
        {filledForms.length > 0 ? (
          <div className="space-y-2">
            {filledForms.map((form) => {
              const statusColor =
                form.status === 'signed' ? 'text-green-600'
                : form.status === 'completed' ? 'text-blue-600'
                : 'text-gray-500';
              return (
                <div
                  key={form.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{form.templateName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-medium capitalize', statusColor)}>
                      {form.status}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(form.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
            No forms have been filled out yet
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Tab
// ---------------------------------------------------------------------------
function ComplianceTab({ checklist }: { checklist: ComplianceItem[] }) {
  const completedCount = checklist.filter((c) => c.completed).length;
  const totalCount = checklist.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Compliance Progress</h3>
          <span className="text-sm font-medium text-gray-600">
            {completedCount}/{totalCount} complete
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              progressPct === 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-[#2A9D8F]' : 'bg-yellow-500',
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">{progressPct}% complete</p>
      </div>

      {/* Checklist */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <ul className="divide-y divide-gray-100">
          {checklist.length > 0 ? (
            checklist.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <div>
                    <span className={cn('text-sm', item.completed ? 'text-gray-500' : 'font-medium text-gray-900')}>
                      {item.label}
                    </span>
                    {item.required && !item.completed && (
                      <span className="ml-2 text-xs font-medium text-red-500">Required</span>
                    )}
                  </div>
                </div>
                {item.completed && item.documentId && (
                  <span className="text-xs text-[#2A9D8F]">Linked</span>
                )}
              </li>
            ))
          ) : (
            <li className="px-5 py-8 text-center text-sm text-gray-400">
              No compliance items configured for this transaction type
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Tab
// ---------------------------------------------------------------------------
function ActivityTab({ events }: { events: ActivityEvent[] }) {
  const iconMap: Record<string, typeof Upload> = {
    upload: Upload,
    edit: FileText,
    form_fill: ClipboardList,
    status_change: BarChart3,
    compliance: Shield,
    comment: Activity,
  };

  return (
    <div className="space-y-1">
      {events.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 h-full w-px bg-gray-200" />
          <ul className="space-y-4">
            {events.map((event) => {
              const EventIcon = iconMap[event.type] ?? Activity;
              return (
                <li key={event.id} className="relative flex gap-4 pl-1">
                  <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#1B3A5C]/10">
                    <EventIcon className="h-4 w-4 text-[#1B3A5C]" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-gray-700">{event.description}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {event.userName} -- {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No activity recorded yet</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('documents');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const { data: txn, isLoading, error } = useQuery<TransactionDetail>({
    queryKey: ['transaction', id],
    queryFn: () => api<TransactionDetail>(`/transactions/${id}`),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) =>
      api(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      setStatusDropdownOpen(false);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Update failed', message: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading transaction...</span>
      </div>
    );
  }

  if (error || !txn) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard/transactions')}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load transaction details.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['transaction', id] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[txn.status] ?? STATUS_BADGE.draft;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/transactions')}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Transactions
      </button>

      {/* Transaction Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#1B3A5C]/10 p-2.5">
              <Home className="h-6 w-6 text-[#1B3A5C]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{txn.propertyAddress}</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                {[txn.city, txn.state, txn.zipCode].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
                badge.bg,
                badge.text,
              )}
            >
              {formatStatusLabel(txn.status)}
              <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', statusDropdownOpen && 'rotate-90')} />
            </button>
            {statusDropdownOpen && (
              <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate(s)}
                    disabled={s === txn.status}
                    className={cn(
                      'block w-full px-4 py-2 text-left text-sm hover:bg-gray-50',
                      s === txn.status ? 'font-medium text-[#2A9D8F]' : 'text-gray-700',
                    )}
                  >
                    {formatStatusLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
          {txn.buyerName && (
            <div>
              <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                <Users className="h-3 w-3" /> Buyer
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{txn.buyerName}</dd>
            </div>
          )}
          {txn.sellerName && (
            <div>
              <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                <Users className="h-3 w-3" /> Seller
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{txn.sellerName}</dd>
            </div>
          )}
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
              <DollarSign className="h-3 w-3" /> List Price
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(txn.listPrice)}</dd>
          </div>
          {txn.salePrice !== null && (
            <div>
              <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                <DollarSign className="h-3 w-3" /> Sale Price
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(txn.salePrice)}</dd>
            </div>
          )}
          <div>
            <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
              <Calendar className="h-3 w-3" /> Closing Date
            </dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(txn.closingDate)}</dd>
          </div>
          {txn.listingDate && (
            <div>
              <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                <Calendar className="h-3 w-3" /> Listed
              </dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(txn.listingDate)}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {TAB_ITEMS.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-[#2A9D8F] text-[#2A9D8F]'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              )}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'documents' && (
          <DocumentsTab documents={txn.documents} transactionId={txn.id} />
        )}
        {activeTab === 'forms' && (
          <FormsTab availableForms={txn.availableForms} filledForms={txn.filledForms} />
        )}
        {activeTab === 'compliance' && (
          <ComplianceTab checklist={txn.complianceChecklist} />
        )}
        {activeTab === 'activity' && (
          <ActivityTab events={txn.activityLog} />
        )}
      </div>
    </div>
  );
}
