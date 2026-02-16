/**
 * Email Integration Provider
 *
 * Abstracts email service (Gmail, Outlook) behind a common interface.
 * Mock provider is used when no credentials are configured.
 */

// ---- Types ---- //

export interface EmailMessage {
  id: string;
  threadId?: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
  read: boolean;
  starred: boolean;
  labels: string[];
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface SendEmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; mimeType: string }[];
}

export interface EmailSearchOptions {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  after?: Date;
  before?: Date;
  hasAttachment?: boolean;
  label?: string;
  limit?: number;
  offset?: number;
}

export interface EmailFolder {
  id: string;
  name: string;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'custom';
  unreadCount: number;
  totalCount: number;
}

// ---- Interface ---- //

export interface EmailProvider {
  readonly name: string;

  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Messages
  getMessages(options?: EmailSearchOptions): Promise<{ messages: EmailMessage[]; total: number }>;
  getMessage(messageId: string): Promise<EmailMessage | null>;
  sendMessage(options: SendEmailOptions): Promise<{ messageId: string }>;
  replyToMessage(messageId: string, body: string, bodyHtml?: string): Promise<{ messageId: string }>;
  deleteMessage(messageId: string): Promise<void>;
  markAsRead(messageId: string): Promise<void>;
  markAsUnread(messageId: string): Promise<void>;
  starMessage(messageId: string): Promise<void>;
  unstarMessage(messageId: string): Promise<void>;

  // Folders/Labels
  getFolders(): Promise<EmailFolder[]>;

  // Search
  searchMessages(query: string, limit?: number): Promise<EmailMessage[]>;
}

// ---- Mock Implementation ---- //

export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';
  private connected = false;
  private messages: EmailMessage[] = [];
  private nextId = 1;

  constructor() {
    // Pre-populate with sample messages
    this.messages = [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        from: 'client@example.com',
        to: ['agent@demo.crestdesk.com'],
        subject: 'Interested in the NW Portland listing',
        body: 'Hi, I saw your listing at 2468 NW 23rd Ave and would love to schedule a showing.',
        date: new Date(Date.now() - 2 * 3600000),
        read: false,
        starred: false,
        labels: ['inbox'],
        attachments: [],
      },
      {
        id: 'msg-2',
        threadId: 'thread-2',
        from: 'title@example.com',
        to: ['agent@demo.crestdesk.com'],
        subject: 'Preliminary Title Report Ready',
        body: 'The preliminary title report for 5678 SE Hawthorne is ready for your review.',
        date: new Date(Date.now() - 24 * 3600000),
        read: true,
        starred: true,
        labels: ['inbox', 'important'],
        attachments: [{ id: 'att-1', filename: 'title-report.pdf', mimeType: 'application/pdf', size: 245000 }],
      },
      {
        id: 'msg-3',
        threadId: 'thread-3',
        from: 'lender@example.com',
        to: ['agent@demo.crestdesk.com'],
        subject: 'Pre-approval letter for Robert Johnson',
        body: 'Attached is the pre-approval letter for your buyer. Approved up to $550,000.',
        date: new Date(Date.now() - 48 * 3600000),
        read: true,
        starred: false,
        labels: ['inbox'],
        attachments: [{ id: 'att-2', filename: 'pre-approval.pdf', mimeType: 'application/pdf', size: 128000 }],
      },
    ];
  }

  async connect(_credentials: Record<string, string>): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMessages(options?: EmailSearchOptions): Promise<{ messages: EmailMessage[]; total: number }> {
    let filtered = [...this.messages];
    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (m) => m.subject.toLowerCase().includes(q) || m.body.toLowerCase().includes(q),
      );
    }
    if (options?.from) {
      filtered = filtered.filter((m) => m.from.includes(options.from!));
    }
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return { messages: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async getMessage(messageId: string): Promise<EmailMessage | null> {
    return this.messages.find((m) => m.id === messageId) ?? null;
  }

  async sendMessage(options: SendEmailOptions): Promise<{ messageId: string }> {
    const id = `msg-${++this.nextId}`;
    this.messages.push({
      id,
      from: 'agent@demo.crestdesk.com',
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      body: options.body,
      bodyHtml: options.bodyHtml,
      date: new Date(),
      read: true,
      starred: false,
      labels: ['sent'],
      attachments: [],
    });
    return { messageId: id };
  }

  async replyToMessage(messageId: string, body: string, _bodyHtml?: string): Promise<{ messageId: string }> {
    const original = this.messages.find((m) => m.id === messageId);
    const id = `msg-${++this.nextId}`;
    this.messages.push({
      id,
      threadId: original?.threadId,
      from: 'agent@demo.crestdesk.com',
      to: original ? [original.from] : [],
      subject: `Re: ${original?.subject ?? ''}`,
      body,
      date: new Date(),
      read: true,
      starred: false,
      labels: ['sent'],
      attachments: [],
    });
    return { messageId: id };
  }

  async deleteMessage(messageId: string): Promise<void> {
    this.messages = this.messages.filter((m) => m.id !== messageId);
  }

  async markAsRead(messageId: string): Promise<void> {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) msg.read = true;
  }

  async markAsUnread(messageId: string): Promise<void> {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) msg.read = false;
  }

  async starMessage(messageId: string): Promise<void> {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) msg.starred = true;
  }

  async unstarMessage(messageId: string): Promise<void> {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) msg.starred = false;
  }

  async getFolders(): Promise<EmailFolder[]> {
    return [
      { id: 'inbox', name: 'Inbox', type: 'inbox', unreadCount: this.messages.filter((m) => !m.read).length, totalCount: this.messages.filter((m) => m.labels.includes('inbox')).length },
      { id: 'sent', name: 'Sent', type: 'sent', unreadCount: 0, totalCount: this.messages.filter((m) => m.labels.includes('sent')).length },
      { id: 'drafts', name: 'Drafts', type: 'drafts', unreadCount: 0, totalCount: 0 },
      { id: 'trash', name: 'Trash', type: 'trash', unreadCount: 0, totalCount: 0 },
    ];
  }

  async searchMessages(query: string, limit = 20): Promise<EmailMessage[]> {
    const { messages } = await this.getMessages({ query, limit });
    return messages;
  }
}

