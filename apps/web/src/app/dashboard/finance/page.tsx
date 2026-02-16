'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
  Download,
  Filter,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  Home,
  Key,
  Search,
} from 'lucide-react';


interface AgentCommission {
  rank: number;
  name: string;
  avatar: string;
  ytdCommission: number;
  dealsClosed: number;
  avgDeal: number;
  trend: 'up' | 'down';
  trendPct: number;
}

interface MonthlyTrend {
  month: string;
  amount: number;
  deals: number;
  change: number;
}

export default function CommissionDashboardPage() {
  const [dateRange, setDateRange] = useState('ytd');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [dealType, setDealType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const [stats] = useState({
    ytdCommission: 1247850,
    thisMonth: 142300,
    pendingCommission: 87650,
    avgDealCommission: 8425,
    ytdChange: 12.5,
    monthChange: 8.3,
    pendingChange: -3.2,
    avgChange: 5.1,
  });

  const [agents] = useState([
    { rank: 1, name: 'Sarah Mitchell', avatar: 'SM', ytdCommission: 312450, dealsClosed: 38, avgDeal: 8222, trend: 'up', trendPct: 15.2 },
    { rank: 2, name: 'James Rodriguez', avatar: 'JR', ytdCommission: 287300, dealsClosed: 32, avgDeal: 8978, trend: 'up', trendPct: 8.7 },
    { rank: 3, name: 'Emily Chen', avatar: 'EC', ytdCommission: 245100, dealsClosed: 28, avgDeal: 8754, trend: 'up', trendPct: 22.1 },
    { rank: 4, name: 'Michael Foster', avatar: 'MF', ytdCommission: 218700, dealsClosed: 26, avgDeal: 8412, trend: 'down', trendPct: 4.3 },
    { rank: 5, name: 'Lisa Thompson', avatar: 'LT', ytdCommission: 184300, dealsClosed: 24, avgDeal: 7679, trend: 'up', trendPct: 11.8 },
  ]);

  const [monthlyTrends] = useState([
    { month: 'August 2025', amount: 198400, deals: 22, change: 5.2 },
    { month: 'September 2025', amount: 215700, deals: 25, change: 8.7 },
    { month: 'October 2025', amount: 187300, deals: 20, change: -13.2 },
    { month: 'November 2025', amount: 203500, deals: 23, change: 8.7 },
    { month: 'December 2025', amount: 178900, deals: 19, change: -12.1 },
    { month: 'January 2026', amount: 142300, deals: 17, change: -20.5 },
  ]);

  const dealTypeBreakdowns = [
    { type: "Residential", icon: <Home className="w-5 h-5" />, percentage: 62, amount: 773667, color: "bg-blue-500" },
    { type: "Commercial", icon: <Building2 className="w-5 h-5" />, percentage: 28, amount: 349398, color: "bg-emerald-500" },
    { type: "Rental", icon: <Key className="w-5 h-5" />, percentage: 10, amount: 124785, color: "bg-amber-500" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);

  const statCards = [
    { label: "YTD Commission", value: stats.ytdCommission, change: stats.ytdChange, icon: DollarSign, color: "text-[var(--color-primary)]", bg: "bg-blue-50" },
    { label: "This Month", value: stats.thisMonth, change: stats.monthChange, icon: TrendingUp, color: "text-[var(--color-secondary)]", bg: "bg-teal-50" },
    { label: "Pending Commission", value: stats.pendingCommission, change: stats.pendingChange, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Avg Deal Commission", value: stats.avgDealCommission, change: stats.avgChange, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>
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
            <option value="sarah">Sarah Mitchell</option>
            <option value="james">James Rodriguez</option>
            <option value="emily">Emily Chen</option>
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
          const isPositive = card.change >= 0;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                  {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(card.change)}%
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(card.value)}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Commission by Agent Table */}
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
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">YTD Commission</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Deals Closed</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg per Deal</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <tr key={agent.rank} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      agent.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                      agent.rank === 2 ? "bg-gray-100 text-gray-600" :
                      agent.rank === 3 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-50 text-gray-500"
                    }`}>
                      {agent.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-semibold">
                        {agent.avatar}
                      </div>
                      <span className="font-medium text-gray-900">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(agent.ytdCommission)}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{agent.dealsClosed}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(agent.avgDeal)}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${agent.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {agent.trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {agent.trendPct}%%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Commission Trend</h2>
            <p className="text-sm text-gray-500 mt-0.5">Last 6 months performance</p>
          </div>
          <div className="p-6 space-y-3">
            {monthlyTrends.map((item) => {
              const maxAmount = Math.max(...monthlyTrends.map((t) => t.amount));
              const widthPct = (item.amount / maxAmount) * 100;
              const isPositive = item.change >= 0;
              return (
                <div key={item.month} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium text-gray-700">{item.month}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs">{item.deals} deals</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
                      <span className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}{item.change}%%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] transition-all duration-500" style={{ width: `${widthPct}%%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deal Type Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Commission by Deal Type</h2>
            <p className="text-sm text-gray-500 mt-0.5">Distribution across property categories</p>
          </div>
          <div className="p-6 space-y-6">
            {dealTypeBreakdowns.map((item) => (
              <div key={item.type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === "Residential" ? "bg-blue-50 text-blue-600" :
                      item.type === "Commercial" ? "bg-emerald-50 text-emerald-600" :
                      "bg-amber-50 text-amber-600"
                    }`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.type}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{item.percentage}%%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={`h-3 rounded-full ${item.color} transition-all duration-500`} style={{ width: `${item.percentage}%%` }}></div>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total Commission</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(stats.ytdCommission)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              {dealTypeBreakdowns.map((item) => (
                <div key={item.type} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-xs text-gray-500">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
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
            <p className="text-sm text-gray-500 mb-1">Total Deals</p>
            <p className="text-2xl font-bold text-gray-900">148</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Active Agents</p>
            <p className="text-2xl font-bold text-gray-900">12</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Avg Close Time</p>
            <p className="text-2xl font-bold text-gray-900">34 days</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Close Rate</p>
            <p className="text-2xl font-bold text-gray-900">68%%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
