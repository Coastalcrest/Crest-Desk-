'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  User,
  Tag,
  Send,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
interface TicketDetail {
  id: string;
  number: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdBy: string;
  createdAt: string;
  assignedTo: string;
  description: string;
}

interface Comment {
  id: string;
  author: string;
  role: 'user' | 'support';
  avatar: string;
  timestamp: string;
  content: string;
}

const TICKETS: Record<string, TicketDetail> = {
  'tkt-001': {
    id: 'tkt-001',
    number: 'TKT-1042',
    subject: 'Email sync stopped working after update',
    status: 'open',
    priority: 'high',
    category: 'Email',
    createdBy: 'Sarah Mitchell',
    createdAt: 'Feb 14, 2026 at 2:34 PM',
    assignedTo: 'David Chen',
    description: 'After the latest update to CrestDesk, my Gmail sync stopped working. I am no longer receiving emails in my unified inbox, and sent emails are not being tracked. I have tried disconnecting and reconnecting the integration through Settings > Connections, but the issue persists. This is blocking my ability to manage transaction communications for 3 active deals.',
  },
};

const DEFAULT_TICKET: TicketDetail = {
  id: 'tkt-001',
  number: 'TKT-1042',
  subject: 'Email sync stopped working after update',
  status: 'open',
  priority: 'high',
  category: 'Email',
  createdBy: 'Sarah Mitchell',
  createdAt: 'Feb 14, 2026 at 2:34 PM',
  assignedTo: 'David Chen',
  description: 'After the latest update to CrestDesk, my Gmail sync stopped working. I am no longer receiving emails in my unified inbox, and sent emails are not being tracked. I have tried disconnecting and reconnecting the integration through Settings > Connections, but the issue persists. This is blocking my ability to manage transaction communications for 3 active deals.',
};

const COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: 'Sarah Mitchell',
    role: 'user',
    avatar: 'SM',
    timestamp: 'Feb 14, 2026 at 2:34 PM',
    content: 'I noticed the email sync stopped working immediately after I updated to the latest version this morning. The Settings > Connections page shows my Gmail as "Connected" but no new emails are coming through. I have tried logging out and back in but no change.',
  },
  {
    id: 'c2',
    author: 'David Chen',
    role: 'support',
    avatar: 'DC',
    timestamp: 'Feb 14, 2026 at 3:12 PM',
    content: 'Thank you for reporting this, Sarah. We have identified a known issue with the latest update affecting Gmail OAuth tokens. Our engineering team is working on a fix. In the meantime, could you try the following:\n\n1. Go to Settings > Connections\n2. Click "Disconnect" next to Gmail\n3. Clear your browser cache\n4. Reconnect your Gmail account\n\nThis has resolved the issue for some users. Please let me know if this helps.',
  },
  {
    id: 'c3',
    author: 'Sarah Mitchell',
    role: 'user',
    avatar: 'SM',
    timestamp: 'Feb 14, 2026 at 4:05 PM',
    content: 'I followed the steps above, but the issue is still occurring. After reconnecting, Gmail shows as "Connected" again but emails are still not syncing. Is there an ETA on the engineering fix?',
  },
];

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params?.id as string;
  const ticket = TICKETS[ticketId] ?? DEFAULT_TICKET;

  const [commentText, setCommentText] = useState('');

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/help/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--color-secondary,#2A9D8F)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      {/* Ticket Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-400">{ticket.number}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[ticket.status])}>
                {STATUS_LABEL[ticket.status] ?? ticket.status}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', PRIORITY_BADGE[ticket.priority])}>
                {ticket.priority}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--color-primary,#1B3A5C)]">{ticket.subject}</h1>
          </div>
        </div>

        {/* Info Row */}
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <User className="h-4 w-4" />
            <span>Created by <strong className="text-gray-900">{ticket.createdBy}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{ticket.createdAt}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <User className="h-4 w-4" />
            <span>Assigned to <strong className="text-gray-900">{ticket.assignedTo}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Tag className="h-4 w-4" />
            <span>{ticket.category}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
      </div>

      {/* Conversation Thread */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-base font-semibold text-gray-900">Conversation</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{COMMENTS.length}</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {COMMENTS.map((comment) => (
            <div
              key={comment.id}
              className={cn('px-6 py-5', comment.role === 'support' && 'bg-blue-50/40')}
            >
              <div className="flex gap-4">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
                  comment.role === 'support' ? 'bg-[var(--color-secondary,#2A9D8F)]' : 'bg-[var(--color-primary,#1B3A5C)]',
                )}>
                  {comment.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      comment.role === 'support' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600',
                    )}>
                      {comment.role === 'support' ? 'Support' : 'You'}
                    </span>
                    <span className="text-xs text-gray-400">{comment.timestamp}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {comment.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">Add a comment</label>
          <div className="flex gap-3">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[var(--color-secondary,#2A9D8F)] focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary,#2A9D8F)] resize-none"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary,#2A9D8F)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              <Send className="h-4 w-4" />
              Submit Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
