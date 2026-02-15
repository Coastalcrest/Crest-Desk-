'use client';

import { Users, FileText, DollarSign, TrendingUp } from 'lucide-react';

const stats = [
  {
    label: 'Active Leads',
    value: '—',
    icon: Users,
    color: 'var(--color-primary)',
    bgColor: 'bg-blue-50',
  },
  {
    label: 'Open Transactions',
    value: '—',
    icon: FileText,
    color: 'var(--color-secondary)',
    bgColor: 'bg-teal-50',
  },
  {
    label: 'Pending Commissions',
    value: '—',
    icon: DollarSign,
    color: 'var(--color-success)',
    bgColor: 'bg-green-50',
  },
  {
    label: 'Monthly Revenue',
    value: '—',
    icon: TrendingUp,
    color: 'var(--color-warning)',
    bgColor: 'bg-yellow-50',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back. Here is an overview of your brokerage.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}
              >
                <Icon className="h-6 w-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            No recent activity to display.
          </p>
          {/* TODO: Activity feed component */}
        </div>

        {/* Upcoming tasks */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">
            Upcoming Tasks
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            No upcoming tasks.
          </p>
          {/* TODO: Task list component */}
        </div>
      </div>
    </div>
  );
}
