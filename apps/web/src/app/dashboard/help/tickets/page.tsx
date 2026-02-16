'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TicketIcon,
  Plus,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  Search,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const STATS = [
  { label: 'Open', value: 3, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'In Progress', value: 2, icon: Loader2, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Resolved', value: 8, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Avg Resolution', value: '4.2 hrs', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
];

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Ticket {
  id: string;
  number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created: string;
  updated: string;
}

const STATUS_BADGE: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_BADGE: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const TICKETS: Ticket[] = [
  { id: 'tkt-001', number: 'TKT-1042', subject: 'Email sync stopped working after update', status: 'open', priority: 'high', created: 'Feb 14, 2026', updated: 'Feb 15, 2026' },
  { id: 'tkt-002', number: 'TKT-1041', subject: "Can't find Oregon disclosure form in templates", status: 'open', priority: 'medium', created: 'Feb 13, 2026', updated: 'Feb 14, 2026' },
  { id: 'tkt-003', number: 'TKT-1040', subject: 'E-signature document shows wrong signer order', status: 'in_progress', priority: 'high', created: 'Feb 12, 2026', updated: 'Feb 14, 2026' },
  { id: 'tkt-004', number: 'TKT-1039', subject: 'Commission split calculation appears incorrect', status: 'in_progress', priority: 'urgent', created: 'Feb 11, 2026', updated: 'Feb 13, 2026' },
  { id: 'tkt-005', number: 'TKT-1038', subject: 'Request to add custom fields to contact records', status: 'open', priority: 'low', created: 'Feb 10, 2026', updated: 'Feb 10, 2026' },
];

const FILTER_TABS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TicketsPage() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', category: 'general', priority: 'medium' });

  const filteredTickets = activeTab === 'All'
    ? TICKETS
    : TICKETS.filter((t) => STATUS_LABEL[t.status] === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
            <TicketIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">Support Tickets</h1>
            <p className="text-sm text-gray-500">Track and manage your support requests</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary,#2A9D8F)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', stat.bg)}>
                <stat.icon className={cn('h-6 w-6', stat.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'border-[var(--color-secondary,#2A9D8F)] text-[var(--color-secondary,#2A9D8F)]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Ticket Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/help/tickets/${ticket.id}`}
                      className="font-medium text-[var(--color-secondary,#2A9D8F)] hover:underline"
                    >
                      {ticket.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-900 max-w-xs truncate">{ticket.subject}</td>
                  <td className="px-6 py-4">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[ticket.status])}>
                      {STATUS_LABEL[ticket.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', PRIORITY_BADGE[ticket.priority])}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{ticket.created}</td>
                  <td className="px-6 py-4 text-gray-500">{ticket.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTickets.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">No tickets found for this filter.</div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Create New Ticket</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Brief description of your issue"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Provide details about your issue..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)]"
                  >
                    <option value="general">General</option>
                    <option value="transactions">Transactions</option>
                    <option value="documents">Documents</option>
                    <option value="email">Email</option>
                    <option value="compliance">Compliance</option>
                    <option value="billing">Billing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg bg-[var(--color-secondary,#2A9D8F)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
