"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPaginated, PaginatedResponse } from "@/lib/api";
import {
  CheckCircle2, XCircle, Edit3, Clock, AlertTriangle, Filter,
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter, Building2,
  Eye, Image as ImageIcon, Video, User, Shield, ChevronDown, X,
  ThumbsUp, ThumbsDown, Check,
} from "lucide-react";

const platformColors: Record<string, string> = {
  facebook: "#1877F2", instagram: "#E4405F", linkedin: "#0A66C2",
  youtube: "#FF0000", tiktok: "#000000", x: "#1DA1F2", google: "#4285F4",
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, React.ReactNode> = {
    facebook: <Facebook className="w-4 h-4" />, instagram: <Instagram className="w-4 h-4" />,
    linkedin: <Linkedin className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />,
    tiktok: <Music2 className="w-4 h-4" />, x: <Twitter className="w-4 h-4" />,
    google: <Building2 className="w-4 h-4" />,
  };
  return <>{icons[platform] || null}</>;
};

interface ApprovalPost {
  id: string;
  agentId: string;
  platform: string;
  postType: string;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledAt: string | null;
  status: string;
  complianceStatus: string | null;
  complianceIssues: unknown;
  createdAt: string;
}

function formatPostType(postType: string): string {
  return postType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapComplianceStatus(status: string | null): 'pass' | 'warning' | 'fail' {
  if (status === 'passed') return 'pass';
  if (status === 'failed') return 'fail';
  return 'warning';
}

function extractComplianceNotes(status: string | null, issues: unknown): string {
  if (Array.isArray(issues) && issues.length > 0) {
    return issues.map((i) => (typeof i === 'string' ? i : String(i))).join('; ');
  }
  if (status === 'passed') return 'All checks passed';
  return 'Review required';
}

function formatScheduledTime(scheduledAt: string | null): string {
  if (!scheduledAt) return 'Not scheduled';
  const date = new Date(scheduledAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Tomorrow, ${timeStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function ApprovalQueuePage() {
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterPostType, setFilterPostType] = useState("all");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const { data: postsData, isLoading } = useQuery<PaginatedResponse<ApprovalPost>>({
    queryKey: ['social-posts', 'pending-approval'],
    queryFn: () => apiPaginated<ApprovalPost>('/social-posts?status=pending_approval&pageSize=50'),
  });
  const posts = postsData?.data ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/social-posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'scheduled' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/social-posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      setShowRejectModal(false);
      setRejectPostId(null);
      setRejectReason('');
    },
  });

  const handleApprove = (id: string) => approveMutation.mutate(id);

  const handleReject = (id: string) => {
    setRejectPostId(id);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectPostId) {
      rejectMutation.mutate({ id: rejectPostId, reason: rejectReason });
    }
  };

  const handleBatchApprove = () => {
    selectedPosts.forEach((id) => approveMutation.mutate(id));
    setSelectedPosts([]);
  };

  const filteredPosts = posts.filter((p) => {
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterPostType !== "all" && p.postType !== filterPostType) return false;
    return true;
  });

  const togglePostSelection = (id: string) => {
    setSelectedPosts((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map((p) => p.id));
    }
  };

  const stats = {
    pendingApproval: posts.length,
    approvedToday: 0,
    rejected: 0,
  };

  const complianceBadge = (status: string, notes: string) => {
    switch (status) {
      case "pass":
        return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200" title={notes}><Shield className="w-3 h-3" /> Compliant</span>);
      case "warning":
        return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title={notes}><AlertTriangle className="w-3 h-3" /> Review</span>);
      case "fail":
        return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200" title={notes}><XCircle className="w-3 h-3" /> Issue</span>);
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--color-primary, #1B3A5C)" }} />
            <span className="ml-3 text-gray-500">Loading approval queue...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Approval Queue</h1>
            <p className="text-gray-500 mt-1">Review and approve agent social media posts before publishing</p>
          </div>
          {selectedPosts.length > 0 && (
            <button onClick={handleBatchApprove}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
              <Check className="w-4 h-4" /> Approve Selected ({selectedPosts.length})
            </button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Pending Approval</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50"><Clock className="w-5 h-5 text-amber-600" /></div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.pendingApproval}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Approved Today</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(42,157,143,0.08)" }}><CheckCircle2 className="w-5 h-5" style={{ color: "var(--color-secondary, #2A9D8F)" }} /></div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.approvedToday}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Rejected</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50"><XCircle className="w-5 h-5 text-red-500" /></div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.rejected}</p>
          </div>
        </div>

        {/* Filters and Batch Select */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="x">X</option>
              <option value="google">Google Business</option>
            </select>
            <select value={filterPostType} onChange={(e) => setFilterPostType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">All Types</option>
              <option value="new_listing">New Listing</option>
              <option value="open_house">Open House</option>
              <option value="just_sold">Just Sold</option>
              <option value="market_update">Market Update</option>
              <option value="testimonial">Testimonial</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0} onChange={selectAll} className="rounded border-gray-300" />
            <span className="text-sm text-gray-600">Select All</span>
          </label>
        </div>

        {/* Post Review Cards */}
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const compStatus = mapComplianceStatus(post.complianceStatus);
            const compNotes = extractComplianceNotes(post.complianceStatus, post.complianceIssues);
            const agentAvatar = post.agentId.slice(0, 2).toUpperCase();
            const mediaCount = post.mediaUrls?.length ?? 0;
            const mediaTypes = post.mediaUrls?.map(() => 'image') ?? [];

            return (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start gap-4">
                  <input type="checkbox" checked={selectedPosts.includes(post.id)} onChange={() => togglePostSelection(post.id)} className="mt-1 rounded border-gray-300" />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: platformColors[post.platform] }}>
                    <PlatformIcon platform={post.platform} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: "var(--color-primary, #1B3A5C)" }}>{agentAvatar}</div>
                        <span className="text-sm font-semibold text-gray-800">Agent {post.agentId.slice(0, 8)}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{formatPostType(post.postType)}</span>
                      {complianceBadge(compStatus, compNotes)}
                    </div>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">{post.content}</p>

                    {compStatus !== "pass" && (
                      <div className={`p-2 rounded-lg mb-3 text-xs ${compStatus === "warning" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                        <strong>Compliance Note:</strong> {compNotes}
                      </div>
                    )}

                    {mediaCount > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        {mediaTypes.map((type, idx) => (
                          <div key={idx} className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            {type === "image" ? <ImageIcon className="w-4 h-4 text-gray-400" /> : <Video className="w-4 h-4 text-gray-400" />}
                          </div>
                        ))}
                        <span className="text-xs text-gray-500">{mediaCount} file{mediaCount > 1 ? "s" : ""}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled: {formatScheduledTime(post.scheduledAt)}</span>
                      <span>Submitted {formatRelativeTime(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => handleApprove(post.id)}
                      disabled={approveMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleReject(post.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
                      <Edit3 className="w-3.5 h-3.5" /> Edit & Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPosts.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--color-secondary, #2A9D8F)" }} />
              <h3 className="text-lg font-semibold text-gray-800 mb-1">All Caught Up!</h3>
              <p className="text-sm text-gray-500">No posts pending approval matching your filters.</p>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Reject Post</h2>
                <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Reason for Rejection</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
                  placeholder="Provide a reason so the agent can revise their post..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Quick reasons:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Compliance issue", "Inappropriate content", "Poor image quality", "Needs revision", "Missing disclaimer"].map((reason) => (
                      <button key={reason} onClick={() => setRejectReason(reason)}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">{reason}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={confirmReject} disabled={rejectMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                  Reject Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
