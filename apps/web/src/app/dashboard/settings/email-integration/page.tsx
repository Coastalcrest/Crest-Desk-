'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Check,
  Copy,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Bell,
  Inbox,
  Settings2,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { addToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectedEmail {
  id: string;
  provider: 'gmail' | 'outlook';
  email: string;
  status: 'active' | 'error' | 'expired';
  connectedAt: string;
}

interface TransactionEmail {
  id: string;
  transactionId: string;
  address: string;
  dealEmail: string;
  active: boolean;
}

interface SenderRule {
  id: string;
  senderEmail: string;
  role: string;
  createdAt: string;
}

interface EmailSettings {
  autoScanEnabled: boolean;
  autoFilingEnabled: boolean;
  confidenceThreshold: number;
  notifyOnAutoFile: boolean;
  notifyOnLowConfidence: boolean;
}

interface EmailIntegrationData {
  connectedAccounts: ConnectedEmail[];
  transactionEmails: TransactionEmail[];
  senderRules: SenderRule[];
  settings: EmailSettings;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  'Buyer',
  'Seller',
  'Buyer Agent',
  'Seller Agent',
  'Lender',
  'Title Company',
  'Inspector',
  'Appraiser',
  'Attorney',
  'Other',
];

const PROVIDER_CONFIG = {
  gmail: {
    label: 'Gmail',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  outlook: {
    label: 'Outlook',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
};

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    bg: 'bg-green-50',
    text: 'text-green-700',
  },
  error: {
    label: 'Error',
    bg: 'bg-red-50',
    text: 'text-red-700',
  },
  expired: {
    label: 'Expired',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
};

// ---------------------------------------------------------------------------
// Toggle Switch Component
// ---------------------------------------------------------------------------

function ToggleSwitch({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2A9D8F] focus:ring-offset-2',
        enabled ? 'bg-[#2A9D8F]' : 'bg-gray-300',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section Wrapper
// ---------------------------------------------------------------------------

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 text-[#1B3A5C]" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function EmailIntegrationPage() {
  const queryClient = useQueryClient();
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [newRuleEmail, setNewRuleEmail] = useState('');
  const [newRuleRole, setNewRuleRole] = useState('Buyer');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch email integration data
  const { data, isLoading } = useQuery({
    queryKey: ['email-integration'],
    queryFn: () => api<EmailIntegrationData>('/settings/email-integration'),
  });

  const connectedAccounts = data?.connectedAccounts ?? [];
  const transactionEmails = data?.transactionEmails ?? [];
  const senderRules = data?.senderRules ?? [];
  const settings = data?.settings ?? {
    autoScanEnabled: false,
    autoFilingEnabled: false,
    confidenceThreshold: 75,
    notifyOnAutoFile: true,
    notifyOnLowConfidence: true,
  };

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: (updates: Partial<EmailSettings>) =>
      api('/settings/email-integration', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-integration'] });
      addToast({ type: 'success', title: 'Settings updated' });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to update settings' });
    },
  });

  // Add sender rule mutation
  const addSenderRule = useMutation({
    mutationFn: (rule: { senderEmail: string; role: string }) =>
      api('/settings/email-integration/sender-rules', {
        method: 'POST',
        body: JSON.stringify(rule),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-integration'] });
      setShowAddRuleForm(false);
      setNewRuleEmail('');
      setNewRuleRole('Buyer');
      addToast({ type: 'success', title: 'Sender rule added' });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to add sender rule' });
    },
  });

  // Delete sender rule mutation
  const deleteSenderRule = useMutation({
    mutationFn: (ruleId: string) =>
      api(`/settings/email-integration/sender-rules/${ruleId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-integration'] });
      addToast({ type: 'success', title: 'Sender rule removed' });
    },
    onError: () => {
      addToast({ type: 'error', title: 'Failed to remove sender rule' });
    },
  });

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      addToast({ type: 'success', title: 'Copied to clipboard' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast({ type: 'error', title: 'Failed to copy' });
    }
  }, []);

  // Connect email (OAuth placeholder)
  const handleConnectEmail = useCallback((provider: 'gmail' | 'outlook') => {
    addToast({
      type: 'info',
      title: `Redirecting to ${provider === 'gmail' ? 'Google' : 'Microsoft'} OAuth...`,
    });
    // TODO: Implement OAuth flow
  }, []);

  // Submit new sender rule
  const handleAddRule = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRuleEmail.trim()) {
        addToast({ type: 'warning', title: 'Please enter a sender email' });
        return;
      }
      addSenderRule.mutate({ senderEmail: newRuleEmail.trim(), role: newRuleRole });
    },
    [newRuleEmail, newRuleRole, addSenderRule],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A5C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email Integration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect email accounts, manage transaction-specific addresses, and configure auto-filing
        </p>
      </div>

      {/* ── Section 1: Connected Email Accounts ── */}
      <SettingsSection
        title="Connected Email Accounts"
        description="Link your email accounts to automatically scan for transaction documents"
        icon={Mail}
      >
        {/* Connected accounts list */}
        {connectedAccounts.length > 0 && (
          <div className="mb-4 space-y-3">
            {connectedAccounts.map((account) => {
              const providerCfg = PROVIDER_CONFIG[account.provider];
              const statusCfg = STATUS_CONFIG[account.status];

              return (
                <div
                  key={account.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-4 py-3',
                    providerCfg.border,
                    providerCfg.bg,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Mail className={cn('h-5 w-5', providerCfg.color)} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {account.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {providerCfg.label} &middot; Connected{' '}
                        {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusCfg.bg,
                      statusCfg.text,
                    )}
                  >
                    {statusCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Connect buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleConnectEmail('gmail')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Mail className="h-4 w-4 text-red-600" />
            Connect Gmail
          </button>
          <button
            type="button"
            onClick={() => handleConnectEmail('outlook')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Mail className="h-4 w-4 text-blue-600" />
            Connect Outlook
          </button>
        </div>

        {/* Auto-scan toggle */}
        <div className="mt-5 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Auto-scan incoming emails for documents
            </p>
            <p className="text-xs text-gray-500">
              Automatically detect and extract document attachments from incoming emails
            </p>
          </div>
          <ToggleSwitch
            enabled={settings.autoScanEnabled}
            onToggle={() =>
              updateSettings.mutate({
                autoScanEnabled: !settings.autoScanEnabled,
              })
            }
            disabled={updateSettings.isPending}
          />
        </div>
      </SettingsSection>

      {/* ── Section 2: Transaction Email Addresses ── */}
      <SettingsSection
        title="Transaction Email Addresses"
        description="Each transaction has a unique email address for easy document forwarding"
        icon={Inbox}
      >
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                How it works
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                Each transaction is assigned a unique email address (e.g.,{' '}
                <code className="rounded bg-blue-100 px-1 py-0.5 text-[11px]">
                  deal-abc123@crestdesk.com
                </code>
                ). Forward or CC documents to this address and they will be automatically
                filed into the correct transaction.
              </p>
            </div>
          </div>
        </div>

        {transactionEmails.length > 0 ? (
          <div className="space-y-2">
            {transactionEmails.map((txEmail) => (
              <div
                key={txEmail.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {txEmail.address}
                  </p>
                  <p className="font-mono text-xs text-[#2A9D8F]">
                    {txEmail.dealEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {!txEmail.active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      Inactive
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCopy(txEmail.dealEmail, txEmail.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    {copiedId === txEmail.id ? (
                      <>
                        <Check className="h-3 w-3 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">
            No active transaction email addresses. Create a transaction to generate one.
          </p>
        )}
      </SettingsSection>

      {/* ── Section 3: Auto-Filing Rules ── */}
      <SettingsSection
        title="Auto-Filing Rules"
        description="Configure how CrestDesk automatically files incoming documents"
        icon={Settings2}
      >
        {/* Auto-filing toggle */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Enable auto-filing
            </p>
            <p className="text-xs text-gray-500">
              Automatically file incoming documents to the correct transaction
            </p>
          </div>
          <ToggleSwitch
            enabled={settings.autoFilingEnabled}
            onToggle={() =>
              updateSettings.mutate({
                autoFilingEnabled: !settings.autoFilingEnabled,
              })
            }
            disabled={updateSettings.isPending}
          />
        </div>

        {/* Confidence threshold slider */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Confidence Threshold
            </label>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-sm font-semibold text-gray-800">
              {settings.confidenceThreshold}%
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Only auto-file documents when the system confidence is above this
            threshold. Lower values file more documents automatically but may be
            less accurate.
          </p>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={settings.confidenceThreshold}
            onChange={(e) =>
              updateSettings.mutate({
                confidenceThreshold: Number(e.target.value),
              })
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#2A9D8F]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-gray-400">
            <span>0% - File everything</span>
            <span>100% - Only exact matches</span>
          </div>
        </div>

        {/* Sender rules */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              Sender Rules
            </h3>
            <button
              type="button"
              onClick={() => setShowAddRuleForm(!showAddRuleForm)}
              className="inline-flex items-center gap-1 rounded-md bg-[#1B3A5C] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2A4F7A]"
            >
              <Plus className="h-3 w-3" />
              Add Rule
            </button>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Map known sender email addresses to transaction roles for faster
            document classification.
          </p>

          {/* Add rule form */}
          {showAddRuleForm && (
            <form
              onSubmit={handleAddRule}
              className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  New Sender Rule
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddRuleForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    value={newRuleEmail}
                    onChange={(e) => setNewRuleEmail(e.target.value)}
                    placeholder="e.g., agent@example.com"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Role
                  </label>
                  <select
                    value={newRuleRole}
                    onChange={(e) => setNewRuleRole(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#2A9D8F] focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRuleForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSenderRule.isPending}
                  className="inline-flex items-center gap-1 rounded-md bg-[#1B3A5C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2A4F7A] disabled:opacity-50"
                >
                  {addSenderRule.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Add Rule
                </button>
              </div>
            </form>
          )}

          {/* Rules list */}
          {senderRules.length > 0 ? (
            <div className="space-y-2">
              {senderRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {rule.senderEmail}
                    </p>
                    <p className="text-xs text-gray-500">
                      Maps to:{' '}
                      <span className="font-medium text-[#2A9D8F]">
                        {rule.role}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSenderRule.mutate(rule.id)}
                    disabled={deleteSenderRule.isPending}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">
              No sender rules configured yet
            </p>
          )}
        </div>
      </SettingsSection>

      {/* ── Section 4: Email Notifications ── */}
      <SettingsSection
        title="Email Notifications"
        description="Control which email-related notifications you receive"
        icon={Bell}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Notify me when documents are auto-filed
              </p>
              <p className="text-xs text-gray-500">
                Receive a notification each time a document is automatically filed
                into a transaction
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.notifyOnAutoFile}
              onToggle={() =>
                updateSettings.mutate({
                  notifyOnAutoFile: !settings.notifyOnAutoFile,
                })
              }
              disabled={updateSettings.isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Notify me when filing confidence is low
              </p>
              <p className="text-xs text-gray-500">
                Get alerted when a document could not be confidently matched to
                a transaction and needs manual review
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.notifyOnLowConfidence}
              onToggle={() =>
                updateSettings.mutate({
                  notifyOnLowConfidence: !settings.notifyOnLowConfidence,
                })
              }
              disabled={updateSettings.isPending}
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
