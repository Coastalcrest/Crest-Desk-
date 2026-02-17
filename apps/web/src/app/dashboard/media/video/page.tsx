'use client';

import { useState, useEffect } from 'react';
import {
  Film, Play, Music, Mic, Type, Settings, Download,
  Upload, GripVertical, Clock, Volume2, Captions,
  Sparkles, Eye, Palette, MonitorPlay, Smartphone,
} from 'lucide-react';

const videoTypes = ["Tour Video", "Market Update", "Testimonial", "Agent Intro", "Custom"];
const moodOptions = ["Upbeat", "Professional", "Calm", "Energetic", "Inspirational", "Dramatic"];
const outputFormats = [
  { id: "reels", label: "15s Reels", icon: "Smartphone" },
  { id: "stories", label: "30s Stories", icon: "Smartphone" },
  { id: "youtube", label: "60s YouTube", icon: "MonitorPlay" },
];

const mockScenes = [
  { id: "s1", title: "Opening Shot", duration: "5s", textOverlay: "Coastal Crest Realty", thumbnail: "/scene1.jpg" },
  { id: "s2", title: "Exterior View", duration: "8s", textOverlay: "123 Oak Street", thumbnail: "/scene2.jpg" },
  { id: "s3", title: "Interior Tour", duration: "12s", textOverlay: "4 Bed | 3 Bath | 2,400 sqft", thumbnail: "/scene3.jpg" },
  { id: "s4", title: "Call to Action", duration: "5s", textOverlay: "Schedule a Showing Today", thumbnail: "/scene4.jpg" },
];

const mockGeneratedVideos = [
  { id: "v1", title: "123 Oak St Tour - 15s Reel", duration: "0:15", format: "Reels", date: "2026-02-14" },
  { id: "v2", title: "February Market Report", duration: "0:30", format: "Stories", date: "2026-02-13" },
  { id: "v3", title: "Agent Sarah Introduction", duration: "1:00", format: "YouTube", date: "2026-02-12" },
];

export default function VideoGeneratorPage() {
  const [activeType, setActiveType] = useState("Tour Video");
  const [selectedMood, setSelectedMood] = useState("Professional");
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [brandingEnabled, setBrandingEnabled] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState("reels");
  const [progress, setProgress] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg"><Film className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Video Generator</h1><p className="text-sm text-gray-500">Create engaging video content for your listings</p></div>
        </div>
        {/* Video Type Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {videoTypes.map((type) => (
            <button key={type} onClick={() => setActiveType(type)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeType === type ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{type}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 p-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Storyboard */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><GripVertical className="w-4 h-4 text-gray-400" />Storyboard</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {mockScenes.map((scene, idx) => (
                <div key={scene.id} className="flex-shrink-0 w-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden cursor-grab hover:shadow-md transition-shadow">
                  <div className="relative h-28 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <Film className="w-8 h-8 text-gray-400" />
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Scene {idx + 1}</span>
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3" />{scene.duration}</span>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-700 truncate">{scene.title}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{scene.textOverlay}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Area */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <button className="p-6 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors"><Play className="w-12 h-12 text-white fill-white" /></button>
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                <div className="flex-1 h-1 bg-white/20 rounded-full"><div className="w-0 h-full bg-[var(--color-secondary)] rounded-full" /></div>
                <span className="text-white/80 text-xs">0:00 / 0:30</span>
              </div>
            </div>
          </div>

          {/* Generate Button with Progress */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Output Format</h3>
              <div className="flex gap-2">
                {outputFormats.map((fmt) => (
                  <button key={fmt.id} onClick={() => setSelectedFormat(fmt.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedFormat === fmt.id ? "bg-[var(--color-primary)] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{fmt.label}</button>
                ))}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4"><div className="h-full bg-[var(--color-secondary)] rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
            <button className="w-full py-3 bg-[var(--color-secondary)] text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" />Generate Video</button>
          </div>

          {/* Generated Videos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Generated Videos</h3>
            <div className="space-y-3">
              {mockGeneratedVideos.map((video) => (
                <div key={video.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="w-20 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center flex-shrink-0"><Play className="w-5 h-5 text-gray-500" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{video.title}</p><p className="text-xs text-gray-400">{video.duration} | {video.format} | {video.date}</p></div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-[var(--color-secondary)] hover:bg-gray-100 rounded-lg"><Eye className="w-4 h-4" /></button>
                    <button className="p-2 text-gray-400 hover:text-[var(--color-secondary)] hover:bg-gray-100 rounded-lg"><Download className="w-4 h-4" /></button>
                    <button className="p-2 text-gray-400 hover:text-[var(--color-secondary)] hover:bg-gray-100 rounded-lg"><Upload className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Settings Panel */}
        <div className="w-72 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Settings className="w-4 h-4" />Settings</h3>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Music Mood</label><select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">{moodOptions.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700 flex items-center gap-2"><Mic className="w-4 h-4" />Voiceover</span><button onClick={() => setVoiceoverEnabled(!voiceoverEnabled)} className={`w-10 h-5 rounded-full transition-colors ${voiceoverEnabled ? "bg-[var(--color-secondary)]" : "bg-gray-300"}`}><div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${voiceoverEnabled ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700 flex items-center gap-2"><Captions className="w-4 h-4" />Captions</span><button onClick={() => setCaptionsEnabled(!captionsEnabled)} className={`w-10 h-5 rounded-full transition-colors ${captionsEnabled ? "bg-[var(--color-secondary)]" : "bg-gray-300"}`}><div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${captionsEnabled ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700 flex items-center gap-2"><Palette className="w-4 h-4" />Branding</span><button onClick={() => setBrandingEnabled(!brandingEnabled)} className={`w-10 h-5 rounded-full transition-colors ${brandingEnabled ? "bg-[var(--color-secondary)]" : "bg-gray-300"}`}><div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${brandingEnabled ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
