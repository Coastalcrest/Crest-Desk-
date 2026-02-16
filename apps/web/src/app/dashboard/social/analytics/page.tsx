"use client";

import { useState } from "react";
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

const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, React.ReactNode> = {
    facebook: <Facebook className="w-4 h-4" />, instagram: <Instagram className="w-4 h-4" />,
    linkedin: <Linkedin className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />,
    tiktok: <Music2 className="w-4 h-4" />, x: <Twitter className="w-4 h-4" />,
    google: <Building2 className="w-4 h-4" />,
  };
  return <>{icons[platform] || null}</>;
};

interface PlatformMetrics {
  key: string;
  name: string;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  followers: number;
  change: number;
}

interface TopPost {
  id: string;
  platform: string;
  content: string;
  impressions: number;
  engagement: number;
  clicks: number;
  leads: number;
  date: string;
}

interface MonthlyData {
  month: string;
  impressions: number;
  engagement: number;
  leads: number;
}

export default function SocialAnalyticsPage() {
  const [dateRange, setDateRange] = useState("last_30");

  const [stats] = useState({
    totalImpressions: 485200,
    totalReach: 312800,
    engagementRate: 4.7,
    leadsGenerated: 42,
  });

  const [platformMetrics] = useState<PlatformMetrics[]>([
    { key: "facebook", name: "Facebook", impressions: 142000, reach: 89000, engagement: 5.2, clicks: 3200, followers: 12400, change: 8.3 },
    { key: "instagram", name: "Instagram", impressions: 128000, reach: 95000, engagement: 6.1, clicks: 2800, followers: 18200, change: 12.1 },
    { key: "linkedin", name: "LinkedIn", impressions: 67000, reach: 42000, engagement: 3.8, clicks: 1900, followers: 5600, change: 5.7 },
    { key: "youtube", name: "YouTube", impressions: 54000, reach: 38000, engagement: 4.2, clicks: 1200, followers: 3200, change: 15.4 },
    { key: "tiktok", name: "TikTok", impressions: 48000, reach: 31000, engagement: 7.8, clicks: 980, followers: 8900, change: 22.3 },
    { key: "x", name: "X", impressions: 32000, reach: 12000, engagement: 2.1, clicks: 890, followers: 4100, change: -1.2 },
    { key: "google", name: "Google Biz", impressions: 14200, reach: 5800, engagement: 1.4, clicks: 640, followers: 0, change: 3.1 },
  ]);

  const [topPosts] = useState<TopPost[]>([
    { id: "1", platform: "instagram", content: "Just listed! Stunning oceanfront property at 456 Coastal Drive...", impressions: 24500, engagement: 8.2, clicks: 890, leads: 6, date: "Feb 3" },
    { id: "2", platform: "facebook", content: "Open House Success! Over 40 families toured our newest listing...", impressions: 18700, engagement: 6.5, clicks: 720, leads: 4, date: "Feb 7" },
    { id: "3", platform: "tiktok", content: "POV: You walk into your dream home for the first time...", impressions: 15200, engagement: 9.1, clicks: 340, leads: 2, date: "Feb 10" },
    { id: "4", platform: "linkedin", content: "Q1 Market Analysis: Why our coastal market is outperforming...", impressions: 12800, engagement: 4.8, clicks: 560, leads: 5, date: "Feb 12" },
    { id: "5", platform: "facebook", content: "JUST SOLD - $50K over asking! Congratulations to our clients...", impressions: 11400, engagement: 7.3, clicks: 410, leads: 3, date: "Feb 14" },
  ]);

  const [monthlyData] = useState<MonthlyData[]>([
    { month: "Sep 2025", impressions: 312000, engagement: 3.9, leads: 24 },
    { month: "Oct 2025", impressions: 345000, engagement: 4.1, leads: 28 },
    { month: "Nov 2025", impressions: 389000, engagement: 4.3, leads: 31 },
    { month: "Dec 2025", impressions: 410000, engagement: 4.4, leads: 35 },
    { month: "Jan 2026", impressions: 448000, engagement: 4.5, leads: 38 },
    { month: "Feb 2026", impressions: 485200, engagement: 4.7, leads: 42 },
  ]);

  const [leadAttribution] = useState([
    { source: "Instagram", contacts: 18, deals: 4, revenue: 48000 },
    { source: "Facebook", contacts: 14, deals: 3, revenue: 36000 },
    { source: "LinkedIn", contacts: 6, deals: 2, revenue: 24000 },
    { source: "TikTok", contacts: 3, deals: 1, revenue: 12000 },
    { source: "X", contacts: 1, deals: 0, revenue: 0 },
  ]);

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
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.totalImpressions.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+8.3% vs last period</span></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Reach</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(42,157,143,0.08)" }}>
                <Users className="w-5 h-5" style={{ color: "var(--color-secondary, #2A9D8F)" }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.totalReach.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+6.1% vs last period</span></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Engagement Rate</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.engagementRate}%</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+0.2% vs last period</span></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Leads Generated</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
                <Target className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.leadsGenerated}</p>
            <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600 font-medium">+10.5% vs last period</span></div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Platform Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {platformMetrics.map((p) => (
              <div key={p.key} className="rounded-lg border border-gray-100 p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: platformColors[p.key] }}>
                    <PlatformIcon platform={p.key} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{p.name}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{(p.impressions / 1000).toFixed(0)}K</p>
                <p className="text-[10px] text-gray-500">impressions</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-medium" style={{ color: "var(--color-secondary, #2A9D8F)" }}>{p.engagement}%</span>
                  <span className="text-[10px] text-gray-400">eng.</span>
                </div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {p.change >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                  <span className={`text-[10px] font-medium ${p.change >= 0 ? "text-green-600" : "text-red-500"}`}>{p.change > 0 ? "+" : ""}{p.change}%</span>
                </div>
              </div>
            ))}
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
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Leads</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: platformColors[post.platform] }}>
                        <PlatformIcon platform={post.platform} />
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <p className="text-sm text-gray-800 truncate max-w-[300px]">{post.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{post.date}</p>
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-medium text-gray-800">{post.impressions.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-sm font-medium" style={{ color: "var(--color-secondary, #2A9D8F)" }}>{post.engagement}%</td>
                    <td className="py-3 px-2 text-right text-sm font-medium text-gray-800">{post.clicks.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">{post.leads}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Monthly Trend</h2>
          <div className="space-y-3">
            {monthlyData.map((m) => {
              const maxImpressions = Math.max(...monthlyData.map((d) => d.impressions));
              const barWidth = (m.impressions / maxImpressions) * 100;
              return (
                <div key={m.month} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 font-medium w-20 flex-shrink-0">{m.month}</span>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, backgroundColor: "var(--color-secondary, #2A9D8F)" }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-800 w-20 text-right">{(m.impressions / 1000).toFixed(0)}K imp.</span>
                    <span className="text-sm font-medium w-16 text-right" style={{ color: "var(--color-secondary, #2A9D8F)" }}>{m.engagement}% eng.</span>
                    <span className="text-sm font-medium text-amber-600 w-14 text-right">{m.leads} leads</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Attribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Lead Attribution</h2>
            <div className="space-y-3">
              {leadAttribution.map((item) => (
                <div key={item.source} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{item.source}</span>
                      <span className="text-xs text-gray-500">{item.contacts} contacts</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs text-gray-600">{item.contacts} contacts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs text-gray-600">{item.deals} deals</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-gray-600">${(item.revenue / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROI Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>ROI Summary</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: "rgba(42,157,143,0.06)" }}>
                <p className="text-sm text-gray-500 mb-1">Revenue from Social</p>
                <p className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>$120,000</p>
                <p className="text-xs text-green-600 font-medium mt-1">+18% from last period</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Cost per Lead</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>$28.50</p>
                  <p className="text-xs text-green-600 font-medium mt-1">-12% vs avg</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">ROI Percentage</p>
                  <p className="text-xl font-bold" style={{ color: "var(--color-secondary, #2A9D8F)" }}>342%</p>
                  <p className="text-xs text-green-600 font-medium mt-1">+24% from last period</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500 mb-1">Total Ad Spend</p>
                <p className="text-xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>$1,197</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">Facebook: $480</span>
                  <span className="text-xs text-gray-500">Instagram: $420</span>
                  <span className="text-xs text-gray-500">LinkedIn: $297</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
