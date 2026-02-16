"use client";

import { useState } from "react";
import { FileText, Plus, Search, Edit3, Trash2, Copy, Eye, Clock, Users, ArrowLeft } from "lucide-react";

interface EmailTemplate {
  id: string; name: string; subject: string; category: string; isShared: boolean; usageCount: number; lastUsedAt: string; preview: string;
}

export default function EmailTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [templates] = useState<EmailTemplate[]>([
    { id: "1", name: "New Listing Announcement", subject: "Just Listed: {{property_address}}", category: "Marketing", isShared: true, usageCount: 47, lastUsedAt: "2 days ago", preview: "Exciting news! A stunning new property has just been listed at {{property_address}}. This beautiful {{bedrooms}}-bedroom home offers..." },
    { id: "2", name: "Open House Invitation", subject: "You're Invited: Open House at {{property_address}}", category: "Marketing", isShared: true, usageCount: 32, lastUsedAt: "5 days ago", preview: "Join us this {{day}} from {{start_time}} to {{end_time}} for an open house at {{property_address}}..." },
    { id: "3", name: "Offer Received Notification", subject: "Offer Received on {{property_address}}", category: "Transaction", isShared: false, usageCount: 28, lastUsedAt: "1 week ago", preview: "Great news! We have received an offer on your property at {{property_address}}. Key details to review..." },
    { id: "4", name: "Closing Congratulations", subject: "Congratulations on Your New Home!", category: "Transaction", isShared: true, usageCount: 19, lastUsedAt: "3 days ago", preview: "Congratulations on the successful closing of {{property_address}}! It has been a wonderful journey..." },
    { id: "5", name: "Follow-Up After Showing", subject: "Thank You for Visiting {{property_address}}", category: "Follow-Up", isShared: false, usageCount: 53, lastUsedAt: "Yesterday", preview: "Thank you for taking the time to visit {{property_address}}. I hope you enjoyed the tour..." },
    { id: "6", name: "Market Update Monthly", subject: "{{month}} Real Estate Market Update - {{area}}", category: "Newsletter", isShared: true, usageCount: 12, lastUsedAt: "2 weeks ago", preview: "Here is your monthly real estate market update for {{area}}. Interesting trends this month..." },
    { id: "7", name: "Price Reduction Alert", subject: "Price Reduced: {{property_address}} Now {{new_price}}", category: "Marketing", isShared: false, usageCount: 15, lastUsedAt: "1 week ago", preview: "Great opportunity! The price for {{property_address}} has been reduced to {{new_price}}..." },
    { id: "8", name: "Referral Thank You", subject: "Thank You for Your Referral!", category: "Follow-Up", isShared: true, usageCount: 8, lastUsedAt: "3 weeks ago", preview: "I wanted to personally thank you for referring {{referral_name}} to me. Referrals are the highest compliment..." },
  ]);

  const categories = ["all", "Marketing", "Transaction", "Follow-Up", "Newsletter"];
  const categoryColor = (cat: string) => {
    const c: Record<string, string> = { Marketing: "bg-blue-100 text-blue-700", Transaction: "bg-green-100 text-green-700", "Follow-Up": "bg-purple-100 text-purple-700", Newsletter: "bg-amber-100 text-amber-700" };
    return c[cat] || "bg-gray-100 text-gray-600";
  };

  const filtered = templates.filter((t) => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (searchQuery) { const q = searchQuery.toLowerCase(); return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q); }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard/email" className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"><ArrowLeft className="w-5 h-5" /></a>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Email Templates</h1>
              <p className="text-gray-500 text-sm mt-0.5">{templates.length} templates available</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}><Plus className="w-4 h-4" /> New Template</button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search templates..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeCategory === cat ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><h3 className="text-sm font-semibold text-gray-900">{t.name}</h3></div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor(t.category)}`}>{t.category}</span>
                  {t.isShared && <Users className="w-3.5 h-3.5 text-gray-400" title="Shared" />}
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium mb-1">Subject: {t.subject}</p>
              <p className="text-xs text-gray-400 line-clamp-2 mb-3">{t.preview}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {t.usageCount} uses</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.lastUsedAt}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Eye className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Copy className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
