"use client";

import { useState } from "react";
import {
  BarChart3, Eye, TrendingUp, Users, Plus, Wand2, LineChart,
  Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter,
  Building2, FileText,
} from "lucide-react";

const platformColors: Record<string, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  tiktok: "#000000",
  x: "#1DA1F2",
  google: "#4285F4",
};

const PlatformIcon = ({ platform, size = "w-4 h-4" }: { platform: string; size?: string }) => {
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

interface ScheduledPost {
  id: string;
  platform: string;
  title: string;
  preview: string;
  scheduledTime: string;
  status: "scheduled" | "draft" | "pending_approval";
  type: string;
}

interface CalendarPost {
  day: number;
  platform: string;
  type: string;
}

interface PlatformHealth {
  name: string;
  key: string;
  status: "connected" | "warning" | "disconnected";
  lastSync: string;
}

export default function SocialDashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 1, 1));

  const [stats] = useState({
    postsThisMonth: 34,
    totalImpressions: 128450,
    engagementRate: 4.7,
    leadsFromSocial: 18,
  });

  const [calendarPosts] = useState<CalendarPost[]>([
    { day: 2, platform: "facebook", type: "listing" },
    { day: 2, platform: "instagram", type: "listing" },
    { day: 5, platform: "linkedin", type: "market_update" },
    { day: 7, platform: "facebook", type: "open_house" },
    { day: 7, platform: "instagram", type: "open_house" },
    { day: 7, platform: "tiktok", type: "open_house" },
    { day: 10, platform: "instagram", type: "just_sold" },
    { day: 10, platform: "facebook", type: "just_sold" },
    { day: 12, platform: "x", type: "market_update" },
    { day: 14, platform: "youtube", type: "listing" },
    { day: 15, platform: "facebook", type: "testimonial" },
    { day: 15, platform: "instagram", type: "testimonial" },
    { day: 17, platform: "linkedin", type: "market_update" },
    { day: 19, platform: "google", type: "listing" },
    { day: 20, platform: "instagram", type: "listing" },
    { day: 20, platform: "facebook", type: "listing" },
    { day: 20, platform: "tiktok", type: "listing" },
    { day: 23, platform: "facebook", type: "open_house" },
    { day: 25, platform: "instagram", type: "under_contract" },
    { day: 25, platform: "facebook", type: "under_contract" },
    { day: 27, platform: "linkedin", type: "testimonial" },
  ]);

  const [upcomingPosts] = useState<ScheduledPost[]>([
    { id: "1", platform: "instagram", title: "New Listing: 742 Evergreen Terrace", preview: "Stunning 4BR/3BA home with panoramic mountain views...", scheduledTime: "Today, 2:00 PM", status: "scheduled", type: "New Listing" },
    { id: "2", platform: "facebook", title: "Open House This Weekend", preview: "Join us Saturday 1-4 PM at 1234 Oak Avenue...", scheduledTime: "Today, 4:30 PM", status: "scheduled", type: "Open House" },
    { id: "3", platform: "linkedin", title: "Market Update: February 2026", preview: "The local real estate market continues to show strong...", scheduledTime: "Tomorrow, 9:00 AM", status: "pending_approval", type: "Market Update" },
    { id: "4", platform: "tiktok", title: "Home Tour: Modern Downtown Condo", preview: "Wait until you see this kitchen renovation...", scheduledTime: "Feb 17, 12:00 PM", status: "draft", type: "New Listing" },
    { id: "5", platform: "x", title: "Just Sold: Over Asking!", preview: "Thrilled to announce another successful closing...", scheduledTime: "Feb 18, 10:00 AM", status: "scheduled", type: "Just Sold" },
  ]);

  const [platformHealth] = useState<PlatformHealth[]>([
    { name: "Facebook", key: "facebook", status: "connected", lastSync: "2 min ago" },
    { name: "Instagram", key: "instagram", status: "connected", lastSync: "2 min ago" },
    { name: "LinkedIn", key: "linkedin", status: "connected", lastSync: "5 min ago" },
    { name: "YouTube", key: "youtube", status: "warning", lastSync: "2 hours ago" },
    { name: "TikTok", key: "tiktok", status: "connected", lastSync: "10 min ago" },
    { name: "X", key: "x", status: "connected", lastSync: "3 min ago" },
    { name: "Google Business", key: "google", status: "disconnected", lastSync: "Never" },
  ]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  while (calendarDays.length < 35) calendarDays.push(null);

  const getPostsForDay = (day: number) => calendarPosts.filter((p) => p.day === day);

  const statusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" /> Scheduled
          </span>
        );
      case "pending_approval":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Pending
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
            <FileText className="w-3 h-3" /> Draft
          </span>
        );
      default:
        return null;
    }
  };

  const healthDot = (status: string) => {
    const colors: Record<string, string> = { connected: "bg-green-500", warning: "bg-amber-500", disconnected: "bg-red-400" };
    return <span className={`w-2.5 h-2.5 rounded-full inline-block ${colors[status]}`} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Social Marketing</h1>
            <p className="text-gray-500 mt-1">Manage your social media presence across all platforms</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              <Wand2 className="w-4 h-4" /> Generate Week
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
              <LineChart className="w-4 h-4" /> View Analytics
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
              <Plus className="w-4 h-4" /> Create Post
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Posts This Month</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(27,58,92,0.08)" }}>
                <BarChart3 className="w-5 h-5" style={{ color: "var(--color-primary, #1B3A5C)" }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.postsThisMonth}</p>
            <p className="text-xs text-green-600 mt-1 font-medium">+12% from last month</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Impressions</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(42,157,143,0.08)" }}>
                <Eye className="w-5 h-5" style={{ color: "var(--color-secondary, #2A9D8F)" }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.totalImpressions.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1 font-medium">+8.3% from last month</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Engagement Rate</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.engagementRate}%</p>
            <p className="text-xs text-green-600 mt-1 font-medium">+0.3% from last month</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Leads from Social</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.leadsFromSocial}</p>
            <p className="text-xs text-green-600 mt-1 font-medium">+5 from last month</p>
          </div>
        </div>

        {/* Content Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Content Calendar</h2>
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
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-gray-50 px-2 py-2 text-center">
                <span className="text-xs font-semibold text-gray-500 uppercase">{d}</span>
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const posts = day ? getPostsForDay(day) : [];
              const isToday = day === 15;
              return (
                <div key={idx} className={`bg-white min-h-[80px] p-2 ${day ? "hover:bg-blue-50/30 cursor-pointer" : ""} transition-colors`} style={isToday ? { boxShadow: "inset 0 0 0 2px var(--color-secondary, #2A9D8F)" } : {}}>
                  {day && (
                    <>
                      <span className={`text-xs font-medium ${isToday ? "text-white px-1.5 py-0.5 rounded-full" : "text-gray-600"}`} style={isToday ? { backgroundColor: "var(--color-secondary, #2A9D8F)" } : {}}>{day}</span>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {posts.map((post, pIdx) => (
                          <span key={pIdx} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: platformColors[post.platform] }} title={`${post.platform} - ${post.type}`} />
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
                <span className="text-xs text-gray-500 capitalize">{key === "google" ? "Google Biz" : key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Posts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Upcoming Posts</h2>
            <button className="text-sm font-medium hover:underline" style={{ color: "var(--color-secondary, #2A9D8F)" }}>View All</button>
          </div>
          <div className="space-y-3">
            {upcomingPosts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: platformColors[post.platform] }}>
                  <PlatformIcon platform={post.platform} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{post.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{post.preview}</p>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{post.scheduledTime}</span>
                </div>
                <div className="flex-shrink-0">{statusBadge(post.status)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Health */}
        <div>
          <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--color-primary, #1B3A5C)" }}>Platform Connections</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {platformHealth.map((p) => (
              <div key={p.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-white" style={{ backgroundColor: platformColors[p.key] }}>
                  <PlatformIcon platform={p.key} />
                </div>
                <p className="text-xs font-semibold text-gray-800 mb-1">{p.name}</p>
                <div className="flex items-center justify-center gap-1.5">
                  {healthDot(p.status)}
                  <span className={`text-[10px] font-medium ${p.status === "connected" ? "text-green-600" : p.status === "warning" ? "text-amber-600" : "text-red-500"}`}>
                    {p.status === "connected" ? "Connected" : p.status === "warning" ? "Warning" : "Not Connected"}
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
