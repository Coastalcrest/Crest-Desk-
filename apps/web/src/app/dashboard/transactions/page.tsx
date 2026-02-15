'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  FileText,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Home,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Transaction {
  id: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  status: 'draft' | 'active' | 'under_contract' | 'pending' | 'closed' | 'cancelled';
  transactionType: 'purchase' | 'listing' | 'dual';
  buyerName: string | null;
  sellerName: string | null;
  listPrice: number | null;
  closingDate: string | null;
  documentCount: number;
  createdAt: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  active: { bg: 'bg-blue-50', text: 'text-blue-700' },
  under_contract: { bg: 'bg-purple-50', text: 'text-purple-700' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  closed: { bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
};

const PAGE_SIZE = 12;

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

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// New Transaction Modal
// ---------------------------------------------------------------------------
function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    propertyAddress: '',
    city: '',
    state: '',
    zipCode: '',
    transactionType: 'purchase' as 'purchase' | 'listing' | 'dual',
    buyerName: '',
    sellerName: '',
    listPrice: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api<{ id: string }>('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          listPrice: data.listPrice ? parseFloat(data.listPrice) : null,
        }),
      }),
    onSuccess: (result) => {
      addToast({ type: 'success', title: 'Transaction created' });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
      router.push(`/dashboard/transactions/${result.id}`);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to create transaction', message: err.message });
    },
  });

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Transaction</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Address */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Property Address *
            </label>
            <input
              type="text"
              required
              value={form.propertyAddress}
              onChange={(e) => updateField('propertyAddress', e.target.value)}
              placeholder="123 Main Street"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">State *</label>
              <select
                required
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              >
                <option value="">Select</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ZIP</label>
              <input
                type="text"
                value={form.zipCode}
                onChange={(e) => updateField('zipCode', e.target.value)}
                maxLength={10}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Transaction Type *
            </label>
            <select
              required
              value={form.transactionType}
              onChange={(e) => updateField('transactionType', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            >
              <option value="purchase">Purchase</option>
              <option value="listing">Listing</option>
              <option value="dual">Dual Agency</option>
            </select>
          </div>

          {/* Buyer & Seller */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Buyer Name</label>
              <input
                type="text"
                value={form.buyerName}
                onChange={(e) => updateField('buyerName', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Seller Name</label>
              <input
                type="text"
                value={form.sellerName}
                onChange={(e) => updateField('sellerName', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          {/* List Price */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">List Price</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={form.listPrice}
                onChange={(e) => updateField('listPrice', e.target.value)}
                placeholder="0"
                min="0"
                step="1000"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
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
              Create Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction Card
// ---------------------------------------------------------------------------
function TransactionCard({ txn, onClick }: { txn: Transaction; onClick: () => void }) {
  const badge = STATUS_BADGE[txn.status] ?? STATUS_BADGE.draft;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-lg bg-[#1B3A5C]/10 p-2">
            <Home className="h-4 w-4 text-[#1B3A5C]" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {txn.propertyAddress}
            </h3>
            <p className="text-xs text-gray-500">
              {[txn.city, txn.state, txn.zipCode].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <span className={cn('flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', badge.bg, badge.text)}>
          {formatStatusLabel(txn.status)}
        </span>
      </div>

      {/* Parties */}
      <div className="mb-3 space-y-1">
        {txn.buyerName && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            <span className="truncate">Buyer: {txn.buyerName}</span>
          </div>
        )}
        {txn.sellerName && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            <span className="truncate">Seller: {txn.sellerName}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm font-medium text-gray-900">
            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
            {formatCurrency(txn.listPrice)}
          </span>
          {txn.closingDate && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              {formatDate(txn.closingDate)}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <FileText className="h-3 w-3" />
          {txn.documentCount} docs
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TransactionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(PAGE_SIZE));
  if (search) queryParams.set('search', search);
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);

  const { data, isLoading, error } = useQuery<TransactionsResponse>({
    queryKey: ['transactions', page, search, statusFilter],
    queryFn: () => api<TransactionsResponse>(`/transactions?${queryParams.toString()}`),
  });

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your real estate transactions and track progress
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Transaction
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by address, buyer, or seller..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
        />
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              statusFilter === tab.value
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
          <span className="ml-2 text-sm text-gray-500">Loading transactions...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load transactions.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <MapPin className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-900">No transactions found</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
            {search || statusFilter !== 'all'
              ? 'No transactions match your current filters. Try adjusting your search criteria.'
              : 'Get started by creating your first transaction to manage documents and compliance.'}
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#238b7e]"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </button>
        </div>
      ) : (
        <>
          {/* Transaction Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {transactions.map((txn) => (
              <TransactionCard
                key={txn.id}
                txn={txn}
                onClick={() => router.push(`/dashboard/transactions/${txn.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, total)} of {total} transactions
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
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
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

      {/* New Transaction Modal */}
      <NewTransactionModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
