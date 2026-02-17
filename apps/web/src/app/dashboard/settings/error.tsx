'use client';

import { AlertTriangle } from 'lucide-react';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          This settings page encountered an error. This may be because some features
          are still being connected to the backend.
        </p>
        <button
          onClick={reset}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
