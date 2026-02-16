'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, Eye, TrendingUp, Users, Plus, Wand2, LineChart,
  Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter,
  Building2, FileText, Loader2,
} from 'lucide-react';
import { api, apiPaginated } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ApiSocialPost {
  id: string;
  tenantId: string;
  authorUserId: string;
  platform: string;
  content: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'archived';
  complianceStatus: string | null;
  complianceNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  engagement: number;
  impressions: number;
  reach: number;
  clicks: number;
  platformPostId: string | null;
  createdAt: string;
}

interface SocialStats {
  postsThisMonth: number;
  totalImpressions: number;
  engagementRate: number;
  leadsFromSocial: number;
}

interface PlatformHealth {
  name: string;
  key: string;
  status: 'connected' | 'warning' | 'disconnected';
  lastSync: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const platformColors: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  youtube: '#FF0000',
  tiktok: '#000000',
  x: '#1DA1F2',
  google: '#4285F4',
};

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PlatformIcon = ({ platform, size = 'w-4 h-4' }: { platform: string; size?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    facebook: <Facebook className={size} />,
    instagram: <Instagram className={size} />,
    linkedin: <Linkedin className={size} />,
    youtube: <Youtube className={size} />,
    tiktok: <Music2 className={size} />,
    x: <Twitter className={size} />,
    google: <Building2 className={size} />,
  };
  return <>{icons[platform] || null}</>;
};

