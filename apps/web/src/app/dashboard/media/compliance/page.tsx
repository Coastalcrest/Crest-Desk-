'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, CheckCircle, AlertTriangle, XCircle, Clock,
  ChevronDown, ChevronUp, Image, Film, User,
  Check, X, MessageSquare, FileText,
} from 'lucide-react';
import { api, apiPaginated, PaginatedResponse } from '@/lib/api';

// ------------------------------------------------------------------ //
//  Types                                                               //
// ------------------------------------------------------------------ //

type ComplianceStatus = 'pending' | 'passed' | 'failed';

interface ComplianceIssue {
  rule: string;
  severity: string;
  description: string;
  passed: boolean;
}

interface ComplianceAsset {
  id: string;
  agentId: string;
  title: string;
  description: string | null;
  assetType: string;
  mediaType: string;
  status: string;
  complianceStatus: string;
  complianceIssues: ComplianceIssue[] | null;
  complianceCheckedAt: string | null;
  createdAt: string;
}

// ------------------------------------------------------------------ //
//  Helpers                                                             //
// ------------------------------------------------------------------ //

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending Review' },
  passed: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Passed' },
  failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Issues Found' },
};

function normalizeStatus(raw: string): ComplianceStatus {
  if (raw === 'passed') return 'passed';
  if (raw === 'failed') return 'failed';
  return 'pending';
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

// ------------------------------------------------------------------ //
//  Page Component                                                      //
// ------------------------------------------------------------------ //

export default function ComplianceReviewPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // ----- Fetch compliance queue ----- //
  const { data: queueData, isLoading } = useQuery<PaginatedResponse<ComplianceAsset>>({
    queryKey: ['media', 'compliance-queue'],
    queryFn: () => apiPaginated<ComplianceAsset>('/media/compliance-queue'),
  });
  const items = queueData?.data ?? [];

  // ----- Mutations ----- //
  const checkMutation = useMutation({
    mutationFn: (id: string) => api(`/media/${id}/compliance-check`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media', 'compliance-queue'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api(`/media/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'compliance-queue'] });
      setSelectedItems([]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/media/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'compliance-queue'] });
      setSelectedItems([]);
    },
  });

  // ----- Derived data ----- //
  const filters = ['All', 'Pending', 'Passed', 'Failed'];

  const filteredItems = items.filter(
    (item) => activeFilter === 'All' || normalizeStatus(item.complianceStatus) === activeFilter.toLowerCase(),
  );

  const pendingCount = items.filter((i) => normalizeStatus(i.complianceStatus) === 'pending').length;
  const approvedCount = items.filter((i) => normalizeStatus(i.complianceStatus) === 'passed').length;
  const issuesCount = items.filter((i) => normalizeStatus(i.complianceStatus) === 'failed').length;

  // ----- Local actions ----- //
  const toggleExpand = (id: string) =>
    setExpandedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const toggleSelect = (id: string) =>
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  const handleBatchApprove = () => {
    selectedItems.forEach((id) => approveMutation.mutate(id));
  };

  // ----- Render ----- //
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
          {filters.map((f) => (<button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeFilter === f ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{f}</button>))}
        </div>
        {selectedItems.length > 0 && (<button onClick={handleBatchApprove} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"><Check className="w-4 h-4" />Batch Approve ({selectedItems.length})</button>)}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No items in the compliance queue.</p>
        </div>
      )}

      {/* Review Cards */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const status = normalizeStatus(item.complianceStatus);
          const config = statusConfig[status];
          const StatusIcon = config.icon;
          const isExpanded = expandedItems.includes(item.id);
          const isSelected = selectedItems.includes(item.id);
          const failedIssues = item.complianceIssues?.filter((i) => !i.passed) ?? [];
          return (
            <div key={item.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isSelected ? 'border-[var(--color-secondary)] ring-2 ring-[var(--color-secondary)]/20' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4 p-4">
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded border-gray-300 text-[var(--color-secondary)] focus:ring-[var(--color-secondary)]" />
                <div className="w-16 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">{item.assetType === 'video' ? <Film className="w-5 h-5 text-gray-400" /> : <Image className="w-5 h-5 text-gray-400" />}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{item.title}</h4>
                  <div className="flex items-center gap-3 mt-1"><span className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />Agent</span><span className="text-xs text-gray-400">{item.assetType}</span><span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span></div>
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}><StatusIcon className="w-3.5 h-3.5" />{config.label}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => approveMutation.mutate(item.id)} disabled={approveMutation.isPending} className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50" title="Approve"><Check className="w-4 h-4" /></button>
                  <button onClick={() => checkMutation.mutate(item.id)} disabled={checkMutation.isPending} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg disabled:opacity-50" title="Run Compliance Check"><MessageSquare className="w-4 h-4" /></button>
                  <button onClick={() => rejectMutation.mutate({ id: item.id, reason: 'Content rejected' })} disabled={rejectMutation.isPending} className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50" title="Reject"><X className="w-4 h-4" /></button>
                </div>
                {failedIssues.length > 0 && (<button onClick={() => toggleExpand(item.id)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>)}
              </div>
              {isExpanded && failedIssues.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 bg-red-50/50">
                  <h5 className="text-xs font-semibold text-red-700 mb-2">Compliance Issues</h5>
                  <div className="space-y-2">
                    {failedIssues.map((issue, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-red-100">
                        <div className="flex items-start gap-2"><FileText className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" /><div><p className="text-xs font-medium text-gray-800">{issue.rule}</p><p className="text-[10px] text-gray-400 mt-0.5">Severity: {issue.severity}</p><p className="text-xs text-gray-600 mt-1 bg-yellow-50 px-2 py-1 rounded">{issue.description}</p></div></div>
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
