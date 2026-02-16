'use client';

import { useState, useEffect } from 'react';
import {
  Search, Filter, Image, Music, Type, FileImage, Palette,
  Download, Heart, Upload, Star, ChevronLeft, ChevronRight,
  Sparkles, Grid, Film, Volume2, Layers, Flower2,
} from 'lucide-react';

const categories = ["All", "Stock Photos", "Icons", "Backgrounds", "Music", "Sound Effects", "Fonts", "Animations"];
const moodFilters = ["Any", "Happy", "Calm", "Professional", "Energetic", "Dramatic"];
const colorFilters = ["Any", "Warm", "Cool", "Neutral", "Vibrant", "Muted"];
const seasonFilters = ["Any", "Spring", "Summer", "Fall", "Winter"];

const mockAssets = [
  { id: "a1", name: "Modern Kitchen Interior", category: "Stock Photos", downloads: 2340, license: "Standard", type: "image" },
  { id: "a2", name: "House Icon Set", category: "Icons", downloads: 1820, license: "Free", type: "icon" },
  { id: "a3", name: "Marble Texture", category: "Backgrounds", downloads: 956, license: "Standard", type: "image" },
  { id: "a4", name: "Upbeat Corporate", category: "Music", downloads: 3100, license: "Premium", type: "audio" },
  { id: "a5", name: "Door Open SFX", category: "Sound Effects", downloads: 450, license: "Free", type: "audio" },
  { id: "a6", name: "Montserrat Bold", category: "Fonts", downloads: 5200, license: "Free", type: "font" },
  { id: "a7", name: "Fade In Transition", category: "Animations", downloads: 780, license: "Standard", type: "animation" },
  { id: "a8", name: "Luxury Living Room", category: "Stock Photos", downloads: 1650, license: "Premium", type: "image" },
  { id: "a9", name: "Real Estate Icons Pro", category: "Icons", downloads: 2900, license: "Premium", type: "icon" },
  { id: "a10", name: "Ocean Wave Gradient", category: "Backgrounds", downloads: 1120, license: "Free", type: "image" },
  { id: "a11", name: "Calm Acoustic", category: "Music", downloads: 2400, license: "Standard", type: "audio" },
  { id: "a12", name: "Slide Up Animation", category: "Animations", downloads: 630, license: "Free", type: "animation" },
];

const recommended = [
  { id: "r1", name: "Aerial Beach View", category: "Stock Photos" },
  { id: "r2", name: "Signature Font Pack", category: "Fonts" },
  { id: "r3", name: "Tropical Background", category: "Backgrounds" },
  { id: "r4", name: "Success Chime SFX", category: "Sound Effects" },
];

const seasonalItems = [
  { id: "sp1", name: "Cherry Blossom Overlay", category: "Backgrounds" },
  { id: "sp2", name: "Spring Garden Photo", category: "Stock Photos" },
  { id: "sp3", name: "Fresh Start Music", category: "Music" },
];

const licenseColors: Record<string, string> = { Free: "bg-green-100 text-green-700", Standard: "bg-blue-100 text-blue-700", Premium: "bg-purple-100 text-purple-700" };

export default function AssetLibraryPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState("Any");
  const [selectedColor, setSelectedColor] = useState("Any");
  const [selectedSeason, setSelectedSeason] = useState("Any");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAssets = mockAssets.filter((a) => activeCategory === "All" || a.category === activeCategory);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "audio": return <Volume2 className="w-8 h-8 text-gray-400" />;
      case "font": return <Type className="w-8 h-8 text-gray-400" />;
      case "icon": return <Grid className="w-8 h-8 text-gray-400" />;
      case "animation": return <Film className="w-8 h-8 text-gray-400" />;
      default: return <Image className="w-8 h-8 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg"><Layers className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Asset Library</h1><p className="text-sm text-gray-500">Browse and manage your media assets</p></div>
          <button className="ml-auto px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg text-sm font-medium hover:shadow-md transition-all flex items-center gap-2"><Upload className="w-4 h-4" />Upload Asset</button>
        </div>
        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat ? "bg-[var(--color-primary)] text-white" : "text-gray-500 hover:bg-gray-100"}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-6 p-6">
        <div className="flex-1">
          {/* Search and Filters */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search assets..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-secondary)]" /></div>
            <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">{moodFilters.map((m) => <option key={m} value={m}>Mood: {m}</option>)}</select>
            <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">{colorFilters.map((c) => <option key={c} value={c}>Color: {c}</option>)}</select>
            <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">{seasonFilters.map((s) => <option key={s} value={s}>Season: {s}</option>)}</select>
          </div>

          {/* Asset Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="group bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer">
                <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {getAssetIcon(asset.type)}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="px-3 py-1.5 bg-[var(--color-secondary)] text-white rounded-lg text-xs font-medium shadow">Use</button>
                    <button className="p-1.5 bg-white rounded-lg shadow"><Heart className="w-3.5 h-3.5 text-gray-600" /></button>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-gray-800 truncate">{asset.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">{asset.category}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${licenseColors[asset.license]}`}>{asset.license}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400"><Download className="w-3 h-3" />{asset.downloads.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <button className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
            {[1, 2, 3, 4, 5].map((page) => (<button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-lg text-sm font-medium ${currentPage === page ? "bg-[var(--color-primary)] text-white" : "text-gray-600 hover:bg-gray-100"}`}>{page}</button>))}
            <button className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[var(--color-secondary)]" />Recommended for You</h3>
            <div className="space-y-2">
              {recommended.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0"><Star className="w-4 h-4 text-gray-400" /></div>
                  <div><p className="text-xs font-medium text-gray-800 truncate">{item.name}</p><p className="text-[10px] text-gray-400">{item.category}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* Seasonal Collection Banner */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-3"><Flower2 className="w-5 h-5 text-green-600" /><h3 className="text-sm font-semibold text-green-800">Spring Collection</h3></div>
            <div className="space-y-2">
              {seasonalItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center"><Image className="w-4 h-4 text-green-500" /></div>
                  <div><p className="text-xs font-medium text-gray-800">{item.name}</p><p className="text-[10px] text-gray-500">{item.category}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
