"use client";

import { useState } from "react";
import {
  ArrowLeft, Reply, ReplyAll, Forward, Star, Archive,
  Trash2, MoreHorizontal, Paperclip, Download, Wand2,
  ChevronDown, ChevronUp,
} from "lucide-react";

interface ThreadMessage {
  id: string;
  fromName: string;
  fromAddress: string;
  toAddresses: string[];
  bodyHtml: string;
  receivedAt: string;
  attachments: Array<{ name: string; size: string }>;
  isExpanded: boolean;
}

export default function EmailThreadPage() {
  const [isStarred, setIsStarred] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([
    {
      id: "1", fromName: "Sarah Mitchell", fromAddress: "sarah@coastalhomes.com",
      toAddresses: ["kris@coastalcrest.net"],
      bodyHtml: "<p>Hi Kris,</p><p>I've attached the inspection report for 742 Evergreen Terrace. The inspector noted a few items to discuss before the buyer's response deadline:</p><ul><li>Roof — Minor wear on south-facing shingles (3-5 years remaining)</li><li>HVAC — System functional but 15 years old, may need replacement in 2-3 years</li><li>Foundation — Small hairline crack, inspector says non-structural</li><li>Plumbing — All fixtures passed, water heater is 8 years old</li></ul><p>Buyers may request an HVAC credit. Let me know your thoughts.</p><p>Best,<br/>Sarah Mitchell<br/>Coastal Homes Realty</p>",
      receivedAt: "Today, 10:23 AM",
      attachments: [{ name: "742_Evergreen_Inspection.pdf", size: "2.4 MB" }, { name: "Inspection_Photos.zip", size: "15.8 MB" }],
      isExpanded: true,
    },
    {
      id: "2", fromName: "Kris Rohde", fromAddress: "kris@coastalcrest.net",
      toAddresses: ["sarah@coastalhomes.com"],
      bodyHtml: "<p>Hi Sarah,</p><p>Thanks for sending this over. I'll review the report this afternoon and discuss with my client. The HVAC credit request seems reasonable — I'll prepare a response strategy.</p><p>Can we schedule a call tomorrow morning?</p><p>Best,<br/>Kris Rohde<br/>Coastal Crest Realty LLC</p>",
      receivedAt: "Yesterday, 3:45 PM", attachments: [], isExpanded: false,
    },
    {
      id: "3", fromName: "Sarah Mitchell", fromAddress: "sarah@coastalhomes.com",
      toAddresses: ["kris@coastalcrest.net"],
      bodyHtml: "<p>Hi Kris,</p><p>The inspection for 742 Evergreen Terrace is scheduled for tomorrow at 10 AM. I'll send the report as soon as it's available.</p><p>Thanks,<br/>Sarah</p>",
      receivedAt: "Feb 13, 9:15 AM", attachments: [], isExpanded: false,
    },
  ]);

  const [aiSummary] = useState({
    summary: "Discussion about the inspection report for 742 Evergreen Terrace. Inspector found minor roof wear, aging HVAC, non-structural foundation crack, and acceptable plumbing. Buyers may request HVAC credit. Next: schedule call to discuss response.",
    sentiment: "Neutral-Positive",
    actionItems: ["Review full inspection report", "Discuss HVAC credit with seller", "Schedule call with Sarah tomorrow AM", "Prepare response before Friday deadline"],
  });

  const toggleMessage = (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, isExpanded: !m.isExpanded } : m));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-4">
          <a href="/dashboard/email" className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"><ArrowLeft className="w-5 h-5" /></a>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: "var(--color-primary, #1B3A5C)" }}>RE: 742 Evergreen Terrace - Inspection Report</h1>
            <p className="text-xs text-gray-400">{messages.length} messages in this thread</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsStarred(!isStarred)} className="p-2 rounded-lg hover:bg-gray-200"><Star className={`w-4 h-4 ${isStarred ? "fill-amber-400 text-amber-400" : "text-gray-400"}`} /></button>
            <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-400"><Archive className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-400"><Trash2 className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg hover:bg-gray-200 text-gray-400"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-800">AI Thread Summary</h3>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">{aiSummary.sentiment}</span>
          </div>
          <p className="text-sm text-purple-700 mb-3">{aiSummary.summary}</p>
          <h4 className="text-xs font-semibold text-purple-600 mb-1.5">Action Items:</h4>
          <ul className="space-y-1">
            {aiSummary.actionItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-purple-700">
                <span className="w-4 h-4 rounded-full border border-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-purple-500">{idx + 1}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button onClick={() => toggleMessage(msg.id)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: msg.fromAddress.includes("coastalcrest") ? "var(--color-secondary, #2A9D8F)" : "var(--color-primary, #1B3A5C)" }}>
                  {msg.fromName.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{msg.fromName}</span>
                    <span className="text-xs text-gray-400">&lt;{msg.fromAddress}&gt;</span>
                  </div>
                  {!msg.isExpanded && <p className="text-xs text-gray-400 truncate mt-0.5">{msg.bodyHtml.replace(/<[^>]*>/g, "").substring(0, 120)}...</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{msg.receivedAt}</span>
                {msg.isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {msg.isExpanded && (
                <div className="px-5 pb-4">
                  <div className="text-xs text-gray-400 mb-3">To: {msg.toAddresses.join(", ")}</div>
                  <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: msg.bodyHtml }} />
                  {msg.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">Attachments ({msg.attachments.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                            <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                            <div><p className="text-xs font-medium text-gray-700">{att.name}</p><p className="text-[10px] text-gray-400">{att.size}</p></div>
                            <Download className="w-3.5 h-3.5 text-gray-400 ml-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"><Reply className="w-3.5 h-3.5" /> Reply</button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"><ReplyAll className="w-3.5 h-3.5" /> Reply All</button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"><Forward className="w-3.5 h-3.5" /> Forward</button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-medium text-purple-600 hover:bg-purple-50"><Wand2 className="w-3.5 h-3.5" /> AI Reply</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
