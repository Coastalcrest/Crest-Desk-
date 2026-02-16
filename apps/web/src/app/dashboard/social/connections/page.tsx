'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import {
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter, Building2,
  RefreshCw, ExternalLink, Link2, Unlink, CheckCircle2, AlertTriangle,
  XCircle, Settings, Shield, Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SocialAccount {
  id: string;
  tenantId: string;
  agentId: string;
  platform: string;
  accountType: string;
  accountName: string;
  accountId: string;
  connectionStatus: 'active' | 'inactive' | 'expired' | 'error';
  profileUrl: string;
  avatarUrl: string;
  scopes: string[];
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AccountHealth {
  accountId: string;
  platform: string;
  connectionStatus: string;
  healthStatus: 'healthy' | 'warning' | 'error';
  tokenExpired: boolean;
  tokenExpiresSoon: boolean;
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
}

interface ContentRule {
  id: string;
  ruleType: string;
  postType: string;
  platform: string;
  requiresBrokerApproval: boolean;
  autoPublish: boolean;
  hashtagDefaults: string[];
  brandingRequirements: Record<string, unknown>;
  schedulingRules: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const platformMeta: Record<string, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2' },
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000' },
  tiktok: { name: 'TikTok', icon: Music2, color: '#000000' },
  x: { name: 'X (Twitter)', icon: Twitter, color: '#1DA1F2' },
  google: { name: 'Google Business', icon: Building2, color: '#4285F4' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

function deriveHealth(
  account: SocialAccount,
  healthData?: AccountHealth,
): { status: 'healthy' | 'warning' | 'error'; note: string } {
  if (account.connectionStatus !== 'active') {
    return { status: 'error', note: 'Account disconnected' };
  }
  if (healthData) {
    if (healthData.healthStatus === 'error' || healthData.tokenExpired) {
      return { status: 'error', note: 'Token expired. Please reconnect.' };
    }
    if (healthData.healthStatus === 'warning' || healthData.tokenExpiresSoon) {
      return { status: 'warning', note: 'Token expires soon. Consider refreshing.' };
    }
    return { status: 'healthy', note: 'All systems operational' };
  }
  return { status: 'healthy', note: 'All systems operational' };
}

function formatPostType(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ConnectionsPage() {
  const queryClient = useQueryClient();

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------
  const {
    data: accounts,
    isLoading: accountsLoading,
    isError: accountsError,
  } = useQuery<SocialAccount[]>({
    queryKey: ['social-accounts'],
    queryFn: () => api<SocialAccount[]>('/social-analytics/accounts'),
  });

  const {
    data: contentRules,
    isLoading: rulesLoading,
  } = useQuery<ContentRule[]>({
    queryKey: ['social-content-rules'],
    queryFn: () => api<ContentRule[]>('/social-analytics/content-rules'),
  });

  // Fetch health for each connected account
  const activeAccounts = accounts?.filter((a) => a.connectionStatus === 'active') ?? [];
  const healthQueries = useQuery<Record<string, AccountHealth>>({
    queryKey: ['social-accounts-health', activeAccounts.map((a) => a.id)],
    queryFn: async () => {
      const entries = await Promise.all(
        activeAccounts.map(async (a) => {
          try {
            const h = await api<AccountHealth>(`/social-analytics/accounts/${a.id}/health`);
            return [a.id, h] as const;
          } catch {
            return [a.id, undefined] as const;
          }
        }),
      );
      return Object.fromEntries(entries.filter(([, v]) => v !== undefined));
    },
    enabled: activeAccounts.length > 0,
  });

  const healthMap = healthQueries.data ?? {};

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------
  const refreshMutation = useMutation({
    mutationFn: (accountId: string) =>
      api(`/social-analytics/accounts/${accountId}/refresh`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Token refreshed' });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['social-accounts-health'] });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to refresh token' });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      api(`/social-analytics/accounts/${accountId}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Account disconnected' });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['social-accounts-health'] });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to disconnect account' });
    },
  });

  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        activeAccounts.map((a) =>
          api(`/social-analytics/accounts/${a.id}/refresh`, { method: 'POST' }),
        ),
      );
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'All connections refreshed' });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['social-accounts-health'] });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to refresh some connections' });
    },
  });

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------
  const connections = (accounts ?? []).map((account) => {
    const meta = platformMeta[account.platform] ?? {
      name: account.platform,
      icon: Building2,
      color: '#6B7280',
    };
    const health = deriveHealth(account, healthMap[account.id]);
    return { account, meta, health };
  });

  const connectedCount = connections.filter((c) => c.account.connectionStatus === 'active').length;
  const warningCount = connections.filter((c) => c.health.status === 'warning').length;
  const disconnectedCount = connections.filter((c) => c.account.connectionStatus !== 'active').length;

  // Group content rules by postType for display
  const groupedRules = (contentRules ?? []).reduce<
    Record<string, { postType: string; autoPublish: boolean; brokerApproval: boolean; platforms: string[] }>
  >((acc, rule) => {
    const key = rule.postType;
    if (!acc[key]) {
      acc[key] = {
        postType: formatPostType(rule.postType),
        autoPublish: rule.autoPublish,
        brokerApproval: rule.requiresBrokerApproval,
        platforms: [],
      };
    }
    if (rule.platform && !acc[key].platforms.includes(rule.platform)) {
      acc[key].platforms.push(rule.platform);
    }
    // If any rule for this postType requires approval, mark as required
    if (rule.requiresBrokerApproval) acc[key].brokerApproval = true;
    // Only mark auto-publish if all rules agree
    if (!rule.autoPublish) acc[key].autoPublish = false;
    return acc;
  }, {});

  const displayRules = Object.values(groupedRules);

  // -----------------------------------------------------------------------
  // Health icon helper
  // -----------------------------------------------------------------------
  const healthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  // -----------------------------------------------------------------------
  // Loading / Error states
  // -----------------------------------------------------------------------
  if (accountsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Failed to load connections</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Platform Connections</h1>
            <p className="text-gray-500 mt-1">Manage your social media account connections and publishing rules</p>
          </div>
          <button
            onClick={() => refreshAllMutation.mutate()}
            disabled={refreshAllMutation.isPending || activeAccounts.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors ${refreshAllMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshAllMutation.isPending ? 'animate-spin' : ''}`} /> Refresh All Connections
          </button>
        </div>

        {/* Platform Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map(({ account, meta, health }) => {
            const Icon = meta.icon;
            const isConnected = account.connectionStatus === 'active';
            return (
              <div key={account.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: meta.color }}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{meta.name}</h3>
                      {isConnected ? (
                        <p className="text-sm text-gray-500">{account.accountName}</p>
                      ) : (
                        <p className="text-sm text-gray-400">Not connected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {healthIcon(health.status)}
                    <span className={`text-xs font-medium ${health.status === 'healthy' ? 'text-green-600' : health.status === 'warning' ? 'text-amber-600' : 'text-red-500'}`}>
                      {health.status === 'healthy' ? 'Healthy' : health.status === 'warning' ? 'Warning' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {isConnected ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-lg font-bold text-gray-400">&mdash;</p>
                        <p className="text-[10px] text-gray-500 font-medium">Followers</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-lg font-bold text-gray-400">&mdash;</p>
                        <p className="text-[10px] text-gray-500 font-medium">Posts</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-xs font-medium text-gray-700 mt-1">{formatLastSync(account.lastSyncAt)}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Last Sync</p>
                      </div>
                    </div>

                    {health.status === 'warning' && (
                      <div className="p-2 rounded-lg bg-amber-50 text-xs text-amber-700 mb-4">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />{health.note}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {account.profileUrl ? (
                        <a href={account.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: 'var(--color-secondary, #2A9D8F)' }}>
                          <ExternalLink className="w-3 h-3" /> View Profile
                        </a>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => refreshMutation.mutate(account.id)}
                          disabled={refreshMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <button
                          onClick={() => disconnectMutation.mutate(account.id)}
                          disabled={disconnectMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                        >
                          <Unlink className="w-3.5 h-3.5" /> Disconnect
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">{health.note}</p>
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: meta.color }}
                    >
                      <Link2 className="w-4 h-4" /> Connect {meta.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content Rules */}
        {(rulesLoading || displayRules.length > 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Content Publishing Rules</h2>
                <p className="text-sm text-gray-500 mt-1">Configure auto-publish and approval requirements per post type</p>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
                <Settings className="w-3.5 h-3.5" /> Edit Rules
              </button>
            </div>

            {rulesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Post Type</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Auto-Publish</th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Broker Approval</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Applicable Platforms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRules.map((rule) => (
                      <tr key={rule.postType} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="text-sm font-medium text-gray-800">{rule.postType}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {rule.autoPublish ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              <CheckCircle2 className="w-3 h-3" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              <XCircle className="w-3 h-3" /> No
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {rule.brokerApproval ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                              <Shield className="w-3 h-3" /> Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Not Required
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {rule.platforms.length === 0 ? (
                              <span className="text-xs text-gray-500 font-medium">All Platforms</span>
                            ) : (
                              rule.platforms.map((p) => {
                                const pMeta = platformMeta[p];
                                if (!pMeta) return null;
                                const PIcon = pMeta.icon;
                                return (
                                  <div key={p} className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ backgroundColor: pMeta.color }} title={pMeta.name}>
                                    <PIcon className="w-3 h-3" />
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Connection Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Connection Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Connected</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{connectedCount}</p>
              <p className="text-xs text-green-600 mt-1">platforms active and syncing</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Warnings</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{warningCount}</p>
              <p className="text-xs text-amber-600 mt-1">platforms need attention</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-semibold text-red-800">Disconnected</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{disconnectedCount}</p>
              <p className="text-xs text-red-500 mt-1">platforms not connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
