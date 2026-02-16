"use client";

import { useState } from "react";
import {
  Plus, Filter, Calendar, Target, BarChart3, ChevronDown, ChevronRight,
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter, Building2,
  CheckCircle2, Clock, Pause, FileText, X, Sparkles, Users,
  TrendingUp, Eye, MousePointerClick,
} from "lucide-react";

const platformColors: Record<string, string> = {
  facebook: "#1877F2", instagram: "#E4405F", linkedin: "#0A66C2",
  youtube: "#FF0000", tiktok: "#000000", x: "#1DA1F2", google: "#4285F4",
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, React.ReactNode> = {
    facebook: <Facebook className="w-3.5 h-3.5" />, instagram: <Instagram className="w-3.5 h-3.5" />,
    linkedin: <Linkedin className="w-3.5 h-3.5" />, youtube: <Youtube className="w-3.5 h-3.5" />,
    tiktok: <Music2 className="w-3.5 h-3.5" />, x: <Twitter className="w-3.5 h-3.5" />,
    google: <Building2 className="w-3.5 h-3.5" />,
  };
  return <>{icons[platform] || null}</>;
};

interface Campaign {
  id: string;
  name: string;
  type: string;
  platforms: string[];
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "completed" | "paused";
  postCount: number;
  impressions: number;
  engagement: number;
  evergreen: boolean;
  posts: { title: string; platform: string; date: string; status: string }[];
}

