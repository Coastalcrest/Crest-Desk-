'use client';

import { useState } from 'react';
import {
  Search, Plus, Copy, Eye, Edit2, Trash2,
  FileText, Mail, Users, Megaphone, Tag,
  Clock, MoreHorizontal, Star, Share2,
} from 'lucide-react';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  category: 'Marketing' | 'Transaction' | 'Follow-Up' | 'Newsletter';
  body: string;
  isShared: boolean;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

const mockTemplates: EmailTemplate[] = [
  {
    id: 1,
    name: 'New Listing Announcement',
    subject: 'Just Listed: {{property_address}} - {{bedrooms}}BR/{{bathrooms}}BA in {{neighborhood}}',
    category: 'Marketing',
    body: 'Exciting new listing alert\! This beautiful {{bedrooms}}-bedroom, {{bathrooms}}-bathroom home at {{property_address}} is now on the market for {{price}}.',
    isShared: true,
    usageCount: 47,
    lastUsed: 'Feb 15, 2026',
    createdAt: 'Jan 3, 2026',
  },
  {
    id: 2,
    name: 'Open House Invitation',
    subject: 'You Are Invited: Open House at {{property_address}} - {{date}}',
    category: 'Marketing',
    body: 'Join us for an open house at {{property_address}} on {{date}} from {{start_time}} to {{end_time}}. Light refreshments will be served.',
    isShared: true,
    usageCount: 32,
    lastUsed: 'Feb 12, 2026',
    createdAt: 'Jan 10, 2026',
  },
  {
    id: 3,
    name: 'Offer Received Notification',
    subject: 'Offer Received on {{property_address}} - Action Required',
    category: 'Transaction',
    body: 'Great news\! We have received an offer on your property at {{property_address}}. The offer is for {{offer_amount}} with a {{closing_timeline}} closing timeline.',
    isShared: false,
    usageCount: 18,
    lastUsed: 'Feb 14, 2026',
    createdAt: 'Dec 15, 2025',
  },
  {
    id: 4,
    name: 'Closing Congratulations',
    subject: 'Congratulations on Your New Home at {{property_address}}\!',
    category: 'Transaction',
    body: 'Congratulations, {{client_name}}\! The closing on {{property_address}} is complete. Welcome to your new home\!',
    isShared: true,
    usageCount: 24,
    lastUsed: 'Feb 10, 2026',
    createdAt: 'Nov 20, 2025',
  },
  {
    id: 5,
    name: 'Post-Showing Follow Up',
    subject: 'Thank You for Visiting {{property_address}} - Next Steps',
    category: 'Follow-Up',
    body: 'Hi {{client_name}}, thank you for taking the time to visit {{property_address}} yesterday. I would love to hear your thoughts on the property.',
    isShared: false,
    usageCount: 56,
    lastUsed: 'Feb 16, 2026',
    createdAt: 'Oct 5, 2025',
  },
  {
    id: 6,
    name: 'Monthly Market Update',
    subject: '{{month}} Real Estate Market Update - {{market_area}}',
    category: 'Newsletter',
    body: 'Here is your {{month}} market update for {{market_area}}. Median home prices are {{price_trend}} compared to last month.',
    isShared: true,
    usageCount: 12,
    lastUsed: 'Feb 1, 2026',
    createdAt: 'Sep 15, 2025',
  },
  {
    id: 7,
    name: 'Buyer Pre-Approval Reminder',
    subject: 'Important: Get Pre-Approved Before Your Home Search',
    category: 'Follow-Up',
    body: 'Hi {{client_name}}, as we discussed, getting pre-approved for a mortgage is an important first step in your home buying journey.',
    isShared: false,
    usageCount: 29,
    lastUsed: 'Feb 8, 2026',
    createdAt: 'Nov 1, 2025',
  },
  {
    id: 8,
    name: 'Listing Anniversary Check-In',
    subject: 'Checking In: Your Home at {{property_address}}',
    category: 'Follow-Up',
    body: 'Hi {{client_name}}, it has been {{days_on_market}} days since we listed your property at {{property_address}}. Here is a summary of our activity.',
    isShared: true,
    usageCount: 15,
    lastUsed: 'Feb 5, 2026',
    createdAt: 'Dec 1, 2025',
  },
];

const categories = ['All', 'Marketing', 'Transaction', 'Follow-Up', 'Newsletter'] as const;

const categoryConfig: Record<string, { color: string; bg: string; icon: typeof Mail }> = {
  Marketing: { color: 'text-purple-700', bg: 'bg-purple-50', icon: Megaphone },
  Transaction: { color: 'text-blue-700', bg: 'bg-blue-50', icon: FileText },
  'Follow-Up': { color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  Newsletter: { color: 'text-emerald-700', bg: 'bg-emerald-50', icon: Mail },
};

export default function EmailTemplatesPage() {
  const [templates] = useState(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Email Templates</h1>
            <p className="text-sm text-gray-500 mt-1">{templates.length} templates available</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-secondary, #2A9D8F)' }}>
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20 focus:border-[#2A9D8F]" />
          </div>
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeCategory === cat ? "text-white" : "text-gray-600 hover:bg-gray-50"}`} style={activeCategory === cat ? { backgroundColor: "var(--color-primary, #1B3A5C)" } : undefined}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const config = categoryConfig[template.category];
            const CategoryIcon = config?.icon || Mail;
            return (
              <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config?.bg} ${config?.color}`}>
                      <CategoryIcon className="w-3 h-3" />{template.category}
                    </span>
                    {template.isShared && <Share2 className="w-3.5 h-3.5 text-gray-400" title="Shared template" />}
                  </div>
                  <button className="p-1 rounded hover:bg-gray-100 text-gray-400"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.subject}</p>
                <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{template.usageCount} uses</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{template.lastUsed}</span>
                </div>
                <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"><Eye className="w-3.5 h-3.5" /> Preview</button>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  <button className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-500 hover:bg-red-50 transition-colors ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
