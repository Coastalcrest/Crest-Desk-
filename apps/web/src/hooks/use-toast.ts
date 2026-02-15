'use client';

import { useCallback, useState } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

let toastId = 0;
const listeners: Set<(toast: Toast) => void> = new Set();

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = String(++toastId);
  const full = { ...toast, id };
  listeners.forEach((fn) => fn(full));
  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const subscribe = useCallback(() => {
    const handler = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, duration);
      }
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, subscribe, dismiss };
}
