'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  MessageCircle, X, Send, ThumbsUp, ThumbsDown,
  Bot, Sparkles, HelpCircle, Ticket, ChevronDown,
  Loader2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'up' | 'down';
}

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/contacts': 'Contacts',
  '/dashboard/pipeline': 'Pipeline',
  '/dashboard/documents': 'Documents',
  '/dashboard/forms': 'Forms',
  '/dashboard/calendar': 'Calendar',
  '/dashboard/finance': 'Finance',
  '/dashboard/media': 'Media Studio',
  '/dashboard/email': 'Email Hub',
  '/dashboard/marketing': 'Marketing',
  '/dashboard/social': 'Social Media',
  '/dashboard/ai': 'CrestAI Copilot',
  '/dashboard/help': 'Help Center',
  '/dashboard/settings': 'Settings',
};

function getPageLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  for (const [path, label] of Object.entries(PAGE_LABELS)) {
    if (pathname.startsWith(path + '/')) return label;
  }
  return 'Dashboard';
}

const SUGGESTED_QUESTIONS = [
  'How do I create a new transaction?',
  'How do I send documents for signature?',
  'What compliance rules apply to my state?',
  'How do I connect my email account?',
];

export function AiChatPanel() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unresolved, setUnresolved] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPage = getPageLabel(pathname);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (in production, call /api/v1/ai-assist/conversations/:id/messages)
    setTimeout(() => {
      const lowerQ = trimmed.toLowerCase();
      let reply = '';

      if (lowerQ.includes('transaction') || lowerQ.includes('deal')) {
        reply = `Great question! To work with transactions on the **${currentPage}** page:\n\n1. Click **+ New Transaction** from the Transactions page\n2. Enter the property address\n3. CrestDesk auto-loads the correct state compliance rules\n4. Add parties, dates, and upload documents\n\nWould you like more details on any of these steps?`;
      } else if (lowerQ.includes('signature') || lowerQ.includes('sign')) {
        reply = 'To send documents for signature:\n\n1. Open the document in a transaction\n2. Click **Send for Signature**\n3. Add signers and place signature fields\n4. Set a deadline and click **Send**\n\nSigners receive a secure link via email and can sign on any device.';
      } else if (lowerQ.includes('compliance') || lowerQ.includes('rules') || lowerQ.includes('disclosure')) {
        reply = 'CrestDesk enforces compliance automatically at every level:\n\n• **Federal** — Fair Housing, RESPA, ESIGN, CAN-SPAM, TCPA\n• **State** — Auto-detected per property location\n• The stricter rule always wins\n\nCheck the Compliance page for your brokerage-wide status, or view per-transaction compliance in any deal.';
      } else if (lowerQ.includes('email') || lowerQ.includes('inbox')) {
        reply = 'To set up your email:\n\n1. Go to **Email > Settings**\n2. Click **+ Add Account**\n3. Choose Gmail or Outlook and authorize with one click\n\nOnce connected, all emails appear in your unified inbox and are automatically tagged to transactions and contacts.';
      } else if (lowerQ.includes('help') || lowerQ.includes('article')) {
        reply = 'You can browse our full Help Center at **Help** in the sidebar. It includes guides for:\n\n• Getting Started\n• Transactions & Documents\n• E-Signatures\n• Contacts & CRM\n• Compliance\n• Finance & Commissions\n• Email & Social Media';
      } else {
        reply = `I'm here to help with anything on the **${currentPage}** page! I can assist with:\n\n• Creating and managing transactions\n• Document uploads and e-signatures\n• Contact management and CRM\n• Compliance questions\n• Email and social media setup\n\nWhat would you like to know?`;
        setUnresolved((prev) => prev + 1);
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  };

  const handleFeedback = (msgId: string, type: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: type } : m))
    );
    if (type === 'down') {
      setUnresolved((prev) => prev + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (q: string) => {
    setInput(q);
    setTimeout(() => {
      setInput(q);
      handleSend();
    }, 50);
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          style={{ backgroundColor: 'var(--color-secondary, #2A9D8F)' }}
          title="CrestAssist — AI Help"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: 'var(--color-primary, #1B3A5C)' }}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-white" />
              <div>
                <h3 className="text-sm font-semibold text-white">CrestAssist</h3>
                <p className="text-[10px] text-white/60">AI Help Desk</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white/80">
                {currentPage}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="ml-1 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(42, 157, 143, 0.1)' }}
                >
                  <Sparkles className="h-6 w-6" style={{ color: 'var(--color-secondary, #2A9D8F)' }} />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">How can I help?</h4>
                <p className="mt-1 text-xs text-gray-500">
                  Ask me anything about CrestDesk
                </p>
                <div className="mt-4 space-y-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestedQuestion(q)}
                      className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'text-white'
                          : 'border border-gray-100 bg-gray-50 text-gray-800'
                      }`}
                      style={
                        msg.role === 'user'
                          ? { backgroundColor: 'var(--color-primary, #1B3A5C)' }
                          : undefined
                      }
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>
                      {msg.role === 'assistant' && (
                        <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-1.5">
                          <span className="mr-1 text-[10px] text-gray-400">Helpful?</span>
                          <button
                            onClick={() => handleFeedback(msg.id, 'up')}
                            className={`rounded p-0.5 transition-colors ${
                              msg.feedback === 'up'
                                ? 'bg-green-50 text-green-600'
                                : 'text-gray-300 hover:text-green-500'
                            }`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'down')}
                            className={`rounded p-0.5 transition-colors ${
                              msg.feedback === 'down'
                                ? 'bg-red-50 text-red-500'
                                : 'text-gray-300 hover:text-red-400'
                            }`}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Typing...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Escalation banner */}
          {unresolved >= 3 && (
            <div className="mx-4 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-800">
                Need more help? Create a support ticket for personalized assistance.
              </p>
              <button
                onClick={() => {
                  window.location.href = '/dashboard/help/tickets';
                }}
                className="mt-1 flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--color-secondary, #2A9D8F)' }}
              >
                <Ticket className="h-3 w-3" />
                Create Support Ticket
              </button>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => {
                window.location.href = '/dashboard/help';
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <HelpCircle className="h-3 w-3" />
              Help Articles
            </button>
            <button
              onClick={() => {
                window.location.href = '/dashboard/help/tickets';
              }}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Ticket className="h-3 w-3" />
              Support Tickets
            </button>
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]/30"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-secondary, #2A9D8F)' }}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