// ---- Gmail Implementation (stub for OAuth integration) ---- //

export class GmailProvider implements EmailProvider {
  readonly name = 'gmail';
  private connected = false;

  async connect(_credentials: Record<string, string>): Promise<void> {
    // In production: use Google OAuth2 tokens to authenticate
    // const { clientId, clientSecret, refreshToken } = credentials;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMessages(_options?: EmailSearchOptions): Promise<{ messages: EmailMessage[]; total: number }> {
    // In production: call Gmail API GET /gmail/v1/users/me/messages
    return { messages: [], total: 0 };
  }

  async getMessage(_messageId: string): Promise<EmailMessage | null> {
    return null;
  }

  async sendMessage(_options: SendEmailOptions): Promise<{ messageId: string }> {
    throw new Error('Gmail provider not fully implemented. Configure OAuth credentials.');
  }

  async replyToMessage(_messageId: string, _body: string): Promise<{ messageId: string }> {
    throw new Error('Gmail provider not fully implemented.');
  }

  async deleteMessage(_messageId: string): Promise<void> {
    throw new Error('Gmail provider not fully implemented.');
  }

  async markAsRead(_messageId: string): Promise<void> {}
  async markAsUnread(_messageId: string): Promise<void> {}
  async starMessage(_messageId: string): Promise<void> {}
  async unstarMessage(_messageId: string): Promise<void> {}

  async getFolders(): Promise<EmailFolder[]> {
    return [];
  }

  async searchMessages(_query: string, _limit?: number): Promise<EmailMessage[]> {
    return [];
  }
}

// ---- Outlook Implementation (stub for Microsoft Graph) ---- //

export class OutlookProvider implements EmailProvider {
  readonly name = 'outlook';
  private connected = false;

  async connect(_credentials: Record<string, string>): Promise<void> {
    // In production: use Microsoft Graph API with OAuth2
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getMessages(_options?: EmailSearchOptions): Promise<{ messages: EmailMessage[]; total: number }> {
    return { messages: [], total: 0 };
  }

  async getMessage(_messageId: string): Promise<EmailMessage | null> {
    return null;
  }

  async sendMessage(_options: SendEmailOptions): Promise<{ messageId: string }> {
    throw new Error('Outlook provider not fully implemented. Configure Microsoft Graph credentials.');
  }

  async replyToMessage(_messageId: string, _body: string): Promise<{ messageId: string }> {
    throw new Error('Outlook provider not fully implemented.');
  }

  async deleteMessage(_messageId: string): Promise<void> {
    throw new Error('Outlook provider not fully implemented.');
  }

  async markAsRead(_messageId: string): Promise<void> {}
  async markAsUnread(_messageId: string): Promise<void> {}
  async starMessage(_messageId: string): Promise<void> {}
  async unstarMessage(_messageId: string): Promise<void> {}

  async getFolders(): Promise<EmailFolder[]> {
    return [];
  }

  async searchMessages(_query: string, _limit?: number): Promise<EmailMessage[]> {
    return [];
  }
}

// ---- Factory ---- //

export type EmailProviderType = 'gmail' | 'outlook' | 'mock';

export function createEmailProvider(type: EmailProviderType = 'mock'): EmailProvider {
  switch (type) {
    case 'gmail':
      return new GmailProvider();
    case 'outlook':
      return new OutlookProvider();
    case 'mock':
    default:
      return new MockEmailProvider();
  }
}
