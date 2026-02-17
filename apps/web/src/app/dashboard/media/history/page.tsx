'use client';

import { useState, useEffect } from 'react';
import {
  History, Image, Film, Download, RefreshCw, Trash2,
  Eye, CheckCircle, AlertTriangle, Clock, Filter,
  ArrowUpDown, TrendingUp, BarChart3, Share2, Calendar,
} from 'lucide-react';

type MediaStatus = "published" | "draft" | "archived";
type CompStatus = "passed" | "pending" | "failed";

interface HistoryItem {
  id: string; title: string; type: "image" | "video"; status: MediaStatus;
  compliance: CompStatus; date: string; platforms: string[];
}

const mockHistory: HistoryItem[] = [
  { id: "h1", title: "123 Oak St - Just Listed Graphic", type: "image", status: "published", compliance: "passed", date: "2026-02-14", platforms: ["Instagram", "Facebook", "MLS"] },
  { id: "h2", title: "Market Update February Video", type: "video", status: "published", compliance: "passed", date: "2026-02-14", platforms: ["YouTube", "Instagram"] },
  { id: "h3", title: "456 Elm Ave - Virtual Staging", type: "image", status: "draft", compliance: "pending", date: "2026-02-13", platforms: [] },
  { id: "h4", title: "Agent Intro - Sarah Johnson", type: "video", status: "published", compliance: "passed", date: "2026-02-13", platforms: ["Website", "YouTube"] },
  { id: "h5", title: "789 Pine Rd - Social Post", type: "image", status: "draft", compliance: "failed", date: "2026-02-12", platforms: [] },
  { id: "h6", title: "Open House Promo Reel", type: "video", status: "published", compliance: "passed", date: "2026-02-12", platforms: ["Instagram", "TikTok"] },
  { id: "h7", title: "Luxury Condo Listing", type: "image", status: "archived", compliance: "passed", date: "2026-02-11", platforms: ["MLS"] },
  { id: "h8", title: "Neighborhood Guide Video", type: "video", status: "published", compliance: "passed", date: "2026-02-11", platforms: ["YouTube", "Website"] },
  { id: "h9", title: "Under Contract Announcement", type: "image", status: "published", compliance: "passed", date: "2026-02-10", platforms: ["Instagram", "Facebook"] },
];

const statusColors: Record<MediaStatus, string> = { published: "bg-green-100 text-green-700", draft: "bg-yellow-100 text-yellow-700", archived: "bg-gray-100 text-gray-600" };
const compColors: Record<CompStatus, string> = { passed: "text-green-600", pending: "text-yellow-600", failed: "text-red-600" };

export default function MediaHistoryPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const totalGenerated = mockHistory.length;
  const totalPublished = mockHistory.filter((i) => i.status === "published").length;
  const passRate = Math.round((mockHistory.filter((i) => i.compliance === "passed").length / totalGenerated) * 100);

  const filtered = mockHistory.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => sortOrder === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const dateGroups: Record<string, HistoryItem[]> = {};
  sorted.forEach((item) => { if (!dateGroups[item.date]) dateGroups[item.date] = []; dateGroups[item.date].push(item); });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg"><History className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Generated Media History</h1><p className="text-sm text-gray-500">Track all your generated images and videos</p></div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-indigo-50 rounded-lg"><BarChart3 className="w-5 h-5 text-indigo-600" /></div><span className="text-sm text-gray-500">Total Generated</span></div><p className="text-3xl font-bold text-gray-900">{totalGenerated}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-green-50 rounded-lg"><Share2 className="w-5 h-5 text-green-600" /></div><span className="text-sm text-gray-500">Total Published</span></div><p className="text-3xl font-bold text-gray-900">{totalPublished}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-teal-50 rounded-lg"><CheckCircle className="w-5 h-5 text-teal-600" /></div><span className="text-sm text-gray-500">Compliance Pass Rate</span></div><p className="text-3xl font-bold text-gray-900">{passRate}%</p></div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"><option value="all">All Types</option><option value="image">Images</option><option value="video">Videos</option></select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"><option value="all">All Status</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
        <div className="flex-1" />
        <button onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><ArrowUpDown className="w-4 h-4" />{sortOrder === "newest" ? "Newest First" : "Oldest First"}</button>
      </div>

      {/* Timeline View */}
      <div className="space-y-8">
        {Object.entries(dateGroups).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-4 h-4 text-[var(--color-secondary)]" />
              <h3 className="text-sm font-semibold text-gray-700">{new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-3 ml-7">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">{item.type === "video" ? <Film className="w-5 h-5 text-gray-400" /> : <Image className="w-5 h-5 text-gray-400" />}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[item.status]}`}>{item.status}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-medium ${compColors[item.compliance]}`}>{item.compliance === "passed" ? <CheckCircle className="w-3 h-3" /> : item.compliance === "pending" ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}{item.compliance}</span>
                        <span className="text-[10px] text-gray-400 capitalize">{item.type}</span>
                      </div>
                      {item.platforms.length > 0 && (<div className="flex items-center gap-1 mt-1">{item.platforms.map((p) => (<span key={p} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">{p}</span>))}</div>)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-2 text-gray-400 hover:text-[var(--color-secondary)] hover:bg-gray-100 rounded-lg" title="View"><Eye className="w-4 h-4" /></button>
                      <button className="p-2 text-gray-400 hover:text-[var(--color-secondary)] hover:bg-gray-100 rounded-lg" title="Regenerate"><RefreshCw className="w-4 h-4" /></button>
                      <button className="p-2 text-gray-400 hover:text-[var(--color-secondary)] hover:bg-gray-100 rounded-lg" title="Download"><Download className="w-4 h-4" /></button>
                      <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
