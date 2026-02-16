'use client';

import { useState } from 'react';
import {
  Bot,
  MessageSquare,
  Clock,
  FileWarning,
  Shield,
  AlertTriangle,
  Send,
  Sparkles,
  ChevronRight,
  Calendar,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const STAT_CARDS = [
  { label: 'Active Deals', value: 8, icon: FileText, color: 'text-[var(--color-primary,#1B3A5C)]', bg: 'bg-blue-50' },
  { label: 'Upcoming Deadlines', value: 3, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Missing Documents', value: 5, icon: FileWarning, color: 'text-red-500', bg: 'bg-red-50' },
  { label: 'Compliance Alerts', value: 2, icon: Shield, color: 'text-orange-500', bg: 'bg-orange-50' },
];

const CONVERSATIONS = [
  { id: '1', title: 'Deal status overview', date: 'Feb 14, 2026', preview: 'Here is a summary of your 8 active deals...' },
  { id: '2', title: 'Missing docs for 742 Evergreen', date: 'Feb 12, 2026', preview: 'The following documents are still needed...' },
  { id: '3', title: 'Compliance check — OR disclosure', date: 'Feb 10, 2026', preview: 'Oregon requires a seller property disclosure...' },
];

const MESSAGES = [
  { id: '1', role: 'user' as const, content: 'What documents are missing for the 742 Evergreen Terrace deal?' },
  { id: '2', role: 'assistant' as const, content: 'For the 742 Evergreen Terrace transaction, you are missing 3 documents:\n\n1. Seller Property Disclosure (due Feb 20)\n2. Lead-Based Paint Disclosure (due Feb 20)\n3. Home Inspection Report (due Feb 25)\n\nWould you like me to send reminders to the relevant parties?' },
  { id: '3', role: 'user' as const, content: 'Yes, send reminders for the first two.' },
  { id: '4', role: 'assistant' as const, content: 'Done! I have sent reminder emails to the seller (Martha Johnson) for the Seller Property Disclosure and the Lead-Based Paint Disclosure. Both are due by February 20, 2026. I will notify you once they are uploaded.' },
];

const SUGGESTED_QUERIES = [
  'What\'s the status of my deals?',
  'Any upcoming deadlines?',
  'Missing documents?',
  'Run compliance check',
];

const DEADLINE_ALERTS = [
  { id: '1', transaction: '742 Evergreen Terrace', date: 'Feb 20, 2026', label: 'Inspection contingency expires' },
  { id: '2', transaction: '1520 NW Harbor Blvd', date: 'Feb 22, 2026', label: 'Financing deadline' },
];

const MISSING_DOCS = [
  { id: '1', transaction: '742 Evergreen Terrace', doc: 'Seller Property Disclosure' },
  { id: '2', transaction: '310 Coastal Ave #4B', doc: 'HOA Resale Certificate' },
];

const COMPLIANCE_WARNINGS = [
  { id: '1', transaction: '1520 NW Harbor Blvd', message: 'Oregon requires earthquake hazard disclosure for properties in Zone 3' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AIPage() {
  const [activeConversation, setActiveConversation] = useState('1');
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">CrestAI Copilot</h1>
            <p className="text-sm text-gray-500">Your AI deal assistant</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
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

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: Chat Interface */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex h-[560px]">
            {/* Conversation Sidebar */}
            <div className="w-64 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Conversations</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {CONVERSATIONS.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                      activeConversation === conv.id && 'bg-blue-50 border-l-2 border-l-[var(--color-secondary,#2A9D8F)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-400 shrink-0" />
                      <p className="text-sm font-medium text-gray-900 truncate">{conv.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{conv.date}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {MESSAGES.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary,#1B3A5C)]">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-[var(--color-primary,#1B3A5C)] text-white'
                          : 'bg-gray-100 text-gray-800',
                      )}
                    >
                      {msg.content.split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < msg.content.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-300">
                        <span className="text-xs font-medium text-gray-700">ME</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Suggested Queries */}
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {SUGGESTED_QUERIES.map((query) => (
                  <button
                    key={query}
                    onClick={() => setInputValue(query)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:border-[var(--color-secondary,#2A9D8F)] transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask CrestAI anything about your deals..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)]"
                  />
                  <button className="rounded-lg bg-[var(--color-secondary,#2A9D8F)] px-4 py-2.5 text-white hover:opacity-90 transition-opacity">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Smart Alerts Panel */}
        <div className="space-y-4">
          {/* Deadline Alerts */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-900">Deadline Alerts</h3>
            </div>
            <div className="space-y-3">
              {DEADLINE_ALERTS.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between gap-2 rounded-lg bg-amber-50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{alert.transaction}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.label}</p>
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{alert.date}</span>
                  </div>
                  <button className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-secondary,#2A9D8F)] hover:bg-teal-50 transition-colors">
                    View <ChevronRight className="inline h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Docs */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileWarning className="h-5 w-5 text-red-500" />
              <h3 className="text-base font-semibold text-gray-900">Missing Documents</h3>
            </div>
            <div className="space-y-3">
              {MISSING_DOCS.map((doc) => (
                <div key={doc.id} className="flex items-start justify-between gap-2 rounded-lg bg-red-50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.transaction}</p>
                    <p className="text-xs text-red-600 mt-0.5">{doc.doc}</p>
                  </div>
                  <button className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-secondary,#2A9D8F)] hover:bg-teal-50 transition-colors">
                    View <ChevronRight className="inline h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Warnings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h3 className="text-base font-semibold text-gray-900">Compliance Warnings</h3>
            </div>
            <div className="space-y-3">
              {COMPLIANCE_WARNINGS.map((warn) => (
                <div key={warn.id} className="flex items-start justify-between gap-2 rounded-lg bg-orange-50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{warn.transaction}</p>
                    <p className="text-xs text-orange-700 mt-0.5">{warn.message}</p>
                  </div>
                  <button className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-secondary,#2A9D8F)] hover:bg-teal-50 transition-colors">
                    View <ChevronRight className="inline h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
