'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Globe,
  Mail,
  Palette,
  Code2,
  Key,
  Shield,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';

/* ─── Mock Data ─── */

const WHITE_LABEL_CONFIG = {
  customDomain: null as string | null,
  domainVerified: false,
  emailFromName: 'CrestDesk',
  emailFromDomain: 'noreply@crestdesk.com',
  emailReplyTo: 'support@coastalcrest.com',
  poweredByVisible: true,
  embedsEnabled: false,
  sdkEnabled: false,
  customCss: '',
  loginHtml: '',
  faviconUrl: '',
};

const ALLOWED_ORIGINS: string[] = [];

const EMBED_WIDGETS = [
  { key: 'transaction_portal', label: 'Transaction Portal', enabled: false },
  { key: 'document_viewer', label: 'Document Viewer', enabled: false },
  { key: 'contact_form', label: 'Contact Form', enabled: false },
  { key: 'commission_tracker', label: 'Commission Tracker', enabled: false },
];

const SDK_KEYS: { id: string; name: string; prefix: string; created: string }[] = [];

/* ─── Page Component ─── */

export default function WhiteLabelSettingsPage() {
  const [config] = useState(WHITE_LABEL_CONFIG);
  const [widgets] = useState(EMBED_WIDGETS);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">
              White-Label Settings
            </h1>
            <p className="text-sm text-gray-500">
              Customize branding, domains, and embeddable components
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings/developer"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Developer
        </Link>
      </div>

      {/* Custom Domain Panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">
            Custom Domain
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Current Domain
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {config.customDomain ?? 'Not configured'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {config.customDomain ? (
                config.domainVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <XCircle className="h-3 w-3" />
                    Unverified
                  </span>
                )
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  None
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
              Set Domain
            </button>
            <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Verify DNS
            </button>
            <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Email Branding Panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">
            Email Branding
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <ReadOnlyField label="From Name" value={config.emailFromName} />
          <ReadOnlyField
            label="From Domain"
            value={config.emailFromDomain}
          />
          <ReadOnlyField label="Reply-To" value={config.emailReplyTo} />
        </div>
        <div className="mt-6 flex justify-end">
          <button className="rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Edit Email Settings
          </button>
        </div>
      </div>

      {/* Login Page Customization */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
          <h2 className="text-lg font-semibold text-gray-900">
            Login Page Customization
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom CSS
            </label>
            <textarea
              readOnly
              value={config.customCss}
              placeholder="/* Add custom CSS for the login page */"
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-600 placeholder-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Login HTML
            </label>
            <textarea
              readOnly
              value={config.loginHtml}
              placeholder="<!-- Add custom HTML to the login page -->"
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-600 placeholder-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Favicon URL
            </label>
            <div className="flex items-center gap-3">
              <input
                readOnly
                type="text"
                value={config.faviconUrl}
                placeholder="https://example.com/favicon.ico"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 placeholder-gray-400 focus:outline-none"
              />
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Preview
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button className="rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Save Customization
          </button>
        </div>
      </div>

      {/* Embed Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-lg font-semibold text-gray-900">
              Embed Settings
            </h2>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              config.embedsEnabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            Embeds: {config.embedsEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Allowed Origins */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Allowed Origins
          </h3>
          {ALLOWED_ORIGINS.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
              <p className="text-sm text-gray-500">
                No allowed origins configured. Add origins to enable
                cross-origin embedding.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {ALLOWED_ORIGINS.map((origin) => (
                <li
                  key={origin}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2"
                >
                  <code className="text-sm font-mono text-gray-600">
                    {origin}
                  </code>
                  <button className="text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Plus className="h-4 w-4" />
            Add Origin
          </button>
        </div>

        {/* Enabled Widgets */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Embeddable Widgets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {widgets.map((widget) => (
              <label
                key={widget.key}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={widget.enabled}
                  readOnly
                  className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary,#1B3A5C)] focus:ring-[var(--color-primary,#1B3A5C)]"
                />
                <span className="text-sm text-gray-700">{widget.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* SDK Configuration */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <h2 className="text-lg font-semibold text-gray-900">
              SDK Configuration
            </h2>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                config.sdkEnabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {config.sdkEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" />
            Create SDK Key
          </button>
        </div>
        {SDK_KEYS.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Key className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              No SDK keys configured. Create a key to enable SDK
              integrations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Key Prefix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SDK_KEYS.map((key) => (
                  <tr
                    key={key.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {key.prefix}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.created}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Powered By Toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-primary,#1B3A5C)]" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Powered By Badge
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Show or hide the &quot;Powered by CrestDesk&quot; badge on
                public-facing pages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                config.poweredByVisible
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {config.poweredByVisible ? 'Visible' : 'Hidden'}
            </span>
            <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              {config.poweredByVisible ? 'Hide Badge' : 'Show Badge'}
            </button>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <p className="text-sm text-gray-500">
          Need help with white-label setup? Check the documentation for
          step-by-step guides.
        </p>
        <button className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary,#1B3A5C)] hover:opacity-80 transition-opacity">
          View Docs
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Read-Only Field Helper ─── */

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
