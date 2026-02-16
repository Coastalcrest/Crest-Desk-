"use client";

import { useState } from "react";
import {
  Send, Paperclip, Wand2, X, ChevronDown,
  Bold, Italic, Underline, List, Link2, Image,
  Clock, FileText, ArrowLeft,
} from "lucide-react";

export default function EmailComposePage() {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("kris@coastalcrest.net");
  const [showAiPanel, setShowAiPanel] = useState(false);

  const [accounts] = useState([
    { email: "kris@coastalcrest.net", label: "Primary" },
    { email: "kris.rohde@gmail.com", label: "Personal" },
  ]);

  const [templates] = useState([
    { id: "1", name: "New Listing Announcement", category: "Marketing" },
    { id: "2", name: "Open House Invitation", category: "Marketing" },
    { id: "3", name: "Offer Received Notification", category: "Transaction" },
    { id: "4", name: "Closing Congratulations", category: "Transaction" },
    { id: "5", name: "Follow-Up After Showing", category: "Follow-Up" },
    { id: "6", name: "Market Update Monthly", category: "Newsletter" },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <a href="/dashboard/email" className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-primary, #1B3A5C)" }}>Compose Email</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* From */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
            <label className="text-sm font-medium text-gray-500 w-16">From</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="flex-1 text-sm text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer">
              {accounts.map((a) => (<option key={a.email} value={a.email}>{a.email} ({a.label})</option>))}
            </select>
          </div>

          {/* To */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
            <label className="text-sm font-medium text-gray-500 w-16">To</label>
            <input type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient email addresses..." className="flex-1 text-sm text-gray-800 bg-transparent border-none focus:outline-none placeholder-gray-400" />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {!showCc && <button onClick={() => setShowCc(true)} className="hover:text-gray-600">Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)} className="hover:text-gray-600">Bcc</button>}
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
              <label className="text-sm font-medium text-gray-500 w-16">Cc</label>
              <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Cc recipients..." className="flex-1 text-sm text-gray-800 bg-transparent border-none focus:outline-none placeholder-gray-400" />
              <button onClick={() => { setShowCc(false); setCc(""); }} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
              <label className="text-sm font-medium text-gray-500 w-16">Bcc</label>
              <input type="text" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="Bcc recipients..." className="flex-1 text-sm text-gray-800 bg-transparent border-none focus:outline-none placeholder-gray-400" />
              <button onClick={() => { setShowBcc(false); setBcc(""); }} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
            <label className="text-sm font-medium text-gray-500 w-16">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." className="flex-1 text-sm text-gray-800 bg-transparent border-none focus:outline-none placeholder-gray-400" />
          </div>

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-100 bg-gray-50/50">
            {[Bold, Italic, Underline].map((Icon, i) => (<button key={i} className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Icon className="w-4 h-4" /></button>))}
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><List className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Link2 className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Image className="w-4 h-4" /></button>
            <div className="flex-1" />
            <button onClick={() => setShowAiPanel(!showAiPanel)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showAiPanel ? "bg-purple-100 text-purple-700" : "text-gray-500 hover:bg-gray-200"}`}>
              <Wand2 className="w-3.5 h-3.5" /> AI Assist
            </button>
          </div>

          {showAiPanel && (
            <div className="px-6 py-4 bg-purple-50/50 border-b border-purple-100">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-purple-800">AI Email Assistant</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Draft professional response", "Make more concise", "Adjust tone (friendly)", "Fix grammar & spelling"].map((label) => (
                  <button key={label} className="text-left px-3 py-2 rounded-lg border border-purple-200 bg-white text-xs text-purple-700 hover:bg-purple-50 transition-colors">{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." className="w-full px-6 py-4 text-sm text-gray-800 bg-transparent border-none focus:outline-none resize-none placeholder-gray-400 min-h-[320px]" />

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-500" title="Attach file"><Paperclip className="w-4 h-4" /></button>
              <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-500" title="Use template"><FileText className="w-4 h-4" /></button>
              <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-500" title="Schedule send"><Clock className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Save Draft</button>
              <button className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: "var(--color-secondary, #2A9D8F)" }}>
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Templates</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {templates.map((t) => (
              <button key={t.id} className="text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-xs">
                <p className="font-medium text-gray-700 truncate">{t.name}</p>
                <p className="text-gray-400 mt-0.5">{t.category}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
