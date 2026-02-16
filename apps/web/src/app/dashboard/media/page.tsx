'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Image, Video, FolderOpen, Clock, TrendingUp, CheckCircle,
  AlertCircle, ChevronRight, Sparkles, Film, Layout,
  ArrowRight, Play, Plus,
} from 'lucide-react';
import { api, apiPaginated } from '@/lib/api';

// ------------------------------------------------------------------ //
//  API response interfaces                                            //
// ------------------------------------------------------------------ //

interface MediaAsset {
  id: string;
  title: string;
  assetType: string;
  mediaType: string;
  status: string;
  thumbnailPath: string | null;
  createdAt: string;
}

interface MediaStats {
  totalAssets: number;
  imageCount: number;
  videoCount: number;
  publishedCount: number;
  pendingComplianceCount: number;
  generatedThisMonth: number;
}

interface Template {
  id: string;
  title: string;
  category: string;
  thumbnail: string | null;
  usageCount: number;
}

// ------------------------------------------------------------------ //
//  Style helpers                                                      //
// ------------------------------------------------------------------ //

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  generating: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
};

const typeColors: Record<string, string> = {
  image: 'bg-purple-100 text-purple-700',
  video: 'bg-pink-100 text-pink-700',
};

// ------------------------------------------------------------------ //
//  Page component                                                     //
// ------------------------------------------------------------------ //

export default function MediaStudioDashboard() {
  const { data: recentData } = useQuery({
    queryKey: ['media', 'recent'],
    queryFn: () => apiPaginated<MediaAsset>('/media?page=1&limit=6&sortBy=newest'),
  });
  const recentProjects = recentData?.data ?? [];

  const { data: stats } = useQuery({
    queryKey: ['media', 'stats'],
    queryFn: () => api<MediaStats>('/media/stats'),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['asset-library', 'templates'],
    queryFn: () => api<Template[]>('/asset-library/templates'),
  });

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
              { label: "Images Generated", value: stats?.imageCount ?? 0, icon: Image, sublabel: "This month", change: "+12", color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Videos Created", value: stats?.videoCount ?? 0, icon: Film, sublabel: "This month", change: "+4", color: "text-pink-600", bg: "bg-pink-50" },
              { label: "Published", value: stats?.publishedCount ?? 0, icon: CheckCircle, sublabel: "This month", change: "+8", color: "text-green-600", bg: "bg-green-50" },
              { label: "Pending Review", value: stats?.pendingComplianceCount ?? 0, icon: AlertCircle, sublabel: "Awaiting approval", change: "", color: "text-amber-600", bg: "bg-amber-50" },
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
                  {project.assetType === "video" ? (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="p-3 bg-white/80 rounded-full shadow"><Play className="w-6 h-6 fill-current" /></div>
                      <Film className="w-10 h-10" />
                    </div>
                  ) : (<Image className="w-12 h-12 text-gray-300" />)}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[project.assetType] ?? 'bg-gray-100 text-gray-700'}`}>{project.assetType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] ?? 'bg-gray-100 text-gray-700'}`}>{project.status}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{project.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
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
      </div>
    </div>
  );
}
