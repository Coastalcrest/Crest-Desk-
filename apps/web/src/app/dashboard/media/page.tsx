'use client';

import { useState, useEffect } from 'react';
import {
  Image, Video, FolderOpen, Clock, TrendingUp, CheckCircle,
  AlertCircle, ChevronRight, Heart, Sparkles, Film, Layout,
  ArrowRight, Play, Plus,
} from 'lucide-react';

type ProjectStatus = 'draft' | 'approved' | 'published';
type MediaType = 'image' | 'video';

interface RecentProject { id: string; title: string; thumbnail: string; type: MediaType; status: ProjectStatus; date: string; }
interface TemplateCard { id: string; title: string; thumbnail: string; category: string; usageCount: number; }
interface FavoriteAsset { id: string; title: string; thumbnail: string; type: MediaType; }

const statusColors = { draft: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', published: 'bg-blue-100 text-blue-700' };
const typeColors = { image: 'bg-purple-100 text-purple-700', video: 'bg-pink-100 text-pink-700' };
export default function MediaStudioDashboard() {
  const [recentProjects, setRecentProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState({ imagesGenerated: 0, videosCreated: 0, published: 0, pendingReview: 0 });
  useEffect(() => {
    setRecentProjects([
      { id: "1", title: "123 Oak Street - Just Listed", thumbnail: "/ph.jpg", type: "image", status: "published", date: "2026-02-14" },
      { id: "2", title: "Market Update February", thumbnail: "/ph.jpg", type: "video", status: "approved", date: "2026-02-13" },
      { id: "3", title: "456 Elm Ave - Virtual Staging", thumbnail: "/ph.jpg", type: "image", status: "draft", date: "2026-02-12" },
      { id: "4", title: "Agent Introduction Video", thumbnail: "/ph.jpg", type: "video", status: "published", date: "2026-02-11" },
      { id: "5", title: "789 Pine Rd - Under Contract", thumbnail: "/ph.jpg", type: "image", status: "approved", date: "2026-02-10" },
      { id: "6", title: "Open House Promo Reel", thumbnail: "/ph.jpg", type: "video", status: "draft", date: "2026-02-09" },
    ]);
    setTemplates([
      { id: "t1", title: "Just Listed", thumbnail: "/t.jpg", category: "Listing", usageCount: 1240 },
      { id: "t2", title: "Under Contract", thumbnail: "/t.jpg", category: "Listing", usageCount: 870 },
      { id: "t3", title: "Just Sold", thumbnail: "/t.jpg", category: "Listing", usageCount: 1055 },
      { id: "t4", title: "Market Update", thumbnail: "/t.jpg", category: "Analytics", usageCount: 632 },
      { id: "t5", title: "Social Post", thumbnail: "/t.jpg", category: "Social", usageCount: 1580 },
    ]);
    setFavorites([
      { id: "f1", title: "Luxury Kitchen Shot", thumbnail: "/f.jpg", type: "image" },
      { id: "f2", title: "Aerial Drone View", thumbnail: "/f.jpg", type: "image" },
      { id: "f3", title: "Walkthrough Clip", thumbnail: "/f.jpg", type: "video" },
      { id: "f4", title: "Backyard Staging", thumbnail: "/f.jpg", type: "image" },
    ]);
    setStats({ imagesGenerated: 47, videosCreated: 12, published: 34, pendingReview: 8 });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-b-3xl" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-60 h-60 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative px-8 py-12">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Sparkles className="w-6 h-6 text-white" /></div>
              <span className="text-white/80 text-sm font-medium tracking-wide uppercase">Phase 7 - Creative Suite</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 font-[Inter]">AI Media Studio</h1>
            <p className="text-lg text-white/80 max-w-2xl leading-relaxed">Create stunning property images, engaging videos, and branded marketing materials - all powered by AI and compliant with brokerage standards.</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 space-y-10">
        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Image, title: "Generate Image", description: "Create AI-powered listing graphics, virtual staging, and social media visuals.", color: "from-purple-500 to-indigo-600" },
              { icon: Video, title: "Create Video", description: "Produce tour videos, market updates, and branded reels for any platform.", color: "from-pink-500 to-rose-600" },
              { icon: FolderOpen, title: "Browse Library", description: "Access stock photos, icons, music, animations, and brand assets.", color: "from-teal-500 to-cyan-600" },
            ].map((action) => (
              <button key={action.title} className="group relative bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-left hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${action.color} mb-5 shadow-lg`}><action.icon className="w-8 h-8 text-white" /></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[var(--color-primary)] transition-colors">{action.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{action.description}</p>
                <ArrowRight className="absolute top-8 right-8 w-5 h-5 text-gray-300 group-hover:text-[var(--color-secondary)] group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </section>

        {/* Stats Row */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Images Generated", value: stats.imagesGenerated, icon: Image, sublabel: "This month", change: "+12", color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Videos Created", value: stats.videosCreated, icon: Film, sublabel: "This month", change: "+4", color: "text-pink-600", bg: "bg-pink-50" },
              { label: "Published", value: stats.published, icon: CheckCircle, sublabel: "This month", change: "+8", color: "text-green-600", bg: "bg-green-50" },
              { label: "Pending Review", value: stats.pendingReview, icon: AlertCircle, sublabel: "Awaiting approval", change: "", color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${stat.bg}`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
                  {stat.change && <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"><TrendingUp className="w-3 h-3" />{stat.change}</span>}
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
            <button className="flex items-center gap-1 text-sm font-medium text-[var(--color-secondary)] hover:underline">View All <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentProjects.map((project) => (
              <div key={project.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
                <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                  {project.type === "video" ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="p-3 bg-white/80 rounded-full shadow"><Play className="w-6 h-6 fill-current" /></div>
                      <Film className="w-10 h-10" />
                    </div>
                  ) : (<Image className="w-12 h-12 text-gray-300" />)}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[project.type]}`}>{project.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>{project.status}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{project.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(project.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Templates Carousel */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
            <button className="flex items-center gap-1 text-sm font-medium text-[var(--color-secondary)] hover:underline">Browse All <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4">
            {templates.map((template) => (
              <div key={template.id} className="flex-shrink-0 w-56 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
                <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Layout className="w-10 h-10 text-gray-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><span className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 shadow">Use Template</span></div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900">{template.title}</h3>
                  <div className="flex items-center justify-between mt-1.5"><span className="text-xs text-gray-400">{template.category}</span><span className="text-xs text-gray-400">{template.usageCount.toLocaleString()} uses</span></div>
                </div>
              </div>
            ))}
            <div className="flex-shrink-0 w-56 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--color-secondary)] hover:bg-gray-100 transition-all min-h-[200px]"><Plus className="w-8 h-8 text-gray-400" /><span className="text-sm text-gray-500 font-medium">Create Custom</span></div>
          </div>
        </section>

        {/* Favorites */}
        <section className="pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Heart className="w-5 h-5 text-red-400" />Favorites</h2>
            <button className="flex items-center gap-1 text-sm font-medium text-[var(--color-secondary)] hover:underline">View All <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {favorites.map((fav) => (
              <div key={fav.id} className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer">
                <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">{fav.type === "video" ? <Film className="w-8 h-8 text-gray-300" /> : <Image className="w-8 h-8 text-gray-300" />}</div>
                <div className="p-3"><h4 className="text-xs font-semibold text-gray-800 truncate">{fav.title}</h4><span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[fav.type]}`}>{fav.type}</span></div>
                <button className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"><Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