export default function CampaignsPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: "", type: "listing_launch", platforms: ["facebook", "instagram"],
    startDate: "2026-02-17", endDate: "2026-03-17", evergreen: false, notes: "",
  });

  const [campaigns] = useState<Campaign[]>([
    {
      id: "1", name: "Spring Listings Launch", type: "Listing Launch",
      platforms: ["facebook", "instagram", "tiktok"], startDate: "Feb 1, 2026",
      endDate: "Mar 31, 2026", status: "active", postCount: 24, impressions: 89400,
      engagement: 5.2, evergreen: false,
      posts: [
        { title: "New Listing: 742 Evergreen Terrace", platform: "instagram", date: "Feb 3", status: "published" },
        { title: "Virtual Tour Teaser", platform: "tiktok", date: "Feb 5", status: "published" },
        { title: "Open House Announcement", platform: "facebook", date: "Feb 7", status: "published" },
        { title: "Price Reduction Alert", platform: "instagram", date: "Feb 14", status: "scheduled" },
        { title: "Neighborhood Spotlight", platform: "facebook", date: "Feb 17", status: "draft" },
      ],
    },
    {
      id: "2", name: "Agent Sarah - Personal Brand", type: "Brand Awareness",
      platforms: ["instagram", "linkedin", "x"], startDate: "Jan 15, 2026",
      endDate: "Ongoing", status: "active", postCount: 18, impressions: 45200,
      engagement: 4.8, evergreen: true,
      posts: [
        { title: "Monday Motivation", platform: "instagram", date: "Feb 10", status: "published" },
        { title: "Market Insights Thread", platform: "x", date: "Feb 12", status: "published" },
        { title: "Client Success Story", platform: "linkedin", date: "Feb 14", status: "scheduled" },
      ],
    },
    {
      id: "3", name: "Valentine Open House Weekend", type: "Event Promotion",
      platforms: ["facebook", "instagram"], startDate: "Feb 10, 2026",
      endDate: "Feb 16, 2026", status: "completed", postCount: 8, impressions: 32100,
      engagement: 6.1, evergreen: false,
      posts: [
        { title: "Save the Date", platform: "facebook", date: "Feb 10", status: "published" },
        { title: "Countdown: 3 Days", platform: "instagram", date: "Feb 11", status: "published" },
        { title: "Event Day Reminder", platform: "facebook", date: "Feb 14", status: "published" },
      ],
    },
    {
      id: "4", name: "Q1 Market Report Series", type: "Content Series",
      platforms: ["linkedin", "facebook", "youtube"], startDate: "Mar 1, 2026",
      endDate: "Mar 31, 2026", status: "draft", postCount: 0, impressions: 0,
      engagement: 0, evergreen: false,
      posts: [],
    },
    {
      id: "5", name: "Luxury Collection Showcase", type: "Listing Launch",
      platforms: ["instagram", "facebook", "youtube"], startDate: "Feb 1, 2026",
      endDate: "Feb 28, 2026", status: "paused", postCount: 6, impressions: 18700,
      engagement: 3.9, evergreen: false,
      posts: [
        { title: "Luxury Home Tour", platform: "youtube", date: "Feb 3", status: "published" },
        { title: "Interior Design Details", platform: "instagram", date: "Feb 5", status: "published" },
      ],
    },
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalPosts = campaigns.reduce((sum, c) => sum + c.postCount, 0);
  const scheduledThisWeek = 7;

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    return true;
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      active: { bg: "bg-green-50 border-green-200", text: "text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      draft: { bg: "bg-gray-50 border-gray-200", text: "text-gray-600", icon: <FileText className="w-3 h-3" /> },
      completed: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: <CheckCircle2 className="w-3 h-3" /> },
      paused: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: <Pause className="w-3 h-3" /> },
    };
    const s = styles[status] || styles.draft;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${s.text}`}>
        {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Campaign Manager</h1>
            <p className="text-gray-500 mt-1">Organize and track your social media campaigns</p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Active Campaigns</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(42,157,143,0.08)" }}>
                <Target className="w-5 h-5" style={{ color: "var(--color-secondary, #2A9D8F)" }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{activeCampaigns}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Posts</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(27,58,92,0.08)" }}>
                <BarChart3 className="w-5 h-5" style={{ color: "var(--color-primary, #1B3A5C)" }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{totalPosts}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Scheduled This Week</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{scheduledThisWeek}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700">
            <option value="all">All Types</option>
            <option value="Listing Launch">Listing Launch</option>
            <option value="Brand Awareness">Brand Awareness</option>
            <option value="Event Promotion">Event Promotion</option>
            <option value="Content Series">Content Series</option>
          </select>
        </div>

        {/* Campaign List */}
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {expandedCampaign === campaign.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">{campaign.name}</h3>
                        {statusBadge(campaign.status)}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{campaign.type}</span>
                        {campaign.evergreen && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"><Sparkles className="w-3 h-3 inline mr-0.5" />Evergreen</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {campaign.startDate} - {campaign.endDate}</span>
                        <span>{campaign.postCount} posts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                      {campaign.platforms.map((p) => (
                        <div key={p} className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ backgroundColor: platformColors[p] }}>
                          <PlatformIcon platform={p} />
                        </div>
                      ))}
                    </div>
                    {campaign.impressions > 0 && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Eye className="w-3.5 h-3.5" /> {(campaign.impressions / 1000).toFixed(1)}K
                        </div>
                        <div className="flex items-center gap-1" style={{ color: "var(--color-secondary, #2A9D8F)" }}>
                          <TrendingUp className="w-3.5 h-3.5" /> {campaign.engagement}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Posts Timeline */}
              {expandedCampaign === campaign.id && campaign.posts.length > 0 && (
                <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Campaign Posts</h4>
                  <div className="space-y-2">
                    {campaign.posts.map((post, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ backgroundColor: platformColors[post.platform] }}>
                          <PlatformIcon platform={post.platform} />
                        </div>
                        <span className="text-sm text-gray-800 flex-1">{post.title}</span>
                        <span className="text-xs text-gray-500">{post.date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${post.status === "published" ? "bg-green-50 text-green-700" : post.status === "scheduled" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                          {post.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Create Campaign</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Campaign Name</label>
                  <input type="text" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g., Spring Listing Campaign" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Campaign Type</label>
                  <select value={newCampaign.type} onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                    <option value="listing_launch">Listing Launch</option>
                    <option value="brand_awareness">Brand Awareness</option>
                    <option value="event_promotion">Event Promotion</option>
                    <option value="content_series">Content Series</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(platformColors).map(([key, color]) => {
                      const isSelected = newCampaign.platforms.includes(key);
                      return (
                        <button key={key} onClick={() => setNewCampaign({ ...newCampaign, platforms: isSelected ? newCampaign.platforms.filter((p) => p !== key) : [...newCampaign.platforms, key] })}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isSelected ? "text-white border-transparent" : "text-gray-600 border-gray-200"}`}
                          style={isSelected ? { backgroundColor: color } : {}}>
                          <PlatformIcon platform={key} /> {key.charAt(0).toUpperCase() + key.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
                    <input type="date" value={newCampaign.startDate} onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
                    <input type="date" value={newCampaign.endDate} onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={newCampaign.evergreen} onChange={(e) => setNewCampaign({ ...newCampaign, evergreen: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\x27\x27] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                  <span className="text-sm text-gray-700">Evergreen Campaign (no end date)</span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Content Strategy Notes</label>
                  <textarea rows={3} placeholder="Describe the campaign strategy, target audience, key messages..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
                  style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>Create Campaign</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
