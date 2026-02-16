'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Search,
  BookOpen,
  FileText,
  FolderOpen,
  PenTool,
  Users,
  Shield,
  DollarSign,
  Mail,
  Eye,
  ArrowRight,
  MessageSquare,
  TicketIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { slug: 'getting-started', name: 'Getting Started', icon: BookOpen, count: 3, description: 'Learn the basics of CrestDesk', color: 'text-[var(--color-primary,#1B3A5C)]', bg: 'bg-blue-50' },
  { slug: 'transactions', name: 'Transactions', icon: FileText, count: 2, description: 'Creating and managing deals', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { slug: 'documents', name: 'Documents', icon: FolderOpen, count: 2, description: 'Upload, organize, and track', color: 'text-amber-600', bg: 'bg-amber-50' },
  { slug: 'e-signatures', name: 'E-Signatures', icon: PenTool, count: 1, description: 'Send and manage signatures', color: 'text-purple-600', bg: 'bg-purple-50' },
  { slug: 'contacts-crm', name: 'Contacts & CRM', icon: Users, count: 1, description: 'Manage your relationships', color: 'text-sky-600', bg: 'bg-sky-50' },
  { slug: 'compliance', name: 'Compliance', icon: Shield, count: 1, description: 'Federal and state rules', color: 'text-red-500', bg: 'bg-red-50' },
  { slug: 'finance', name: 'Finance', icon: DollarSign, count: 1, description: 'Commissions and expenses', color: 'text-green-600', bg: 'bg-green-50' },
  { slug: 'email', name: 'Email', icon: Mail, count: 1, description: 'Unified inbox and AI assistant', color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

const POPULAR_ARTICLES = [
  { slug: 'getting-started-with-crestdesk', title: 'Getting Started with CrestDesk', category: 'Getting Started', views: 1842 },
  { slug: 'creating-your-first-transaction', title: 'Creating Your First Transaction', category: 'Transactions', views: 1254 },
  { slug: 'uploading-and-organizing-documents', title: 'Uploading and Organizing Documents', category: 'Documents', views: 987 },
  { slug: 'setting-up-e-signature-workflows', title: 'Setting Up E-Signature Workflows', category: 'E-Signatures', views: 876 },
  { slug: 'understanding-compliance-rules', title: 'Understanding Compliance Rules by State', category: 'Compliance', views: 743 },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  'Getting Started': 'bg-blue-100 text-blue-700',
  'Transactions': 'bg-emerald-100 text-emerald-700',
  'Documents': 'bg-amber-100 text-amber-700',
  'E-Signatures': 'bg-purple-100 text-purple-700',
  'Compliance': 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">Help Center</h1>
            <p className="text-sm text-gray-500">Find answers and get support</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help articles..."
          className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)]"
        />
      </div>

      {/* Category Grid */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Browse by Category</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/dashboard/help/${cat.slug}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-[var(--color-secondary,#2A9D8F)] hover:shadow-md transition-all"
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', cat.bg)}>
                <cat.icon className={cn('h-5 w-5', cat.color)} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900 group-hover:text-[var(--color-secondary,#2A9D8F)]">{cat.name}</h3>
              <p className="mt-1 text-xs text-gray-500">{cat.description}</p>
              <p className="mt-2 text-xs text-gray-400">{cat.count} {cat.count === 1 ? 'article' : 'articles'}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Articles */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Popular Articles</h2>
        <div className="divide-y divide-gray-100">
          {POPULAR_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/dashboard/help/${article.slug}`}
              className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{article.title}</p>
                  <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium', CATEGORY_BADGE_COLORS[article.category] ?? 'bg-gray-100 text-gray-700')}>
                    {article.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Eye className="h-3.5 w-3.5" />
                {article.views.toLocaleString()}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Need More Help */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-[var(--color-primary,#1B3A5C)] to-[#264a6e] p-8 shadow-sm text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold">Need more help?</h2>
            <p className="mt-1 text-sm text-blue-100">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/help/tickets"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[var(--color-primary,#1B3A5C)] hover:bg-gray-100 transition-colors"
            >
              <TicketIcon className="h-4 w-4" />
              Create Support Ticket
            </Link>
            <button className="flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">
              <MessageSquare className="h-4 w-4" />
              Ask CrestAssist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
