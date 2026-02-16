'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Inbox, Send, FileText, Star, Archive, FolderOpen, Search,
  Plus, Paperclip, AlertTriangle, MoreHorizontal,
  Reply, Forward, Trash2, Tag, Circle,
  RefreshCw, Settings, AtSign,
} from 'lucide-react';
import { api, apiPaginated } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
//  Types matching the gateway DB schema
// ---------------------------------------------------------------------------

interface ApiAttachment {
  name: string;
  size: string;
  contentType?: string;
  url?: string;
}

interface ApiEmail {
  id: string;
  tenantId: string;
  messageId: string;
  threadId: string;
  fromAddress: string;
  fromName: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  snippet: string;
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  priority: string;
  labels: string[];
  hasAttachments: boolean;
  attachments: ApiAttachment[];
  receivedAt: string;
  sentAt: string;
  accountId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
//  Static sidebar data (accounts / folders kept client-side for now)
// ---------------------------------------------------------------------------

const connectedAccounts = [
  { id: 1, name: 'Work Email', email: 'agent@crestdesk.com', provider: 'Gmail', color: '#EA4335' },
  { id: 2, name: 'Personal', email: 'john.doe@gmail.com', provider: 'Gmail', color: '#4285F4' },
  { id: 3, name: 'Brokerage', email: 'john@premierhomes.com', provider: 'Outlook', color: '#0078D4' },
];

const folders = [
  { name: 'Inbox', icon: Inbox, apiValue: 'inbox' },
  { name: 'Sent', icon: Send, apiValue: 'sent' },
  { name: 'Drafts', icon: FileText, apiValue: 'drafts' },
  { name: 'Starred', icon: Star, apiValue: 'starred' },
  { name: 'Archived', icon: Archive, apiValue: 'archived' },
  { name: 'All Mail', icon: FolderOpen, apiValue: 'all' },
];

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

const avatarColors = ['bg-[#1B3A5C]', 'bg-[#2A9D8F]', 'bg-amber-600', 'bg-rose-600', 'bg-purple-600', 'bg-indigo-600'];
function getAvatarBg(s: string) { return avatarColors[s.charCodeAt(0) % avatarColors.length]; }

function initials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
//  Page component
// ---------------------------------------------------------------------------

export default function EmailInboxPage() {
  const queryClient = useQueryClient();

  // --- UI state ---
  const [selectedFolder, setSelectedFolder] = useState('Inbox');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // --- Build query params ---
  const folderMeta = folders.find((f) => f.name === selectedFolder);
  const buildQueryString = (): string => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (folderMeta && folderMeta.apiValue !== 'all') {
      if (folderMeta.apiValue === 'starred') {
        // starred is not a folder, query by isStarred
        params.set('isStarred', 'true');
      } else {
        params.set('folder', folderMeta.apiValue);
      }
    }
    if (filterRead === 'unread') params.set('isRead', 'false');
    if (filterRead === 'read') params.set('isRead', 'true');
    if (filterPriority !== 'all') params.set('priority', filterPriority);
    if (selectedAccount !== 'all') params.set('accountId', selectedAccount);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    return params.toString();
  };

