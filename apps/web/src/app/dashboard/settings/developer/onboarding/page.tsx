'use client';

import Link from 'next/link';
import {
  ClipboardCheck,
  CheckCircle,
  Circle,
  ArrowLeft,
  ArrowRight,
  SkipForward,
} from 'lucide-react';

/* ─── Mock Data ─── */

const STEPS = [
  {
    key: 'account_created',
    label: 'Account Created',
    status: 'completed' as const,
    description: 'Your CrestDesk account has been created and verified.',
  },
  {
    key: 'brokerage_info',
    label: 'Brokerage Information',
    status: 'completed' as const,
    description: 'Brokerage details, license numbers, and office addresses have been configured.',
  },
  {
    key: 'team_setup',
    label: 'Team Setup',
    status: 'completed' as const,
    description: 'Team members have been invited and roles assigned.',
  },
  {
    key: 'branding',
    label: 'Branding & Customization',
    status: 'current' as const,
    description: 'Configure your logo, colors, email templates, and public-facing branding.',
  },
  {
    key: 'compliance_config',
    label: 'Compliance Configuration',
    status: 'pending' as const,
    description: 'Set up compliance rules, document requirements, and approval workflows.',
  },
  {
    key: 'first_transaction',
    label: 'First Transaction',
    status: 'pending' as const,
    description: 'Create your first real estate transaction to validate the workflow.',
  },
  {
    key: 'onboarding_complete',
    label: 'Onboarding Complete',
    status: 'pending' as const,
    description: 'Review all settings and finalize your CrestDesk setup.',
  },
];

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-200',
    labelColor: 'text-gray-900',
    descColor: 'text-gray-500',
    lineColor: 'bg-green-400',
  },
  current: {
    icon: Circle,
    iconColor: 'text-[var(--color-primary,#1B3A5C)]',
    bg: 'bg-blue-50',
    border: 'border-[var(--color-primary,#1B3A5C)]',
    labelColor: 'text-[var(--color-primary,#1B3A5C)]',
    descColor: 'text-gray-600',
    lineColor: 'bg-gray-200',
  },
  pending: {
    icon: Circle,
    iconColor: 'text-gray-300',
    bg: 'bg-white',
    border: 'border-gray-200',
    labelColor: 'text-gray-500',
    descColor: 'text-gray-400',
    lineColor: 'bg-gray-200',
  },
};

/* ─── Page Component ─── */

export default function OnboardingProgressPage() {
  const completedCount = STEPS.filter((s) => s.status === 'completed').length;
  const totalCount = STEPS.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary,#1B3A5C)]">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-primary,#1B3A5C)]">
              Onboarding Progress
            </h1>
            <p className="text-sm text-gray-500">
              Track your setup progress and complete remaining steps
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

      {/* Progress Bar Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Overall Progress
          </h2>
          <span className="text-sm font-medium text-gray-600">
            {completedCount} of {totalCount} steps completed
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-gray-100">
          <div
            className="h-4 rounded-full bg-[var(--color-primary,#1B3A5C)] transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-gray-500">{percentage}% complete</span>
          <span className="inline-flex rounded-full bg-[var(--color-secondary,#2A9D8F)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-secondary,#2A9D8F)]">
            {completedCount === totalCount ? 'All Done' : 'In Progress'}
          </span>
        </div>
      </div>

      {/* Steps Checklist */}
      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const cfg = STATUS_CONFIG[step.status];
          const Icon = cfg.icon;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className="relative">
              {/* Connecting line */}
              {!isLast && (
                <div
                  className={`absolute left-[23px] top-[60px] h-[calc(100%-36px)] w-0.5 ${
                    step.status === 'completed'
                      ? cfg.lineColor
                      : 'bg-gray-200'
                  }`}
                />
              )}

              <div
                className={`relative rounded-xl border ${cfg.border} ${cfg.bg} p-5 shadow-sm transition-colors`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    {step.status === 'current' ? (
                      <div className="relative flex h-6 w-6 items-center justify-center">
                        <Circle className={`h-6 w-6 ${cfg.iconColor}`} />
                        <div className="absolute h-2.5 w-2.5 rounded-full bg-[var(--color-primary,#1B3A5C)]" />
                      </div>
                    ) : (
                      <Icon className={`h-6 w-6 ${cfg.iconColor}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3
                        className={`text-sm font-semibold ${cfg.labelColor}`}
                      >
                        {step.label}
                      </h3>
                      {step.status === 'completed' && (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Completed
                        </span>
                      )}
                      {step.status === 'current' && (
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Current Step
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-sm ${cfg.descColor}`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="shrink-0">
                    {step.status === 'current' && (
                      <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary,#1B3A5C)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                        Complete
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                    {step.status === 'pending' && (
                      <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                        <SkipForward className="h-3.5 w-3.5" />
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-gray-700">
            Need help completing onboarding?
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            Our team is available to walk you through each step.
          </p>
        </div>
        <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Contact Support
        </button>
      </div>
    </div>
  );
}
