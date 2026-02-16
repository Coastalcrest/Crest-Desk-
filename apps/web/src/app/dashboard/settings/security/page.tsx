'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Activity,
  XCircle,
  Monitor,
  Smartphone,
  Settings,
  AlertTriangle,
  Globe,
  ArrowRight,
} from 'lucide-react';

/* ─── Mock Data ─── */

const SECURITY_EVENTS = [
  {
    id: '1',
    type: 'login_success',
    user: 'Kris Rohde',
    ip: '73.162.45.12',
    severity: 'info' as const,
    time: '2 hours ago',
    status: 'resolved' as const,
  },
  {
    id: '2',
    type: 'login_failure',
    user: 'Jane Smith',
    ip: '198.51.100.5',
    severity: 'warning' as const,
    time: '4 hours ago',
    status: 'unresolved' as const,
  },
  {
    id: '3',
    type: 'mfa_success',
    user: 'Kris Rohde',
    ip: '73.162.45.12',
    severity: 'info' as const,
    time: '2 hours ago',
    status: 'resolved' as const,
  },
  {
    id: '4',
    type: 'suspicious_activity',
    user: 'Unknown',
    ip: '203.0.113.42',
    severity: 'critical' as const,
    time: '6 hours ago',
    status: 'unresolved' as const,
  },
  {
    id: '5',
    type: 'password_change',
    user: 'Bob Wilson',
    ip: '10.0.0.55',
    severity: 'info' as const,
    time: '1 day ago',
    status: 'resolved' as const,
  },
];

const IP_ALLOWLIST = [
  { id: '1', cidr: '10.0.0.0/8', label: 'Office Network', enabled: true },
  { id: '2', cidr: '73.162.45.0/24', label: 'Kris Home', enabled: true },
];

const TRUSTED_DEVICES = [
  {
    id: '1',
    device: "Kris's MacBook",
    browser: 'Chrome 121',
    os: 'macOS 14.3',
    lastUsed: '2 hours ago',
    lastIp: '73.162.45.12',
  },
  {
    id: '2',
    device: "Kris's iPhone",
    browser: 'Safari 17',
    os: 'iOS 17.3',
    lastUsed: '1 day ago',
    lastIp: '73.162.45.12',
  },
  {
    id: '3',
    device: 'Office Desktop',
    browser: 'Firefox 122',
    os: 'Windows 11',
    lastUsed: '3 days ago',
    lastIp: '10.0.0.55',
  },
];

const SEVERITY_BADGE: Record<string, string> = {
  info: 'bg-gray-100 text-gray-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  resolved: 'bg-green-100 text-green-700',
  unresolved: 'bg-red-100 text-red-700',
};

/* ─── Page Component ─── */

export default function SecurityDashboardPage() {
  const [ipAllowlistEnabled] = useState(false);

  const statCards = [
    {
      label: 'Total Events (24h)',
      value: '47',
      icon: Activity,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Failed Logins (24h)',
      value: '3',
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Active Sessions',
      value: '12',
      icon: Monitor,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Trusted Devices',
      value: '8',
      icon: Smartphone,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">
            Security Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Monitor and manage security settings
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Security Policy Panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">Security Policy</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <PolicyRow label="Min Password Length" value="12 characters" />
          <PolicyRow label="Require Uppercase">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Yes
            </span>
          </PolicyRow>
          <PolicyRow label="Require Numbers">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Yes
            </span>
          </PolicyRow>
          <PolicyRow label="Require Special Chars">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Yes
            </span>
          </PolicyRow>
          <PolicyRow label="Max Password Age" value="90 days" />
          <PolicyRow label="Session Timeout" value="8 hours" />
          <PolicyRow label="Max Concurrent Sessions" value="5" />
          <PolicyRow label="MFA Required For">
            <div className="flex gap-1.5">
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Owner
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Principal Broker
              </span>
            </div>
          </PolicyRow>
          <PolicyRow label="Account Lockout" value="After 5 failed attempts" />
          <PolicyRow label="Lockout Duration" value="30 minutes" />
        </div>
        <div className="mt-6 flex justify-end">
          <button className="rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Edit Policy
          </button>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <AlertTriangle className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">Recent Security Events</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {SECURITY_EVENTS.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {event.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {event.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {event.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[event.severity]}`}
                    >
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[event.status]}`}
                    >
                      {event.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IP Allowlist Panel */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-lg font-semibold text-gray-900">IP Allowlist</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            IP Allowlist: {ipAllowlistEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  CIDR Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Label
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
              {IP_ALLOWLIST.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {entry.cidr}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {entry.label}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Enabled
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button className="rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Add IP Range
          </button>
        </div>
      </div>

      {/* Trusted Devices Panel */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <Smartphone className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">Trusted Devices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Browser
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  OS
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last IP
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TRUSTED_DEVICES.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {device.device}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {device.browser}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {device.os}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.lastUsed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {device.lastIp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Link to Breach Management */}
      <div className="flex justify-end">
        <Link
          href="/dashboard/settings/security/breach"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Breach Management
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ─── Policy Row Helper ─── */

function PolicyRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      {children ?? (
        <span className="text-sm font-medium text-gray-900">{value}</span>
      )}
    </div>
  );
}
