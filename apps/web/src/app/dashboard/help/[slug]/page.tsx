'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  FileText,
  HelpCircle,
  MessageSquare,
  TicketIcon,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const ARTICLES: Record<string, { title: string; category: string; updated: string; content: string[] }> = {
  'getting-started-with-crestdesk': {
    title: 'Getting Started with CrestDesk',
    category: 'Getting Started',
    updated: 'February 10, 2026',
    content: [
      'Welcome to CrestDesk, the all-in-one platform designed for real estate professionals. This guide will walk you through the essential steps to get up and running.',
      '## 1. Setting Up Your Profile',
      'After logging in for the first time, navigate to Settings > Account to configure your profile. Add your license number, brokerage details, and contact information. This data will auto-populate on forms and disclosures.',
      '## 2. Connecting Your Email',
      'CrestDesk includes a unified inbox that syncs with Gmail and Outlook. Go to Settings > Connections and follow the OAuth prompts to link your email account. Once connected, all transaction-related emails will be automatically categorized.',
      '## 3. Creating Your First Transaction',
      'To create a new transaction:',
      '1. Navigate to the Transactions page from the sidebar',
      '2. Click "New Transaction" in the top right',
      '3. Select the transaction type (Purchase, Listing, or Dual Agency)',
      '4. Enter the property address and key dates',
      '5. Add parties (buyers, sellers, agents, title company)',
      '6. Upload any existing documents',
      '## 4. Understanding the Dashboard',
      'Your dashboard provides an at-a-glance view of all active deals, upcoming deadlines, compliance alerts, and recent activity. Cards are customizable — drag and drop to rearrange them to suit your workflow.',
      '## 5. Getting Help',
      'If you ever get stuck, use the CrestAI Copilot (accessible from the sidebar) to ask questions about your deals, documents, or compliance requirements. You can also submit a support ticket from the Help Center.',
    ],
  },
};

const DEFAULT_ARTICLE = {
  title: 'Getting Started with CrestDesk',
  category: 'Getting Started',
  updated: 'February 10, 2026',
  content: ARTICLES['getting-started-with-crestdesk']!.content,
};

const RELATED_ARTICLES = [
  { slug: 'creating-your-first-transaction', title: 'Creating Your First Transaction' },
  { slug: 'uploading-and-organizing-documents', title: 'Uploading and Organizing Documents' },
  { slug: 'understanding-compliance-rules', title: 'Understanding Compliance Rules by State' },
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
export default function HelpArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const article = ARTICLES[slug] ?? DEFAULT_ARTICLE;

  const [helpfulYes, setHelpfulYes] = useState(24);
  const [helpfulNo, setHelpfulNo] = useState(3);
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null);

  const handleVote = (vote: 'yes' | 'no') => {
    if (voted) return;
    setVoted(vote);
    if (vote === 'yes') setHelpfulYes((v) => v + 1);
    else setHelpfulNo((v) => v + 1);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/dashboard/help" className="hover:text-[var(--color-secondary,#2A9D8F)] transition-colors">
          Help Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/dashboard/help" className="hover:text-[var(--color-secondary,#2A9D8F)] transition-colors">
          {article.category}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900 font-medium truncate max-w-xs">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Article Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">{article.title}</h1>

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CATEGORY_BADGE_COLORS[article.category] ?? 'bg-gray-100 text-gray-700')}>
                {article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="h-3 w-3" />
                Last updated {article.updated}
              </span>
            </div>

            <div className="mt-8 space-y-4 text-sm text-gray-700 leading-relaxed">
              {article.content.map((block, i) => {
                if (block.startsWith('## ')) {
                  return (
                    <h2 key={i} className="mt-6 text-lg font-semibold text-gray-900">
                      {block.replace('## ', '')}
                    </h2>
                  );
                }
                if (/^\d+\.\s/.test(block)) {
                  return (
                    <div key={i} className="ml-4 flex gap-2">
                      <span className="font-medium text-[var(--color-secondary,#2A9D8F)]">{block.split('.')[0]}.</span>
                      <span>{block.replace(/^\d+\.\s/, '')}</span>
                    </div>
                  );
                }
                return <p key={i}>{block}</p>;
              })}
            </div>

            {/* Helpful */}
            <div className="mt-10 rounded-lg border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-900">Was this article helpful?</p>
              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => handleVote('yes')}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    voted === 'yes'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes ({helpfulYes})
                </button>
                <button
                  onClick={() => handleVote('no')}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    voted === 'no'
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <ThumbsDown className="h-4 w-4" />
                  No ({helpfulNo})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Related Articles */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
              <h3 className="text-base font-semibold text-gray-900">Related Articles</h3>
            </div>
            <div className="space-y-2">
              {RELATED_ARTICLES.map((ra) => (
                <Link
                  key={ra.slug}
                  href={`/dashboard/help/${ra.slug}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[var(--color-secondary,#2A9D8F)] transition-colors"
                >
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="line-clamp-2">{ra.title}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Still Need Help */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
              <h3 className="text-base font-semibold text-gray-900">Still need help?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Our team and AI assistant are ready to help you resolve any issue.
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard/ai"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-secondary,#2A9D8F)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <MessageSquare className="h-4 w-4" />
                Ask CrestAssist
              </Link>
              <Link
                href="/dashboard/help/tickets"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <TicketIcon className="h-4 w-4" />
                Create Ticket
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
