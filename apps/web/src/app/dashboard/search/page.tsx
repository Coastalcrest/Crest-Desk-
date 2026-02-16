'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  Users,
  FolderOpen,
  Briefcase,
  Mail,
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
type ResultType = 'transaction' | 'contact' | 'document' | 'deal' | 'email';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
}

const TYPE_CONFIG: Record<ResultType, { icon: typeof FileText; label: string; badgeColor: string }> = {
  transaction: { icon: FileText, label: 'Transaction', badgeColor: 'bg-emerald-100 text-emerald-700' },
  contact: { icon: Users, label: 'Contact', badgeColor: 'bg-blue-100 text-blue-700' },
  document: { icon: FolderOpen, label: 'Document', badgeColor: 'bg-amber-100 text-amber-700' },
  deal: { icon: Briefcase, label: 'Deal', badgeColor: 'bg-purple-100 text-purple-700' },
  email: { icon: Mail, label: 'Email', badgeColor: 'bg-indigo-100 text-indigo-700' },
};

const TABS: { label: string; type: ResultType | 'all'; count: number }[] = [
  { label: 'All', type: 'all', count: 12 },
  { label: 'Transactions', type: 'transaction', count: 3 },
  { label: 'Contacts', type: 'contact', count: 4 },
  { label: 'Documents', type: 'document', count: 2 },
  { label: 'Deals', type: 'deal', count: 2 },
  { label: 'Emails', type: 'email', count: 1 },
];

const RESULTS: SearchResult[] = [
  // Transactions
  { id: 't1', type: 'transaction', title: '742 Evergreen Terrace — Johnson Purchase', subtitle: 'Purchase | Closing: Mar 15, 2026', meta: 'Under Contract', badge: 'Transaction' },
  { id: 't2', type: 'transaction', title: '1520 NW Harbor — Johnson Listing', subtitle: 'Listing | Listed: Jan 20, 2026', meta: 'Active', badge: 'Transaction' },
  { id: 't3', type: 'transaction', title: '890 Oak Blvd #12 — Johnson Dual Agency', subtitle: 'Dual Agency | Closing: Apr 1, 2026', meta: 'Pending Review', badge: 'Transaction' },
  // Contacts
  { id: 'c1', type: 'contact', title: 'Martha Johnson', subtitle: 'martha.johnson@email.com | (503) 555-0142', meta: 'Seller', badge: 'Contact' },
  { id: 'c2', type: 'contact', title: 'Robert Johnson', subtitle: 'rob.johnson@email.com | (503) 555-0198', meta: 'Buyer', badge: 'Contact' },
  { id: 'c3', type: 'contact', title: 'Lisa Johnson-Park', subtitle: 'lisa.jp@coastalrealty.com | (503) 555-0267', meta: 'Agent', badge: 'Contact' },
  { id: 'c4', type: 'contact', title: 'Johnson Family Trust', subtitle: 'trust@johnsonfamily.org | (503) 555-0311', meta: 'Entity', badge: 'Contact' },
  // Documents
  { id: 'd1', type: 'document', title: 'Johnson_Purchase_Agreement_v2.pdf', subtitle: '742 Evergreen Terrace | Uploaded Feb 10, 2026', meta: '2.4 MB', badge: 'Document' },
  { id: 'd2', type: 'document', title: 'Johnson_Property_Disclosure.pdf', subtitle: '742 Evergreen Terrace | Uploaded Feb 8, 2026', meta: '1.1 MB', badge: 'Document' },
  // Deals
  { id: 'dl1', type: 'deal', title: 'Johnson Residence Purchase', subtitle: 'Stage: Due Diligence | $485,000', meta: 'Active', badge: 'Deal' },
  { id: 'dl2', type: 'deal', title: 'Johnson Harbor Listing', subtitle: 'Stage: Marketing | $725,000', meta: 'Active', badge: 'Deal' },
  // Emails
  { id: 'e1', type: 'email', title: 'Re: Inspection results for Johnson property', subtitle: 'From: Martha Johnson | Feb 13, 2026', meta: 'Inbox', badge: 'Email' },
];

// ---------------------------------------------------------------------------
// Highlight helper
// ---------------------------------------------------------------------------
function highlightTerm(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const regex = new RegExp(`(${term})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SearchPage() {
  const [query, setQuery] = useState('Johnson');
  const [activeTab, setActiveTab] = useState<ResultType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredResults = activeTab === 'all'
    ? RESULTS
    : RESULTS.filter((r) => r.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
          <Search className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">Search Results</h1>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions, contacts, documents..."
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm shadow-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)]"
        />
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-600">
        Found <strong className="text-gray-900">{filteredResults.length}</strong> results for &lsquo;<strong className="text-[var(--color-primary,#1B3A5C)]">{query}</strong>&rsquo;
      </p>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => { setActiveTab(tab.type); setCurrentPage(1); }}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.type
                ? 'border-[var(--color-secondary,#2A9D8F)] text-[var(--color-secondary,#2A9D8F)]'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              activeTab === tab.type ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500',
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="space-y-2">
        {filteredResults.map((result) => {
          const config = TYPE_CONFIG[result.type];
          const Icon = config.icon;
          return (
            <div
              key={result.id}
              className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-[var(--color-secondary,#2A9D8F)] hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {highlightTerm(result.title, query)}
                    </h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.badgeColor)}>
                      {config.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{highlightTerm(result.subtitle, query)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {result.meta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-3 shadow-sm">
        <p className="text-sm text-gray-500">
          Showing <strong>1-{filteredResults.length}</strong> of <strong>{filteredResults.length}</strong> results
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)] text-xs font-medium text-white">
            1
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            2
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