  // --- Fetch emails ---
  const {
    data: emailsResponse,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['emails', selectedFolder, selectedAccount, filterRead, filterPriority, searchQuery, page],
    queryFn: () => apiPaginated<ApiEmail>(`/email-inbox?${buildQueryString()}`),
  });

  const emails = emailsResponse?.data ?? [];
  const pagination = emailsResponse?.pagination;

  // Find the selected email from the list (or keep null)
  const selectedEmail = emails.find((e) => e.id === selectedEmailId) ?? null;

  // Derived counts (from the current page of results)
  const unreadCount = emails.filter((e) => !e.isRead).length;
  const urgentCount = emails.filter((e) => e.priority === 'urgent').length;
  const starredCount = emails.filter((e) => e.isStarred).length;

  // --- Mutations ---
  const invalidateEmails = () => queryClient.invalidateQueries({ queryKey: ['emails'] });

  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/email-inbox/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) }),
    onSuccess: () => invalidateEmails(),
    onError: () => addToast({ type: 'error', title: 'Failed to mark email as read' }),
  });

  const toggleStarMutation = useMutation({
    mutationFn: ({ id, isStarred }: { id: string; isStarred: boolean }) =>
      api(`/email-inbox/${id}`, { method: 'PATCH', body: JSON.stringify({ isStarred: !isStarred }) }),
    onSuccess: () => {
      invalidateEmails();
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update star' }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/email-inbox/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Email archived' });
      if (selectedEmailId) setSelectedEmailId(null);
      invalidateEmails();
    },
    onError: () => addToast({ type: 'error', title: 'Failed to archive email' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/email-inbox/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Email deleted' });
      if (selectedEmailId) setSelectedEmailId(null);
      invalidateEmails();
    },
    onError: () => addToast({ type: 'error', title: 'Failed to delete email' }),
  });

  // --- Event handlers ---
  const handleSelectEmail = (email: ApiEmail) => {
    setSelectedEmailId(email.id);
    if (!email.isRead) {
      markReadMutation.mutate(email.id);
    }
  };

  const handleToggleStar = (email: ApiEmail, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleStarMutation.mutate({ id: email.id, isStarred: email.isStarred });
  };

  const handleRefresh = () => invalidateEmails();

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1B3A5C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading email hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-[#1B3A5C]" />
            <h1 className="text-xl font-bold text-[#1B3A5C]">Email Hub</h1>
            {isFetching && !isLoading && (
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-[#2A9D8F] text-white px-4 py-2 rounded-lg hover:bg-[#238b7e] transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Compose
            </button>
            <button onClick={handleRefresh} className="p-2 hover:bg-gray-100 rounded-lg">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><Settings className="w-4 h-4 text-gray-500" /></button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <Circle className="w-3 h-3 fill-blue-500 text-blue-500" /> {unreadCount} Unread
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
              <AlertTriangle className="w-3 h-3" /> {urgentCount} Urgent
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {starredCount} Starred
            </span>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search emails..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30 focus:border-[#2A9D8F]" />
          </div>
          <select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5">
            <option value="all">All Accounts</option>
            {connectedAccounts.map((a) => <option key={a.id} value={a.email}>{a.name}</option>)}
          </select>
          <select value={filterRead} onChange={(e) => { setFilterRead(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5">
            <option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option>
          </select>
          <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5">
            <option value="all">All Priority</option><option value="urgent">Urgent</option><option value="normal">Normal</option>
          </select>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Accounts</h3>
            <div className="space-y-1">
              <button onClick={() => { setSelectedAccount('all'); setPage(1); }}
                className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ' + (selectedAccount === 'all' ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                <AtSign className="w-4 h-4" />
                <span className="flex-1 text-left truncate">All Accounts</span>
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              </button>
              {connectedAccounts.map((acc) => (
                <button key={acc.id} onClick={() => { setSelectedAccount(acc.email); setPage(1); }}
                  className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ' + (selectedAccount === acc.email ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: acc.color }} />
                  <span className="flex-1 text-left truncate">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Folders</h3>
            <div className="space-y-1">
              {folders.map((folder) => {
                const Icon = folder.icon;
                return (
                  <button key={folder.name} onClick={() => { setSelectedFolder(folder.name); setPage(1); }}
                    className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ' + (selectedFolder === folder.name ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{folder.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-auto p-4 border-t border-gray-100">
            {pagination && (
              <p className="text-xs text-gray-400 mb-1">{pagination.total} email{pagination.total !== 1 ? 's' : ''} total</p>
            )}
            <button onClick={handleRefresh} className="text-[#2A9D8F] text-xs hover:underline mt-1 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Sync now
            </button>
          </div>
        </div>
        <div className="w-96 border-r border-gray-200 overflow-y-auto bg-white">
          <div className="divide-y divide-gray-100">
            {emails.map((email) => {
              const avatar = initials(email.fromName || email.fromAddress);
              return (
                <div key={email.id} onClick={() => handleSelectEmail(email)}
                  className={'px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ' + (selectedEmailId === email.id ? 'bg-blue-50/70 border-l-2 border-[#2A9D8F]' : 'border-l-2 border-transparent') + ' ' + (email.isRead ? 'bg-gray-50/30' : '')}>
                  <div className="flex items-start gap-3">
                    <div className={'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold mt-0.5 ' + getAvatarBg(avatar)}>
                      {avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={'text-sm truncate ' + (!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700')}>{email.fromName || email.fromAddress}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          {!email.isRead && <div className="w-2 h-2 rounded-full bg-[#2A9D8F]" />}
                          <span className="text-xs text-gray-400">{formatTime(email.receivedAt)}</span>
                        </div>
                      </div>
                      <p className={'text-sm truncate mb-0.5 ' + (!email.isRead ? 'font-medium text-gray-800' : 'text-gray-600')}>{email.subject}</p>
                      <p className="text-xs text-gray-400 truncate">{email.snippet}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {email.priority === 'urgent' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium"><AlertTriangle className="w-3 h-3" /> Urgent</span>}
                        {email.hasAttachments && <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><Paperclip className="w-3 h-3" /> {email.attachments?.length ?? ''}</span>}
                        <div className="flex-1" />
                        <button onClick={(e) => handleToggleStar(email, e)} className="p-0.5 hover:bg-gray-200 rounded">
                          <Star className={'w-3.5 h-3.5 ' + (email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {emails.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-400">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No emails match your filters</p>
              </div>
            )}
          </div>
          {/* Pagination controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-gray-200 rounded text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Prev
              </button>
              <span className="text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-gray-200 rounded text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedEmail ? (() => {
            const avatar = initials(selectedEmail.fromName || selectedEmail.fromAddress);
            return (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedEmail.priority === 'urgent' && <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium"><AlertTriangle className="w-3 h-3" /> Urgent</span>}
                      <h2 className="text-lg font-bold text-gray-900">{selectedEmail.subject}</h2>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-12">From:</span>
                        <div className={'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ' + getAvatarBg(avatar)}>{avatar}</div>
                        <span className="font-medium text-gray-700">{selectedEmail.fromName}</span>
                        <span className="text-gray-400">&lt;{selectedEmail.fromAddress}&gt;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-12">To:</span>
                        <span className="text-gray-600">{selectedEmail.toAddresses?.join(', ')}</span>
                      </div>
                      {selectedEmail.ccAddresses?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 w-12">CC:</span>
                          <span className="text-gray-600">{selectedEmail.ccAddresses.join(', ')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-12">Date:</span>
                        <span className="text-gray-600">{formatDate(selectedEmail.receivedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleStar(selectedEmail)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Star className={'w-5 h-5 ' + (selectedEmail.isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-400')} />
                    </button>
                    <button onClick={() => archiveMutation.mutate(selectedEmail.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Archive className="w-5 h-5 text-gray-400" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(selectedEmail.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Trash2 className="w-5 h-5 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreHorizontal className="w-5 h-5 text-gray-400" /></button>
                  </div>
                </div>
                <div className="mb-6 border-t border-gray-100 pt-6">
                  {selectedEmail.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-line text-gray-700 text-sm leading-relaxed">
                      {selectedEmail.bodyText}
                    </div>
                  )}
                </div>
                {selectedEmail.hasAttachments && selectedEmail.attachments?.length > 0 && (
                  <div className="border-t border-gray-100 pt-4 mb-6">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{att.name}</span>
                          {att.size && <span className="text-xs text-gray-400">({att.size})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1B3A5C] text-white rounded-lg hover:bg-[#15304d] text-sm font-medium">
                    <Reply className="w-4 h-4" /> Reply
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                    <Forward className="w-4 h-4" /> Forward
                  </button>
                  <div className="flex-1" />
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#2A9D8F]/10 text-[#2A9D8F] rounded-lg text-sm font-medium">
                    <Tag className="w-4 h-4" /> Link to Transaction
                  </button>
                </div>
              </div>
            );
          })() : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an email to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
