'use client';

import { useState } from 'react';
import {
  Plus, Edit2, Trash2, Filter, ArrowRight,
  Mail, Star, Tag, FolderOpen, Reply,
  AlertTriangle, CheckCircle2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Zap, Shield,
} from 'lucide-react';

interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

interface RuleAction {
  type: string;
  value: string;
}

interface EmailRule {
  id: number;
  name: string;
  description: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
  matchCount: number;
}

const mockRules: EmailRule[] = [
  {
    id: 1,
    name: 'Auto-Categorize MLS Alerts',
    description: 'Automatically move MLS listing alerts to the MLS Alerts folder and apply a label',
    conditions: [
      { field: 'From', operator: 'contains', value: '@mls.com' },
      { field: 'Subject', operator: 'contains', value: 'New Listing' },
    ],
    actions: [
      { type: 'Move to folder', value: 'MLS Alerts' },
      { type: 'Apply label', value: 'MLS' },
    ],
    priority: 1,
    enabled: true,
    matchCount: 234,
  },
  {
    id: 2,
    name: 'Flag Title Company Emails',
    description: 'Star and prioritize emails from title companies for quick access during closings',
    conditions: [
      { field: 'From', operator: 'contains', value: 'titleco.com' },
    ],
    actions: [
      { type: 'Star message', value: '' },
      { type: 'Apply label', value: 'Title/Escrow' },
      { type: 'Mark as important', value: '' },
    ],
    priority: 2,
    enabled: true,
    matchCount: 89,
  },
  {
    id: 3,
    name: 'Client Inquiry Auto-Reply',
    description: 'Send an automatic acknowledgment when new client inquiries come in after hours',
    conditions: [
      { field: 'Subject', operator: 'contains', value: 'Property Inquiry' },
      { field: 'To', operator: 'equals', value: 'agent@crestdesk.com' },
    ],
    actions: [
      { type: 'Auto-reply', value: 'Thank you for your inquiry. I will get back to you within 24 hours.' },
      { type: 'Apply label', value: 'New Lead' },
    ],
    priority: 3,
    enabled: true,
    matchCount: 156,
  },
  {
    id: 4,
    name: 'Archive Newsletter Emails',
    description: 'Auto-archive newsletters and market reports to keep inbox clean',
    conditions: [
      { field: 'From', operator: 'contains', value: 'newsletter@' },
      { field: 'Subject', operator: 'contains', value: 'Market Report' },
    ],
    actions: [
      { type: 'Move to folder', value: 'Newsletters' },
      { type: 'Mark as read', value: '' },
    ],
    priority: 4,
    enabled: false,
    matchCount: 45,
  },
  {
    id: 5,
    name: 'Inspection Report Priority',
    description: 'Prioritize and flag inspection reports for immediate review',
    conditions: [
      { field: 'From', operator: 'contains', value: '@inspection' },
      { field: 'Subject', operator: 'contains', value: 'Inspection Report' },
    ],
    actions: [
      { type: 'Star message', value: '' },
      { type: 'Apply label', value: 'Inspection' },
      { type: 'Move to folder', value: 'Transaction Docs' },
    ],
    priority: 2,
    enabled: true,
    matchCount: 27,
  },
  {
    id: 6,
    name: 'Lender Communications',
    description: 'Label and organize all communications from mortgage lenders',
    conditions: [
      { field: 'From', operator: 'contains', value: 'lender' },
      { field: 'From', operator: 'contains', value: 'mortgage' },
    ],
    actions: [
      { type: 'Apply label', value: 'Financing' },
      { type: 'Move to folder', value: 'Lender' },
    ],
    priority: 3,
    enabled: true,
    matchCount: 63,
  },
];

const actionIcons: Record<string, typeof Mail> = {
  'Move to folder': FolderOpen,
  'Apply label': Tag,
  'Star message': Star,
  'Auto-reply': Reply,
  'Mark as read': CheckCircle2,
  'Mark as important': AlertTriangle,
};

export default function EmailRulesPage() {
  const [rules, setRules] = useState(mockRules);
  const [expandedRule, setExpandedRule] = useState(1 as number | null);

  const toggleEnabled = (id: number) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Email Rules</h1>
            <p className="text-sm text-gray-500 mt-1">{rules.length} rules configured</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-secondary, #2A9D8F)' }}>
            <Plus className="w-4 h-4" /> New Rule
          </button>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${rule.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
              {/* Rule Header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => toggleEnabled(rule.id)} className="shrink-0" title={rule.enabled ? "Disable rule" : "Enable rule"}>
                  {rule.enabled ? <ToggleRight className="w-8 h-8 text-[#2A9D8F]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                </button>
                <button onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{rule.name}</h3>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">Priority {rule.priority}</span>
                    <span className="shrink-0 flex items-center gap-1 text-[10px] text-gray-400"><Zap className="w-3 h-3" />{rule.matchCount} matches</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{rule.description}</p>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  {expandedRule === rule.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRule === rule.id && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Conditions */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Filter className="w-3 h-3" /> Conditions</h4>
                      <div className="space-y-1.5">
                        {rule.conditions.map((cond, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{cond.field}</span>
                            <span className="text-gray-400">{cond.operator}</span>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">{cond.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Actions */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Actions</h4>
                      <div className="space-y-1.5">
                        {rule.actions.map((action, i) => {
                          const ActionIcon = actionIcons[action.type] || Shield;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <ActionIcon className="w-3.5 h-3.5 text-[#2A9D8F]" />
                              <span className="text-gray-700">{action.type}</span>
                              {action.value && <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">{action.value}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
