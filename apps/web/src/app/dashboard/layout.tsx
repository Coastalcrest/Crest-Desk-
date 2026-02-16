'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { AiChatPanel } from '@/components/dashboard/ai-chat-panel';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Restore sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((prev) => !prev);
  };

  // Close mobile sidebar on route change (handled by clicking nav links)
  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[var(--color-surface)]">
        {/* ----- Mobile overlay ----- */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
        )}

        {/* ----- Sidebar ----- */}
        <div
          className={cn(
            'fixed z-50 h-full transition-transform duration-200 ease-in-out lg:relative lg:z-auto lg:transition-none',
            mobileSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0',
          )}
        >
          {user && (
            <Sidebar
              user={user}
              collapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
              onLogout={logout}
            />
          )}
        </div>

        {/* ----- Main content area ----- */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            onMenuToggle={toggleMobileSidebar}
            sidebarCollapsed={sidebarCollapsed}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
            <AiChatPanel />
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
