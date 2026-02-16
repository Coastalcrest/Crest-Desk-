"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Eye, Users, TrendingUp, Target, Calendar, Filter,
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter, Building2,
  ArrowUpRight, ArrowDownRight, BarChart3, DollarSign,
  MousePointerClick, UserPlus, ChevronDown,
} from "lucide-react";

const platformColors: Record<string, string> = {
  facebook: "#1877F2", instagram: "#E4405F", linkedin: "#0A66C2",
  youtube: "#FF0000", tiktok: "#000000", x: "#1DA1F2", google: "#4285F4",
};

const platformNames: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
  youtube: "YouTube", tiktok: "TikTok", x: "X", google: "Google Biz",
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

interface EngagementSummary {
  totalImpressions: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalClicks: number;
  byPlatform: { platform: string; postCount: number; impressions: number; engagement: number }[];
  topPosts: { id: string; platform: string; postType: string; content: string; impressions: number; likes: number; comments: number; shares: number; publishedAt: string | null }[];
}

interface TrendMonth {
  month: string;
  postCount: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalClicks: number;
}

interface ROIData {
  totalLeadsFromSocial: number;
  dealsFromSocial: number;
  revenueFromSocial: string;
  costPerLead: string;
  roiPercentage: string;
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SocialAnalyticsPage() {
  const [dateRange, setDateRange] = useState("last_30");

  const { data: summary } = useQuery<EngagementSummary>({
    queryKey: ["social-analytics", "engagement-summary"],
    queryFn: () => api<EngagementSummary>("/social-analytics/engagement/summary"),
  });

  const { data: trends } = useQuery<TrendMonth[]>({
    queryKey: ["social-analytics", "trends"],
    queryFn: () => api<TrendMonth[]>("/social-analytics/engagement/trends"),
  });

  const { data: roi } = useQuery<ROIData>({
    queryKey: ["social-analytics", "roi"],
    queryFn: () => api<ROIData>("/social-analytics/roi"),
  });

  // Derived engagement rate
  const totalEng = (summary?.totalLikes ?? 0) + (summary?.totalComments ?? 0) + (summary?.totalShares ?? 0);
  const engRate = summary?.totalImpressions
    ? ((totalEng / summary.totalImpressions) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Social Analytics</h1>
            <p className="text-gray-500 mt-1">Track performance across all your social platforms</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none">
              <option value="last_7">Last 7 Days</option>
              <option value="last_30">Last 30 Days</option>
              <option value="last_90">Last 90 Days</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Impressions</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(27,58,92,0.08)" }}>
                <Eye className="w-5 h-5" style={{ color: "var(--color-primary, #1B3A5C)" }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{summary?.totalImpressions?.toLocaleString() ?? "0"}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+8.3% vs last period</span></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Reach</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(42,157,143,0.08)" }}>
                <Users className="w-5 h-5" style={{ color: "var(--color-secondary, #2A9D8F)" }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{summary?.totalReach?.toLocaleString() ?? "0"}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+6.1% vs last period</span></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Engagement Rate</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{engRate}%</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+0.2% vs last period</span></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Leads Generated</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{roi?.totalLeadsFromSocial ?? 0}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+10.5% vs last period</span></div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Platform Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {(summary?.byPlatform ?? []).map((p) => {
              const engPct = p.impressions ? ((p.engagement / p.impressions) * 100).toFixed(1) : "0";
              return (
                <div key={p.platform} className="rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: platformColors[p.platform] }}>
                      <PlatformIcon platform={p.platform} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{platformNames[p.platform] ?? p.platform}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{(p.impressions / 1000).toFixed(0)}K</p>
                  <p className="text-[10px] text-gray-500">impressions</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs font-medium" style={{ color: "var(--color-secondary, #2A9D8F)" }}>{engPct}%</span>
                    <span className="text-[10px] text-gray-400">eng.</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400">{p.postCount} posts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Posts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Top Performing Posts</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Platform</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Content</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Impressions</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Engagement</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.topPosts ?? []).map((post) => {
                  const postEng = post.impressions
                    ? (((post.likes + post.comments + post.shares) / post.impressions) * 100).toFixed(1)
                    : "0";
                  return (
                    <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: platformColors[post.platform] }}>
                          <PlatformIcon platform={post.platform} />
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm text-gray-800 truncate max-w-[300px]">{post.content}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(post.publishedAt)}</p>
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-medium text-gray-800">{post.impressions.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right text-sm font-medium" style={{ color: "var(--color-secondary, #2A9D8F)" }}>{postEng}%</td>
                      <td className="py-3 px-2 text-right text-sm font-medium text-gray-400">&mdash;</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Monthly Trend</h2>
          <div className="space-y-3">
            {(trends ?? []).map((m) => {
              const maxImpressions = Math.max(...(trends ?? []).map((d) => d.totalImpressions), 1);
              const barWidth = (m.totalImpressions / maxImpressions) * 100;
              const mEng = m.totalImpressions
                ? (((m.totalLikes + m.totalComments + m.totalShares) / m.totalImpressions) * 100).toFixed(1)
                : "0";
              return (
                <div key={m.month} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 font-medium w-20 flex-shrink-0">{formatMonth(m.month)}</span>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, backgroundColor: "var(--color-secondary, #2A9D8F)" }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-800 w-20 text-right">{(m.totalImpressions / 1000).toFixed(0)}K imp.</span>
                    <span className="text-sm font-medium w-16 text-right" style={{ color: "var(--color-secondary, #2A9D8F)" }}>{mEng}% eng.</span>
                    <span className="text-sm font-medium text-amber-600 w-14 text-right">{m.totalClicks.toLocaleString()} clicks</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform Engagement (replaces Lead Attribution) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Platform Engagement</h2>
            <div className="space-y-3">
              {(summary?.byPlatform ?? []).map((item) => {
                const engPct = item.impressions
                  ? ((item.engagement / item.impressions) * 100).toFixed(1)
                  : "0";
                return (
                  <div key={item.platform} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800">{platformNames[item.platform] ?? item.platform}</span>
                        <span className="text-xs text-gray-500">{item.postCount} posts</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs text-gray-600">{(item.impressions / 1000).toFixed(0)}K imp.</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-xs text-gray-600">{engPct}% eng.</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-gray-600">{item.engagement.toLocaleString()} interactions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROI Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>ROI Summary</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: "rgba(42,157,143,0.06)" }}>
                <p className="text-sm text-gray-500 mb-1">Revenue from Social</p>
                <p className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>
                  ${parseFloat(roi?.revenueFromSocial ?? "0").toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Cost per Lead</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>
                    ${parseFloat(roi?.costPerLead ?? "0").toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">ROI Percentage</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-secondary, #2A9D8F)" }}>
                    {parseFloat(roi?.roiPercentage ?? "0").toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Deals from Social</p>
                <p className="text-xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{roi?.dealsFromSocial ?? 0}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">{roi?.totalLeadsFromSocial ?? 0} leads total</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
