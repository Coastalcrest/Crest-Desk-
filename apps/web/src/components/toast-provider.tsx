'use client';

import { useEffect } from 'react';
import { useToast } from '../hooks/use-toast';
import { cn } from '../lib/utils';

const typeStyles = {
  success: 'bg-green-50 border-green-500 text-green-800',
  error: 'bg-red-50 border-red-500 text-red-800',
  warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
  info: 'bg-blue-50 border-blue-500 text-blue-800',
};

const typeIcons = {
  success: '\u2713',
  error: '\u2715',
  warning: '\u26A0',
  info: '\u2139',
};

export function ToastProvider() {
  const { toasts, subscribe, dismiss } = useToast();

  useEffect(() => {
    return subscribe();
  }, [subscribe]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'border-l-4 p-4 rounded-md shadow-lg animate-in slide-in-from-right',
            typeStyles[toast.type],
          )}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">{typeIcons[toast.type]}</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{toast.title}</p>
              {toast.message && (
                <p className="text-sm mt-1 opacity-80">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-current opacity-50 hover:opacity-100"
            >
              {'\u2715'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
