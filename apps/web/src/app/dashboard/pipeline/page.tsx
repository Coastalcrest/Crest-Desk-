'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  X,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Trophy,
  XCircle,
  Calendar,
  User,
  ChevronDown,
  Settings,
  Filter,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types — aligned with GET /deals and GET /deals/stats API responses
// ---------------------------------------------------------------------------

/** A single deal row from GET /deals (flat, with joined stage + contact). */
interface ApiDeal {
  id: string;
  tenantId: string;
  contactId: string;
  ownerUserId: string;
  pipelineStageId: string;
  dealName: string;
  dealValue: string | null; // numeric comes back as string
  expectedCloseDate: string | null;
  probability: number | null;
  dealType: string;
  propertyAddress: string | null;
  propertyState: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdAt: string;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
  stageName: string;
  stageColor: string;
  stageOrder: number;
}

/** Stage row from GET /deals/stages */
interface ApiStage {
  id: string;
  tenantId: string;
  stageName: string;
  stageOrder: number;
  stageColor: string | null;
  isClosedWon: boolean;
  isClosedLost: boolean;
}

/** Normalised deal for the kanban UI. */
interface Deal {
  id: string;
  name: string;
  contactId: string;
  contactName: string;
  value: number;
  expectedCloseDate: string | null;
  probability: number;
  stageId: string;
  stageName: string;
  dealType: string;
  propertyAddress: string | null;
  ownerId: string;
  createdAt: string;
}

/** A stage column in the kanban board. */
interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  deals: Deal[];
  totalValue: number;
}

interface PipelineStats {
  totalDeals: number;
  totalValue: string;
  wonThisMonth: number;
  lostThisMonth: number;
  forecast: string;
  byStage: { stageId: string; stageName: string; stageColor: string; stageOrder: number; dealCount: number; stageValue: string }[];
}

