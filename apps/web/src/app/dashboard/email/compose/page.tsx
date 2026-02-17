'use client';

import { useState, useEffect } from 'react';
import {
  Send, Paperclip, X, ChevronDown, Bold, Italic, Link, List, Image,
  Sparkles, FileText, Users, Building2, Clock, Trash2, Save, Calendar,
  CheckCircle2, RefreshCw, AlertTriangle, Type, Smile
} from 'lucide-react';

const accounts = [
  { id: 1, email: 'agent@crestdesk.com', name: 'Work Email' },
  { id: 2, email: 'john.doe@gmail.com', name: 'Personal' },
  { id: 3, email: 'john@premierhomes.com', name: 'Brokerage' },
];

const contactSuggestions = [
  { name: 'Sarah Johnson', email: 'sarah.j@homebuyers.com' },
  { name: 'Mike Chen', email: 'mike.chen@outlook.com' },
  { name: 'Lisa Rodriguez', email: 'lisa.r@titleco.com' },
  { name: 'David Park', email: 'david.park@gmail.com' },
  { name: 'Robert Kim', email: 'r.kim@lenderplus.com' },
  { name: 'Amanda Torres', email: 'amanda.t@inspection.com' },
];

const toneOptions = ['Professional', 'Friendly', 'Firm', 'Urgent'];

const templateCategories = ['Introduction', 'Follow-Up', 'Offer', 'Counter-Offer', 'Closing', 'Thank You'];
const templates = [
  { id: 1, name: 'New Listing Introduction', category: 'Introduction', subject: 'Exciting New Listing at {{property_address}}' },
  { id: 2, name: 'Offer Follow-Up', category: 'Follow-Up', subject: 'Following Up on Your Offer - {{property_address}}' },
  { id: 3, name: 'Closing Congratulations', category: 'Closing', subject: 'Congratulations on Your New Home!' },
];

const mockAttachments = [
  { name: 'Comparable_Market_Analysis.pdf', size: '2.1 MB' },
];

const transactions = [
  { id: 1, name: '742 Evergreen Terrace' },
  { id: 2, name: '1850 Oak Avenue' },
  { id: 3, name: '2210 Birch Lane' },
];

