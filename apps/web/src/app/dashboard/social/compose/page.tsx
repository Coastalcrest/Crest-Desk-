"use client";

import { useState } from "react";
import {
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter, Building2,
  Wand2, Hash, Image as ImageIcon, Video, Calendar, Clock, Send,
  Save, Eye, CheckCircle2, AlertTriangle, X, Sparkles, Type,
  FileText, Home, DollarSign, Users, MessageSquare, Star,
} from "lucide-react";

const platforms = [
  { key: "facebook", name: "Facebook", icon: Facebook, color: "#1877F2", maxChars: 63206 },
  { key: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F", maxChars: 2200 },
  { key: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0A66C2", maxChars: 3000 },
  { key: "youtube", name: "YouTube", icon: Youtube, color: "#FF0000", maxChars: 5000 },
  { key: "tiktok", name: "TikTok", icon: Music2, color: "#000000", maxChars: 2200 },
  { key: "x", name: "X", icon: Twitter, color: "#1DA1F2", maxChars: 280 },
  { key: "google", name: "Google Business", icon: Building2, color: "#4285F4", maxChars: 1500 },
];

const postTypes = [
  { key: "new_listing", label: "New Listing", icon: Home },
  { key: "open_house", label: "Open House", icon: Users },
  { key: "under_contract", label: "Under Contract", icon: FileText },
  { key: "just_sold", label: "Just Sold", icon: DollarSign },
  { key: "market_update", label: "Market Update", icon: Type },
  { key: "testimonial", label: "Testimonial", icon: Star },
  { key: "custom", label: "Custom", icon: MessageSquare },
];

const aiCaptions = [
  "Just listed! This stunning 4BR/3BA home at 742 Evergreen Terrace features panoramic mountain views, a gourmet kitchen with quartz countertops, and a backyard oasis perfect for entertaining. Schedule your private showing today! #NewListing #DreamHome #RealEstate",
  "Your dream home awaits at 742 Evergreen Terrace! With 4 bedrooms, 3 baths, and breathtaking mountain views from every room, this property is the total package. The chef-worthy kitchen and resort-style backyard are just the beginning. DM for details! #JustListed #HomeSweetHome",
  "JUST LISTED - 742 Evergreen Terrace. 4 bed | 3 bath | Mountain views | Gourmet kitchen | Private backyard paradise. This one will not last. Open house this Saturday 1-4 PM. Link in bio for full details. #OpenHouse #LuxuryLiving #CoastalCrestRealty",
];

const suggestedHashtags = [
  "#RealEstate", "#NewListing", "#DreamHome", "#HomeSweetHome",
  "#JustListed", "#LuxuryLiving", "#HouseHunting", "#PropertyForSale",
  "#RealtorLife", "#CoastalCrestRealty", "#HomeForSale", "#OpenHouse",
];

const mockMedia = [
  { id: "1", type: "image", name: "front-exterior.jpg", url: "/mock/house1.jpg" },
  { id: "2", type: "image", name: "kitchen.jpg", url: "/mock/house2.jpg" },
  { id: "3", type: "image", name: "living-room.jpg", url: "/mock/house3.jpg" },
  { id: "4", type: "video", name: "walkthrough.mp4", url: "/mock/video1.mp4" },
];

export default function ComposePostPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [selectedPostType, setSelectedPostType] = useState("new_listing");
  const [content, setContent] = useState("Just listed! This stunning 4BR/3BA home at 742 Evergreen Terrace features panoramic mountain views, a gourmet kitchen with quartz countertops, and a backyard oasis perfect for entertaining. Schedule your private showing today!");
  const [hashtags, setHashtags] = useState<string[]>(["#NewListing", "#DreamHome", "#RealEstate", "#CoastalCrestRealty"]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("schedule");
  const [scheduleDate, setScheduleDate] = useState("2026-02-17");
  const [scheduleTime, setScheduleTime] = useState("14:00");
  const [selectedMedia, setSelectedMedia] = useState(["1", "2", "3"]);
  const [complianceStatus] = useState<"approved" | "warning" | "pending">("approved");
  const [newHashtag, setNewHashtag] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState("instagram");

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const getCharLimit = () => {
    const limits = selectedPlatforms.map((p) => platforms.find((pl) => pl.key === p)?.maxChars || 9999);
    return Math.min(...limits);
  };

  const addHashtag = () => {
    if (newHashtag && !hashtags.includes(newHashtag)) {
      const tag = newHashtag.startsWith("#") ? newHashtag : `#${newHashtag}`;
      setHashtags([...hashtags, tag]);
      setNewHashtag("");
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const fullContent = content + (hashtags.length > 0 ? "\n\n" + hashtags.join(" ") : "");
  const charLimit = getCharLimit();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Compose Post</h1>
            <p className="text-gray-500 mt-1">Create and schedule social media content</p>
          </div>
          <div className="flex items-center gap-2">
            {complianceStatus === "approved" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Compliance Approved
              </span>
            )}
            {complianceStatus === "warning" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" /> Review Needed
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Platform Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Platforms</h3>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedPlatforms.includes(p.key);
                  return (
                    <button key={p.key} onClick={() => togglePlatform(p.key)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${isSelected ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                      style={isSelected ? { backgroundColor: p.color } : {}}>
                      <Icon className="w-4 h-4" /> {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Post Type</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {postTypes.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedPostType === t.key;
                  return (
                    <button key={t.key} onClick={() => setSelectedPostType(t.key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${isSelected ? "border-transparent text-white" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                      style={isSelected ? { backgroundColor: "var(--color-primary, #1B3A5C)" } : {}}>
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Content</h3>
                <button onClick={() => setShowAiSuggestions(!showAiSuggestions)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
                  <Sparkles className="w-4 h-4" /> Generate with AI
                </button>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ focusRingColor: "var(--color-secondary, #2A9D8F)" }}
                placeholder="Write your post content here..." />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  {selectedPlatforms.map((pKey) => {
                    const p = platforms.find((pl) => pl.key === pKey);
                    if (!p) return null;
                    const isOver = fullContent.length > p.maxChars;
                    return (
                      <span key={pKey} className={`text-xs font-medium ${isOver ? "text-red-500" : "text-gray-400"}`}>
                        {p.name}: {fullContent.length}/{p.maxChars}
                      </span>
                    );
                  })}
                </div>
                <span className={`text-xs font-medium ${fullContent.length > charLimit ? "text-red-500" : "text-gray-400"}`}>
                  {fullContent.length} characters
                </span>
              </div>

              {/* AI Suggestions */}
              {showAiSuggestions && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4" style={{ color: "var(--color-secondary, #2A9D8F)" }} />
                    <h4 className="text-sm font-semibold text-gray-700">AI-Generated Captions</h4>
                  </div>
                  <div className="space-y-3">
                    {aiCaptions.map((caption, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-300 cursor-pointer transition-colors" onClick={() => { setContent(caption); setShowAiSuggestions(false); }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-500">Option {idx + 1}</span>
                          <span className="text-xs text-gray-400">{caption.length} chars</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{caption}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Hashtags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {hashtags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {tag}
                    <button onClick={() => removeHashtag(tag)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input type="text" value={newHashtag} onChange={(e) => setNewHashtag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHashtag()}
                  placeholder="Add hashtag..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50" />
                <button onClick={addHashtag} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Add</button>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">AI Suggested:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedHashtags.filter((t) => !hashtags.includes(t)).map((tag) => (
                    <button key={tag} onClick={() => setHashtags([...hashtags, tag])}
                      className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Media Attachments</h3>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {mockMedia.map((m) => {
                  const isSelected = selectedMedia.includes(m.id);
                  return (
                    <div key={m.id} onClick={() => setSelectedMedia(isSelected ? selectedMedia.filter((id) => id !== m.id) : [...selectedMedia, m.id])}
                      className={`relative aspect-square rounded-lg border-2 cursor-pointer overflow-hidden transition-all ${isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"}`}>
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        {m.type === "image" ? <ImageIcon className="w-6 h-6 text-gray-400" /> : <Video className="w-6 h-6 text-gray-400" />}
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">{m.name}</p>
                    </div>
                  );
                })}
              </div>
              <button className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
                + Add from Media Studio
              </button>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Schedule</h3>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setScheduleMode("now")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${scheduleMode === "now" ? "border-transparent text-white" : "bg-white text-gray-600 border-gray-200"}`}
                  style={scheduleMode === "now" ? { backgroundColor: "var(--color-secondary, #2A9D8F)" } : {}}>
                  <Send className="w-4 h-4 inline mr-1.5" /> Post Now
                </button>
                <button onClick={() => setScheduleMode("schedule")}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${scheduleMode === "schedule" ? "border-transparent text-white" : "bg-white text-gray-600 border-gray-200"}`}
                  style={scheduleMode === "schedule" ? { backgroundColor: "var(--color-secondary, #2A9D8F)" } : {}}>
                  <Calendar className="w-4 h-4 inline mr-1.5" /> Schedule
                </button>
              </div>
              {scheduleMode === "schedule" && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Date</label>
                    <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Time</label>
                    <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                <Save className="w-4 h-4 inline mr-1.5" /> Save Draft
              </button>
              <button className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--color-primary, #1B3A5C)" }}>
                <Calendar className="w-4 h-4 inline mr-1.5" /> Schedule
              </button>
              <button className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
                <Send className="w-4 h-4 inline mr-1.5" /> Publish Now
              </button>
            </div>
          </div>

          {/* Right: Preview Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview</h3>
              <div className="flex items-center gap-2 mb-4">
                {selectedPlatforms.map((pKey) => {
                  const p = platforms.find((pl) => pl.key === pKey);
                  if (!p) return null;
                  const Icon = p.icon;
                  return (
                    <button key={pKey} onClick={() => setPreviewPlatform(pKey)}
                      className={`p-2 rounded-lg border transition-all ${previewPlatform === pKey ? "border-transparent text-white" : "border-gray-200 text-gray-500"}`}
                      style={previewPlatform === pKey ? { backgroundColor: p.color } : {}}>
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              {/* Phone Mockup for Instagram */}
              {previewPlatform === "instagram" && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden max-w-[280px] mx-auto">
                  <div className="bg-white p-3 flex items-center gap-2 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">coastalcrest_realty</p>
                      <p className="text-[10px] text-gray-500">Sponsored</p>
                    </div>
                  </div>
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-900 line-clamp-3"><span className="font-semibold">coastalcrest_realty</span> {content}</p>
                    <p className="text-[10px] text-blue-500 mt-1">{hashtags.join(" ")}</p>
                  </div>
                </div>
              )}

              {/* Card Mockup for Facebook */}
              {previewPlatform === "facebook" && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Facebook className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Coastal Crest Realty</p>
                      <p className="text-xs text-gray-500">Just now</p>
                    </div>
                  </div>
                  <div className="px-3 pb-2">
                    <p className="text-sm text-gray-800 line-clamp-4">{content}</p>
                    <p className="text-sm text-blue-600 mt-1">{hashtags.join(" ")}</p>
                  </div>
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="p-3 border-t border-gray-100 flex items-center justify-around text-xs text-gray-500">
                    <span>Like</span><span>Comment</span><span>Share</span>
                  </div>
                </div>
              )}

              {/* Generic preview for other platforms */}
              {previewPlatform !== "instagram" && previewPlatform !== "facebook" && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: platforms.find((p) => p.key === previewPlatform)?.color }}>
                      {(() => { const p = platforms.find((pl) => pl.key === previewPlatform); if (!p) return null; const Icon = p.icon; return <Icon className="w-4 h-4" />; })()}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">Coastal Crest Realty</p>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-4 mb-2">{content}</p>
                  <p className="text-xs text-blue-600">{hashtags.join(" ")}</p>
                  <div className="mt-3 aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Post Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Post Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Platforms</span>
                  <span className="font-medium text-gray-800">{selectedPlatforms.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Post Type</span>
                  <span className="font-medium text-gray-800">{postTypes.find((t) => t.key === selectedPostType)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Media</span>
                  <span className="font-medium text-gray-800">{selectedMedia.length} files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Characters</span>
                  <span className="font-medium text-gray-800">{fullContent.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hashtags</span>
                  <span className="font-medium text-gray-800">{hashtags.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Schedule</span>
                  <span className="font-medium text-gray-800">{scheduleMode === "now" ? "Immediate" : `${scheduleDate} ${scheduleTime}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
