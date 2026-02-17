'use client';

import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This page encountered an error. Some features are still under development
          and may not be fully connected yet.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-[#1B3A5C] px-4 py-2 text-sm font-medium text-white hover:bg-[#152d49] transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
