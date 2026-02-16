"use client";

import { useState } from "react";
import {
  Facebook, Instagram, Linkedin, Youtube, Music2, Twitter, Building2,
  RefreshCw, ExternalLink, Link2, Unlink, CheckCircle2, AlertTriangle,
  XCircle, Users, FileText, Globe, Settings, Shield,
} from "lucide-react";

interface PlatformConnection {
  key: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  connected: boolean;
  accountName: string;
  profileUrl: string;
  followers: number;
  postCount: number;
  lastSync: string;
  health: "healthy" | "warning" | "error";
  healthNote: string;
}

interface ContentRule {
  postType: string;
  autoPublish: boolean;
  brokerApproval: boolean;
  platforms: string[];
}

export default function ConnectionsPage() {
  const [refreshing, setRefreshing] = useState(false);

  const [connections, setConnections] = useState<PlatformConnection[]>([
    { key: "facebook", name: "Facebook", icon: Facebook, color: "#1877F2", connected: true, accountName: "Coastal Crest Realty", profileUrl: "facebook.com/coastalcrestrealty", followers: 12400, postCount: 342, lastSync: "2 minutes ago", health: "healthy", healthNote: "All systems operational" },
    { key: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F", connected: true, accountName: "@coastalcrest_realty", profileUrl: "instagram.com/coastalcrest_realty", followers: 18200, postCount: 567, lastSync: "2 minutes ago", health: "healthy", healthNote: "All systems operational" },
    { key: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0A66C2", connected: true, accountName: "Coastal Crest Realty LLC", profileUrl: "linkedin.com/company/coastalcrest", followers: 5600, postCount: 189, lastSync: "5 minutes ago", health: "healthy", healthNote: "All systems operational" },
    { key: "youtube", name: "YouTube", icon: Youtube, color: "#FF0000", connected: true, accountName: "Coastal Crest Realty", profileUrl: "youtube.com/@coastalcrestrealty", followers: 3200, postCount: 45, lastSync: "2 hours ago", health: "warning", healthNote: "API rate limit approaching. Token refresh needed within 7 days." },
    { key: "tiktok", name: "TikTok", icon: Music2, color: "#000000", connected: true, accountName: "@coastalcrest", profileUrl: "tiktok.com/@coastalcrest", followers: 8900, postCount: 78, lastSync: "10 minutes ago", health: "healthy", healthNote: "All systems operational" },
    { key: "x", name: "X (Twitter)", icon: Twitter, color: "#1DA1F2", connected: true, accountName: "@CoastalCrestRE", profileUrl: "x.com/CoastalCrestRE", followers: 4100, postCount: 892, lastSync: "3 minutes ago", health: "healthy", healthNote: "All systems operational" },
    { key: "google", name: "Google Business", icon: Building2, color: "#4285F4", connected: false, accountName: "", profileUrl: "", followers: 0, postCount: 0, lastSync: "Never", health: "error", healthNote: "Account not connected. Connect to manage your Google Business profile." },
  ]);

  const [contentRules] = useState<ContentRule[]>([
    { postType: "New Listing", autoPublish: false, brokerApproval: true, platforms: ["facebook", "instagram", "linkedin"] },
    { postType: "Open House", autoPublish: false, brokerApproval: true, platforms: ["facebook", "instagram"] },
    { postType: "Under Contract", autoPublish: true, brokerApproval: false, platforms: ["facebook", "instagram"] },
    { postType: "Just Sold", autoPublish: false, brokerApproval: true, platforms: ["facebook", "instagram", "linkedin"] },
    { postType: "Market Update", autoPublish: false, brokerApproval: true, platforms: ["linkedin", "facebook"] },
    { postType: "Testimonial", autoPublish: false, brokerApproval: true, platforms: ["instagram", "facebook", "google"] },
    { postType: "Custom Post", autoPublish: false, brokerApproval: true, platforms: ["all"] },
  ]);

  const handleRefreshAll = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const handleToggleConnection = (key: string) => {
    setConnections(connections.map((c) => {
      if (c.key === key) {
        return c.connected
          ? { ...c, connected: false, accountName: "", profileUrl: "", followers: 0, postCount: 0, lastSync: "Never", health: "error" as const, healthNote: "Account disconnected" }
          : { ...c, connected: true, accountName: "Demo Account", profileUrl: "#", followers: 0, postCount: 0, lastSync: "Just now", health: "healthy" as const, healthNote: "Just connected" };
      }
      return c;
    }));
  };

  const healthIcon = (health: string) => {
    switch (health) {
      case "healthy": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "error": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Platform Connections</h1>
            <p className="text-gray-500 mt-1">Manage your social media account connections and publishing rules</p>
          </div>
          <button onClick={handleRefreshAll}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors ${refreshing ? "opacity-50 pointer-events-none" : ""}`}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh All Connections
          </button>
        </div>

        {/* Platform Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((platform) => {
            const Icon = platform.icon;
            return (
              <div key={platform.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: platform.color }}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{platform.name}</h3>
                      {platform.connected ? (
                        <p className="text-sm text-gray-500">{platform.accountName}</p>
                      ) : (
                        <p className="text-sm text-gray-400">Not connected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {healthIcon(platform.health)}
                    <span className={`text-xs font-medium ${platform.health === "healthy" ? "text-green-600" : platform.health === "warning" ? "text-amber-600" : "text-red-500"}`}>
                      {platform.health === "healthy" ? "Healthy" : platform.health === "warning" ? "Warning" : "Disconnected"}
                    </span>
                  </div>
                </div>

                {platform.connected ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-lg font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{platform.followers.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Followers</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-lg font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>{platform.postCount}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Posts</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50">
                        <p className="text-xs font-medium text-gray-700 mt-1">{platform.lastSync}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Last Sync</p>
                      </div>
                    </div>

                    {platform.health === "warning" && (
                      <div className="p-2 rounded-lg bg-amber-50 text-xs text-amber-700 mb-4">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />{platform.healthNote}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <a href="#" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: "var(--color-secondary, #2A9D8F)" }}>
                        <ExternalLink className="w-3 h-3" /> {platform.profileUrl}
                      </a>
                      <button onClick={() => handleToggleConnection(platform.key)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                        <Unlink className="w-3.5 h-3.5" /> Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">{platform.healthNote}</p>
                    <button onClick={() => handleToggleConnection(platform.key)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: platform.color }}>
                      <Link2 className="w-4 h-4" /> Connect {platform.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content Rules */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Content Publishing Rules</h2>
              <p className="text-sm text-gray-500 mt-1">Configure auto-publish and approval requirements per post type</p>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50">
              <Settings className="w-3.5 h-3.5" /> Edit Rules
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Post Type</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Auto-Publish</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Broker Approval</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase">Applicable Platforms</th>
                </tr>
              </thead>
              <tbody>
                {contentRules.map((rule) => (
                  <tr key={rule.postType} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="text-sm font-medium text-gray-800">{rule.postType}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rule.autoPublish ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          <XCircle className="w-3 h-3" /> No
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {rule.brokerApproval ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                          <Shield className="w-3 h-3" /> Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Not Required
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {rule.platforms.includes("all") ? (
                          <span className="text-xs text-gray-500 font-medium">All Platforms</span>
                        ) : (
                          rule.platforms.map((p) => {
                            const conn = connections.find((c) => c.key === p);
                            if (!conn) return null;
                            const PIcon = conn.icon;
                            return (
                              <div key={p} className="w-6 h-6 rounded flex items-center justify-center text-white" style={{ backgroundColor: conn.color }} title={conn.name}>
                                <PIcon className="w-3 h-3" />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Connection Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-primary, #1B3A5C)" }}>Connection Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Connected</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{connections.filter((c) => c.connected).length}</p>
              <p className="text-xs text-green-600 mt-1">platforms active and syncing</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Warnings</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{connections.filter((c) => c.health === "warning").length}</p>
              <p className="text-xs text-amber-600 mt-1">platforms need attention</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-semibold text-red-800">Disconnected</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{connections.filter((c) => !c.connected).length}</p>
              <p className="text-xs text-red-500 mt-1">platforms not connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* Extended connection details - additional helper components and sections can be added below */

/* 
  Usage Notes:
  - Platform connections are managed via OAuth2 flows in production
  - Content rules sync with the compliance engine for broker-level controls
  - Health monitoring runs every 5 minutes with automatic token refresh
  - Connection status changes trigger webhook notifications to admins
  - All platform API tokens are stored in AWS Secrets Manager
  - Rate limit tracking is per-platform with configurable thresholds
  - Disconnection requires confirmation and notifies affected scheduled posts
  
  Platform-Specific Notes:
  - Facebook: Uses Graph API v19.0, Page tokens with manage_pages scope
  - Instagram: Requires Facebook Business account linkage
  - LinkedIn: Uses Marketing API with rw_organization_admin scope
  - YouTube: Uses Data API v3 with upload scope
  - TikTok: Uses Content Posting API with video.upload scope
  - X: Uses API v2 with tweet.write scope
  - Google Business: Uses Business Profile API with locations scope
  
  Content Rules Engine:
  - Rules cascade: Platform defaults < Brokerage rules < Agent overrides
  - Auto-publish requires compliance pre-check pass
  - Broker approval queue supports batch operations
  - Rule changes are audited and require admin confirmation
  - Emergency kill switch available for all auto-publish rules
*/
