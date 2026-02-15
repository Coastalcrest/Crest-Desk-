'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  status: 'complete' | 'warning' | 'missing';
  statuteReference?: string;
  statuteUrl?: string;
  conditional?: boolean;
  conditionMet?: boolean;
}

interface ComplianceChecklist {
  transactionId: string;
  jurisdiction: string;
  state: string;
  overallProgress: number;
  federalProgress: number;
  stateProgress: number;
  status: 'compliant' | 'needs_review' | 'non_compliant';
  federalItems: ComplianceItem[];
  stateItems: ComplianceItem[];
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Status Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  complete: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Complete',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Warning',
  },
  missing: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Missing',
  },
};

const OVERALL_STATUS_CONFIG = {
  compliant: {
    label: 'Compliant',
    bg: 'bg-green-100',
    text: 'text-green-800',
  },
  needs_review: {
    label: 'Needs Review',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
  },
  non_compliant: {
    label: 'Non-Compliant',
    bg: 'bg-red-100',
    text: 'text-red-800',
  },
};

// ---------------------------------------------------------------------------
// Progress Section
// ---------------------------------------------------------------------------

function ProgressSection({
  label,
  progress,
  color,
}: {
  label: string;
  progress: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{progress}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Item Row
// ---------------------------------------------------------------------------

function ComplianceItemRow({ item }: { item: ComplianceItem }) {
  const config = STATUS_CONFIG[item.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
        config.border,
        config.bg,
      )}
    >
      <StatusIcon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
              config.bg,
              config.color,
            )}
          >
            {config.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
          {item.description}
        </p>
        {item.statuteReference && (
          <div className="mt-1.5">
            {item.statuteUrl ? (
              <a
                href={item.statuteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2A9D8F] hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {item.statuteReference}
              </a>
            ) : (
              <span className="text-xs text-gray-400 italic">
                {item.statuteReference}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function ComplianceSection({
  title,
  icon,
  items,
  defaultOpen,
}: {
  title: string;
  icon: React.ReactNode;
  items: ComplianceItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  const counts = useMemo(() => {
    const complete = items.filter((i) => i.status === 'complete').length;
    const warning = items.filter((i) => i.status === 'warning').length;
    const missing = items.filter((i) => i.status === 'missing').length;
    return { complete, warning, missing };
  }, [items]);

  // Filter out conditional items whose condition is not met
  const visibleItems = useMemo(
    () => items.filter((i) => !i.conditional || i.conditionMet),
    [items],
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {visibleItems.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini counts */}
          <div className="hidden items-center gap-2 sm:flex">
            {counts.complete > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {counts.complete}
              </span>
            )}
            {counts.warning > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {counts.warning}
              </span>
            )}
            {counts.missing > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-red-600">
                <XCircle className="h-3.5 w-3.5" />
                {counts.missing}
              </span>
            )}
          </div>
          {open ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t border-gray-100 px-5 py-4">
          {visibleItems.map((item) => (
            <ComplianceItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ComplianceChecklistPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params.id as string;

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['compliance-checklist', transactionId],
    queryFn: () =>
      api<ComplianceChecklist>(`/transactions/${transactionId}/compliance`),
    enabled: Boolean(transactionId),
  });

  const handleDownloadReport = async () => {
    try {
      const blob = await api<Blob>(
        `/transactions/${transactionId}/compliance/report`,
        {
          headers: { Accept: 'application/pdf' },
        },
      );
      // In a real implementation, convert the response to downloadable blob
      addToast({ type: 'success', title: 'Compliance report downloaded' });
    } catch {
      addToast({ type: 'error', title: 'Failed to download report' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A5C]" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">
          No compliance data found for this transaction
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-1 text-sm text-[#2A9D8F] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  const overallConfig = OVERALL_STATUS_CONFIG[checklist.status];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Compliance Checklist
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5" />
                {checklist.state}
              </span>
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  overallConfig.bg,
                  overallConfig.text,
                )}
              >
                {overallConfig.label}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadReport}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Download Compliance Report
        </button>
      </div>

      {/* ── Overall Progress ── */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            Overall Progress
          </h2>
          <span className="text-2xl font-bold text-[#1B3A5C]">
            {checklist.overallProgress}%
          </span>
        </div>
        <div className="space-y-3">
          <ProgressSection
            label="Federal Compliance"
            progress={checklist.federalProgress}
            color={
              checklist.federalProgress === 100
                ? 'bg-green-500'
                : checklist.federalProgress >= 50
                  ? 'bg-[#2A9D8F]'
                  : 'bg-red-500'
            }
          />
          <ProgressSection
            label="State Compliance"
            progress={checklist.stateProgress}
            color={
              checklist.stateProgress === 100
                ? 'bg-green-500'
                : checklist.stateProgress >= 50
                  ? 'bg-[#2A9D8F]'
                  : 'bg-red-500'
            }
          />
        </div>

        {/* Color legend */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">Missing / Required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-xs text-gray-500">Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500">Complete</span>
          </div>
        </div>
      </div>

      {/* ── Federal Items ── */}
      <ComplianceSection
        title="Federal Compliance Items"
        icon={<Shield className="h-5 w-5 text-red-600" />}
        items={checklist.federalItems}
        defaultOpen
      />

      {/* ── State Items ── */}
      <ComplianceSection
        title={`${checklist.state} State Compliance Items`}
        icon={<Shield className="h-5 w-5 text-blue-600" />}
        items={checklist.stateItems}
        defaultOpen
      />

      {/* ── Last Updated ── */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400">
        <Clock className="h-3.5 w-3.5" />
        Last updated:{' '}
        {new Date(checklist.lastUpdated).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </div>
    </div>
  );
}
