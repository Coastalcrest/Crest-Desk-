'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  ChevronDown,
  Star,
  ExternalLink,
  ClipboardList,
  Home,
  X,
  ChevronRight,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { api, apiPaginated } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Transaction {
  id: string;
  propertyAddress: string;
  propertyState: string;
  status: string;
  transactionType: string;
  buyerName: string | null;
  sellerName: string | null;
  closingDate: string | null;
  createdAt: string;
}

interface FormTemplate {
  id: string;
  formKey: string;
  formName: string;
  formType: string;
  jurisdiction: string;
  effectiveDate: string;
  isSystemForm: boolean;
  supersededDate: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormInstance {
  id: string;
  formId: string;
  transactionId: string;
  filledData: Record<string, unknown>;
  isComplete: boolean;
  isSentForSignature: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

const ROLE_LEVEL: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-400',
  active: 'bg-blue-500',
  under_contract: 'bg-purple-500',
  pending: 'bg-yellow-500',
  closed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const FORM_INSTANCE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'text-gray-500' },
  completed: { label: 'Complete', color: 'text-blue-600' },
  signed: { label: 'Signed', color: 'text-green-600' },
};

const FORM_TYPES = ['All Types', 'agreement', 'disclosure', 'addendum'];

const EXTERNAL_PROVIDERS = [
  { name: 'OREF — Oregon Real Estate Forms', url: 'https://orefonline.com/oref-library/', category: 'forms' },
  { name: 'Oregon REALTORS Forms', url: 'https://www.orforms.org/', category: 'forms' },
  { name: 'SkySlope Forms', url: 'https://skyslope.com/', category: 'platform' },
  { name: 'Dotloop', url: 'https://www.dotloop.com/', category: 'platform' },
  { name: 'Lone Wolf Transactions', url: 'https://www.lwolf.com/products/transactions-zipform-edition', category: 'platform' },
  { name: 'DocuSign', url: 'https://www.docusign.com/', category: 'platform' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getInstanceStatus(instance: FormInstance): string {
  if (instance.isSentForSignature) return 'signed';
  if (instance.isComplete) return 'completed';
  return 'draft';
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FormsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // State
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [txnSearch, setTxnSearch] = useState('');
  const [formSearch, setFormSearch] = useState('');
  const [formTypeFilter, setFormTypeFilter] = useState('All Types');
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const canCreateCustom = user !== null && hasMinRole(user.role, 'principal_broker');

  // ── Fetch transactions ──
  const { data: txnData, isLoading: txnLoading } = useQuery({
    queryKey: ['forms-page-transactions'],
    queryFn: () => apiPaginated<Transaction>('/transactions?page=1&pageSize=50'),
  });

  const allTransactions = txnData?.data ?? [];

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!txnSearch.trim()) return allTransactions;
    const q = txnSearch.toLowerCase();
    return allTransactions.filter(
      (t) =>
        t.propertyAddress.toLowerCase().includes(q) ||
        (t.buyerName?.toLowerCase().includes(q)) ||
        (t.sellerName?.toLowerCase().includes(q)),
    );
  }, [allTransactions, txnSearch]);

  // Auto-select first transaction
  useEffect(() => {
    if (!selectedTxnId && allTransactions.length > 0) {
      setSelectedTxnId(allTransactions[0].id);
    }
  }, [allTransactions, selectedTxnId]);

  const selectedTxn = allTransactions.find((t) => t.id === selectedTxnId) ?? null;

  // ── Fetch form instances for selected transaction ──
  const { data: instancesRaw, isLoading: instancesLoading } = useQuery({
    queryKey: ['form-instances', selectedTxnId],
    queryFn: () => api<FormInstance[]>(`/form-instances/transaction/${selectedTxnId}`),
    enabled: Boolean(selectedTxnId),
  });

  const formInstances = instancesRaw ?? [];

  // ── Fetch form library for selected transaction's state ──
  const { data: formsRaw, isLoading: formsLoading } = useQuery({
    queryKey: ['forms-library', selectedTxn?.propertyState],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedTxn?.propertyState) params.set('jurisdiction', selectedTxn.propertyState);
      const qs = params.toString();
      return api<FormTemplate[]>(`/forms${qs ? `?${qs}` : ''}`);
    },
    enabled: Boolean(selectedTxn),
  });

  const allForms = formsRaw ?? [];

  // Resolve form names for instances
  const formNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allForms.forEach((f) => map.set(f.id, f.formName));
    return map;
  }, [allForms]);

  // Filter form library
  const filteredForms = useMemo(() => {
    let filtered = allForms;
    if (formTypeFilter !== 'All Types') {
      filtered = filtered.filter((f) => f.formType === formTypeFilter);
    }
    if (formSearch.trim()) {
      const q = formSearch.toLowerCase();
      filtered = filtered.filter((f) => f.formName.toLowerCase().includes(q));
    }
    // Sort: custom first, then alphabetical
    return [...filtered].sort((a, b) => {
      if (a.isSystemForm !== b.isSystemForm) return a.isSystemForm ? 1 : -1;
      return a.formName.localeCompare(b.formName);
    });
  }, [allForms, formTypeFilter, formSearch]);

  // ── Add form to transaction mutation ──
  const addFormMutation = useMutation({
    mutationFn: (formId: string) =>
      api('/form-instances', {
        method: 'POST',
        body: JSON.stringify({ formId, transactionId: selectedTxnId }),
      }),
    onSuccess: (_data, formId) => {
      addToast({ type: 'success', title: 'Form added to transaction' });
      queryClient.invalidateQueries({ queryKey: ['form-instances', selectedTxnId] });
      router.push(`/dashboard/forms/${formId}/fill?transactionId=${selectedTxnId}`);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to add form', message: err.message });
    },
  });

  // ── Loading state ──
  if (txnLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
        <span className="ml-2 text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* ── Page Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
      </div>

      {/* ── Two-Panel Layout ── */}
      <div className="flex flex-1 gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">

        {/* ── Left Panel: Transactions ── */}
        <div className="flex w-full flex-col border-r border-gray-200 lg:w-[30%]">
          {/* Transaction search */}
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                placeholder="Search transactions..."
                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
              />
            </div>
          </div>

          {/* Transaction list */}
          <div className="flex-1 overflow-y-auto">
            {filteredTransactions.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {filteredTransactions.map((txn) => {
                  const isSelected = txn.id === selectedTxnId;
                  const dotColor = STATUS_DOT[txn.status] ?? 'bg-gray-400';
                  return (
                    <li key={txn.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTxnId(txn.id)}
                        className={cn(
                          'flex w-full flex-col gap-0.5 border-l-2 px-3 py-2.5 text-left transition-colors',
                          isSelected
                            ? 'border-l-[#2A9D8F] bg-[#2A9D8F]/5'
                            : 'border-l-transparent hover:bg-gray-50',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Home className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <span className={cn(
                            'truncate text-sm',
                            isSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-700',
                          )}>
                            {txn.propertyAddress}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-5.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColor)} />
                          <span className="text-xs text-gray-500">{formatStatusLabel(txn.status)}</span>
                          {txn.closingDate && (
                            <>
                              <span className="text-xs text-gray-300">·</span>
                              <span className="text-xs text-gray-400">{formatDate(txn.closingDate)}</span>
                            </>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : allTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <FolderOpen className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-500">No transactions yet</p>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/transactions')}
                  className="mt-2 text-xs font-medium text-[#2A9D8F] hover:underline"
                >
                  Go to Transactions
                </button>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No transactions match your search
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Forms Workspace ── */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {selectedTxn ? (
            <div className="flex flex-col gap-0">
              {/* Transaction header */}
              <div className="border-b border-gray-100 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{selectedTxn.propertyAddress}</h2>
                    <p className="text-xs text-gray-500">
                      {selectedTxn.propertyState} · {formatStatusLabel(selectedTxn.transactionType)}
                      {selectedTxn.buyerName && ` · ${selectedTxn.buyerName}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/transactions/${selectedTxn.id}`)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#2A9D8F] hover:underline"
                  >
                    View Transaction
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Section A: Transaction Forms */}
              <div className="border-b border-gray-100 px-5 py-4">
                <div className="mb-2 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#1B3A5C]" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Transaction Forms
                  </h3>
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                    {formInstances.length}
                  </span>
                </div>

                {instancesLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400">Loading forms...</span>
                  </div>
                ) : formInstances.length > 0 ? (
                  <ul className="space-y-1">
                    {formInstances.map((instance) => {
                      const status = getInstanceStatus(instance);
                      const statusInfo = FORM_INSTANCE_STATUS[status] ?? FORM_INSTANCE_STATUS.draft;
                      const formName = formNameMap.get(instance.formId) ?? 'Unknown Form';
                      return (
                        <li key={instance.id}>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/forms/${instance.formId}/fill?transactionId=${selectedTxnId}`,
                              )
                            }
                            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                              <span className="truncate text-sm text-gray-800">{formName}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={cn('text-xs font-medium', statusInfo.color)}>
                                {statusInfo.label}
                              </span>
                              <span className="text-xs text-gray-400">{formatDate(instance.updatedAt)}</span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="py-3 text-center text-xs text-gray-400">
                    No forms added yet — browse the library below to add forms
                  </p>
                )}
              </div>

              {/* Section B: Form Library */}
              <div className="flex-1 px-5 py-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1B3A5C]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Form Library
                    </h3>
                    {selectedTxn.propertyState && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {selectedTxn.propertyState}
                      </span>
                    )}
                    {canCreateCustom && (
                      <button
                        type="button"
                        onClick={() => router.push('/dashboard/forms/create')}
                        className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#1B3A5C] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#2A4F7A]"
                      >
                        <Plus className="h-3 w-3" />
                        Custom Form
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formSearch}
                        onChange={(e) => setFormSearch(e.target.value)}
                        placeholder="Search forms..."
                        className="w-48 rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-xs placeholder:text-gray-400 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                      />
                    </div>
                    <select
                      value={formTypeFilter}
                      onChange={(e) => setFormTypeFilter(e.target.value)}
                      className="rounded-md border border-gray-300 bg-white py-1.5 pl-2 pr-7 text-xs text-gray-700 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                    >
                      {FORM_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type === 'All Types' ? 'All Types' : capitalize(type) + 's'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formsLoading ? (
                  <div className="flex items-center gap-2 py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400">Loading form library...</span>
                  </div>
                ) : filteredForms.length > 0 ? (
                  <ul className="space-y-0.5">
                    {filteredForms.map((form) => (
                      <li
                        key={form.id}
                        className="group flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {!form.isSystemForm && (
                            <Star className="h-3 w-3 flex-shrink-0 text-amber-400 fill-amber-400" />
                          )}
                          <span className="truncate text-sm text-gray-700">{form.formName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addFormMutation.mutate(form.id)}
                          disabled={addFormMutation.isPending}
                          className="flex-shrink-0 rounded-md bg-[#2A9D8F] px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-all hover:bg-[#238b7e] group-hover:opacity-100 disabled:opacity-50"
                        >
                          {addFormMutation.isPending ? 'Adding...' : 'Add'}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No forms found</p>
                    <p className="text-xs text-gray-400">Try adjusting your search or filter</p>
                  </div>
                )}
              </div>

              {/* Section C: External Resources (collapsed) */}
              <div className="border-t border-gray-100 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setResourcesOpen(!resourcesOpen)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  External Resources
                  <ChevronDown className={cn(
                    'h-3 w-3 transition-transform',
                    resourcesOpen && 'rotate-180',
                  )} />
                </button>

                {resourcesOpen && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {EXTERNAL_PROVIDERS.map((provider) => (
                      <a
                        key={provider.name}
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md border border-gray-100 px-3 py-2 transition-colors hover:border-[#2A9D8F]/30 hover:bg-[#2A9D8F]/5"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-gray-700">{provider.name}</p>
                          <p className="text-[10px] text-gray-400 capitalize">
                            {provider.category === 'forms' ? 'Form Library' : 'Platform'}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No transaction selected */
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">
              <ClipboardList className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-500">
                Select a transaction to manage its forms
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Choose a transaction from the left panel to view and add forms
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
