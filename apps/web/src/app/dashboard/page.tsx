'use client';

import {
  FileText,
  Users,
  PenTool,
  CalendarCheck,
  Plus,
  Send,
  UserPlus,
  BarChart3,
  Shield,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Plug,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

// ---------------------------------------------------------------------------
// Role hierarchy helper
// ---------------------------------------------------------------------------
const ROLE_LEVEL: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  change,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  change?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className="mt-1 text-xs text-green-600">{change}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-3', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------
function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Action Button
// ---------------------------------------------------------------------------
function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)]"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Compliance indicator
// ---------------------------------------------------------------------------
function ComplianceIndicator({
  label,
  status,
}: {
  label: string;
  status: 'green' | 'yellow' | 'red';
}) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };
  const labels = {
    green: 'Compliant',
    yellow: 'Review Needed',
    red: 'Non-Compliant',
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <div className={cn('h-2.5 w-2.5 rounded-full', colors[status])} />
        <span className="text-xs text-gray-500">{labels[status]}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Dashboard Section
// ---------------------------------------------------------------------------
function AgentDashboard() {
  return (
    <>
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* TODO: Wire up to transactions API */}
        <StatCard
          title="Active Transactions"
          value="--"
          icon={FileText}
          color="bg-[var(--color-primary)]"
        />
        {/* TODO: Wire up to e-sign API */}
        <StatCard
          title="Pending Signatures"
          value="--"
          icon={PenTool}
          color="bg-amber-500"
        />
        {/* TODO: Wire up to contacts API */}
        <StatCard
          title="Contacts"
          value="--"
          icon={Users}
          color="bg-[var(--color-secondary)]"
        />
        {/* TODO: Wire up to closings API */}
        <StatCard
          title="Closings This Month"
          value="--"
          icon={CalendarCheck}
          color="bg-green-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {/* TODO: Wire up navigation / modal triggers */}
        <QuickAction label="New Transaction" icon={Plus} />
        <QuickAction label="Send for Signature" icon={Send} />
        <QuickAction label="Add Contact" icon={UserPlus} />
      </div>

      {/* Cards row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Today's Tasks">
          {/* TODO: Wire up to tasks API */}
          <div className="space-y-3">
            <PlaceholderItem icon={Clock} text="No tasks scheduled for today" />
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity">
          {/* TODO: Wire up to activity feed API */}
          <div className="space-y-3">
            <PlaceholderItem
              icon={Clock}
              text="No recent activity to display"
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Upcoming Closings">
        {/* TODO: Wire up to closings API */}
        <div className="space-y-3">
          <PlaceholderItem
            icon={CalendarCheck}
            text="No upcoming closings"
          />
        </div>
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Managing Broker additions
// ---------------------------------------------------------------------------
function ManagingBrokerDashboard() {
  return (
    <>
      {/* Team Performance stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* TODO: Wire up to team stats API */}
        <StatCard
          title="Team Members"
          value="--"
          icon={Users}
          color="bg-[var(--color-primary)]"
        />
        <StatCard
          title="Team Transactions"
          value="--"
          icon={FileText}
          color="bg-[var(--color-secondary)]"
        />
        <StatCard
          title="Avg. Days to Close"
          value="--"
          icon={TrendingUp}
          color="bg-amber-500"
        />
        <StatCard
          title="Team Volume (MTD)"
          value="--"
          icon={DollarSign}
          color="bg-green-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Lead Distribution Queue">
          {/* TODO: Wire up to lead distribution API */}
          <div className="space-y-3">
            <PlaceholderItem icon={Users} text="No leads in queue" />
          </div>
        </SectionCard>

        <SectionCard title="Team Compliance Status">
          {/* TODO: Wire up to compliance API */}
          <div className="space-y-2">
            <ComplianceIndicator label="License Renewals" status="green" />
            <ComplianceIndicator label="E&O Insurance" status="green" />
            <ComplianceIndicator label="CE Requirements" status="yellow" />
            <ComplianceIndicator label="Fair Housing Training" status="green" />
          </div>
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Principal Broker additions
// ---------------------------------------------------------------------------
function PrincipalBrokerDashboard() {
  return (
    <>
      {/* Brokerage-wide stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* TODO: Wire up to brokerage stats API */}
        <StatCard
          title="Total Agents"
          value="--"
          icon={Users}
          color="bg-[var(--color-primary)]"
        />
        <StatCard
          title="Active Listings"
          value="--"
          icon={Building2}
          color="bg-[var(--color-secondary)]"
        />
        <StatCard
          title="Pending Reviews"
          value="--"
          icon={AlertTriangle}
          color="bg-amber-500"
        />
        <StatCard
          title="Monthly Revenue"
          value="--"
          icon={DollarSign}
          color="bg-green-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Review Queue">
          {/* TODO: Wire up to review queue API */}
          <div className="space-y-3">
            <PlaceholderItem
              icon={CheckCircle2}
              text="No items pending review"
            />
          </div>
        </SectionCard>

        <SectionCard title="Compliance Dashboard">
          {/* TODO: Wire up to compliance dashboard API */}
          <div className="space-y-2">
            <ComplianceIndicator label="Brokerage License" status="green" />
            <ComplianceIndicator label="Trust Account Audit" status="green" />
            <ComplianceIndicator
              label="Advertising Compliance"
              status="yellow"
            />
            <ComplianceIndicator label="RESPA Compliance" status="green" />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Financial Summary">
        {/* TODO: Wire up to financial summary API */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Gross Revenue</p>
            <p className="mt-1 text-xl font-bold text-gray-900">--</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">
              Pending Commissions
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900">--</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">
              Operating Expenses
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900">--</p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Owner additions
// ---------------------------------------------------------------------------
function OwnerDashboard() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Subscription & Billing">
          {/* TODO: Wire up to billing API */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Plan</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Billing Cycle</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Next Payment</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Seats Used</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Integration Health">
          {/* TODO: Wire up to integrations health API */}
          <div className="space-y-2">
            <IntegrationStatus name="MLS Integration" status="connected" />
            <IntegrationStatus name="Email Service" status="connected" />
            <IntegrationStatus name="Payment Gateway" status="connected" />
            <IntegrationStatus name="DocuSign" status="disconnected" />
          </div>
        </SectionCard>

        <SectionCard title="User Management">
          {/* TODO: Wire up to user management API */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending Invites</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Deactivated</span>
              <span className="text-sm font-medium text-gray-900">--</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Integration status helper
// ---------------------------------------------------------------------------
function IntegrationStatus({
  name,
  status,
}: {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
}) {
  const statusConfig = {
    connected: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: CheckCircle2,
      label: 'Connected',
    },
    disconnected: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
      icon: Plug,
      label: 'Disconnected',
    },
    error: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: AlertTriangle,
      label: 'Error',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2.5',
        config.bgColor,
      )}
    >
      <span className="text-sm text-gray-700">{name}</span>
      <div className={cn('flex items-center gap-1.5', config.color)}>
        <StatusIcon className="h-4 w-4" />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder item
// ---------------------------------------------------------------------------
function PlaceholderItem({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center">
      <Icon className="mx-auto h-5 w-5 text-gray-300" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const greeting = getGreeting();
  const todayDate = formatDate();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{todayDate}</p>
      </div>

      {/* ----- Agent Dashboard (all roles see this) ----- */}
      <AgentDashboard />

      {/* ----- Managing Broker additions ----- */}
      {hasMinRole(user.role, 'managing_broker') && (
        <>
          <div className="border-t border-gray-200 pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
              Team Management
            </h2>
          </div>
          <ManagingBrokerDashboard />
        </>
      )}

      {/* ----- Principal Broker additions ----- */}
      {hasMinRole(user.role, 'principal_broker') && (
        <>
          <div className="border-t border-gray-200 pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Shield className="h-5 w-5 text-[var(--color-primary)]" />
              Brokerage Operations
            </h2>
          </div>
          <PrincipalBrokerDashboard />
        </>
      )}

      {/* ----- Owner additions ----- */}
      {hasMinRole(user.role, 'owner') && (
        <>
          <div className="border-t border-gray-200 pt-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
              Platform Administration
            </h2>
          </div>
          <OwnerDashboard />
        </>
      )}
    </div>
  );
}
