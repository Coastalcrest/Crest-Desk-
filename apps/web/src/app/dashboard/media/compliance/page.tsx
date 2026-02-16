'use client';

import { useState, useEffect } from 'react';
import {
  Shield, CheckCircle, AlertTriangle, XCircle, Clock,
  ChevronDown, ChevronUp, Image, Film, User,
  Check, X, MessageSquare, FileText, Eye,
} from 'lucide-react';

type ComplianceStatus = "pending" | "passed" | "failed";

interface ComplianceIssue { rule: string; jurisdiction: string; suggestion: string; }
interface ReviewItem { id: string; title: string; agent: string; type: string; submittedDate: string; status: ComplianceStatus; issues: ComplianceIssue[]; }

const statusConfig = {
  pending: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock, label: "Pending Review" },
  passed: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Passed" },
  failed: { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Issues Found" },
};

const mockReviewItems: ReviewItem[] = [
  { id: "c1", title: "123 Oak St - Just Listed Graphic", agent: "Sarah Johnson", type: "image", submittedDate: "2026-02-14", status: "pending", issues: [] },
  { id: "c2", title: "Market Update February Video", agent: "Mike Chen", type: "video", submittedDate: "2026-02-14", status: "passed", issues: [] },
  { id: "c3", title: "456 Elm Ave - Social Post", agent: "Lisa Rodriguez", type: "image", submittedDate: "2026-02-13", status: "failed", issues: [{ rule: "Fair Housing Act - Section 3604", jurisdiction: "Federal", suggestion: "Remove reference to school districts. Use proximity to amenities instead." }, { rule: "FL Real Estate Commission Rule 61J2-10.025", jurisdiction: "Florida", suggestion: "Brokerage name must appear in same size font as agent name." }] },
  { id: "c4", title: "Open House Promo Reel", agent: "David Kim", type: "video", submittedDate: "2026-02-13", status: "pending", issues: [] },
  { id: "c5", title: "789 Pine Rd - Virtual Tour", agent: "Sarah Johnson", type: "video", submittedDate: "2026-02-12", status: "failed", issues: [{ rule: "MLS Photo Policy 4.2", jurisdiction: "Local MLS", suggestion: "Watermark must include brokerage logo, not just agent branding." }] },
  { id: "c6", title: "Agent Team Introduction", agent: "Mike Chen", type: "video", submittedDate: "2026-02-12", status: "passed", issues: [] },
];

export default function ComplianceReviewPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const filters = ["All", "Pending", "Passed", "Failed"];
  const filteredItems = mockReviewItems.filter((item) => activeFilter === "All" || item.status === activeFilter.toLowerCase());

  const toggleExpand = (id: string) => setExpandedItems((prev) => prev.includes(id) ? prev.filter((i) => i \!== id) : [...prev, id]);
  const toggleSelect = (id: string) => setSelectedItems((prev) => prev.includes(id) ? prev.filter((i) => i \!== id) : [...prev, id]);

  const pendingCount = mockReviewItems.filter((i) => i.status === "pending").length;
  const approvedCount = mockReviewItems.filter((i) => i.status === "passed").length;
  const issuesCount = mockReviewItems.filter((i) => i.status === "failed").length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg"><Shield className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Compliance Review Queue</h1><p className="text-sm text-gray-500">Managing Broker - Review and approve media content</p></div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-yellow-50 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div><span className="text-sm text-gray-500">Pending Review</span></div><p className="text-3xl font-bold text-gray-900">{pendingCount}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div><span className="text-sm text-gray-500">Approved Today</span></div><p className="text-3xl font-bold text-gray-900">{approvedCount}</p></div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><div className="flex items-center gap-3 mb-2"><div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div><span className="text-sm text-gray-500">Issues Found</span></div><p className="text-3xl font-bold text-gray-900">{issuesCount}</p></div>
      </div>

      {/* Filter Tabs and Batch Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {filters.map((f) => (<button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeFilter === f ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{f}</button>))}
        </div>
        {selectedItems.length > 0 && (<button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"><Check className="w-4 h-4" />Batch Approve ({selectedItems.length})</button>)}
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;
          const isExpanded = expandedItems.includes(item.id);
          const isSelected = selectedItems.includes(item.id);
          return (
            <div key={item.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isSelected ? "border-[var(--color-secondary)] ring-2 ring-[var(--color-secondary)]/20" : "border-gray-200"}`}>
              <div className="flex items-center gap-4 p-4">
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-gray-300 text-[var(--color-secondary)] focus:ring-[var(--color-secondary)]" />
                <div className="w-16 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">{item.type === "video" ? <Film className="w-5 h-5 text-gray-400" /> : <Image className="w-5 h-5 text-gray-400" />}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h4>
                  <div className="flex items-center gap-3 mt-1"><span className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />{item.agent}</span><span className="text-xs text-gray-400">{item.type}</span><span className="text-xs text-gray-400">{item.submittedDate}</span></div>
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}><StatusIcon className="w-3.5 h-3.5" />{config.label}</span>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><Check className="w-4 h-4" /></button>
                  <button className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Request Revisions"><MessageSquare className="w-4 h-4" /></button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><X className="w-4 h-4" /></button>
                </div>
                {item.issues.length > 0 && (<button onClick={() => toggleExpand(item.id)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>)}
              </div>
              {isExpanded && item.issues.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 bg-red-50/50">
                  <h5 className="text-xs font-semibold text-red-700 mb-2">Compliance Issues</h5>
                  <div className="space-y-2">
                    {item.issues.map((issue, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-red-100">
                        <div className="flex items-start gap-2"><FileText className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" /><div><p className="text-xs font-medium text-gray-800">{issue.rule}</p><p className="text-[10px] text-gray-400 mt-0.5">Jurisdiction: {issue.jurisdiction}</p><p className="text-xs text-gray-600 mt-1 bg-yellow-50 px-2 py-1 rounded">{issue.suggestion}</p></div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
