'use client';

import { BarChart3, Clock } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100">
          <BarChart3 className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-500 mb-6">
          Track brokerage performance, agent metrics, revenue trends, and market insights. Coming soon.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-sm font-medium">
          <Clock className="w-4 h-4" />
          Under Development
        </div>
      </div>
    </div>
  );
}
