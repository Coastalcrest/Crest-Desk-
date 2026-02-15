'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Tag,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Folder,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentResult {
  id: string;
  name: string;
  type: string;
  transactionId: string;
  transactionAddress: string;
  uploadedAt: string;
  complianceStatus: 'compliant' | 'flagged' | 'unchecked';
  signedStatus: 'signed' | 'unsigned' | 'pending';
  tags: string[];
  relevanceScore?: number;
  fileSize: number;
}

interface DocumentSearchResponse {
  documents: DocumentResult[];
  total: number;
  page: number;
  pageSize: number;
}

interface TransactionOption {
  id: string;
  address: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES = [
  'Purchase Agreement',
  'Listing Agreement',
  'Disclosure',
  'Addendum',
  'Inspection Report',
  'Appraisal',
  'Title Report',
  'Closing Statement',
  'Amendment',
  'Other',
];

const TAG_OPTIONS = [
  { value: 'signed', label: 'Signed', color: 'bg-green-100 text-green-800' },
  { value: 'unsigned', label: 'Unsigned', color: 'bg-gray-100 text-gray-700' },
  { value: 'needs_review', label: 'Needs Review', color: 'bg-amber-100 text-amber-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const COMPLIANCE_OPTIONS = [
  { value: '', label: 'Any Status' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'unchecked', label: 'Unchecked' },
];

const SIGNED_OPTIONS = [
  { value: '', label: 'Any Status' },
  { value: 'signed', label: 'Signed' },
  { value: 'unsigned', label: 'Unsigned' },
  { value: 'pending', label: 'Pending' },
];

const COMPLIANCE_BADGE: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  compliant: { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50' },
  flagged: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50' },
  unchecked: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocumentSearchPage() {
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('');
  const [signedFilter, setSignedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const pageSize = 20;

  // Fetch transactions for filter dropdown
  const { data: transactionsData } = useQuery({
    queryKey: ['transactions-options'],
    queryFn: () =>
      api<{ transactions: TransactionOption[] }>('/transactions?fields=id,address&limit=100'),
  });
  const transactions = transactionsData?.transactions ?? [];

  // Build search params
  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (submittedQuery) params.set('q', submittedQuery);
    if (selectedTypes.length > 0) params.set('types', selectedTypes.join(','));
    if (selectedTransaction) params.set('transactionId', selectedTransaction);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (complianceFilter) params.set('complianceStatus', complianceFilter);
    if (signedFilter) params.set('signedStatus', signedFilter);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    return params.toString();
  }, [
    submittedQuery,
    selectedTypes,
    selectedTransaction,
    selectedTags,
    dateFrom,
    dateTo,
    complianceFilter,
    signedFilter,
    page,
  ]);

  // Fetch results
  const { data: results, isLoading } = useQuery({
    queryKey: ['document-search', searchParams],
    queryFn: () =>
      api<DocumentSearchResponse>(`/documents/search?${searchParams}`),
  });

  const documents = results?.documents ?? [];
  const totalResults = results?.total ?? 0;
  const totalPages = Math.ceil(totalResults / pageSize);

  // Handlers
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmittedQuery(searchQuery);
      setPage(1);
      setSelectedDocs(new Set());
    },
    [searchQuery],
  );

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSubmittedQuery('');
    setSelectedTypes([]);
    setSelectedTransaction('');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
    setComplianceFilter('');
    setSignedFilter('');
    setPage(1);
    setSelectedDocs(new Set());
  }, []);

  const toggleDocSelection = useCallback((id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map((d) => d.id)));
    }
  }, [documents, selectedDocs.size]);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  // Bulk actions
  const handleBulkAddTag = useCallback(() => {
    addToast({ type: 'info', title: `Tagging ${selectedDocs.size} documents...` });
  }, [selectedDocs.size]);

  const handleBulkMove = useCallback(() => {
    addToast({ type: 'info', title: `Moving ${selectedDocs.size} documents...` });
  }, [selectedDocs.size]);

  const handleBulkExport = useCallback(() => {
    addToast({ type: 'info', title: `Exporting ${selectedDocs.size} documents...` });
  }, [selectedDocs.size]);

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedTransaction !== '' ||
    selectedTags.length > 0 ||
    dateFrom !== '' ||
    dateTo !== '' ||
    complianceFilter !== '' ||
    signedFilter !== '';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Search</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search and filter documents across all transactions
        </p>
      </div>

      {/* ── Search Bar ── */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name, content, or keywords..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-24 text-sm shadow-sm placeholder:text-gray-400 focus:border-[#2A9D8F] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-[#1B3A5C] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2A4F7A]"
          >
            Search
          </button>
        </div>
      </form>

      {/* ── Advanced Filters Toggle ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          <Filter className="h-4 w-4" />
          Advanced Filters
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-[#2A9D8F] px-1.5 py-0.5 text-[10px] font-bold text-white">
              !
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
          >
            <X className="h-3 w-3" />
            Clear all filters
          </button>
        )}
      </div>

      {/* ── Advanced Filters Panel ── */}
      {showAdvanced && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Document Type */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Document Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DOCUMENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      selectedTypes.includes(type)
                        ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Transaction
              </label>
              <select
                value={selectedTransaction}
                onChange={(e) => setSelectedTransaction(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              >
                <option value="">All Transactions</option>
                {transactions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      selectedTags.includes(tag.value)
                        ? 'border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Uploaded Between
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                />
              </div>
            </div>

            {/* Compliance Status */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Compliance Status
              </label>
              <select
                value={complianceFilter}
                onChange={(e) => setComplianceFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              >
                {COMPLIANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Signed Status */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Signed Status
              </label>
              <select
                value={signedFilter}
                onChange={(e) => setSignedFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              >
                {SIGNED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Actions Toolbar ── */}
      {selectedDocs.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[#2A9D8F]/30 bg-[#2A9D8F]/5 px-4 py-2.5">
          <span className="text-sm font-medium text-[#2A9D8F]">
            {selectedDocs.size} selected
          </span>
          <div className="h-4 w-px bg-[#2A9D8F]/30" />
          <button
            type="button"
            onClick={handleBulkAddTag}
            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-white"
          >
            <Tag className="h-3 w-3" />
            Add Tag
          </button>
          <button
            type="button"
            onClick={handleBulkMove}
            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-white"
          >
            <Folder className="h-3 w-3" />
            Move to Transaction
          </button>
          <button
            type="button"
            onClick={handleBulkExport}
            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-white"
          >
            <Download className="h-3 w-3" />
            Export
          </button>
        </div>
      )}

      {/* ── Results Count ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalResults > 0 ? (
            <>
              Showing{' '}
              <span className="font-medium text-gray-700">
                {(page - 1) * pageSize + 1}
              </span>
              {' '}-{' '}
              <span className="font-medium text-gray-700">
                {Math.min(page * pageSize, totalResults)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-gray-700">{totalResults}</span>{' '}
              results
            </>
          ) : (
            'No results'
          )}
        </p>
      </div>

      {/* ── Results Table ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A5C]" />
        </div>
      ) : documents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        documents.length > 0 &&
                        selectedDocs.size === documents.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                    />
                  </th>
                  {submittedQuery && (
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <div className="flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" />
                        Score
                      </div>
                    </th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Document
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Transaction
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Compliance
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => {
                  const compBadge = COMPLIANCE_BADGE[doc.complianceStatus];
                  const CompIcon = compBadge?.icon ?? Clock;

                  return (
                    <tr
                      key={doc.id}
                      className={cn(
                        'transition-colors hover:bg-gray-50',
                        selectedDocs.has(doc.id) && 'bg-[#2A9D8F]/5',
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDocs.has(doc.id)}
                          onChange={() => toggleDocSelection(doc.id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#2A9D8F] focus:ring-[#2A9D8F]"
                        />
                      </td>
                      {submittedQuery && (
                        <td className="px-4 py-3">
                          {doc.relevanceScore !== undefined && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
                              {(doc.relevanceScore * 100).toFixed(0)}%
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 text-[#1B3A5C]" />
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">
                              {doc.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatFileSize(doc.fileSize)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">
                        {doc.transactionAddress}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            compBadge?.bg,
                            compBadge?.color,
                          )}
                        >
                          <CompIcon className="h-3 w-3" />
                          {doc.complianceStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.map((tag) => {
                            const tagDef = TAG_OPTIONS.find(
                              (t) => t.value === tag,
                            );
                            return (
                              <span
                                key={tag}
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                  tagDef?.color ?? 'bg-gray-100 text-gray-600',
                                )}
                              >
                                {tagDef?.label ?? tag}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Empty / No Results ── */
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16">
          <Search className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            {submittedQuery || hasActiveFilters
              ? 'No documents match your search'
              : 'Search for documents across your transactions'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {submittedQuery || hasActiveFilters
              ? 'Try adjusting your search query or filters'
              : 'Enter a search term or use advanced filters to find documents'}
          </p>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
