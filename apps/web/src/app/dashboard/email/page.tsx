'use client';

import { useState, useEffect } from 'react';
import {
  Mail, Inbox, Send, FileText, Star, Archive, FolderOpen, Search,
  Plus, Paperclip, AlertTriangle, MoreHorizontal,
  Reply, Forward, Trash2, Tag, Circle,
  RefreshCw, Settings, AtSign
} from 'lucide-react';

const connectedAccounts = [
  { id: 1, name: 'Work Email', email: 'agent@crestdesk.com', provider: 'Gmail', unread: 3, color: '#EA4335' },
  { id: 2, name: 'Personal', email: 'john.doe@gmail.com', provider: 'Gmail', unread: 1, color: '#4285F4' },
  { id: 3, name: 'Brokerage', email: 'john@premierhomes.com', provider: 'Outlook', unread: 1, color: '#0078D4' },
];

const folders = [
  { name: 'Inbox', icon: Inbox, count: 12 },
  { name: 'Sent', icon: Send, count: 0 },
  { name: 'Drafts', icon: FileText, count: 3 },
  { name: 'Starred', icon: Star, count: 3 },
  { name: 'Archived', icon: Archive, count: 0 },
  { name: 'All Mail', icon: FolderOpen, count: 0 },
];

interface EmailAttachment { name: string; size: string; }
interface EmailItem {
  id: number; from: string; fromEmail: string; to: string; cc: string;
  subject: string; snippet: string; body: string; time: string; date: string;
  unread: boolean; starred: boolean; priority: string; account: string;
  avatar: string; attachments: EmailAttachment[];
}

