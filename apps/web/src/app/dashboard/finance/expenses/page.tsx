'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingDown,
  Percent,
  Plus,
  Filter,
  ChevronDown,
  X,
  Camera,
  Palette,
  Megaphone,
  ClipboardCheck,
  FileCheck,
  FileText,
  Receipt,
  MoreHorizontal,
  Search,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api, apiPaginated } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types -- aligned with GET /expenses and GET /expenses/stats API responses
// ---------------------------------------------------------------------------

interface ApiExpense {
  id: string;
  dealId: string | null;
  agentId: string | null;
  vendorId: string | null;
  expenseCategory: string;
  amount: string; // numeric comes back as string
  description: string | null;
  receiptDate: string | null;
  paymentDate: string | null;
  paidStatus: 'paid' | 'pending';
  receiptUrl: string | null;
  taxDeductible: boolean;
  irsCategoryCode: string | null;
  qbSyncDate: string | null;
  qbExpenseId: string | null;
  notes: string | null;
  createdAt: string;
  dealName: string | null;
  propertyAddress: string | null;
  agentFirstName: string | null;
  agentLastName: string | null;
}

interface CategoryStat {
  category: string;
  totalAmount: number;
  count: number;
}

interface ExpenseStats {
  totalYtd: number;
  totalThisMonth: number;
  byCategory: CategoryStat[];
  expenseToRevenueRatio: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  Photography: 'bg-blue-500',
  Staging: 'bg-purple-500',
  Marketing: 'bg-pink-500',
  Inspection: 'bg-amber-500',
  Appraisal: 'bg-green-500',
  Title: 'bg-indigo-500',
  Recording: 'bg-teal-500',
  Other: 'bg-gray-500',
};

function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? 'bg-gray-400';
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(val);

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ExpenseDashboardPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: '',
    deal: '',
    vendor: '',
  });

  // Build query string for the expense list
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (statusFilter !== 'all') params.set('paidStatus', statusFilter);
    return params.toString();
  };

  // Fetch expense list
  const {
    data: expensesResponse,
    isLoading: expensesLoading,
    error: expensesError,
  } = useQuery({
    queryKey: ['expenses', page, categoryFilter, statusFilter],
    queryFn: () =>
      apiPaginated<ApiExpense>(`/expenses?${buildQueryString()}`),
  });

  const expenses = expensesResponse?.data ?? [];
  const pagination = expensesResponse?.pagination ?? {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  };

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<ExpenseStats>({
    queryKey: ['expense-stats'],
    queryFn: () => api<ExpenseStats>('/expenses/stats'),
  });

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          expenseCategory: data.category,
          amount: data.amount,
          description: data.description,
          receiptDate: data.date || undefined,
          dealId: data.deal || undefined,
          vendorId: data.vendor || undefined,
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Expense created successfully' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      setShowModal(false);
      setFormData({
        category: '',
        amount: '',
        description: '',
        date: '',
        deal: '',
        vendor: '',
      });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to create expense',
        message: err.message,
      });
    },
  });

  // Mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (expenseId: string) =>
      api(`/expenses/${expenseId}/mark-paid`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Expense marked as paid' });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    },
    onError: (err: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to mark as paid',
        message: err.message,
      });
    },
  });

  // Derived values for category chart
  const categories = stats?.byCategory ?? [];
  const maxCatAmount = categories.length
    ? Math.max(...categories.map((c) => c.totalAmount))
    : 1;

  const isLoading = expensesLoading && statsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>Expense Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage brokerage expenses across all categories</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-red-50"><DollarSign className="w-5 h-5 text-red-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalYtd ?? 0)}</p>
          <p className="text-sm text-gray-500 mt-1">YTD Expenses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-orange-50"><TrendingDown className="w-5 h-5 text-orange-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalThisMonth ?? 0)}</p>
          <p className="text-sm text-gray-500 mt-1">This Month</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-purple-50"><Percent className="w-5 h-5 text-purple-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.expenseToRevenueRatio?.toFixed(1) ?? '0.0'}%</p>
          <p className="text-sm text-gray-500 mt-1">Expense-to-Revenue Ratio</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Expenses by Category</h2>
          <p className="text-sm text-gray-500 mt-0.5">Breakdown of spending across expense categories</p>
        </div>
        <div className="p-6 space-y-3">
          {categories.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No category data available</p>
          )}
          {categories.map((cat) => (
            <div key={cat.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${categoryColor(cat.category)}`}></div>
                  <span className="font-medium text-gray-700">{cat.category}</span>
                  <span className="text-gray-400 text-xs">({cat.count} items)</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(cat.totalAmount)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${categoryColor(cat.category)} transition-all duration-500`} style={{ width: `${(cat.totalAmount / maxCatAmount) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" /><span className="font-medium">Filters:</span>
          </div>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Categories</option>
            <option value="photography">Photography</option>
            <option value="staging">Staging</option>
            <option value="marketing">Marketing</option>
            <option value="inspection">Inspection</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
          {expensesLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deal</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 && !expensesLoading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                    No expenses found
                  </td>
                </tr>
              )}
              {expenses.map((exp) => {
                const agentName = [exp.agentFirstName, exp.agentLastName]
                  .filter(Boolean)
                  .join(' ') || '\u2014';
                const displayDate = exp.receiptDate
                  ? new Date(exp.receiptDate).toLocaleDateString()
                  : '\u2014';

                return (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{displayDate}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{exp.description ?? '\u2014'}</td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{exp.expenseCategory}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{exp.dealName ?? exp.propertyAddress ?? '\u2014'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{agentName}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(Number(exp.amount))}</td>
                    <td className="px-6 py-4 text-center">
                      {exp.paidStatus === 'paid' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">paid</span>
                      ) : (
                        <button
                          onClick={() => markPaidMutation.mutate(exp.id)}
                          disabled={markPaidMutation.isPending}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors cursor-pointer"
                        >
                          pending
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1}
              {'\u2013'}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} expenses
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Expense</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option value="">Select category</option>
                  <option value="photography">Photography</option>
                  <option value="staging">Staging</option>
                  <option value="marketing">Marketing</option>
                  <option value="inspection">Inspection</option>
                  <option value="appraisal">Appraisal</option>
                  <option value="title">Title</option>
                  <option value="recording">Recording</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" placeholder="Enter description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal</label>
                  <input type="text" placeholder="Related deal" value={formData.deal} onChange={(e) => setFormData({...formData, deal: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input type="text" placeholder="Vendor name" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => createMutation.mutate(formData)}
                disabled={createMutation.isPending || !formData.category || !formData.amount}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
