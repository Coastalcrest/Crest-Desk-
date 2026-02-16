'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { api, apiPaginated } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BillingRecord {
  id: string;
  tenantId: string;
  agentId: string;
  agentFirstName: string;
  agentLastName: string;
  billingType: string;
  amount: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceDate: string;
  dueDate: string;
  paidStatus: 'unpaid' | 'paid' | 'overdue' | 'partial';
  paymentDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface OutstandingEntry {
  agentId: string;
  agentFirstName: string;
  agentLastName: string;
  agentEmail: string;
  totalOutstanding: number;
  currentAmount: number;
  over30: number;
  over60: number;
  over90: number;
  invoiceCount: number;
}

interface MarkPaidPayload {
  paidDate: string;
  paidAmount: number;
  paymentMethod: string;
  paymentReference: string;
}

interface GenerateInvoicesPayload {
  agentIds: string[];
  invoiceDate: string;
  dueDate: string;
  billingTypes: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25;

const TYPE_LABELS: Record<string, string> = {
  desk_fee: 'Desk Fee',
  eo_insurance: 'E&O Insurance',
  tech_fee: 'Tech Fee',
};

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  unpaid: 'bg-blue-100 text-blue-700',
  partial: 'bg-yellow-100 text-yellow-700',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(num);
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function AgentBillingPage() {
  const queryClient = useQueryClient();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [billingFilter, setBillingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Invoice creation form state
  const [invoiceForm, setInvoiceForm] = useState({
    agentIds: [] as string[],
    billingType: 'desk_fee',
    invoiceDate: '',
    dueDate: '',
  });

  // ---- Build query params ----
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(PAGE_SIZE));
  if (billingFilter !== 'all') queryParams.set('billingType', billingFilter);
  if (statusFilter !== 'all') queryParams.set('paidStatus', statusFilter);

  // ---- Billing records query ----
  const {
    data: billingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['billing', page, billingFilter, statusFilter],
    queryFn: () =>
      apiPaginated<BillingRecord>(`/billing?${queryParams.toString()}`),
  });

  const billingItems = billingData?.data ?? [];
  const totalPages = billingData?.pagination?.totalPages ?? 1;

  // ---- Outstanding / aging query ----
  const { data: outstandingData } = useQuery({
    queryKey: ['billing', 'outstanding'],
    queryFn: () => api<OutstandingEntry[]>('/billing/outstanding'),
  });

  const outstanding = outstandingData ?? [];

  // Compute aggregate stats from outstanding data
  const totalOutstanding = outstanding.reduce(
    (sum, o) => sum + o.totalOutstanding,
    0,
  );
  const totalOverdue = outstanding.reduce(
    (sum, o) => sum + o.over30 + o.over60 + o.over90,
    0,
  );
  const agingCurrent = outstanding.reduce(
    (sum, o) => sum + o.currentAmount,
    0,
  );
  const aging30 = outstanding.reduce((sum, o) => sum + o.over30, 0);
  const aging60 = outstanding.reduce((sum, o) => sum + o.over60, 0);
  const aging90 = outstanding.reduce((sum, o) => sum + o.over90, 0);

  // ---- Mark-paid mutation ----
  const markPaidMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkPaidPayload }) =>
      api(`/billing/${id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Invoice marked as paid' });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to mark paid',
        message: err.message,
      });
    },
  });

  // ---- Generate invoices mutation ----
  const generateMutation = useMutation({
    mutationFn: (data: GenerateInvoicesPayload) =>
      api('/billing/generate-invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Invoices generated successfully' });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      setShowInvoiceModal(false);
      setInvoiceForm({
        agentIds: [],
        billingType: 'desk_fee',
        invoiceDate: '',
        dueDate: '',
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to generate invoices',
        message: err.message,
      });
    },
  });

  const handleMarkPaid = (item: BillingRecord) => {
    markPaidMutation.mutate({
      id: item.id,
      payload: {
        paidDate: new Date().toISOString().split('T')[0],
        paidAmount: parseFloat(item.amount),
        paymentMethod: 'manual',
        paymentReference: '',
      },
    });
  };

  const handleGenerateInvoices = () => {
    if (!invoiceForm.invoiceDate || !invoiceForm.dueDate) {
      addToast({
        type: 'warning',
        title: 'Please fill in all required fields',
      });
      return;
    }
    generateMutation.mutate({
      agentIds: invoiceForm.agentIds,
      invoiceDate: invoiceForm.invoiceDate,
      dueDate: invoiceForm.dueDate,
      billingTypes: [invoiceForm.billingType],
    });
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-gray-700 font-medium">Failed to load billing data</p>
        <p className="text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Agent Billing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage desk fees, E&O insurance, and technology charges
          </p>
        </div>
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total Outstanding</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(totalOverdue)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Overdue</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-green-50">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(agingCurrent)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Current</p>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Aging Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
            <p className="text-sm font-medium text-green-700 mb-1">Current</p>
            <p className="text-xl font-bold text-green-800">
              {formatCurrency(agingCurrent)}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-100">
            <p className="text-sm font-medium text-yellow-700 mb-1">
              30+ Days
            </p>
            <p className="text-xl font-bold text-yellow-800">
              {formatCurrency(aging30)}
            </p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
            <p className="text-sm font-medium text-orange-700 mb-1">
              60+ Days
            </p>
            <p className="text-xl font-bold text-orange-800">
              {formatCurrency(aging60)}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
            <p className="text-sm font-medium text-red-700 mb-1">90+ Days</p>
            <p className="text-xl font-bold text-red-800">
              {formatCurrency(aging90)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={billingFilter}
            onChange={(e) => {
              setBillingFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="desk_fee">Desk Fee</option>
            <option value="eo_insurance">E&O Insurance</option>
            <option value="tech_fee">Tech Fee</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>

      {/* Billing Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount Due
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billingItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No billing records found
                  </td>
                </tr>
              )}
              {billingItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-semibold">
                        {getInitials(item.agentFirstName, item.agentLastName)}
                      </div>
                      <span className="font-medium text-gray-900">
                        {item.agentFirstName} {item.agentLastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {formatDate(item.dueDate)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {TYPE_LABELS[item.billingType] || item.billingType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_STYLES[item.paidStatus] ??
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.paidStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.paidStatus !== 'paid' && (
                      <button
                        onClick={() => handleMarkPaid(item)}
                        disabled={markPaidMutation.isPending}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {markPaidMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin inline" />
                        ) : (
                          'Mark Paid'
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Invoice
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={invoiceForm.agentIds[0] ?? ''}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({
                      ...f,
                      agentIds: e.target.value ? [e.target.value] : [],
                    }))
                  }
                >
                  <option value="">Select agent</option>
                  {outstanding.map((o) => (
                    <option key={o.agentId} value={o.agentId}>
                      {o.agentFirstName} {o.agentLastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Type
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={invoiceForm.billingType}
                    onChange={(e) =>
                      setInvoiceForm((f) => ({
                        ...f,
                        billingType: e.target.value,
                      }))
                    }
                  >
                    <option value="desk_fee">Desk Fee</option>
                    <option value="eo_insurance">E&O Insurance</option>
                    <option value="tech_fee">Tech Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) =>
                      setInvoiceForm((f) => ({
                        ...f,
                        invoiceDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={invoiceForm.dueDate}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoices}
                disabled={generateMutation.isPending}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {generateMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
