'use client';

import Link from 'next/link';
import {
  BarChart3,
  Users,
  FileText,
  Zap,
  HardDrive,
  CreditCard,
  ArrowLeft,
  ArrowUpRight,
} from 'lucide-react';

/* ─── Mock Data ─── */

const CURRENT_PLAN = {
  name: 'Team',
  price: 39,
  interval: 'agent/month',
  description:
    'For growing brokerages that need advanced collaboration and compliance tools.',
};

const USAGE_METRICS = [
  {
    label: 'Users',
    current: 7,
    max: 10,
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    barColor: 'bg-blue-500',
  },
  {
    label: 'Transactions',
    current: 145,
    max: 200,
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    barColor: 'bg-emerald-500',
  },
  {
    label: 'API Calls',
    current: 2340,
    max: 5000,
    icon: Zap,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    barColor: 'bg-purple-500',
  },
  {
    label: 'Storage',
    current: 1.2,
    max: 5,
    unit: 'GB',
    icon: HardDrive,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    barColor: 'bg-amber-500',
  },
];

const BILLING_INFO = {
  email: 'billing@coastalcrest.com',
  name: 'Coastal Crest Realty LLC',
  stripeId: 'cus_Abc123Xyz',
  nextInvoice: '2025-03-01',
  paymentMethod: 'Visa ending in 4242',
};

const USAGE_HISTORY = [
  {
    month: 'January 2025',
    users: 6,
    transactions: 132,
    apiCalls: 2100,
    storage: '1.0 GB',
  },
  {
    month: 'December 2024',
    users: 5,
    transactions: 118,
    apiCalls: 1840,
    storage: '0.8 GB',
  },
  {
    month: 'November 2024',
    users: 5,
    transactions: 97,
    apiCalls: 1520,
    storage: '0.6 GB',
  },
];

/* ─── Page Component ─── */

export default function UsageSubscriptionPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">
              Usage & Subscription
            </h1>
            <p className="text-sm text-gray-500">
              Monitor resource usage and manage your subscription plan
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings/developer"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Developer
        </Link>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Plan
              </h2>
              <span className="rounded-full bg-[var(--color-secondary,#2A9D8F)]/10 px-3 py-0.5 text-xs font-semibold text-[var(--color-secondary,#2A9D8F)]">
                {CURRENT_PLAN.name}
              </span>
            </div>
            <p className="text-sm text-gray-500 max-w-lg">
              {CURRENT_PLAN.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              ${CURRENT_PLAN.price}
              <span className="text-sm font-normal text-gray-500">
                /{CURRENT_PLAN.interval}
              </span>
            </p>
            <button className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              Upgrade Plan
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Usage Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Usage Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {USAGE_METRICS.map((metric) => {
            const Icon = metric.icon;
            const percentage = Math.round(
              (metric.current / metric.max) * 100,
            );
            const unit = metric.unit ?? '';

            return (
              <div
                key={metric.label}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${metric.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {metric.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.current.toLocaleString()}
                  {unit ? ` ${unit}` : ''}
                  <span className="text-sm font-normal text-gray-400">
                    {' '}
                    / {metric.max.toLocaleString()}
                    {unit ? ` ${unit}` : ''}
                  </span>
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{percentage}% used</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full ${metric.barColor} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Info Panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">
            Billing Information
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label="Billing Email" value={BILLING_INFO.email} />
          <InfoRow label="Billing Name" value={BILLING_INFO.name} />
          <InfoRow label="Stripe Customer ID">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
              {BILLING_INFO.stripeId}
            </code>
          </InfoRow>
          <InfoRow label="Next Invoice" value={BILLING_INFO.nextInvoice} />
          <InfoRow
            label="Payment Method"
            value={BILLING_INFO.paymentMethod}
          />
        </div>
      </div>

      {/* Usage History */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
          <BarChart3 className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">
            Usage History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  API Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {USAGE_HISTORY.map((row) => (
                <tr
                  key={row.month}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {row.users}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {row.transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {row.apiCalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {row.storage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Info Row Helper ─── */

function InfoRow({
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
