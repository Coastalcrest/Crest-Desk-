'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  Percent,
  Plus,
  Filter,
  ChevronDown,
  X,
  Camera,
  Palette,
  Megaphone,
  ClipboardCheck,
  FileCheck,
  FileText,
  Receipt,
  MoreHorizontal,
  Search,
  Download,
} from 'lucide-react';


interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  deal: string;
  agent: string;
  amount: number;
  status: 'paid' | 'pending';
}

interface CategoryBreakdown {
  name: string;
  amount: number;
  count: number;
  color: string;
}

export default function ExpenseDashboardPage() {
  const [showModal, setShowModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const [stats] = useState({
    ytdExpenses: 342150,
    thisMonth: 28750,
    expenseToRevenue: 27.4,
  });

  const [categories] = useState([
    { name: 'Photography', amount: 67200, count: 48, color: 'bg-blue-500' },
    { name: 'Staging', amount: 54800, count: 22, color: 'bg-purple-500' },
    { name: 'Marketing', amount: 48300, count: 65, color: 'bg-pink-500' },
    { name: 'Inspection', amount: 42100, count: 38, color: 'bg-amber-500' },
    { name: 'Appraisal', amount: 38600, count: 32, color: 'bg-green-500' },
    { name: 'Title', amount: 35200, count: 28, color: 'bg-indigo-500' },
    { name: 'Recording', amount: 28400, count: 45, color: 'bg-teal-500' },
    { name: 'Other', amount: 27550, count: 31, color: 'bg-gray-500' },
  ]);

  const [expenses] = useState([
    { id: '1', date: '2026-02-14', description: 'Property photography - 123 Oak St', category: 'Photography', deal: '123 Oak Street', agent: 'Sarah Mitchell', amount: 450, status: 'paid' },
    { id: '2', date: '2026-02-13', description: 'Home staging - 456 Elm Ave', category: 'Staging', deal: '456 Elm Avenue', agent: 'James Rodriguez', amount: 2800, status: 'paid' },
    { id: '3', date: '2026-02-12', description: 'Facebook ad campaign - Q1', category: 'Marketing', deal: 'General', agent: 'Emily Chen', amount: 1200, status: 'pending' },
    { id: '4', date: '2026-02-11', description: 'Home inspection - 789 Pine Dr', category: 'Inspection', deal: '789 Pine Drive', agent: 'Michael Foster', amount: 575, status: 'paid' },
    { id: '5', date: '2026-02-10', description: 'Property appraisal - 321 Maple Ln', category: 'Appraisal', deal: '321 Maple Lane', agent: 'Lisa Thompson', amount: 650, status: 'pending' },
    { id: '6', date: '2026-02-09', description: 'Title search - 555 Cedar Ct', category: 'Title', deal: '555 Cedar Court', agent: 'Sarah Mitchell', amount: 425, status: 'paid' },
    { id: '7', date: '2026-02-08', description: 'Document recording fees', category: 'Recording', deal: '789 Pine Drive', agent: 'Michael Foster', amount: 175, status: 'paid' },
  ]);

  const [formData, setFormData] = useState({
    category: "", amount: "", description: "", date: "", deal: "", vendor: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);

  const maxCatAmount = Math.max(...categories.map((c) => c.amount));

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
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Expense Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage brokerage expenses across all categories</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-red-50"><DollarSign className="w-5 h-5 text-red-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.ytdExpenses)}</p>
          <p className="text-sm text-gray-500 mt-1">YTD Expenses</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-orange-50"><TrendingDown className="w-5 h-5 text-orange-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.thisMonth)}</p>
          <p className="text-sm text-gray-500 mt-1">This Month</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-purple-50"><Percent className="w-5 h-5 text-purple-600" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.expenseToRevenue}%%</p>
          <p className="text-sm text-gray-500 mt-1">Expense-to-Revenue Ratio</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Expenses by Category</h2>
          <p className="text-sm text-gray-500 mt-0.5">Breakdown of spending across expense categories</p>
        </div>
        <div className="p-6 space-y-3">
          {categories.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  <span className="text-gray-400 text-xs">({cat.count} items)</span>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(cat.amount)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${cat.color} transition-all duration-500`} style={{ width: `${(cat.amount / maxCatAmount) * 100}%%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" /><span className="font-medium">Filters:</span>
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Categories</option>
            <option value="photography">Photography</option>
            <option value="staging">Staging</option>
            <option value="marketing">Marketing</option>
            <option value="inspection">Inspection</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deal</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">{exp.date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{exp.description}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{exp.category}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exp.deal}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exp.agent}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(exp.amount)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      exp.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>{exp.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Expense</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option value="">Select category</option>
                  <option value="photography">Photography</option>
                  <option value="staging">Staging</option>
                  <option value="marketing">Marketing</option>
                  <option value="inspection">Inspection</option>
                  <option value="appraisal">Appraisal</option>
                  <option value="title">Title</option>
                  <option value="recording">Recording</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" placeholder="Enter description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deal</label>
                  <input type="text" placeholder="Related deal" value={formData.deal} onChange={(e) => setFormData({...formData, deal: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <input type="text" placeholder="Vendor name" value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">Save Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