export default function EmailComposePage() {
  const [fromAccount, setFromAccount] = useState(accounts[0].email);
  const [toRecipients, setToRecipients] = useState(['sarah.j@homebuyers.com']);
  const [toInput, setToInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState([] as string[]);
  const [bccRecipients, setBccRecipients] = useState([] as string[]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState(mockAttachments);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiTone, setAiTone] = useState('Professional');
  const [aiPurpose, setAiPurpose] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDraftReady, setAiDraftReady] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [linkedTransaction, setLinkedTransaction] = useState('');
  const [complianceStatus] = useState('passed');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t); }, []);

  const addRecipient = (email: string) => {
    if (!toRecipients.includes(email)) setToRecipients([...toRecipients, email]);
    setToInput(''); setShowSuggestions(false);
  };
  const removeRecipient = (email: string) => setToRecipients(toRecipients.filter(r => r !== email));
  const removeAttachment = (name: string) => setAttachments(attachments.filter(a => a.name !== name));

  const generateAiDraft = () => {
    setAiGenerating(true);
    setTimeout(() => {
      setBody('Dear Sarah,

Thank you for your continued interest in 742 Evergreen Terrace. I have reviewed the revised offer with my clients.

After careful consideration, my clients are pleased with the direction and would like to discuss a few remaining terms. Specifically, they would appreciate a shorter inspection contingency period of 7 business days.

I believe we are very close to reaching an agreement. Would you be available for a call tomorrow to finalize the details?

Best regards,
John Doe
CrestDesk Realty');
      setAiGenerating(false);
      setAiDraftReady(true);
    }, 2000);
  };

  const filteredSuggestions = contactSuggestions.filter(c =>
    c.email.toLowerCase().includes(toInput.toLowerCase()) || c.name.toLowerCase().includes(toInput.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="w-12 h-12 border-4 border-[#1B3A5C] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Send className="w-6 h-6 text-[#1B3A5C]" />
            <h1 className="text-xl font-bold text-[#1B3A5C]">Compose Email</h1>
          </div>
          <div className="flex items-center gap-2">
            {complianceStatus === 'passed' && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Compliance: Passed
              </span>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 space-y-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500 w-16">From:</label>
              <select value={fromAccount} onChange={e => setFromAccount(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                {accounts.map(a => <option key={a.id} value={a.email}>{a.name} ({a.email})</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500 w-16">To:</label>
              <div className="flex-1 flex flex-wrap items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 min-h-[36px]">
                {toRecipients.map(r => (
                  <span key={r} className="inline-flex items-center gap-1 bg-[#1B3A5C]/10 text-[#1B3A5C] px-2 py-0.5 rounded text-xs">
                    {r}
                    <button onClick={() => removeRecipient(r)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <div className="relative flex-1">
                  <input type="text" value={toInput} placeholder="Add recipient..."
                    onChange={e => { setToInput(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
                    className="w-full text-sm outline-none min-w-[120px]" />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {filteredSuggestions.map(s => (
                        <button key={s.email} onClick={() => addRecipient(s.email)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-gray-400 ml-2">{s.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-[#2A9D8F] hover:underline">CC</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)} className="text-xs text-[#2A9D8F] hover:underline">BCC</button>}
              </div>
            </div>
            {showCc && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-16">CC:</label>
                <input type="text" placeholder="Add CC recipients..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-16">BCC:</label>
                <input type="text" placeholder="Add BCC recipients..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500 w-16">Subject:</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Email subject..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="border-b border-gray-100 px-4 py-2 flex items-center gap-1 bg-gray-50/50">
            <button className="p-1.5 hover:bg-gray-200 rounded"><Bold className="w-4 h-4 text-gray-600" /></button>
            <button className="p-1.5 hover:bg-gray-200 rounded"><Italic className="w-4 h-4 text-gray-600" /></button>
            <button className="p-1.5 hover:bg-gray-200 rounded"><Link className="w-4 h-4 text-gray-600" /></button>
            <button className="p-1.5 hover:bg-gray-200 rounded"><List className="w-4 h-4 text-gray-600" /></button>
            <button className="p-1.5 hover:bg-gray-200 rounded"><Image className="w-4 h-4 text-gray-600" /></button>
            <button className="p-1.5 hover:bg-gray-200 rounded"><Type className="w-4 h-4 text-gray-600" /></button>
            <button className="p-1.5 hover:bg-gray-200 rounded"><Smile className="w-4 h-4 text-gray-600" /></button>
            <div className="flex-1" />
            <div className="relative">
              <button onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="flex items-center gap-1.5 text-xs text-[#2A9D8F] hover:bg-[#2A9D8F]/10 px-2.5 py-1.5 rounded">
                <FileText className="w-3.5 h-3.5" /> Use Template <ChevronDown className="w-3 h-3" />
              </button>
              {showTemplateDropdown && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => { setSubject(t.subject); setShowTemplateDropdown(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50">
                      <span className="font-medium">{t.name}</span>
                      <span className="block text-xs text-gray-400">{t.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-4">
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your email here..." rows={14}
              className="w-full border border-gray-200 rounded-lg p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30" />
          </div>
          <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-[#1B3A5C]/5 to-[#2A9D8F]/5 border border-[#2A9D8F]/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#2A9D8F]" />
              <h3 className="text-sm font-semibold text-[#1B3A5C]">AI Draft Assistant</h3>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tone</label>
                <select value={aiTone} onChange={e => setAiTone(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm">
                  {toneOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Purpose / Context</label>
                <input type="text" value={aiPurpose} onChange={e => setAiPurpose(e.target.value)}
                  placeholder="e.g., Counter-offer response for 742 Evergreen..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={generateAiDraft} disabled={aiGenerating}
                className="flex items-center gap-2 bg-[#2A9D8F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#238b7e] disabled:opacity-50">
                {aiGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
              {aiDraftReady && (
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Accept
                  </button>
                  <button onClick={generateAiDraft} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">
                    <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> Regenerate
                  </button>
                  <button className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>
          {attachments.length > 0 && (
            <div className="mx-4 mb-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Attachments</h4>
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                    <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                    <span>{a.name}</span>
                    <span className="text-xs text-gray-400">{a.size}</span>
                    <button onClick={() => removeAttachment(a.name)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                ))}
                <button className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
                  <Paperclip className="w-3.5 h-3.5" /> Add File
                </button>
              </div>
            </div>
          )}
          <div className="mx-4 mb-4 flex items-center gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Link Transaction</label>
              <select value={linkedTransaction} onChange={e => setLinkedTransaction(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                <option value="">None</option>
                {transactions.map(t => <option key={t.id} value={t.id.toString()}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Link Contact</label>
              <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                <option value="">None</option>
                {contactSuggestions.map(c => <option key={c.email} value={c.email}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 bg-gray-50/50 rounded-b-xl">
            <button className="flex items-center gap-2 bg-[#1B3A5C] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#15304d]">
              <Send className="w-4 h-4" /> Send
            </button>
            <button className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              <Calendar className="w-4 h-4" /> Schedule Send
            </button>
            <div className="flex-1" />
            <button className="flex items-center gap-2 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
