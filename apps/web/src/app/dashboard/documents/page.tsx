'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  Upload,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  CloudUpload,
  Loader2,
  File,
  AlertCircle,
} from 'lucide-react';
import { api, apiPaginated, PaginatedResponse } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ApiDocument {
  id: string;
  tenantId: string;
  transactionId: string | null;
  documentType: string;
  originalFilename: string;
  s3Key: string;
  s3Bucket: string | null;
  fileSizeBytes: number;
  mimeType: string;
  folderPath: string | null;
  isCompliant: boolean | null;
  isSigned: boolean | null;
  classificationConfidence: string | null;
  extractedData: unknown;
  complianceIssues: unknown;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Compute a display status from the API's boolean flags */
function computeDocStatus(doc: ApiDocument): 'compliant' | 'flagged' | 'unsigned' | 'signed' {
  if (doc.isCompliant === false) return 'flagged';
  if (doc.isSigned) return 'signed';
  if (doc.isCompliant) return 'compliant';
  return 'unsigned';
}

interface Transaction {
  id: string;
  propertyAddress: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DOCUMENT_TYPES = [
  'Purchase Agreement',
  'Listing Agreement',
  'Disclosure',
  'Inspection Report',
  'Appraisal',
  'Title Report',
  'Closing Document',
  'Addendum',
  'Other',
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'unsigned', label: 'Unsigned' },
  { value: 'signed', label: 'Signed' },
];

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string }> = {
  compliant: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  signed: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  flagged: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  unsigned: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
};

const PAGE_SIZE = 20;

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
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Upload Modal
// ---------------------------------------------------------------------------
function UploadModal({
  open,
  onClose,
  transactions,
}: {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [transactionId, setTransactionId] = useState('');

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      if (transactionId) formData.append('transactionId', transactionId);
      return api<{ uploaded: number }>('/documents/upload', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Documents uploaded successfully' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      handleClose();
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Upload failed', message: err.message });
    },
  });

  const handleClose = () => {
    setSelectedFiles([]);
    setTransactionId('');
    setDragActive(false);
    onClose();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Transaction selector */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Link to Transaction (optional)
          </label>
          <select
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          >
            <option value="">No transaction</option>
            {transactions.map((t) => (
              <option key={t.id} value={t.id}>{t.propertyAddress}</option>
            ))}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
            dragActive
              ? 'border-[#2A9D8F] bg-[#2A9D8F]/5'
              : 'border-gray-300 hover:border-gray-400',
          )}
        >
          <CloudUpload className={cn('mb-3 h-10 w-10', dragActive ? 'text-[#2A9D8F]' : 'text-gray-400')} />
          <p className="text-sm font-medium text-gray-700">
            Drop files here or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 25MB</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <File className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate text-sm text-gray-700">{file.name}</span>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => uploadMutation.mutate(selectedFiles)}
            disabled={selectedFiles.length === 0 || uploadMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter Sidebar
// ---------------------------------------------------------------------------
function FilterSidebar({
  filters,
  onFilterChange,
  transactions,
}: {
  filters: {
    transactionId: string;
    types: string[];
    status: string;
    dateFrom: string;
    dateTo: string;
  };
  onFilterChange: (filters: Record<string, unknown>) => void;
  transactions: Transaction[];
}) {
  const toggleType = (type: string) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFilterChange({ ...filters, types: next });
  };

  return (
    <aside className="w-64 flex-shrink-0 space-y-6">
      {/* Transaction filter */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Transaction
        </label>
        <select
          value={filters.transactionId}
          onChange={(e) => onFilterChange({ ...filters, transactionId: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
        >
          <option value="">All Transactions</option>
          {transactions.map((t) => (
            <option key={t.id} value={t.id}>{t.propertyAddress}</option>
          ))}
        </select>
      </div>

      {/* Document type filter */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Document Type
        </label>
        <div className="space-y-1.5">
          {DOCUMENT_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.types.includes(type)}
                onChange={() => toggleType(type)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
              />
              <span className="text-sm text-gray-700">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status filter */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Status
        </label>
        <div className="space-y-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={filters.status === opt.value}
                onChange={() => onFilterChange({ ...filters, status: opt.value })}
                className="h-3.5 w-3.5 border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
              />
              <span className="text-sm text-gray-700">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Date Range
        </label>
        <div className="space-y-2">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          />
        </div>
      </div>

      {/* Clear filters */}
      {(filters.transactionId || filters.types.length > 0 || filters.status !== 'all' || filters.dateFrom || filters.dateTo) && (
        <button
          onClick={() =>
            onFilterChange({
              transactionId: '',
              types: [],
              status: 'all',
              dateFrom: '',
              dateTo: '',
            })
          }
          className="text-sm font-medium text-[#2A9D8F] hover:text-[#238b7e]"
        >
          Clear all filters
        </button>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function DocumentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    transactionId: '',
    types: [] as string[],
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });

  // Fetch transactions for filter dropdown
  const { data: transactionsData } = useQuery<Transaction[]>({
    queryKey: ['transactions-list'],
    queryFn: () => api<Transaction[]>('/transactions?pageSize=100'),
  });
  const transactions = transactionsData ?? [];

  // Fetch documents
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (filters.transactionId) queryParams.set('transactionId', filters.transactionId);
  if (filters.types.length > 0) queryParams.set('types', filters.types.join(','));
  if (filters.status !== 'all') queryParams.set('status', filters.status);
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);

  const {
    data,
    isLoading,
    error,
  } = useQuery<PaginatedResponse<ApiDocument>>({
    queryKey: ['documents', page, search, filters],
    queryFn: () => apiPaginated<ApiDocument>(`/documents?${queryParams.toString()}`),
  });

  const documents = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleFilterChange = (next: Record<string, unknown>) => {
    setFilters(next as typeof filters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Hub</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage, search, and organize all your transaction documents
          </p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* Search & Filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents by name, type, or transaction..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
            showFilters
              ? 'border-[#1B3A5C] bg-[#1B3A5C]/5 text-[#1B3A5C]'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50',
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Content area */}
      <div className="flex gap-6">
        {/* Filter sidebar */}
        {showFilters && (
          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            transactions={transactions}
          />
        )}

        {/* Document table */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
              <span className="ml-2 text-sm text-gray-500">Loading documents...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
              <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
              <p className="text-sm text-red-600">Failed to load documents. Please try again.</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
                className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
              >
                Retry
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
              <FileText className="mb-3 h-12 w-12 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-900">No documents found</h3>
              <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
                {search || filters.status !== 'all' || filters.types.length > 0
                  ? 'No documents match your current filters. Try adjusting your search criteria.'
                  : 'Get started by uploading your first document or creating a transaction.'}
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e]"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">Transaction</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Date</th>
                      <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.map((doc) => {
                      const status = computeDocStatus(doc);
                      const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.compliant;
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
                          className="cursor-pointer transition-colors hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span className="truncate text-sm font-medium text-gray-900">{doc.originalFilename}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{doc.documentType}</span>
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <span className="truncate text-sm text-gray-500">
                              {doc.transactionId ?? '--'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', sc.bg, sc.text)}>
                              <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <span className="text-sm text-gray-500">{formatDate(doc.createdAt)}</span>
                          </td>
                          <td className="hidden px-4 py-3 text-right lg:table-cell">
                            <span className="text-sm text-gray-500">{formatFileSize(doc.fileSizeBytes)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, total)} of {total} documents
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
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
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
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        transactions={transactions}
      />
    </div>
  );
}
