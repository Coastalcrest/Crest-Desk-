'use client';

import { useCallback, useState } from 'react';
import {
  Calendar,
  Check,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  Plug,
  PlugZap,
  X,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { addToast } from '../../../../hooks/use-toast';

/* ─── Types ─── */

interface Connection {
  id: string;
  service: string;
  provider: string;
  icon: React.ElementType;
  category: 'email' | 'calendar' | 'mls' | 'accounting' | 'social';
  connected: boolean;
  accountLabel?: string;
  description: string;
  comingSoon?: boolean;
}

/* ─── MLS Icon (custom) ─── */
function MlsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

/* ─── QuickBooks Icon (custom) ─── */
function QuickBooksIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
    </svg>
  );
}

/* ─── Initial mock connections ─── */

const INITIAL_CONNECTIONS: Connection[] = [
  {
    id: 'gmail',
    service: 'Gmail',
    provider: 'Google',
    icon: Mail,
    category: 'email',
    connected: false,
    description: 'Sync your Gmail inbox to manage client communications.',
  },
  {
    id: 'outlook',
    service: 'Outlook',
    provider: 'Microsoft',
    icon: Mail,
    category: 'email',
    connected: false,
    description: 'Connect your Outlook account for email management.',
  },
  {
    id: 'google-calendar',
    service: 'Google Calendar',
    provider: 'Google',
    icon: Calendar,
    category: 'calendar',
    connected: false,
    description: 'Sync showings, closings, and meetings with your calendar.',
  },
  {
    id: 'outlook-calendar',
    service: 'Outlook Calendar',
    provider: 'Microsoft',
    icon: Calendar,
    category: 'calendar',
    connected: false,
    description: 'Sync your Outlook Calendar with CrestDesk events.',
  },
  {
    id: 'mls',
    service: 'MLS',
    provider: 'Local MLS',
    icon: MlsIcon,
    category: 'mls',
    connected: false,
    description: 'Connect your MLS feed for automatic listing imports.',
  },
  {
    id: 'quickbooks',
    service: 'QuickBooks',
    provider: 'Intuit',
    icon: QuickBooksIcon,
    category: 'accounting',
    connected: false,
    description: 'Sync commission data and generate financial reports.',
  },
  {
    id: 'facebook',
    service: 'Facebook',
    provider: 'Meta',
    icon: Facebook,
    category: 'social',
    connected: false,
    description: 'Publish listings and marketing content to your Facebook page.',
  },
  {
    id: 'instagram',
    service: 'Instagram',
    provider: 'Meta',
    icon: Instagram,
    category: 'social',
    connected: false,
    description: 'Share property photos and reels to your Instagram account.',
  },
  {
    id: 'linkedin',
    service: 'LinkedIn',
    provider: 'Microsoft',
    icon: Linkedin,
    category: 'social',
    connected: false,
    description: 'Share professional content and listings on LinkedIn.',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  email: 'Email',
  calendar: 'Calendar',
  mls: 'MLS',
  accounting: 'Accounting',
  social: 'Social Media',
};

const CATEGORY_ORDER: string[] = ['email', 'calendar', 'mls', 'accounting', 'social'];

/* ─── Page Component ─── */

export default function ConnectionsSettingsPage() {
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (connectionId: string) => {
      setLoadingId(connectionId);
      const conn = connections.find((c) => c.id === connectionId);

      // Simulate API delay
      await new Promise((r) => setTimeout(r, 1200));

      if (conn?.connected) {
        // Disconnect
        setConnections((prev) =>
          prev.map((c) =>
            c.id === connectionId
              ? { ...c, connected: false, accountLabel: undefined }
              : c,
          ),
        );
        addToast({
          type: 'success',
          title: `${conn.service} disconnected.`,
        });
      } else if (conn) {
        // Connect (mock)
        setConnections((prev) =>
          prev.map((c) =>
            c.id === connectionId
              ? { ...c, connected: true, accountLabel: 'user@example.com' }
              : c,
          ),
        );
        addToast({
          type: 'success',
          title: `${conn.service} connected successfully.`,
        });
      }

      setLoadingId(null);
    },
    [connections],
  );

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    items: connections.filter((c) => c.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <PlugZap className="h-5 w-5 text-[#1B3A5C]" />
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Connect your external services to streamline your workflow. All connections use secure
          OAuth where available.
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.category}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            {group.label}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.items.map((conn) => {
              const Icon = conn.icon;
              const isLoading = loadingId === conn.id;

              return (
                <div
                  key={conn.id}
                  className={cn(
                    'card flex flex-col justify-between transition-shadow hover:shadow-md',
                    conn.connected && 'ring-1 ring-[#2A9D8F]/30',
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            conn.connected
                              ? 'bg-[#2A9D8F]/10 text-[#2A9D8F]'
                              : 'bg-gray-100 text-gray-500',
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{conn.service}</p>
                          <p className="text-xs text-gray-400">{conn.provider}</p>
                        </div>
                      </div>
                      {conn.connected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          <Check className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{conn.description}</p>
                    {conn.connected && conn.accountLabel && (
                      <p className="text-xs text-gray-400 mb-3">
                        Linked as: <span className="font-medium text-gray-600">{conn.accountLabel}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(conn.id)}
                    disabled={isLoading || conn.comingSoon}
                    className={cn(
                      'w-full rounded-md px-4 py-2 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                      conn.connected
                        ? 'border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-red-600 hover:border-red-300'
                        : 'bg-[#1B3A5C] text-white hover:bg-[#2A5A8C]',
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : conn.connected ? (
                      <>
                        <X className="h-4 w-4" />
                        Disconnect
                      </>
                    ) : conn.comingSoon ? (
                      'Coming Soon'
                    ) : (
                      <>
                        <Plug className="h-4 w-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
