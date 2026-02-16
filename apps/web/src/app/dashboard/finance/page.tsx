'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
  Download,
  Filter,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api, apiPaginated } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types — aligned with API responses
// ---------------------------------------------------------------------------

interface CommissionStats {
  totalYtd: number;
  totalThisMonth: number;
  pendingCount: number;
  averageDeal: number;
  topAgents: TopAgent[];
}

interface TopAgent {
  agentId: string;
  agentFirstName: string;
  agentLastName: string;
  totalCommission: number;
  dealCount: number;
}

interface Commission {
  id: string;
  dealId: string;
  agentId: string;
  salePrice: number;
  commissionRate: number;
  totalCommission: number;
  brokerageAmount: number;
  agentAmount: number;
  referralFee: number;
  franchiseFee: number;
  netAgentAmount: number;
  dealType: string;
  closingDate: string;
  status: string;
  dealName: string;
  propertyAddress: string;
  agentFirstName: string;
  agentLastName: string;
  agentEmail: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommissionDashboardPage() {
  const [dateRange, setDateRange] = useState('ytd');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [dealType, setDealType] = useState('all');

  // ----- API queries -----

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<CommissionStats>({
    queryKey: ['commission-stats'],
    queryFn: () => api<CommissionStats>('/commissions/stats'),
  });

  const {
    data: commissionsResponse,
    isLoading: commissionsLoading,
    error: commissionsError,
  } = useQuery({
    queryKey: ['commissions-recent'],
    queryFn: () => apiPaginated<Commission>('/commissions?page=1&pageSize=10'),
  });

  const recentCommissions = commissionsResponse?.data ?? [];
  const topAgents = stats?.topAgents ?? [];

  const isLoading = statsLoading || commissionsLoading;
  const error = statsError ?? commissionsError;

  // ----- Helpers -----

  const formatCurrency = (val: number | string | null | undefined) => {
    if (val === null || val === undefined) return '$0';
    const n = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(n)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(n);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (first: string | null | undefined, last: string | null | undefined) => {
    const f = first?.charAt(0)?.toUpperCase() ?? '';
    const l = last?.charAt(0)?.toUpperCase() ?? '';
    return f + l || '??';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // ----- Stat cards -----

  const statCards = [
    {
      label: 'YTD Commission',
      value: stats?.totalYtd ?? 0,
      icon: DollarSign,
      color: 'text-[var(--color-primary)]',
      bg: 'bg-blue-50',
    },
    {
      label: 'This Month',
      value: stats?.totalThisMonth ?? 0,
      icon: TrendingUp,
      color: 'text-[var(--color-secondary)]',
      bg: 'bg-teal-50',
    },
    {
      label: 'Pending Commissions',
      value: stats?.pendingCount ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      isCurrency: false,
    },
    {
      label: 'Avg Deal Commission',
      value: stats?.averageDeal ?? 0,
      icon: BarChart3,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  // ----- Loading state -----

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // ----- Error state -----

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-red-600">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm font-medium">Failed to load commission data</p>
        <p className="text-xs text-gray-500">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
            Commission Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track agent commissions, trends, and deal performance</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters:</span>
          </div>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            <option value="ytd">Year to Date</option>
            <option value="q1">Q1 2026</option>
            <option value="q4-2025">Q4 2025</option>
            <option value="last-12">Last 12 Months</option>
          </select>
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            <option value="all">All Agents</option>
            {topAgents.map((a) => (
              <option key={a.agentId} value={a.agentId}>
                {a.agentFirstName} {a.agentLastName}
              </option>
            ))}
          </select>
          <select value={dealType} onChange={(e) => setDealType(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            <option value="all">All Deal Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="rental">Rental</option>
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isCurrency = (card as { isCurrency?: boolean }).isCurrency !== false;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {isCurrency ? formatCurrency(card.value) : card.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Top Agents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Commission by Agent</h2>
            <p className="text-sm text-gray-500 mt-0.5">Ranked by YTD commission earnings</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search agents..." className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Commission</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Deals Closed</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg per Deal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topAgents.map((agent, idx) => {
                const rank = idx + 1;
                const avgPerDeal = agent.dealCount > 0 ? agent.totalCommission / agent.dealCount : 0;
                const initials = getInitials(agent.agentFirstName, agent.agentLastName);
                return (
                  <tr key={agent.agentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        rank === 2 ? 'bg-gray-100 text-gray-600' :
                        rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-semibold">
                          {initials}
                        </div>
                        <span className="font-medium text-gray-900">
                          {agent.agentFirstName} {agent.agentLastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(agent.totalCommission)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{agent.dealCount}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(avgPerDeal)}</td>
                  </tr>
                );
              })}
              {topAgents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">No agent data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Commissions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Commissions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Latest commission records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deal</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Sale Price</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Net</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Closing Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCommissions.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{c.dealName}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{c.propertyAddress}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-semibold">
                        {getInitials(c.agentFirstName, c.agentLastName)}
                      </div>
                      <span className="text-sm text-gray-700">{c.agentFirstName} {c.agentLastName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">{c.dealType}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">{formatCurrency(c.salePrice)}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(c.totalCommission)}</td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">{formatCurrency(c.netAgentAmount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(c.closingDate)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentCommissions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-400">No commissions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-green-50">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Performance Summary</h2>
            <p className="text-sm text-gray-500">Quick metrics at a glance</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">YTD Commission</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalYtd ?? 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Top Agents</p>
            <p className="text-2xl font-bold text-gray-900">{topAgents.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.pendingCount ?? 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Avg Deal</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.averageDeal ?? 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
