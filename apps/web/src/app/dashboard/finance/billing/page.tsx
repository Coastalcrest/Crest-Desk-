'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Filter,
  Clock,
  CreditCard,
  FileText,
  Search,
  Download,
} from 'lucide-react';


interface BillingItem {
  id: string;
  agentName: string;
  avatar: string;
  amountDue: number;
  dueDate: string;
  type: 'desk_fee' | 'eo_insurance' | 'tech_fee';
  status: 'current' | 'overdue' | 'paid';
}

export default function AgentBillingPage() {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [billingFilter, setBillingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const [stats] = useState({
    totalOutstanding: 34250,
    overdue: 8750,
    collectedThisMonth: 52300,
  });

  const [aging] = useState({
    current: 18500,
    days30: 7000,
    days60: 5250,
    days90: 3500,
  });

  const [billingItems, setBillingItems] = useState([
    { id: '1', agentName: 'Sarah Mitchell', avatar: 'SM', amountDue: 750, dueDate: '2026-02-28', type: 'desk_fee', status: 'current' },
    { id: '2', agentName: 'James Rodriguez', avatar: 'JR', amountDue: 750, dueDate: '2026-02-28', type: 'desk_fee', status: 'current' },
    { id: '3', agentName: 'Emily Chen', avatar: 'EC', amountDue: 2400, dueDate: '2026-01-31', type: 'eo_insurance', status: 'overdue' },
    { id: '4', agentName: 'Michael Foster', avatar: 'MF', amountDue: 150, dueDate: '2026-02-28', type: 'tech_fee', status: 'current' },
    { id: '5', agentName: 'Lisa Thompson', avatar: 'LT', amountDue: 750, dueDate: '2025-12-31', type: 'desk_fee', status: 'overdue' },
    { id: '6', agentName: 'David Kim', avatar: 'DK', amountDue: 2400, dueDate: '2026-03-15', type: 'eo_insurance', status: 'current' },
    { id: '7', agentName: 'Rachel Green', avatar: 'RG', amountDue: 150, dueDate: '2026-01-15', type: 'tech_fee', status: 'overdue' },
    { id: '8', agentName: 'Tom Wilson', avatar: 'TW', amountDue: 750, dueDate: '2026-02-28', type: 'desk_fee', status: 'current' },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(val);

  const handleMarkPaid = (id: string) => {
    setBillingItems(items => items.map(item => item.id === id ? { ...item, status: "paid" } : item));
  };

  const typeLabels: Record<string, string> = { desk_fee: "Desk Fee", eo_insurance: "E&O Insurance", tech_fee: "Tech Fee" };

  if (isLoading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>Agent Billing</h1>
          <p className="text-sm text-gray-500 mt-1">Manage desk fees, E&O insurance, and technology charges</p>
        </div>
        <button onClick={() => setShowInvoiceModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-blue-50"><DollarSign className="w-5 h-5 text-[var(--color-primary)]" /></div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalOutstanding)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Outstanding</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-red-50"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
          <p className="text-sm text-gray-500 mt-1">Overdue</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-lg bg-green-50"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.collectedThisMonth)}</p>
          <p className="text-sm text-gray-500 mt-1">Collected This Month</p>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aging Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
            <p className="text-sm font-medium text-green-700 mb-1">Current</p>
            <p className="text-xl font-bold text-green-800">{formatCurrency(aging.current)}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-100">
            <p className="text-sm font-medium text-yellow-700 mb-1">30+ Days</p>
            <p className="text-xl font-bold text-yellow-800">{formatCurrency(aging.days30)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
            <p className="text-sm font-medium text-orange-700 mb-1">60+ Days</p>
            <p className="text-xl font-bold text-orange-800">{formatCurrency(aging.days60)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
            <p className="text-sm font-medium text-red-700 mb-1">90+ Days</p>
            <p className="text-xl font-bold text-red-800">{formatCurrency(aging.days90)}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={billingFilter} onChange={(e) => setBillingFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Types</option>
            <option value="desk_fee">Desk Fee</option>
            <option value="eo_insurance">E&O Insurance</option>
            <option value="tech_fee">Tech Fee</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="current">Current</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Billing Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount Due</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billingItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-semibold">{item.avatar}</div>
                      <span className="font-medium text-gray-900">{item.agentName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">{formatCurrency(item.amountDue)}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">{item.dueDate}</td>
                  <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{typeLabels[item.type] || item.type}</span></td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      item.status === "paid" ? "bg-green-100 text-green-700" :
                      item.status === "overdue" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.status \!== "paid" && (
                      <button onClick={() => handleMarkPaid(item.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">Mark Paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create Invoice</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option>Select agent</option>
                  <option>Sarah Mitchell</option><option>James Rodriguez</option><option>Emily Chen</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option>Desk Fee</option><option>E&O Insurance</option><option>Tech Fee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="number" placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={3} placeholder="Optional notes..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">Create Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