const mockEmails: EmailItem[] = [
  { id: 1, from: 'Sarah Johnson', fromEmail: 'sarah.j@homebuyers.com', to: 'agent@crestdesk.com', cc: 'broker@premierhomes.com', subject: 'RE: 742 Evergreen Terrace - Offer Update', snippet: 'Hi John, I wanted to follow up on the counter-offer we discussed yesterday...', body: 'Hi John,
I wanted to follow up on the counter-offer. The buyers will increase to \85,000 with 30-day close.
Best regards,
Sarah Johnson', time: '10:32 AM', date: 'Feb 16, 2026', unread: true, starred: true, priority: 'urgent', account: 'agent@crestdesk.com', avatar: 'SJ', attachments: [{ name: 'Revised_Offer.pdf', size: '1.2 MB' }, { name: 'Pre-Approval.pdf', size: '340 KB' }] },
  { id: 2, from: 'Mike Chen', fromEmail: 'mike.chen@outlook.com', to: 'agent@crestdesk.com', cc: '', subject: 'Property Tour Request - Downtown Condos', snippet: 'Hello, I am interested in viewing the downtown condo listings...', body: 'Hello,
I am looking for a 2BR unit under \50,000 with parking.
Thank you, Mike Chen', time: '9:15 AM', date: 'Feb 16, 2026', unread: true, starred: false, priority: 'normal', account: 'agent@crestdesk.com', avatar: 'MC', attachments: [] },
  { id: 3, from: 'Lisa Rodriguez', fromEmail: 'lisa.r@titleco.com', to: 'agent@crestdesk.com', cc: 'escrow@titleco.com', subject: 'Closing Documents Ready - 1850 Oak Ave', snippet: 'The closing documents for 1850 Oak Avenue are ready for review...', body: 'Dear John,
Closing docs for 1850 Oak Ave are ready. Signatures needed by Feb 20th.
Regards, Lisa Rodriguez', time: 'Yesterday', date: 'Feb 15, 2026', unread: true, starred: false, priority: 'urgent', account: 'john@premierhomes.com', avatar: 'LR', attachments: [{ name: 'Settlement.pdf', size: '890 KB' }, { name: 'Deed.pdf', size: '1.5 MB' }, { name: 'Disclosures.pdf', size: '3.2 MB' }] },
  { id: 4, from: 'David Park', fromEmail: 'david.park@gmail.com', to: 'john.doe@gmail.com', cc: '', subject: 'Thanks for the showing yesterday\!', snippet: 'Hi John, my wife and I really loved the house on Maple Drive...', body: 'Hi John,
We loved Maple Drive and want to offer around \20,000.
David Park', time: 'Yesterday', date: 'Feb 15, 2026', unread: false, starred: true, priority: 'normal', account: 'john.doe@gmail.com', avatar: 'DP', attachments: [] },
  { id: 5, from: 'Premier Homes Newsletter', fromEmail: 'newsletter@premierhomes.com', to: 'john@premierhomes.com', cc: '', subject: 'Weekly Market Report - February 2026', snippet: 'Median home prices rose 3.2% in your area...', body: 'Weekly Market Report
Median prices rose 3.2%. New listings up 12%. Avg days on market: 28.', time: 'Feb 14', date: 'Feb 14, 2026', unread: false, starred: false, priority: 'normal', account: 'john@premierhomes.com', avatar: 'PH', attachments: [] },
  { id: 6, from: 'Amanda Torres', fromEmail: 'amanda.t@inspection.com', to: 'agent@crestdesk.com', cc: '', subject: 'Inspection Report - 2210 Birch Lane', snippet: 'Inspection report for 2210 Birch Lane attached...', body: 'Hi John,
Inspection items: 1. Roof damage 2. HVAC maintenance 3. Water heater aging.
Amanda Torres', time: 'Feb 14', date: 'Feb 14, 2026', unread: true, starred: false, priority: 'normal', account: 'agent@crestdesk.com', avatar: 'AT', attachments: [{ name: 'Inspection_Report.pdf', size: '4.8 MB' }] },
  { id: 7, from: 'Robert Kim', fromEmail: 'r.kim@lenderplus.com', to: 'agent@crestdesk.com', cc: 'sarah.j@homebuyers.com', subject: 'Pre-Approval Confirmation - Kim Family', snippet: 'Kim family pre-approved for mortgage up to \50,000...', body: 'Dear John,
Kim family pre-approved for \50,000 with 20%% down. Valid 90 days.
Robert Kim, LenderPlus', time: 'Feb 13', date: 'Feb 13, 2026', unread: false, starred: true, priority: 'normal', account: 'agent@crestdesk.com', avatar: 'RK', attachments: [{ name: 'PreApproval.pdf', size: '520 KB' }] },
  { id: 8, from: 'CrestDesk System', fromEmail: 'notifications@crestdesk.com', to: 'agent@crestdesk.com', cc: '', subject: 'Transaction Alert: Deadline Approaching', snippet: 'Inspection contingency deadline in 2 days...', body: 'Transaction Alert
Inspection contingency deadline for 742 Evergreen in 2 days.
Action: Review report, submit repairs, update status.', time: 'Feb 13', date: 'Feb 13, 2026', unread: true, starred: false, priority: 'urgent', account: 'agent@crestdesk.com', avatar: 'CD', attachments: [] },
];

const avatarColors = ['bg-[#1B3A5C]', 'bg-[#2A9D8F]', 'bg-amber-600', 'bg-rose-600', 'bg-purple-600', 'bg-indigo-600'];
function getAvatarBg(i: string) { return avatarColors[i.charCodeAt(0) % avatarColors.length]; }

export default function EmailInboxPage() {
  const [selectedFolder, setSelectedFolder] = useState('Inbox');
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState(mockEmails[0] as any);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [emails, setEmails] = useState(mockEmails);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const toggleStar = (id: number) => {
    setEmails(p => p.map(e => e.id === id ? { ...e, starred: \!e.starred } : e));
  };
  const markRead = (id: number) => setEmails(p => p.map(e => e.id === id ? { ...e, unread: false } : e));

  const unreadCount = emails.filter(e => e.unread).length;
  const urgentCount = emails.filter(e => e.priority === 'urgent').length;
  const starredCount = emails.filter(e => e.starred).length;

  const filteredEmails = emails.filter(e => {
    if (selectedAccount \!== 'all' && e.account \!== selectedAccount) return false;
    if (filterPriority \!== 'all' && e.priority \!== filterPriority) return false;
    if (filterRead === 'unread' && \!e.unread) return false;
    if (filterRead === 'read' && e.unread) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (\!e.subject.toLowerCase().includes(q) && \!e.from.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
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
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-[#2A9D8F] text-white px-4 py-2 rounded-lg hover:bg-[#238b7e] transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Compose
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
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
            <input type="text" placeholder="Search emails..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30 focus:border-[#2A9D8F]" />
          </div>
          <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5">
            <option value="all">All Accounts</option>
            {connectedAccounts.map(a => <option key={a.id} value={a.email}>{a.name}</option>)}
          </select>
          <select value={filterRead} onChange={e => setFilterRead(e.target.value)}
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5">
            <option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
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
              <button onClick={() => setSelectedAccount('all')}
                className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ' + (selectedAccount === 'all' ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                <AtSign className="w-4 h-4" />
                <span className="flex-1 text-left truncate">All Accounts</span>
                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              </button>
              {connectedAccounts.map(acc => (
                <button key={acc.id} onClick={() => setSelectedAccount(acc.email)}
                  className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ' + (selectedAccount === acc.email ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: acc.color }} />
                  <span className="flex-1 text-left truncate">{acc.name}</span>
                  {acc.unread > 0 && <span className="text-xs bg-[#2A9D8F] text-white px-1.5 py-0.5 rounded-full">{acc.unread}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Folders</h3>
            <div className="space-y-1">
              {folders.map(folder => {
                const Icon = folder.icon;
                return (
                  <button key={folder.name} onClick={() => setSelectedFolder(folder.name)}
                    className={'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ' + (selectedFolder === folder.name ? 'bg-[#1B3A5C]/10 text-[#1B3A5C] font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{folder.name}</span>
                    {folder.count > 0 && <span className="text-xs text-gray-400">{folder.count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-auto p-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Last synced: 2 min ago</p>
            <button className="text-[#2A9D8F] text-xs hover:underline mt-1 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Sync now
            </button>
          </div>
        </div>
        <div className="w-96 border-r border-gray-200 overflow-y-auto bg-white">
          <div className="divide-y divide-gray-100">
            {filteredEmails.map(email => (
              <div key={email.id} onClick={() => { setSelectedEmail(email); markRead(email.id); }}
                className={'px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ' + (selectedEmail?.id === email.id ? 'bg-blue-50/70 border-l-2 border-[#2A9D8F]' : 'border-l-2 border-transparent') + ' ' + (email.unread ? '' : 'bg-gray-50/30')}>
                <div className="flex items-start gap-3">
                  <div className={'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold mt-0.5 ' + getAvatarBg(email.avatar)}>
                    {email.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={'text-sm truncate ' + (email.unread ? 'font-semibold text-gray-900' : 'text-gray-700')}>{email.from}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {email.unread && <div className="w-2 h-2 rounded-full bg-[#2A9D8F]" />}
                        <span className="text-xs text-gray-400">{email.time}</span>
                      </div>
                    </div>
                    <p className={'text-sm truncate mb-0.5 ' + (email.unread ? 'font-medium text-gray-800' : 'text-gray-600')}>{email.subject}</p>
                    <p className="text-xs text-gray-400 truncate">{email.snippet}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {email.priority === 'urgent' && <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium"><AlertTriangle className="w-3 h-3" /> Urgent</span>}
                      {email.attachments.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><Paperclip className="w-3 h-3" /> {email.attachments.length}</span>}
                      <div className="flex-1" />
                      <button onClick={e => { e.stopPropagation(); toggleStar(email.id); }} className="p-0.5 hover:bg-gray-200 rounded">
                        <Star className={'w-3.5 h-3.5 ' + (email.starred ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredEmails.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-400">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No emails match your filters</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedEmail ? (
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
                      <div className={'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ' + getAvatarBg(selectedEmail.avatar)}>{selectedEmail.avatar}</div>
                      <span className="font-medium text-gray-700">{selectedEmail.from}</span>
                      <span className="text-gray-400">{selectedEmail.fromEmail}</span>
                    </div>
                    <div className="flex items-center gap-2"><span className="text-gray-400 w-12">To:</span><span className="text-gray-600">{selectedEmail.to}</span></div>
                    {selectedEmail.cc && <div className="flex items-center gap-2"><span className="text-gray-400 w-12">CC:</span><span className="text-gray-600">{selectedEmail.cc}</span></div>}
                    <div className="flex items-center gap-2"><span className="text-gray-400 w-12">Date:</span><span className="text-gray-600">{selectedEmail.date}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleStar(selectedEmail.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Star className={'w-5 h-5 ' + (selectedEmail.starred ? 'fill-amber-400 text-amber-400' : 'text-gray-400')} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg"><Archive className="w-5 h-5 text-gray-400" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 className="w-5 h-5 text-gray-400" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreHorizontal className="w-5 h-5 text-gray-400" /></button>
                </div>
              </div>
              <div className="mb-6 border-t border-gray-100 pt-6">
                <div className="whitespace-pre-line text-gray-700 text-sm leading-relaxed">{selectedEmail.body}</div>
              </div>
