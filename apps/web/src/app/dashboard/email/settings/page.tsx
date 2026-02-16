'use client';

import { useState } from 'react';
import {
  Mail, Settings, Wand2, Bell, Edit2, Unlink,
  CheckCircle2, RefreshCw, Shield, Save,
  ToggleLeft, ToggleRight, Globe, Sparkles,
  MessageSquare, BrainCircuit, Zap, Crown,
} from 'lucide-react';

interface ConnectedAccount {
  id: number;
  email: string;
  provider: string;
  providerColor: string;
  status: string;
  lastSync: string;
  isPrimary: boolean;
}

const mockAccounts: ConnectedAccount[] = [
  {
    id: 1,
    email: 'agent@crestdesk.com',
    provider: 'Gmail',
    providerColor: '#EA4335',
    status: 'Connected',
    lastSync: '2 minutes ago',
    isPrimary: true,
  },
  {
    id: 2,
    email: 'john@premierhomes.com',
    provider: 'Outlook',
    providerColor: '#0078D4',
    status: 'Connected',
    lastSync: '15 minutes ago',
    isPrimary: false,
  },
];

export default function EmailSettingsPage() {
  const [accounts] = useState(mockAccounts);
  const [voiceTone, setVoiceTone] = useState('Professional');
  const [writingStyle, setWritingStyle] = useState('Concise');
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [suggestReplies, setSuggestReplies] = useState(true);
  const [smartPriority, setSmartPriority] = useState(true);
  const [notifyNewEmail, setNotifyNewEmail] = useState(true);
  const [notifyImportant, setNotifyImportant] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [signature, setSignature] = useState('Best regards,\nJohn Doe\nLicensed Real Estate Agent\nCoastal Crest Realty LLC\nPhone: (555) 123-4567\nEmail: agent@crestdesk.com');

  const voiceTones = ["Professional", "Friendly", "Casual", "Formal"];
  const writingStyles = ["Concise", "Detailed", "Conversational", "Bullet Points"];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" style={{ color: 'var(--color-primary, #1B3A5C)' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary, #1B3A5C)' }}>Email Settings</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Manage your email accounts, AI preferences, and notification settings</p>
        </div>

        {/* Connected Accounts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Mail className="w-5 h-5 text-gray-500" /> Connected Accounts</h2>
            <button className="text-sm font-medium hover:opacity-90" style={{ color: 'var(--color-secondary, #2A9D8F)' }}>+ Add Account</button>
          </div>
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: account.providerColor }}>
                  {account.provider[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{account.email}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{account.provider}</span>
                    {account.isPrimary && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex items-center gap-0.5"><Crown className="w-2.5 h-2.5" /> Primary</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {account.status}</span>
                    <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Synced {account.lastSync}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Disconnect"><Unlink className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4"><Wand2 className="w-5 h-5 text-purple-500" /> AI Preferences</h2>
          <div className="space-y-5">
            {/* Voice Tone */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2"><MessageSquare className="w-4 h-4 text-gray-400" /> Voice Tone</label>
              <div className="flex flex-wrap gap-2">
                {voiceTones.map((tone) => (
                  <button key={tone} onClick={() => setVoiceTone(tone)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${voiceTone === tone ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{tone}</button>
                ))}
              </div>
            </div>
            {/* Writing Style */}
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2"><Globe className="w-4 h-4 text-gray-400" /> Writing Style</label>
              <div className="flex flex-wrap gap-2">
                {writingStyles.map((style) => (
                  <button key={style} onClick={() => setWritingStyle(style)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${writingStyle === style ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{style}</button>
                ))}
              </div>
            </div>
            {/* AI Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /><span className="text-sm text-gray-700">Auto-summarize threads</span></div>
                <button onClick={() => setAutoSummarize(!autoSummarize)}>{autoSummarize ? <ToggleRight className="w-8 h-8 text-[#2A9D8F]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}</button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><BrainCircuit className="w-4 h-4 text-purple-400" /><span className="text-sm text-gray-700">Suggest smart replies</span></div>
                <button onClick={() => setSuggestReplies(!suggestReplies)}>{suggestReplies ? <ToggleRight className="w-8 h-8 text-[#2A9D8F]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}</button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400" /><span className="text-sm text-gray-700">Smart priority sorting</span></div>
                <button onClick={() => setSmartPriority(!smartPriority)}>{smartPriority ? <ToggleRight className="w-8 h-8 text-[#2A9D8F]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-gray-500" /> Notification Preferences</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">New email notifications</p>
                <p className="text-xs text-gray-400">Get notified when you receive new emails</p>
              </div>
              <button onClick={() => setNotifyNewEmail(!notifyNewEmail)}>{notifyNewEmail ? <ToggleRight className="w-8 h-8 text-[#2A9D8F]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Important email alerts</p>
                <p className="text-xs text-gray-400">Priority alerts for urgent or flagged emails</p>
              </div>
              <button onClick={() => setNotifyImportant(!notifyImportant)}>{notifyImportant ? <ToggleRight className="w-8 h-8 text-[#2A9D8F]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Daily digest</p>
                <p className="text-xs text-gray-400">Receive a daily summary of email activity</p>
              </div>
              <button onClick={() => setDailyDigest(!dailyDigest)}>{dailyDigest ? <ToggleRight className="w-8 h-8 text-[#2A9D8F]" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}</button>
            </div>
          </div>
        </div>

        {/* Email Signature */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-gray-500" /> Email Signature</h2>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            rows={6}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20 focus:border-[#2A9D8F] resize-none"
          />
          <p className="text-xs text-gray-400 mt-2">This signature will be appended to all outgoing emails</p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90" style={{ backgroundColor: 'var(--color-secondary, #2A9D8F)' }}>
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
