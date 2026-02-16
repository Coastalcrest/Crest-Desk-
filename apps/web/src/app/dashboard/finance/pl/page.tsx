'use client';

import { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  const [summary] = useState({
    totalRevenue: 1247850,
    totalExpenses: 342150,
    grossProfit: 905700,
    netProfit: 748200,
    profitMargin: 59.9,
    revenueChange: 12.5,
    expenseChange: 8.1,
    profitChange: 15.2,
  });

  const [monthlyData] = useState([
    { month: 'January', revenue: 142300, expenses: 38750, grossProfit: 103550, netProfit: 87200 },
    { month: 'February', revenue: 0, expenses: 0, grossProfit: 0, netProfit: 0 },
    { month: 'March', revenue: 0, expenses: 0, grossProfit: 0, netProfit: 0 },
    { month: 'April', revenue: 0, expenses: 0, grossProfit: 0, netProfit: 0 },
    { month: 'May', revenue: 0, expenses: 0, grossProfit: 0, netProfit: 0 },
    { month: 'June', revenue: 0, expenses: 0, grossProfit: 0, netProfit: 0 },
    { month: 'July', revenue: 0, expenses: 0, grossProfit: 0, netProfit: 0 },
    { month: 'August', revenue: 198400, expenses: 48200, grossProfit: 150200, netProfit: 128400 },
    { month: 'September', revenue: 215700, expenses: 52300, grossProfit: 163400, netProfit: 138900 },
    { month: 'October', revenue: 187300, expenses: 45800, grossProfit: 141500, netProfit: 118700 },
    { month: 'November', revenue: 203500, expenses: 49600, grossProfit: 153900, netProfit: 131200 },
    { month: 'December', revenue: 178900, expenses: 43500, grossProfit: 135400, netProfit: 112800 },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
            <span className="flex items-center gap-1 text-xs font-medium text-green-600"><ArrowUpRight className="w-3.5 h-3.5" />{summary.revenueChange}%%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-red-50"><TrendingDown className="w-5 h-5 text-red-600" /></div>
            <span className="flex items-center gap-1 text-xs font-medium text-red-600"><ArrowUpRight className="w-3.5 h-3.5" />{summary.expenseChange}%%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalExpenses)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Expenses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-50"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            <span className="flex items-center gap-1 text-xs font-medium text-green-600"><ArrowUpRight className="w-3.5 h-3.5" />{summary.profitChange}%%</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.netProfit)}</p>
          <p className="text-sm text-gray-500 mt-1">Net Profit</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-50"><Percent className="w-5 h-5 text-purple-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.profitMargin}%%</p>
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
              <span className="font-semibold text-gray-900">{formatCurrency(summary.totalRevenue)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="h-4 rounded-full bg-[var(--color-secondary)] transition-all duration-500" style={{ width: "100%%" }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Expenses</span>
              <span className="font-semibold text-gray-900">{formatCurrency(summary.totalExpenses)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="h-4 rounded-full bg-red-400 transition-all duration-500" style={{ width: `${(summary.totalExpenses / summary.totalRevenue * 100).toFixed(0)}%%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Net Profit</span>
              <span className="font-semibold text-green-600">{formatCurrency(summary.netProfit)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div className="h-4 rounded-full bg-green-500 transition-all duration-500" style={{ width: `${(summary.netProfit / summary.totalRevenue * 100).toFixed(0)}%%` }}></div>
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
                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</td>
                <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(summary.grossProfit)}</td>
                <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(summary.netProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
