'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Key,
  Webhook,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ─── Mock Data ─── */

const API_KEYS = [
  {
    id: '1',
    name: 'Production API',
    prefix: 'sk_live_a3f2',
    scopes: ['read', 'write'],
    lastUsed: '2 hours ago',
    expires: null,
    status: 'active' as const,
  },
  {
    id: '2',
    name: 'Staging API',
    prefix: 'sk_live_b8c1',
    scopes: ['read'],
    lastUsed: '5 days ago',
    expires: '2025-06-01',
    status: 'active' as const,
  },
  {
    id: '3',
    name: 'Old Integration',
    prefix: 'sk_live_d4e7',
    scopes: ['read', 'write'],
    lastUsed: '30 days ago',
    expires: null,
    status: 'revoked' as const,
  },
];

const WEBHOOKS = [
  {
    id: '1',
    url: 'https://app.example.com/webhooks/crestdesk',
    events: 6,
    enabled: true,
    failureCount: 0,
    lastTriggered: '1 hour ago',
  },
  {
    id: '2',
    url: 'https://zapier.com/hooks/abc123',
    events: 3,
    enabled: true,
    failureCount: 2,
    lastTriggered: '3 hours ago',
  },
  {
    id: '3',
    url: 'https://old.example.com/hook',
    events: 14,
    enabled: false,
    failureCount: 15,
    lastTriggered: '7 days ago',
  },
];

const WEBHOOK_EVENT_TYPES = [
  { type: 'transaction.created', description: 'A new transaction is created' },
  { type: 'transaction.updated', description: 'A transaction is updated' },
  { type: 'transaction.status_changed', description: 'A transaction status changes' },
  { type: 'document.uploaded', description: 'A document is uploaded' },
  { type: 'document.signed', description: 'A document is signed' },
  { type: 'document.completed', description: 'A document signing is completed' },
  { type: 'contact.created', description: 'A new contact is created' },
  { type: 'contact.updated', description: 'A contact is updated' },
  { type: 'task.completed', description: 'A task is completed' },
  { type: 'task.overdue', description: 'A task becomes overdue' },
  { type: 'commission.calculated', description: 'A commission is calculated' },
  { type: 'commission.paid', description: 'A commission is paid' },
  { type: 'user.invited', description: 'A user is invited' },
  { type: 'user.deactivated', description: 'A user is deactivated' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  revoked: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
};

const SCOPE_BADGE: Record<string, string> = {
  read: 'bg-blue-100 text-blue-700',
  write: 'bg-purple-100 text-purple-700',
};

/* ─── Page Component ─── */

export default function DeveloperDashboardPage() {
  const [showEventTypes, setShowEventTypes] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">
              Developer
            </h1>
            <p className="text-sm text-gray-500">
              Manage API keys, webhooks, and integrations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/settings/developer/usage"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Usage & Subscription
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/settings/developer/white-label"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            White-Label
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            Create API Key
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Key Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Scopes
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {API_KEYS.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {key.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-600">
                        {visibleKeys[key.id]
                          ? `${key.prefix}...xxxxxxxxxxxx`
                          : `${key.prefix}...${'*'.repeat(12)}`}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {visibleKeys[key.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SCOPE_BADGE[scope] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {key.lastUsed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {key.expires ?? 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[key.status]}`}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhooks Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            Add Webhook
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Endpoint URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Failures
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Triggered
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {WEBHOOKS.map((hook) => (
                <tr key={hook.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono text-gray-600 max-w-[280px] truncate block">
                      {hook.url}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {hook.events} event{hook.events !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        hook.enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {hook.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {hook.failureCount > 0 ? (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-sm font-medium text-red-600">
                            {hook.failureCount}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-sm text-gray-500">0</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {hook.lastTriggered}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Event Types (Collapsible) */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <button
          onClick={() => setShowEventTypes(!showEventTypes)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-lg font-semibold text-gray-900">
              Webhook Event Types
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {WEBHOOK_EVENT_TYPES.length}
            </span>
          </div>
          {showEventTypes ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {showEventTypes && (
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WEBHOOK_EVENT_TYPES.map((event) => (
                <div
                  key={event.type}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <code className="mt-0.5 shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-700">
                    {event.type}
                  </code>
                  <span className="text-sm text-gray-600">
                    {event.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/settings/developer/onboarding"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary,#1B3A5C)] hover:opacity-80 transition-opacity"
        >
          Onboarding Progress
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to Settings
        </Link>
      </div>
    </div>
  );
}
