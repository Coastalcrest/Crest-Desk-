"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, Edit3, Clock, AlertTriangle, Filter,
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter, Building2,
  Eye, Image as ImageIcon, Video, User, Shield, ChevronDown, X,
  ThumbsUp, ThumbsDown, Check,
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

interface PendingPost {
  id: string;
  platform: string;
  agentName: string;
  agentAvatar: string;
  postType: string;
  content: string;
  mediaCount: number;
  mediaTypes: string[];
  scheduledTime: string;
  complianceStatus: "pass" | "warning" | "fail";
  complianceNotes: string;
  submittedAt: string;
}

export default function ApprovalQueuePage() {
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterPostType, setFilterPostType] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPostId, setRejectPostId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  const [stats] = useState({
    pendingApproval: 8,
    approvedToday: 12,
    rejected: 2,
  });

  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([
    { id: "1", platform: "instagram", agentName: "Sarah Mitchell", agentAvatar: "SM", postType: "New Listing", content: "Just listed\! This stunning 4BR/3BA home at 742 Evergreen Terrace features panoramic mountain views, a gourmet kitchen with quartz countertops, and a backyard oasis perfect for entertaining. Schedule your private showing today\! #NewListing #DreamHome", mediaCount: 4, mediaTypes: ["image", "image", "image", "image"], scheduledTime: "Today, 2:00 PM", complianceStatus: "pass", complianceNotes: "All checks passed", submittedAt: "2 hours ago" },
    { id: "2", platform: "facebook", agentName: "Mike Rodriguez", agentAvatar: "MR", postType: "Open House", content: "Join us this Saturday from 1-4 PM for an exclusive open house at 1234 Oak Avenue\! This beautifully renovated 3BR/2BA home features hardwood floors throughout, a modern kitchen, and a spacious backyard. Light refreshments will be served\!", mediaCount: 3, mediaTypes: ["image", "image", "video"], scheduledTime: "Today, 4:30 PM", complianceStatus: "pass", complianceNotes: "All checks passed", submittedAt: "3 hours ago" },
    { id: "3", platform: "linkedin", agentName: "Sarah Mitchell", agentAvatar: "SM", postType: "Market Update", content: "The coastal real estate market continues to show remarkable resilience heading into Q1 2026. Average home prices increased 5.2% year-over-year, while inventory remains tight at just 2.3 months supply. Here is what this means for buyers and sellers in our area...", mediaCount: 1, mediaTypes: ["image"], scheduledTime: "Tomorrow, 9:00 AM", complianceStatus: "warning", complianceNotes: "Statistics should include source citation", submittedAt: "4 hours ago" },
    { id: "4", platform: "tiktok", agentName: "Jessica Chen", agentAvatar: "JC", postType: "New Listing", content: "POV: You walk into your dream home for the first time and the kitchen alone takes your breath away. Wait for the backyard reveal... #RealEstateTikTok #DreamHome #HouseHunting #HomeTour", mediaCount: 1, mediaTypes: ["video"], scheduledTime: "Tomorrow, 12:00 PM", complianceStatus: "pass", complianceNotes: "All checks passed", submittedAt: "5 hours ago" },
    { id: "5", platform: "facebook", agentName: "David Park", agentAvatar: "DP", postType: "Just Sold", content: "JUST SOLD\! Thrilled to announce the successful closing of 567 Maple Drive - $50K OVER asking price\! My clients are absolutely overjoyed with their new home. The market is HOT right now. If you are thinking about selling, lets chat about what your home could be worth\!", mediaCount: 2, mediaTypes: ["image", "image"], scheduledTime: "Tomorrow, 3:00 PM", complianceStatus: "fail", complianceNotes: "Guarantee language detected: remove claims about guaranteed selling prices", submittedAt: "6 hours ago" },
    { id: "6", platform: "instagram", agentName: "Mike Rodriguez", agentAvatar: "MR", postType: "Testimonial", content: "Nothing makes us happier than happy clients\! Thank you to the Johnson family for trusting us with the sale of their home. From listing to closing in just 14 days - and $30K over asking\! #ClientLove #RealEstateSuccess #CoastalCrestRealty", mediaCount: 1, mediaTypes: ["image"], scheduledTime: "Feb 18, 10:00 AM", complianceStatus: "warning", complianceNotes: "Client consent form should be verified for testimonial use", submittedAt: "7 hours ago" },
    { id: "7", platform: "x", agentName: "Sarah Mitchell", agentAvatar: "SM", postType: "Market Update", content: "Coastal market update: Home sales up 12% in January. Average days on market: 21. The spring market is going to be interesting. What are you seeing in your market?", mediaCount: 0, mediaTypes: [], scheduledTime: "Feb 18, 11:00 AM", complianceStatus: "pass", complianceNotes: "All checks passed", submittedAt: "8 hours ago" },
    { id: "8", platform: "youtube", agentName: "Jessica Chen", agentAvatar: "JC", postType: "New Listing", content: "Full home tour of this incredible 5BR/4BA luxury property at 890 Ocean View Drive. Featuring panoramic ocean views, a gourmet kitchen, wine cellar, infinity pool, and more. Listed at $2.4M.", mediaCount: 1, mediaTypes: ["video"], scheduledTime: "Feb 19, 2:00 PM", complianceStatus: "pass", complianceNotes: "All checks passed", submittedAt: "1 day ago" },
  ]);

  const handleApprove = (id: string) => {
    setPendingPosts(pendingPosts.filter((p) => p.id !== id));
  };

  const handleReject = (id: string) => {
    setRejectPostId(id);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectPostId) {
      setPendingPosts(pendingPosts.filter((p) => p.id !== rejectPostId));
    }
    setShowRejectModal(false);
    setRejectPostId(null);
    setRejectReason("");
  };

  const handleBatchApprove = () => {
    setPendingPosts(pendingPosts.filter((p) => !selectedPosts.includes(p.id)));
    setSelectedPosts([]);
  };

  const togglePostSelection = (id: string) => {
    setSelectedPosts((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map((p) => p.id));
    }
  };

  const filteredPosts = pendingPosts.filter((p) => {
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterPostType !== "all" && p.postType !== filterPostType) return false;
    if (filterAgent !== "all" && p.agentName !== filterAgent) return false;
    return true;
  });

  const complianceBadge = (status: string, notes: string) => {
    switch (status) {
      case "pass":
        return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200" title={notes}><Shield className="w-3 h-3" /> Compliant</span>);
      case "warning":
        return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title={notes}><AlertTriangle className="w-3 h-3" /> Review</span>);
      case "fail":
        return (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200" title={notes}><XCircle className="w-3 h-3" /> Issue</span>);
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Approval Queue</h1>
            <p className="text-gray-500 mt-1">Review and approve agent social media posts before publishing</p>
          </div>
          {selectedPosts.length > 0 && (
            <button onClick={handleBatchApprove}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
              <Check className="w-4 h-4" /> Approve Selected ({selectedPosts.length})
            </button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Pending Approval</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-50"><Clock className="w-5 h-5 text-amber-600" /></div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.pendingApproval}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Approved Today</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(42,157,143,0.08)" }}><CheckCircle2 className="w-5 h-5" style={{ color: "var(--color-secondary, #2A9D8F)" }} /></div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.approvedToday}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500 font-medium">Rejected</span>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50"><XCircle className="w-5 h-5 text-red-500" /></div>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{stats.rejected}</p>
          </div>
        </div>

        {/* Filters and Batch Select */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="x">X</option>
              <option value="google">Google Business</option>
            </select>
            <select value={filterPostType} onChange={(e) => setFilterPostType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">All Types</option>
              <option value="New Listing">New Listing</option>
              <option value="Open House">Open House</option>
              <option value="Just Sold">Just Sold</option>
              <option value="Market Update">Market Update</option>
              <option value="Testimonial">Testimonial</option>
            </select>
            <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="all">All Agents</option>
              <option value="Sarah Mitchell">Sarah Mitchell</option>
              <option value="Mike Rodriguez">Mike Rodriguez</option>
              <option value="Jessica Chen">Jessica Chen</option>
              <option value="David Park">David Park</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0} onChange={selectAll} className="rounded border-gray-300" />
            <span className="text-sm text-gray-600">Select All</span>
          </label>
        </div>

        {/* Post Review Cards */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                <input type="checkbox" checked={selectedPosts.includes(post.id)} onChange={() => togglePostSelection(post.id)} className="mt-1 rounded border-gray-300" />
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: platformColors[post.platform] }}>
                  <PlatformIcon platform={post.platform} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: "var(--color-primary, #1B3A5C)" }}>{post.agentAvatar}</div>
                      <span className="text-sm font-semibold text-gray-800">{post.agentName}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{post.postType}</span>
                    {complianceBadge(post.complianceStatus, post.complianceNotes)}
                  </div>
                  <p className="text-sm text-gray-700 mb-3 line-clamp-3">{post.content}</p>

                  {post.complianceStatus !== "pass" && (
                    <div className={`p-2 rounded-lg mb-3 text-xs ${post.complianceStatus === "warning" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                      <strong>Compliance Note:</strong> {post.complianceNotes}
                    </div>
                  )}

                  {post.mediaCount > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      {post.mediaTypes.map((type, idx) => (
                        <div key={idx} className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          {type === "image" ? <ImageIcon className="w-4 h-4 text-gray-400" /> : <Video className="w-4 h-4 text-gray-400" />}
                        </div>
                      ))}
                      <span className="text-xs text-gray-500">{post.mediaCount} file{post.mediaCount > 1 ? "s" : ""}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled: {post.scheduledTime}</span>
                    <span>Submitted {post.submittedAt}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(post.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90"
                    style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => handleReject(post.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
                    <Edit3 className="w-3.5 h-3.5" /> Edit & Approve
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredPosts.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--color-secondary, #2A9D8F)" }} />
              <h3 className="text-lg font-semibold text-gray-800 mb-1">All Caught Up!</h3>
              <p className="text-sm text-gray-500">No posts pending approval matching your filters.</p>
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Reject Post</h2>
                <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="p-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Reason for Rejection</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
                  placeholder="Provide a reason so the agent can revise their post..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Quick reasons:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Compliance issue", "Inappropriate content", "Poor image quality", "Needs revision", "Missing disclaimer"].map((reason) => (
                      <button key={reason} onClick={() => setRejectReason(reason)}
                        className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200">{reason}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={confirmReject} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">Reject Post</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