function formatScheduledTime(iso: string | null): string {
  if (!iso) return '--';
  const date = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

function truncateContent(content: string, maxLen = 80): string {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen).trimEnd() + '...';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SocialDashboardPage() {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [page, setPage] = useState(1);
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('pageSize', String(PAGE_SIZE));
  if (platformFilter) queryParams.set('platform', platformFilter);
  if (statusFilter) queryParams.set('status', statusFilter);

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['social-posts', page, platformFilter, statusFilter],
    queryFn: () => apiPaginated<ApiSocialPost>(`/social-posts?${queryParams.toString()}`),
  });

  // Fetch scheduled posts for the upcoming list (next posts regardless of page filters)
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ['social-posts-upcoming'],
    queryFn: () =>
      apiPaginated<ApiSocialPost>('/social-posts?status=scheduled&pageSize=5&page=1'),
  });

  // Fetch all posts for the current calendar month to populate the calendar view
  const calendarStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const calendarEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

  const { data: calendarData } = useQuery({
    queryKey: ['social-posts-calendar', currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: () =>
      apiPaginated<ApiSocialPost>(
        `/social-posts?pageSize=200&scheduledAfter=${calendarStart.toISOString()}&scheduledBefore=${calendarEnd.toISOString()}`,
      ),
  });

  const { data: approvalData } = useQuery({
    queryKey: ['social-posts-approval'],
    queryFn: () => apiPaginated<ApiSocialPost>('/social-posts/approval-queue?page=1&pageSize=10'),
  });

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------
  const approveMutation = useMutation({
    mutationFn: (postId: string) =>
      api<ApiSocialPost>(`/social-posts/${postId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Post approved' });
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-posts-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['social-posts-approval'] });
      queryClient.invalidateQueries({ queryKey: ['social-posts-calendar'] });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to approve post' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      api(`/social-posts/${postId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Post rejected' });
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-posts-approval'] });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to reject post' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) =>
      api(`/social-posts/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Post deleted' });
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-posts-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['social-posts-calendar'] });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to delete post' });
    },
  });

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------
  const posts = postsData?.data ?? [];
  const pagination = postsData?.pagination;
  const upcomingPosts = upcomingData?.data ?? [];
  const calendarPosts = calendarData?.data ?? [];
  const pendingApprovalCount = approvalData?.pagination?.total ?? 0;

  // Compute stats from loaded data
  const stats: SocialStats = useMemo(() => {
    const allPosts = posts;
    const totalImpressions = allPosts.reduce((sum, p) => sum + (p.impressions ?? 0), 0);
    const totalEngagement = allPosts.reduce((sum, p) => sum + (p.engagement ?? 0), 0);
    const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;
    return {
      postsThisMonth: pagination?.total ?? allPosts.length,
      totalImpressions,
      engagementRate: Math.round(engagementRate * 10) / 10,
      leadsFromSocial: allPosts.reduce((sum, p) => sum + (p.clicks ?? 0), 0),
    };
  }, [posts, pagination]);

  // Calendar helpers
  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  while (calendarDays.length < 35) calendarDays.push(null);

  const getPostsForDay = (day: number) =>
    calendarPosts.filter((p) => {
      const date = p.scheduledAt ? new Date(p.scheduledAt) : null;
      return date !== null && date.getDate() === day;
    });

  const today = new Date();
  const isCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  // Platform health is static / tenant-config; keep as local state for now
  const [platformHealth] = useState<PlatformHealth[]>([
    { name: 'Facebook', key: 'facebook', status: 'connected', lastSync: '2 min ago' },
    { name: 'Instagram', key: 'instagram', status: 'connected', lastSync: '2 min ago' },
    { name: 'LinkedIn', key: 'linkedin', status: 'connected', lastSync: '5 min ago' },
    { name: 'YouTube', key: 'youtube', status: 'warning', lastSync: '2 hours ago' },
    { name: 'TikTok', key: 'tiktok', status: 'connected', lastSync: '10 min ago' },
    { name: 'X', key: 'x', status: 'connected', lastSync: '3 min ago' },
    { name: 'Google Business', key: 'google', status: 'disconnected', lastSync: 'Never' },
  ]);

  // -----------------------------------------------------------------------
  // Status badge helper
  // -----------------------------------------------------------------------
  const statusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" /> Scheduled
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Published
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
            <FileText className="w-3 h-3" /> Draft
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200">
            <FileText className="w-3 h-3" /> Archived
          </span>
        );
      default:
        return null;
    }
  };

  const healthDot = (status: string) => {
    const colors: Record<string, string> = { connected: 'bg-green-500', warning: 'bg-amber-500', disconnected: 'bg-red-400' };
    return <span className={`w-2.5 h-2.5 rounded-full inline-block ${colors[status]}`} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Social Marketing</h1>
            <p className="text-gray-500 mt-1">Manage your social media presence across all platforms</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              <Wand2 className="w-4 h-4" /> Generate Week
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              <LineChart className="w-4 h-4" /> View Analytics
            </button>
            {pendingApprovalCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                {pendingApprovalCount} Pending Approval
              </span>
            )}
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-secondary, #2A9D8F)' }}>
              <Plus className="w-4 h-4" /> Create Post
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Posts This Month</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(27,58,92,0.08)' }}>
                <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-primary, #1B3A5C)' }} />
              </div>
            </div>
            {postsLoading ? (
              <div className="h-9 w-16 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>{stats.postsThisMonth}</p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Impressions</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(42,157,143,0.08)' }}>
                <Eye className="w-5 h-5" style={{ color: 'var(--color-secondary, #2A9D8F)' }} />
              </div>
            </div>
            {postsLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>{stats.totalImpressions.toLocaleString()}</p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Engagement Rate</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            {postsLoading ? (
              <div className="h-9 w-16 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>{stats.engagementRate}%</p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Clicks</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            {postsLoading ? (
              <div className="h-9 w-12 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>{stats.leadsFromSocial}</p>
            )}
          </div>
        </div>

        {/* Content Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Content Calendar</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">{monthName}</span>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="bg-gray-50 px-2 py-2 text-center">
                <span className="text-xs font-semibold text-gray-500 uppercase">{d}</span>
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayPosts = day ? getPostsForDay(day) : [];
              const isToday = isCurrentMonth && day === today.getDate();
              return (
                <div key={idx} className={`bg-white min-h-[80px] p-2 ${day ? 'hover:bg-blue-50/30 cursor-pointer' : ''} transition-colors`} style={isToday ? { boxShadow: 'inset 0 0 0 2px var(--color-secondary, #2A9D8F)' } : {}}>
                  {day && (
                    <>
                      <span className={`text-xs font-medium ${isToday ? 'text-white px-1.5 py-0.5 rounded-full' : 'text-gray-600'}`} style={isToday ? { backgroundColor: 'var(--color-secondary, #2A9D8F)' } : {}}>{day}</span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {dayPosts.map((post, pIdx) => (
                          <span key={pIdx} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: platformColors[post.platform] }} title={`${post.platform} - ${post.status}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Platforms:</span>
            {Object.entries(platformColors).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-500 capitalize">{key === 'google' ? 'Google Biz' : key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Posts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Upcoming Posts</h2>
            <button className="text-sm font-medium hover:underline" style={{ color: 'var(--color-secondary, #2A9D8F)' }}>View All</button>
          </div>
          {upcomingLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading posts...</span>
            </div>
          ) : upcomingPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Clock className="w-8 h-8 mb-2" />
              <p className="text-sm">No upcoming scheduled posts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: platformColors[post.platform] }}>
                    <PlatformIcon platform={post.platform} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {post.content.split('\n')[0] || 'Untitled Post'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{truncateContent(post.content)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{formatScheduledTime(post.scheduledAt)}</span>
                  </div>
                  <div className="flex-shrink-0">{statusBadge(post.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Posts table with pagination */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>All Posts</h2>
            <div className="flex items-center gap-2">
              <select
                value={platformFilter}
                onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="">All Platforms</option>
                {Object.keys(platformColors).map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="failed">Failed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {postsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading posts...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="w-8 h-8 mb-2" />
              <p className="text-sm">No posts found</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {posts.map((post) => (
                  <div key={post.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: platformColors[post.platform] }}>
                      <PlatformIcon platform={post.platform} size="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{truncateContent(post.content, 60)}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {post.scheduledAt && <span>{formatScheduledTime(post.scheduledAt)}</span>}
                        {post.impressions > 0 && <span>{post.impressions.toLocaleString()} impressions</span>}
                        {post.engagement > 0 && <span>{post.engagement.toLocaleString()} engagements</span>}
                        {post.clicks > 0 && <span>{post.clicks.toLocaleString()} clicks</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">{statusBadge(post.status)}</div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Showing {(pagination.page - 1) * pagination.pageSize + 1}
                    {' '}-{' '}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                    {' '}of {pagination.total}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-xs text-gray-600 px-2">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Platform Health */}
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Platform Connections</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {platformHealth.map((p) => (
              <div key={p.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-white" style={{ backgroundColor: platformColors[p.key] }}>
                  <PlatformIcon platform={p.key} />
                </div>
                <p className="text-xs font-semibold text-gray-800 mb-1">{p.name}</p>
                <div className="flex items-center justify-center gap-1.5">
                  {healthDot(p.status)}
                  <span className={`text-[10px] font-medium ${p.status === 'connected' ? 'text-green-600' : p.status === 'warning' ? 'text-amber-600' : 'text-red-500'}`}>
                    {p.status === 'connected' ? 'Connected' : p.status === 'warning' ? 'Warning' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Sync: {p.lastSync}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
