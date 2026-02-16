"use client";

import { useState } from "react";
import { ArrowLeft, Mail, Shield, Bell, Wand2, PenTool, Globe, Trash2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface EmailAccount {
  id: string; provider: string; email: string; displayName: string; isPrimary: boolean; connectionStatus: string; lastSyncAt: string;
}

export default function EmailSettingsPage() {
  const [accounts] = useState<EmailAccount[]>([
    { id: "1", provider: "gmail", email: "kris@coastalcrest.net", displayName: "Kris Rohde", isPrimary: true, connectionStatus: "active", lastSyncAt: "2 minutes ago" },
    { id: "2", provider: "outlook", email: "kris.rohde@outlook.com", displayName: "Kris Rohde", isPrimary: false, connectionStatus: "active", lastSyncAt: "15 minutes ago" },
  ]);

  const [aiPrefs, setAiPrefs] = useState({
    voiceTone: "professional", writingStyle: "concise", autoSummarize: true, suggestReplies: true, smartPriority: true, autoCategories: true,
  });

  const [notifications, setNotifications] = useState({
    newEmail: true, importantOnly: false, dailyDigest: true, weeklyReport: true,
  });

  const [signature, setSignature] = useState("Kris Rohde\nBroker/Owner, Coastal Crest Realty LLC\nPhone: (555) 123-4567\nEmail: kris@coastalcrest.net\nwww.coastalcrest.net");

  const providerColors: Record<string, { bg: string; text: string; label: string }> = {
    gmail: { bg: "bg-red-50", text: "text-red-600", label: "Gmail" },
    outlook: { bg: "bg-blue-50", text: "text-blue-600", label: "Outlook" },
    imap: { bg: "bg-gray-50", text: "text-gray-600", label: "IMAP" },
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${checked ? "left-5.5 translate-x-0" : "left-0.5"}`} style={{ left: checked ? "22px" : "2px" }} />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <a href="/dashboard/email" className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"><ArrowLeft className="w-5 h-5" /></a>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Email Settings</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage accounts, AI preferences, and notifications</p>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Mail className="w-5 h-5 text-gray-400" /><h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Connected Accounts</h2></div>
            <button className="text-sm font-medium hover:underline" style={{ color: "var(--color-secondary, #2A9D8F)" }}>+ Add Account</button>
          </div>
          <div className="space-y-3">
            {accounts.map((a) => {
              const p = providerColors[a.provider] || providerColors.imap;
              return (
                <div key={a.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.bg}`}><Globe className={`w-5 h-5 ${p.text}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{a.email}</p>
                      {a.isPrimary && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">Primary</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: p.bg.replace("bg-", ""), color: p.text.replace("text-", "") }} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.bg} ${p.text}`}>{p.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.connectionStatus === "active" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                      <span className="text-xs text-gray-400">Synced {a.lastSyncAt}</span>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><RefreshCw className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Writing Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4"><Wand2 className="w-5 h-5 text-purple-500" /><h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>AI Writing Preferences</h2></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Voice Tone</label>
              <select value={aiPrefs.voiceTone} onChange={(e) => setAiPrefs({ ...aiPrefs, voiceTone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                <option value="professional">Professional</option><option value="friendly">Friendly</option><option value="formal">Formal</option><option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Writing Style</label>
              <select value={aiPrefs.writingStyle} onChange={(e) => setAiPrefs({ ...aiPrefs, writingStyle: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                <option value="concise">Concise</option><option value="detailed">Detailed</option><option value="balanced">Balanced</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: "autoSummarize", label: "Auto-summarize incoming emails" },
              { key: "suggestReplies", label: "Suggest AI-powered replies" },
              { key: "smartPriority", label: "Smart priority inbox sorting" },
              { key: "autoCategories", label: "Auto-categorize by content type" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{label}</span>
                <Toggle checked={(aiPrefs as Record<string, boolean>)[key]} onChange={() => setAiPrefs({ ...aiPrefs, [key]: !(aiPrefs as Record<string, boolean>)[key] })} />
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-amber-500" /><h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Notification Preferences</h2></div>
          <div className="space-y-3">
            {[
              { key: "newEmail", label: "Notify on all new emails" },
              { key: "importantOnly", label: "Important emails only" },
              { key: "dailyDigest", label: "Daily email digest" },
              { key: "weeklyReport", label: "Weekly inbox report" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{label}</span>
                <Toggle checked={(notifications as Record<string, boolean>)[key]} onChange={() => setNotifications({ ...notifications, [key]: !(notifications as Record<string, boolean>)[key] })} />
              </div>
            ))}
          </div>
        </div>

        {/* Signature Editor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4"><PenTool className="w-5 h-5 text-gray-400" /><h2 className="text-lg font-semibold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Email Signature</h2></div>
          <textarea value={signature} onChange={(e) => setSignature(e.target.value)} rows={5} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-mono" />
          <div className="flex justify-end mt-3">
            <button className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>Save Signature</button>
          </div>
        </div>
      </div>
    </div>
  );
}
