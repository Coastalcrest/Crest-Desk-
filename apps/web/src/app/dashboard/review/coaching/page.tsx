'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Repeat,
  TrendingUp,
  Lightbulb,
  Eye,
  Loader2,
  AlertCircle,
  Users,
  ChevronDown,
  Send,
  X as XIcon,
  Sparkles,
  BarChart3,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Agent {
  id: string;
  name: string;
  email: string;
  transactionCount: number;
}

interface CoachingInsight {
  id: string;
  type: 'recurring_issue' | 'improvement' | 'coaching_tip' | 'pattern_detected';
  category: string;
  description: string;
  occurrenceCount: number;
  lastSeenAt: string;
  exampleTransactions: ExampleTransaction[];
  dismissed: boolean;
}

interface ExampleTransaction {
  id: string;
  propertyAddress: string;
}

interface CoachingStats {
  totalInsights: number;
  recurringIssues: number;
  improvements: number;
}

interface AgentsResponse {
  agents: Agent[];
}

interface CoachingResponse {
  insights: CoachingInsight[];
  stats: CoachingStats;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INSIGHT_TYPE_CONFIG = {
  recurring_issue: {
    icon: Repeat,
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    label: 'Recurring Issue',
    badgeColor: 'bg-red-100 text-red-700',
  },
  improvement: {
    icon: TrendingUp,
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    label: 'Improvement',
    badgeColor: 'bg-green-100 text-green-700',
  },
  coaching_tip: {
    icon: Lightbulb,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    label: 'Coaching Tip',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  pattern_detected: {
    icon: Eye,
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    label: 'Pattern Detected',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatRelativeDate(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(iso);
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
  icon: typeof BarChart3;
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
// Insight Card
// ---------------------------------------------------------------------------
function InsightCard({
  insight,
  onSendReminder,
  onDismiss,
  isSending,
  isDismissing,
}: {
  insight: CoachingInsight;
  onSendReminder: (id: string) => void;
  onDismiss: (id: string) => void;
  isSending: boolean;
  isDismissing: boolean;
}) {
  const router = useRouter();
  const config = INSIGHT_TYPE_CONFIG[insight.type];
  const InsightIcon = config.icon;

  return (
    <div className={cn('rounded-lg border p-5 shadow-sm transition-all hover:shadow-md', config.border, insight.dismissed ? 'opacity-60 bg-gray-50' : config.bg)}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn('flex-shrink-0 rounded-lg p-2.5', config.iconBg)}>
          <InsightIcon className={cn('h-5 w-5', config.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.badgeColor)}>
              {config.label}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {formatStatusLabel(insight.category)}
            </span>
            {insight.dismissed && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                Dismissed
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-gray-700">{insight.description}</p>

          {/* Occurrence & Last seen */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {insight.occurrenceCount} occurrence{insight.occurrenceCount !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last seen: {formatRelativeDate(insight.lastSeenAt)}
            </span>
          </div>

          {/* Example Transactions */}
          {insight.exampleTransactions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Example Transactions:</p>
              <div className="flex flex-wrap gap-1.5">
                {insight.exampleTransactions.map((txn) => (
                  <button
                    key={txn.id}
                    onClick={() => router.push(`/dashboard/transactions/${txn.id}`)}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-1 text-xs text-[#1B3A5C] hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {txn.propertyAddress}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!insight.dismissed && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => onSendReminder(insight.id)}
                disabled={isSending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A9D8F] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#238b7e] disabled:opacity-50 transition-colors"
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send Reminder
              </button>
              <button
                onClick={() => onDismiss(insight.id)}
                disabled={isDismissing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {isDismissing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XIcon className="h-3.5 w-3.5" />
                )}
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AgentCoachingPage() {
  const queryClient = useQueryClient();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  // ---- Load agents ----
  const { data: agentsData, isLoading: agentsLoading } = useQuery<AgentsResponse>({
    queryKey: ['brokerage-agents'],
    queryFn: () => api<AgentsResponse>('/users?role=agent'),
  });

  const agents = agentsData?.agents ?? [];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  // ---- Load coaching insights for selected agent ----
  const {
    data: coachingData,
    isLoading: insightsLoading,
    error: insightsError,
  } = useQuery<CoachingResponse>({
    queryKey: ['coaching-insights', selectedAgentId],
    queryFn: () => api<CoachingResponse>(`/ai-review/coaching/${selectedAgentId}`),
    enabled: !!selectedAgentId,
  });

  const insights = coachingData?.insights ?? [];
  const stats = coachingData?.stats ?? null;

  // ---- Generate insights mutation ----
  const generateMutation = useMutation({
    mutationFn: () =>
      api(`/ai-review/coaching/generate/${selectedAgentId}`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Insights generated', message: 'Agent history analysis complete.' });
      queryClient.invalidateQueries({ queryKey: ['coaching-insights', selectedAgentId] });
    },
    onError: (err: Error) => {
      addToast({ type: 'error', title: 'Generation failed', message: err.message });
    },
  });

  // ---- Send reminder (placeholder) ----
  const handleSendReminder = useCallback(
    async (insightId: string) => {
      setSendingReminderId(insightId);
      try {
        await api(`/ai-review/coaching/${selectedAgentId}/remind`, {
          method: 'POST',
          body: JSON.stringify({ insightId }),
        });
        addToast({ type: 'success', title: 'Reminder sent to agent' });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed to send reminder',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setSendingReminderId(null);
      }
    },
    [selectedAgentId],
  );

  // ---- Dismiss insight ----
  const handleDismiss = useCallback(
    async (insightId: string) => {
      setDismissingId(insightId);
      try {
        await api(`/ai-review/coaching/${selectedAgentId}/insights/${insightId}/dismiss`, {
          method: 'PATCH',
        });
        addToast({ type: 'success', title: 'Insight dismissed' });
        queryClient.invalidateQueries({ queryKey: ['coaching-insights', selectedAgentId] });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed to dismiss',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setDismissingId(null);
      }
    },
    [selectedAgentId, queryClient],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Coaching Insights</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-detected patterns and coaching opportunities across your agents' transaction history
          </p>
        </div>
        {selectedAgentId && (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1B3A5C] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#2a4d73] disabled:opacity-50 transition-colors"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze Agent History
          </button>
        )}
      </div>

      {/* Agent Selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700">Select an Agent</label>
        <div className="relative">
          <button
            onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
            disabled={agentsLoading}
            className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-left hover:border-gray-400 focus:border-[#1B3A5C] focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]"
          >
            {agentsLoading ? (
              <span className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading agents...
              </span>
            ) : selectedAgent ? (
              <span className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B3A5C]/10 text-xs font-bold text-[#1B3A5C]">
                  {selectedAgent.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-900">{selectedAgent.name}</span>
                <span className="text-gray-500">({selectedAgent.email})</span>
                <span className="ml-auto text-xs text-gray-400">
                  {selectedAgent.transactionCount} transactions
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-400">
                <Users className="h-4 w-4" />
                Choose an agent to view insights...
              </span>
            )}
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', agentDropdownOpen && 'rotate-180')} />
          </button>

          {agentDropdownOpen && agents.length > 0 && (
            <div className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setAgentDropdownOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50',
                    selectedAgentId === agent.id ? 'bg-[#2A9D8F]/5 font-medium text-[#2A9D8F]' : 'text-gray-700',
                  )}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B3A5C]/10 text-xs font-bold text-[#1B3A5C]">
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{agent.name}</p>
                    <p className="truncate text-xs text-gray-500">{agent.email}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {agent.transactionCount} txns
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content: requires agent selection */}
      {!selectedAgentId ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
          <div className="rounded-full bg-[#1B3A5C]/10 p-4 mb-4">
            <Users className="h-10 w-10 text-[#1B3A5C]" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Select an Agent</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
            Choose an agent from the dropdown above to view AI-generated coaching insights and performance patterns.
          </p>
        </div>
      ) : insightsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#1B3A5C]" />
          <span className="ml-2 text-sm text-gray-500">Loading coaching insights...</span>
        </div>
      ) : insightsError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 py-12">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">Failed to load coaching insights.</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['coaching-insights', selectedAgentId] })}
            className="mt-3 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73]"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatsCard
                label="Total Insights"
                value={stats.totalInsights}
                icon={BarChart3}
                color="bg-[#1B3A5C]"
              />
              <StatsCard
                label="Recurring Issues"
                value={stats.recurringIssues}
                icon={Repeat}
                color="bg-red-500"
              />
              <StatsCard
                label="Improvements"
                value={stats.improvements}
                icon={TrendingUp}
                color="bg-green-500"
              />
            </div>
          )}

          {/* Insights List */}
          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-16">
              <div className="rounded-full bg-purple-50 p-4 mb-4">
                <Sparkles className="h-10 w-10 text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No Insights Yet</h3>
              <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
                Click "Analyze Agent History" to generate AI coaching insights for this agent.
              </p>
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a4d73] disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analyze Agent History
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onSendReminder={handleSendReminder}
                  onDismiss={handleDismiss}
                  isSending={sendingReminderId === insight.id}
                  isDismissing={dismissingId === insight.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
