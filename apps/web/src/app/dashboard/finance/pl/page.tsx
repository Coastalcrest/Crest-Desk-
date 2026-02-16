'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  BarChart3,
  Target,
  Percent,
  Download,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';

interface PLReport {
  totalRevenue: string;
  totalExpenses: string;
  grossProfit: string;
  profitMargin: string;
  commissionCount: number;
  monthlyTrend: {
    revenue: { month: string; revenue: string }[];
    expenses: { month: string; expenses: string }[];
  };
}

interface MonthlyPL {
  month: string;
  revenue: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
}

export default function PLByOfficePage() {
  const [selectedOffice, setSelectedOffice] = useState('main');
  const [selectedYear, setSelectedYear] = useState('2026');

  const { data, isLoading } = useQuery<PLReport>({
    queryKey: ['reports', 'pl-by-office'],
    queryFn: () => api<PLReport>('/reports/pl-by-office'),
  });

  const totalRevenue = parseFloat(data?.totalRevenue ?? '0');
  const totalExpenses = parseFloat(data?.totalExpenses ?? '0');
  const grossProfit = totalRevenue - totalExpenses;
  const netProfit = grossProfit; // P&L report has no separate net vs gross distinction
  const profitMargin = parseFloat(data?.profitMargin ?? '0');

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthlyData: MonthlyPL[] = monthNames.map((name, i) => {
    const mm = String(i + 1).padStart(2, '0');
    const yearMonth = `${selectedYear}-${mm}`;
    const rev = parseFloat(data?.monthlyTrend?.revenue?.find(r => r.month === yearMonth)?.revenue ?? '0');
    const exp = parseFloat(data?.monthlyTrend?.expenses?.find(e => e.month === yearMonth)?.expenses ?? '0');
    return { month: name, revenue: rev, expenses: exp, grossProfit: rev - exp, netProfit: rev - exp };
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);

  const offices = [
    { value: "main", label: "Main Office - Downtown Wilmington" },
    { value: "branch", label: "Branch Office - Wrightsville Beach" },
  ];

  if (isLoading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Profit & Loss</h1>
          <p className="text-sm text-gray-500 mt-1">Financial performance by office and entity</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={selectedOffice} onChange={(e) => setSelectedOffice(e.target.value)} className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            {offices.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-50"><DollarSign className="w-5 h-5 text-[var(--color-primary)]" /></div>
            <span className="text-xs font-medium text-gray-400">--</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-red-50"><TrendingDown className="w-5 h-5 text-red-600" /></div>
            <span className="text-xs font-medium text-gray-400">--</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Expenses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-50"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            <span className="text-xs font-medium text-gray-400">--</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(netProfit)}</p>
          <p className="text-sm text-gray-500 mt-1">Net Profit</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50"><Percent className="w-5 h-5 text-purple-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{profitMargin}%</p>
          <p className="text-sm text-gray-500 mt-1">Profit Margin</p>
        </div>
      </div>

      {/* Profit Margin Visual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Expenses</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Revenue</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="h-4 rounded-full bg-[var(--color-secondary)] transition-all duration-500" style={{ width: "100%" }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Expenses</span>
              <span className="font-semibold text-gray-900">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="h-4 rounded-full bg-red-400 transition-all duration-500" style={{ width: `${totalRevenue > 0 ? (totalExpenses / totalRevenue * 100).toFixed(0) : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Net Profit</span>
              <span className="font-semibold text-green-600">{formatCurrency(netProfit)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="h-4 rounded-full bg-green-500 transition-all duration-500" style={{ width: `${totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(0) : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly P&L Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Monthly P&L Statement</h2>
          <p className="text-sm text-gray-500 mt-0.5">Detailed monthly financial breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Profit</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyData.filter(m => m.revenue > 0).map((row) => (
                <tr key={row.month} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{row.month}</td>
                  <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatCurrency(row.expenses)}</td>
                  <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(row.grossProfit)}</td>
                  <td className="px-6 py-4 text-right font-semibold">
                    <span className={row.netProfit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(row.netProfit)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300">
                <td className="px-6 py-4 font-bold text-gray-900">Total</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(totalRevenue)}</td>
                <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(totalExpenses)}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(grossProfit)}</td>
                <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(netProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
