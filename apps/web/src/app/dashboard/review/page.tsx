'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  Clock,
  CheckCircle2,
  CornerDownLeft,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  Eye,
  Play,
  Users,
  CalendarClock,
  ListChecks,
  LayoutList,
  FileSearch,
  SkipForward,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ReviewQueueStats {
  pending: number;
  inReview: number;
  approvedThisWeek: number;
  returned: number;
}

interface FindingCounts {
  critical: number;
  warning: number;
  info: number;
}

interface ReviewQueueItem {
  id: string;
  transactionId: string;
  propertyAddress: string;
  transactionType: 'purchase' | 'listing' | 'dual';
  transactionStatus: string;
  buyerName: string | null;
  sellerName: string | null;
  closingDate: string | null;
  readinessScore: number;
  priority: number;
  status: 'pending' | 'in_review' | 'approved' | 'returned' | 'escalated';
  findingCounts: FindingCounts;
  assignedReviewer: string | null;
  createdAt: string;
}

interface ReviewQueueResponse {
  items: ReviewQueueItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'returned', label: 'Returned' },
  { value: 'escalated', label: 'Escalated' },
];

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'closingDate', label: 'Closing Date' },
  { value: 'readinessScore', label: 'Readiness Score' },
];

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  in_review: { bg: 'bg-blue-50', text: 'text-blue-700' },
  approved: { bg: 'bg-green-50', text: 'text-green-700' },
  returned: { bg: 'bg-orange-50', text: 'text-orange-700' },
  escalated: { bg: 'bg-red-50', text: 'text-red-700' },
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function daysUntilClosing(closingDate: string | null): number | null {
  if (!closingDate) return null;
  const now = new Date();
  const closing = new Date(closingDate);
  const diffMs = closing.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getPriorityColor(priority: number): string {
  if (priority <= 25) return 'bg-red-500';
  if (priority <= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getScoreColor(score: number): string {
  if (score < 50) return 'text-red-600';
  if (score < 80) return 'text-yellow-600';
  return 'text-green-600';
}

function getScoreStrokeColor(score: number): string {
  if (score < 50) return 'stroke-red-500';
  if (score < 80) return 'stroke-yellow-500';
  return 'stroke-green-500';
}

function getScoreTrackColor(score: number): string {
  if (score < 50) return 'stroke-red-100';
  if (score < 80) return 'stroke-yellow-100';
  return 'stroke-green-100';
}

function getDaysUntilBadgeColor(days: number): string {
  if (days < 0) return 'bg-red-100 text-red-700';
  if (days <= 7) return 'bg-orange-100 text-orange-700';
  if (days <= 14) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
}

// ---------------------------------------------------------------------------
// Circular Score Indicator
// ---------------------------------------------------------------------------
function CircularScore({ score, size = 40 }: { score: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={getScoreTrackColor(score)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-500', getScoreStrokeColor(score))}
        />
      </svg>
      <span className={cn('absolute text-xs font-bold', getScoreColor(score))}>
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Card
// ---------------------------------------------------------------------------
function StatsCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review Queue Item Row
// ---------------------------------------------------------------------------
function ReviewQueueRow({
  item,
  onStartReview,
  onView,
  isStarting,
}: {
  item: ReviewQueueItem;
  onStartReview: (id: string) => void;
  onView: (id: string) => void;
  isStarting: boolean;
}) {
  const days = daysUntilClosing(item.closingDate);
  const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.pending;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left section: Priority + Address + Details */}
        <div className="flex items-start gap-3 lg:flex-1 lg:min-w-0">
          {/* Priority indicator */}
          <div className="mt-1.5 flex flex-shrink-0 flex-col items-center gap-1">
            <div className={cn('h-3 w-3 rounded-full', getPriorityColor(item.priority))} />
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {item.propertyAddress}
              </h3>
              <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', badge.bg, badge.text)}>
                {formatStatusLabel(item.status)}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="capitalize">
                {item.transactionType.replace(/_/g, ' ')} -- {formatStatusLabel(item.transactionStatus)}
              </span>
              {item.buyerName && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Buyer: {item.buyerName}
                </span>
              )}
              {item.sellerName && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Seller: {item.sellerName}
                </span>
              )}
            </div>

            {/* Closing date + reviewer */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {item.closingDate && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <CalendarClock className="h-3 w-3" />
                  {formatDate(item.closingDate)}
                </span>
              )}
              {days !== null && (
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getDaysUntilBadgeColor(days))}>
                  {days < 0
                    ? `${Math.abs(days)}d overdue`
                    : days === 0
                      ? 'Closing today'
                      : `${days}d until closing`}
                </span>
              )}
              {item.assignedReviewer ? (
                <span className="rounded-full bg-[#1B3A5C]/10 px-2 py-0.5 text-xs font-medium text-[#1B3A5C]">
                  {item.assignedReviewer}
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Unassigned
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right section: Score + Findings + Actions */}
        <div className="flex items-center gap-4 lg:flex-shrink-0">
          {/* Findings badges */}
          <div className="flex items-center gap-1.5">
            {item.findingCounts.critical > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                <AlertCircle className="h-3 w-3" />
                {item.findingCounts.critical}
              </span>
            )}
            {item.findingCounts.warning > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                <AlertTriangle className="h-3 w-3" />
                {item.findingCounts.warning}
              </span>
            )}
            {item.findingCounts.info > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {item.findingCounts.info} info
              </span>
            )}
          </div>

          {/* Readiness Score */}
          <CircularScore score={item.readinessScore} size={44} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {item.status === 'pending' && (
              <button
                onClick={() => onStartReview(item.id)}
                disabled={isStarting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A9D8F] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:opacity-50 transition-colors"
              >
                {isStarting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Start Review
              </button>
            )}
            <button
              onClick={() => onView(item.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
      <div className="rounded-full bg-[#1B3A5C]/10 p-4 mb-4">
        <FileSearch className="h-10 w-10 text-[#1B3A5C]" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">No transactions pending review</h3>
      <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
        {filter !== 'all'
          ? `No transactions found with status "${formatStatusLabel(filter)}". Try selecting a different filter.`
          : 'All transaction files have been reviewed. New submissions will appear here.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ReviewQueuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [page, setPage] = useState(1);
  const [batchMode, setBatchMode] = useState(false);
  const [startingReviewId, setStartingReviewId] = useState<string | null>(null);

  // ---- Stats query ----
  const { data: stats, isLoading: statsLoading } = useQuery<ReviewQueueStats>({
    queryKey: ['review-queue-stats'],
    queryFn: () => api<ReviewQueueStats>('/review-queue/stats'),
  });

  // ---- Queue query ----
  const queryParams = new URLSearchParams();
  if (filter !== 'all') queryParams.set('status', filter);
  queryParams.set('sortBy', sortBy);
  queryParams.set('page', String(page));
  queryParams.set('limit', String(PAGE_SIZE));

  const { data, isLoading, error } = useQuery<ReviewQueueResponse>({
    queryKey: ['review-queue', filter, sortBy, page],
    queryFn: () =>
      api<ReviewQueueResponse>(`/review-queue?${queryParams.toString()}`),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---- Start Review mutation ----
  const startReviewMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/review-queue/${id}/start-review`, { method: 'PATCH' }),
    onMutate: (id) => {
      setStartingReviewId(id);
    },
    onSuccess: (_data, id) => {
      addToast({ type: 'success', title: 'Review started' });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue-stats'] });
      router.push(`/dashboard/review/${id}`);
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Failed to start review', message: err.message });
      setStartingReviewId(null);
    },
  });

  const handleStartReview = useCallback(
    (id: string) => {
      startReviewMutation.mutate(id);
    },
    [startReviewMutation],
  );

  const handleView = useCallback(
    (id: string) => {
      router.push(`/dashboard/review/${id}`);
    },
    [router],
  );

  // ---- Batch Mode: find next pending review ----
  const handleBatchNext = useCallback(() => {
    const nextPending = items.find(
      (item) => item.status === 'pending' || item.status === 'in_review',
    );
    if (nextPending) {
      if (nextPending.status === 'pending') {
        startReviewMutation.mutate(nextPending.id);
      } else {
        router.push(`/dashboard/review/${nextPending.id}`);
      }
    } else {
      addToast({ type: 'info', title: 'No more reviews', message: 'All items have been reviewed.' });
    }
  }, [items, startReviewMutation, router]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve transaction files before closing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              batchMode
                ? 'bg-[#1B3A5C] text-white shadow-sm hover:bg-[#2a4d73]'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50',
            )}
          >
            <LayoutList className="h-4 w-4" />
            {batchMode ? 'Batch Mode On' : 'Batch Mode'}
          </button>
          {batchMode && (
            <button
              onClick={handleBatchNext}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2A9D8F] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#238b7e] transition-colors"
            >
              <SkipForward className="h-4 w-4" />
              Next Review
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Pending Reviews"
            value={stats.pending}
            icon={Clock}
            color="bg-yellow-500"
          />
          <StatsCard
            label="In Review"
            value={stats.inReview}
            icon={ListChecks}
            color="bg-blue-500"
          />
          <StatsCard
            label="Approved This Week"
            value={stats.approvedThisWeek}
            icon={CheckCircle2}
            color="bg-green-500"
          />
          <StatsCard
            label="Returned"
            value={stats.returned}
            icon={CornerDownLeft}
            color="bg-orange-500"
          />
        </div>
      ) : null}

      {/* Filter Tabs + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 sm:border-b-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setFilter(tab.value); setPage(1); }}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors sm:rounded-lg sm:border-b-0',
                filter === tab.value
                  ? 'border-[#2A9D8F] text-[#2A9D8F] sm:bg-[#2A9D8F]/10 sm:border-transparent'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 sm:hover:bg-gray-50 sm:hover:border-transparent',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading review queue...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load review queue.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['review-queue'] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <>
          {/* Queue List */}
          <div className="space-y-3">
            {items.map((item) => (
              <ReviewQueueRow
                key={item.id}
                item={item}
                onStartReview={handleStartReview}
                onView={handleView}
                isStarting={startingReviewId === item.id}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, total)} of {total} items
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
    </div>
  );
}
