'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  FileWarning,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
} from 'lucide-react';

/* ─── Mock Data ─── */

const BREACH_INCIDENTS = [
  {
    id: 'BR-2026-001',
    title: 'Unauthorized Email Access',
    severity: 'high' as const,
    status: 'investigating' as const,
    affectedStates: 'OR, WA, CA',
    discovered: 'Feb 5, 2026',
  },
  {
    id: 'BR-2026-002',
    title: 'Lost Laptop with Client Data',
    severity: 'medium' as const,
    status: 'contained' as const,
    affectedStates: 'OR',
    discovered: 'Jan 28, 2026',
  },
];

const STATE_RULES = [
  {
    state: 'Alabama',
    abbr: 'AL',
    deadline: '45 days',
    agRequired: true,
    consumerReporting: false,
    threshold: '500+ individuals',
    statute: 'Ala. Code 8-38-1',
  },
  {
    state: 'Alaska',
    abbr: 'AK',
    deadline: '45 days',
    agRequired: true,
    consumerReporting: false,
    threshold: '1,000+ individuals',
    statute: 'Alaska Stat. 45.48.010',
  },
  {
    state: 'Arizona',
    abbr: 'AZ',
    deadline: '45 days',
    agRequired: true,
    consumerReporting: true,
    threshold: '1,000+ individuals',
    statute: 'Ariz. Rev. Stat. 18-552',
  },
  {
    state: 'Arkansas',
    abbr: 'AR',
    deadline: 'Expedient',
    agRequired: false,
    consumerReporting: false,
    threshold: 'No minimum',
    statute: 'Ark. Code 4-110-105',
  },
  {
    state: 'California',
    abbr: 'CA',
    deadline: 'Expedient',
    agRequired: true,
    consumerReporting: true,
    threshold: '500+ individuals',
    statute: 'Cal. Civ. Code 1798.82',
  },
  {
    state: 'Colorado',
    abbr: 'CO',
    deadline: '30 days',
    agRequired: true,
    consumerReporting: true,
    threshold: '500+ individuals',
    statute: 'Colo. Rev. Stat. 6-1-716',
  },
  {
    state: 'Connecticut',
    abbr: 'CT',
    deadline: '60 days',
    agRequired: true,
    consumerReporting: false,
    threshold: 'No minimum',
    statute: 'Conn. Gen. Stat. 36a-701b',
  },
  {
    state: 'Delaware',
    abbr: 'DE',
    deadline: '60 days',
    agRequired: true,
    consumerReporting: false,
    threshold: '500+ individuals',
    statute: 'Del. Code tit. 6, 12B-102',
  },
  {
    state: 'Florida',
    abbr: 'FL',
    deadline: '30 days',
    agRequired: true,
    consumerReporting: true,
    threshold: '500+ individuals',
    statute: 'Fla. Stat. 501.171',
  },
  {
    state: 'Georgia',
    abbr: 'GA',
    deadline: 'Expedient',
    agRequired: false,
    consumerReporting: true,
    threshold: '10,000+ individuals',
    statute: 'Ga. Code 10-1-912',
  },
];

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

const INCIDENT_STATUS_BADGE: Record<string, string> = {
  investigating: 'bg-amber-100 text-amber-700',
  contained: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  reported: 'bg-purple-100 text-purple-700',
};

/* ─── Page Component ─── */

export default function BreachManagementPage() {
  const [showStateRules, setShowStateRules] = useState(false);

  const statCards = [
    {
      label: 'Total Incidents',
      value: '2',
      icon: FileWarning,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active',
      value: '1',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Pending Notifications',
      value: '4',
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Overdue',
      value: '0',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">
            Breach Management
          </h1>
          <p className="text-sm text-gray-500">
            Track incidents and manage state notification requirements
          </p>
        </div>
        <Link
          href="/dashboard/settings/security"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Security
        </Link>
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

      {/* Breach Incidents Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Breach Incidents</h2>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            New Incident
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Incident #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Affected States
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discovered
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {BREACH_INCIDENTS.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                    {incident.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {incident.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[incident.severity]}`}
                    >
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${INCIDENT_STATUS_BADGE[incident.status]}`}
                    >
                      {incident.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {incident.affectedStates}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {incident.discovered}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 50-State Rules Reference (Collapsible) */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-lg font-semibold text-gray-900">
              State Breach Notification Rules
            </h2>
          </div>
          <button
            onClick={() => setShowStateRules(!showStateRules)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {showStateRules ? (
              <>
                Hide
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Show
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
        {showStateRules && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      AG Required
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Consumer Reporting
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Threshold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Statute
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {STATE_RULES.map((rule) => (
                    <tr key={rule.abbr} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rule.state} ({rule.abbr})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {rule.deadline}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            rule.agRequired
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {rule.agRequired ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            rule.consumerReporting
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {rule.consumerReporting ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {rule.threshold}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {rule.statute}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing 10 of 51 jurisdictions
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