/** Transform flat API deals + stages into kanban PipelineStage[]. */
function buildKanban(stages: ApiStage[], deals: ApiDeal[]): PipelineStage[] {
  const stageMap = new Map<string, PipelineStage>();
  for (const s of stages) {
    stageMap.set(s.id, {
      id: s.id,
      name: s.stageName,
      order: s.stageOrder,
      color: s.stageColor ?? '#6B7280',
      deals: [],
      totalValue: 0,
    });
  }
  for (const d of deals) {
    const col = stageMap.get(d.pipelineStageId);
    if (!col) continue;
    const val = d.dealValue ? parseFloat(d.dealValue) : 0;
    col.deals.push({
      id: d.id,
      name: d.dealName,
      contactId: d.contactId,
      contactName: [d.contactFirstName, d.contactLastName].filter(Boolean).join(' ') || 'Unknown',
      value: val,
      expectedCloseDate: d.expectedCloseDate,
      probability: d.probability ?? 50,
      stageId: d.pipelineStageId,
      stageName: d.stageName,
      dealType: d.dealType,
      propertyAddress: d.propertyAddress,
      ownerId: d.ownerUserId,
      createdAt: d.createdAt,
    });
    col.totalValue += val;
  }
  return Array.from(stageMap.values()).sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEAL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'rental', label: 'Rental' },
  { value: 'referral', label: 'Referral' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  return parts.map((p) => p.charAt(0)).join('').toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------
function StatsBar({ stats, isLoading }: { stats: PipelineStats | undefined; isLoading: boolean }) {
  const cards = [
    { label: 'Total Deals', value: stats?.totalDeals ?? 0, format: 'number' as const, icon: BarChart3, color: 'text-[#1B3A5C]', bgColor: 'bg-[#1B3A5C]/10' },
    { label: 'Total Value', value: stats?.totalValue ?? '0', format: 'currency' as const, icon: DollarSign, color: 'text-[#2A9D8F]', bgColor: 'bg-[#2A9D8F]/10' },
    { label: 'Weighted Forecast', value: stats?.forecast ?? '0', format: 'currency' as const, icon: TrendingUp, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { label: 'Won This Month', value: stats?.wonThisMonth ?? 0, format: 'number' as const, icon: Trophy, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Lost This Month', value: stats?.lostThisMonth ?? 0, format: 'number' as const, icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', card.bgColor)}>
                <Icon className={cn('h-5 w-5', card.color)} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                {isLoading ? (
                  <div className="mt-1 h-5 w-16 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className="text-lg font-bold text-gray-900">
                    {card.format === 'currency' ? formatCurrency(card.value) : typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deal Card
// ---------------------------------------------------------------------------
function DealCard({ deal, stages, onMove }: { deal: Deal; stages: { id: string; name: string }[]; onMove: (dealId: string, stageId: string) => void }) {
  const [moveOpen, setMoveOpen] = useState(false);
  const daysLeft = daysUntil(deal.expectedCloseDate);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
      {/* Deal Name */}
      <h4 className="mb-1 truncate text-sm font-semibold text-gray-900">{deal.name}</h4>

      {/* Contact */}
      <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
        <User className="h-3 w-3" />
        <span className="truncate">{deal.contactName}</span>
      </div>

      {/* Value */}
      <p className="mb-2 text-lg font-bold text-[#1B3A5C]">{formatCurrency(deal.value)}</p>

      {/* Expected close & probability */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(deal.expectedCloseDate)}</span>
          {daysLeft !== null && (
            <span className={cn(
              'ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              daysLeft <= 0 ? 'bg-red-100 text-red-700' :
              daysLeft <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600',
            )}>
              {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d`}
            </span>
          )}
        </div>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          deal.probability >= 70 ? 'bg-green-100 text-green-700' :
          deal.probability >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600',
        )}>
          {deal.probability}%
        </span>
      </div>

      {/* Deal Type */}
      <div className="mb-3">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 capitalize">{deal.dealType}</span>
      </div>

      {/* Property Address */}
      {deal.propertyAddress && (
        <p className="mb-3 truncate text-xs text-gray-400">{deal.propertyAddress}</p>
      )}

      {/* Move to dropdown */}
      <div className="relative">
        <button
          onClick={() => setMoveOpen(!moveOpen)}
          className="inline-flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <span className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Move to...
          </span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', moveOpen && 'rotate-180')} />
        </button>

        {moveOpen && (
          <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {stages.filter((s) => s.id !== deal.stageId).map((s) => (
              <button
                key={s.id}
                onClick={() => { onMove(deal.id, s.id); setMoveOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
              >
                <div className="h-2 w-2 rounded-full bg-gray-400" />
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Column
// ---------------------------------------------------------------------------
function KanbanColumn({
  stage,
  allStages,
  onMoveDeal,
}: {
  stage: PipelineStage;
  allStages: { id: string; name: string }[];
  onMoveDeal: (dealId: string, stageId: string) => void;
}) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50">
      {/* Column header */}
      <div className="border-b border-gray-200 p-3">
        <div className="mb-2 h-1 w-full rounded-full" style={{ backgroundColor: stage.color || '#6B7280' }} />
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{stage.name}</h3>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm">
            {stage.deals.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{formatCurrency(stage.totalValue)}</p>
      </div>

      {/* Deal cards */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3" style={{ maxHeight: '60vh' }}>
        {stage.deals.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400">No deals in this stage</p>
          </div>
        ) : (
          stage.deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              stages={allStages}
              onMove={onMoveDeal}
            />
          ))
        )}

        {/* Visual drop zone */}
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-3 text-center transition-colors hover:border-[#2A9D8F]/50 hover:bg-[#2A9D8F]/5">
          <p className="text-xs text-gray-400">Drop deal here</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Deal Modal
// ---------------------------------------------------------------------------
function NewDealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    contactSearch: '',
    contactId: '',
    value: '',
    expectedCloseDate: '',
    dealType: 'buyer',
    propertyAddress: '',
    stage: 'New Lead',
  });
  const [contactResults, setContactResults] = useState<{ id: string; name: string }[]>([]);
  const [showContactResults, setShowContactResults] = useState(false);

  const searchContactsMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await api<{ id: string; firstName: string; lastName: string }[]>(`/contacts?search=${encodeURIComponent(query)}&pageSize=5`);
      // api() unwraps { data: [...] } → [...], so res is the array
      return Array.isArray(res) ? res : [];
    },
    onSuccess: (contacts) => {
      setContactResults(
        contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
      );
      setShowContactResults(true);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api<{ id: string }>('/deals', {
        method: 'POST',
        body: JSON.stringify({
          dealName: data.name,
          contactId: data.contactId,
          dealValue: parseFloat(data.value) || 0,
          expectedCloseDate: data.expectedCloseDate || null,
          dealType: data.dealType,
          propertyAddress: data.propertyAddress || null,
        }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Deal created successfully' });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
      onClose();
      setForm({ name: '', contactSearch: '', contactId: '', value: '', expectedCloseDate: '', dealType: 'buyer', propertyAddress: '', stage: 'New Lead' });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to create deal', message: err.message });
    },
  });

  const updateField = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleContactSearch = useCallback((query: string) => {
    updateField('contactSearch', query);
    updateField('contactId', '');
    if (query.length >= 2) {
      searchContactsMutation.mutate(query);
    } else {
      setShowContactResults(false);
    }
  }, [updateField, searchContactsMutation]);

  const selectContact = useCallback((contact: { id: string; name: string }) => {
    updateField('contactId', contact.id);
    updateField('contactSearch', contact.name);
    setShowContactResults(false);
  }, [updateField]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactId) {
      addToast({ type: 'warning', title: 'Please select a contact' });
      return;
    }
    createMutation.mutate(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Deal</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Search */}
          <div className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">Contact *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.contactSearch}
                onChange={(e) => handleContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
            {showContactResults && contactResults.length > 0 && (
              <div className="absolute left-0 right-0 z-20 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {contactResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectContact(c)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Deal Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Deal Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., 123 Main St Purchase"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
          </div>

          {/* Value & Close Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Deal Value *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  required
                  value={form.value}
                  onChange={(e) => updateField('value', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Expected Close</label>
              <input
                type="date"
                value={form.expectedCloseDate}
                onChange={(e) => updateField('expectedCloseDate', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          {/* Deal Type & Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Deal Type</label>
              <select
                value={form.dealType}
                onChange={(e) => updateField('dealType', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="rental">Rental</option>
                <option value="referral">Referral</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => updateField('stage', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
              >
                {DEFAULT_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Property Address */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Property Address</label>
            <input
              type="text"
              value={form.propertyAddress}
              onChange={(e) => updateField('propertyAddress', e.target.value)}
              placeholder="123 Main Street, City, ST"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
            />
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
              Create Deal
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
export default function PipelinePage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [agentFilter, setAgentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const queryParams = new URLSearchParams();
  queryParams.set('pageSize', '200');
  if (agentFilter) queryParams.set('ownerId', agentFilter);
  if (typeFilter) queryParams.set('dealType', typeFilter);

  // Fetch pipeline stages
  const { data: stagesData } = useQuery<ApiStage[]>({
    queryKey: ['pipeline-stages'],
    queryFn: () => api<ApiStage[]>('/deals/stages'),
  });

  // Fetch deals (flat list)
  const { data: dealsData, isLoading, error } = useQuery<ApiDeal[]>({
    queryKey: ['pipeline', agentFilter, typeFilter],
    queryFn: () => api<ApiDeal[]>(`/deals?${queryParams.toString()}`),
  });

  // Fetch aggregate stats
  const { data: stats, isLoading: statsLoading } = useQuery<PipelineStats>({
    queryKey: ['pipeline-stats'],
    queryFn: () => api<PipelineStats>('/deals/stats'),
  });

  // Build kanban from flat data
  const stages = buildKanban(stagesData ?? [], dealsData ?? []);
  const allStageRefs = stages.map((s) => ({ id: s.id, name: s.name }));

  const moveDealMutation = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      api(`/deals/${dealId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Deal moved successfully' });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to move deal', message: err.message });
    },
  });

  const handleMoveDeal = useCallback((dealId: string, stageId: string) => {
    moveDealMutation.mutate({ dealId, stageId });
  }, [moveDealMutation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track deals through your sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => addToast({ type: 'info', title: 'Stage management requires Managing Broker+ role' })}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Manage Stages
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by agent..."
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-48 rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
        >
          {DEAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} isLoading={statsLoading} />

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading pipeline...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load pipeline.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['pipeline'] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      ) : stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <BarChart3 className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-base font-semibold text-gray-900">No pipeline stages configured</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
            Set up your pipeline stages to start tracking deals.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: `${stages.length * 300}px` }}>
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                allStages={allStageRefs}
                onMoveDeal={handleMoveDeal}
              />
            ))}
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      <NewDealModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
