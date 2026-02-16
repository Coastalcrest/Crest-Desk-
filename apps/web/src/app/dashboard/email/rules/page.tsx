"use client";

import { useState } from "react";
import { Filter, Plus, Edit3, Trash2, ArrowLeft, ToggleLeft, ToggleRight, Zap, Inbox, Star, Tag, Archive } from "lucide-react";

interface EmailRule {
  id: string; name: string; description: string; conditions: string; actions: string; priority: number; isEnabled: boolean; matchCount: number; lastMatchedAt: string;
}

export default function EmailRulesPage() {
  const [rules, setRules] = useState<EmailRule[]>([
    { id: "1", name: "MLS Listing Alerts", description: "Auto-categorize MLS notifications", conditions: "From contains 'mls.com' or 'mlsmatrix'", actions: "Label: Market, Move to: MLS Alerts folder", priority: 1, isEnabled: true, matchCount: 234, lastMatchedAt: "2 hours ago" },
    { id: "2", name: "Title Company Emails", description: "Flag emails from title companies as high priority", conditions: "From contains 'titleco' or 'firstamerican' or 'chicagotitle'", actions: "Star, Label: Closing, Mark Important", priority: 2, isEnabled: true, matchCount: 89, lastMatchedAt: "Yesterday" },
    { id: "3", name: "Lead Inquiry Auto-Tag", description: "Tag new lead inquiries from website forms", conditions: "Subject contains 'New Inquiry' or 'Property Inquiry'", actions: "Label: Lead, Star, Notify immediately", priority: 3, isEnabled: true, matchCount: 156, lastMatchedAt: "5 hours ago" },
    { id: "4", name: "Newsletter Subscriptions", description: "Archive marketing newsletters automatically", conditions: "From contains 'newsletter' or 'marketing' or 'noreply'", actions: "Move to: Archive, Mark as Read", priority: 5, isEnabled: false, matchCount: 412, lastMatchedAt: "3 days ago" },
    { id: "5", name: "Compliance Notifications", description: "Flag compliance alerts for immediate attention", conditions: "Subject contains 'Compliance' or 'Regulatory' or 'License Renewal'", actions: "Label: Compliance, Star, Move to: Priority", priority: 1, isEnabled: true, matchCount: 23, lastMatchedAt: "1 week ago" },
    { id: "6", name: "Client Thank You Responses", description: "Auto-label client appreciation messages", conditions: "Subject contains 'thank' or 'testimonial' or 'review'", actions: "Label: Testimonial, Star", priority: 4, isEnabled: true, matchCount: 67, lastMatchedAt: "2 days ago" },
  ]);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
  };

  const actionIcon = (actions: string) => {
    if (actions.toLowerCase().includes("star")) return <Star className="w-3.5 h-3.5 text-amber-500" />;
    if (actions.toLowerCase().includes("archive")) return <Archive className="w-3.5 h-3.5 text-gray-500" />;
    if (actions.toLowerCase().includes("label")) return <Tag className="w-3.5 h-3.5 text-blue-500" />;
    return <Inbox className="w-3.5 h-3.5 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/dashboard/email" className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"><ArrowLeft className="w-5 h-5" /></a>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Email Rules</h1>
              <p className="text-gray-500 text-sm mt-0.5">{rules.filter((r) => r.isEnabled).length} of {rules.length} rules active</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}><Plus className="w-4 h-4" /> New Rule</button>
        </div>

        <div className="space-y-3">
          {rules.sort((a, b) => a.priority - b.priority).map((rule) => (
            <div key={rule.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-opacity ${!rule.isEnabled ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">{actionIcon(rule.actions)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{rule.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">Priority {rule.priority}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleRule(rule.id)} className="p-1" title={rule.isEnabled ? "Disable" : "Enable"}>
                    {rule.isEnabled ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                  </button>
                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Edit3 className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Conditions</p>
                  <p className="text-xs text-gray-600">{rule.conditions}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Actions</p>
                  <p className="text-xs text-gray-600">{rule.actions}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {rule.matchCount} matches</span>
                <span>Last matched: {rule.lastMatchedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
