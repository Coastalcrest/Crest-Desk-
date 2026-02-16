'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  FolderOpen,
  ClipboardList,
  Calendar,
  Megaphone,
  Share2,
  UserCheck,
  Shield,
  ClipboardCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Kanban,
  DollarSign,
  Wand2,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Role hierarchy for visibility checks
// ---------------------------------------------------------------------------
const ROLE_LEVEL: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

function hasMinRole(userRole: string, minRole?: string): boolean {
  if (!minRole) return true;
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[minRole] ?? Infinity);
}

// ---------------------------------------------------------------------------
// Navigation definition
// ---------------------------------------------------------------------------
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }> | null;
  minRole?: string;
  separator?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', href: '/dashboard/transactions', icon: FileText },
  { label: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { label: 'Pipeline', href: '/dashboard/pipeline', icon: Kanban },
  { label: 'Documents', href: '/dashboard/documents', icon: FolderOpen },
  { label: 'Forms', href: '/dashboard/forms', icon: ClipboardList },
  { label: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { label: 'Finance', href: '/dashboard/finance', icon: DollarSign },
  { label: 'Media Studio', href: '/dashboard/media', icon: Wand2 },
  { label: 'Email', href: '/dashboard/email', icon: Mail },
  { label: '', href: '', icon: null, separator: true },
  { label: 'Marketing', href: '/dashboard/marketing', icon: Megaphone },
  { label: 'Social Media', href: '/dashboard/social', icon: Share2 },
  { label: '', href: '', icon: null, separator: true },
  {
    label: 'Team',
    href: '/dashboard/team',
    icon: UserCheck,
    minRole: 'managing_broker',
  },
  {
    label: 'Compliance',
    href: '/dashboard/compliance',
    icon: Shield,
    minRole: 'principal_broker',
  },
  {
    label: 'Review Queue',
    href: '/dashboard/review',
    icon: ClipboardCheck,
    minRole: 'managing_broker',
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    minRole: 'managing_broker',
  },
  { label: '', href: '', icon: null, separator: true },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export interface SidebarProps {
  user: {
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
  };
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export function Sidebar({ user, collapsed, onToggle, onLogout }: SidebarProps) {
  const pathname = usePathname();

  /** Determine if a nav item is the active route */
  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  }

  /** Build initials for the avatar fallback */
  const initials =
    `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  /** Filter nav items based on the user's role */
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.separator) return true;
    return hasMinRole(user.role, item.minRole);
  });

  // Remove leading / trailing / consecutive separators after filtering
  const cleanedItems = visibleItems.filter((item, idx, arr) => {
    if (!item.separator) return true;
    // Skip separator at start
    if (idx === 0) return false;
    // Skip separator at end
    if (idx === arr.length - 1) return false;
    // Skip consecutive separators
    const prev = arr[idx - 1];
    if (prev?.separator) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-[var(--color-primary)] text-white transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Brand */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 overflow-hidden"
        >
          {/* Logo mark */}
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-secondary)] text-sm font-bold text-white">
            CD
          </div>
          {!collapsed && (
            <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-white">
              CrestDesk
            </span>
          )}
        </Link>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Navigation */}
      {/* ----------------------------------------------------------------- */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {cleanedItems.map((item, idx) => {
          if (item.separator) {
            return (
              <div
                key={`sep-${idx}`}
                className="my-3 border-t border-white/10"
              />
            );
          }

          const Icon = item.icon!;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--color-secondary)] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ----------------------------------------------------------------- */}
      {/* Collapse toggle */}
      {/* ----------------------------------------------------------------- */}
      <div className="hidden px-2 py-2 lg:block">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="truncate">Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* User section */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.firstName} ${user.lastName}`}
              className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-xs font-bold text-white">
              {initials}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-white/50">
                {user.role.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={onLogout}
              title="Sign out"
              className="flex-shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Show logout icon when collapsed */}
        {collapsed && (
          <button
            onClick={onLogout}
            title="Sign out"
            className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
