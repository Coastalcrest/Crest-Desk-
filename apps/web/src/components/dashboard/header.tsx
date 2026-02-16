'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  FileText,
  Users as UsersIcon,
  FolderOpen,
  Mail,
  Kanban,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export interface HeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

// ---------------------------------------------------------------------------
// Search suggestion type
// ---------------------------------------------------------------------------
interface SearchSuggestion {
  id: string;
  entityType: string;
  title: string;
  subtitle?: string;
  href: string;
}

function getEntityHref(entityType: string, entityId: string): string {
  const routes: Record<string, string> = {
    transaction: '/dashboard/transactions',
    contact: '/dashboard/contacts',
    document: '/dashboard/documents',
    email: '/dashboard/email',
    deal: '/dashboard/pipeline',
  };
  const base = routes[entityType] ?? '/dashboard/search';
  return `${base}/${entityId}`;
}

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  transaction: FileText,
  contact: UsersIcon,
  document: FolderOpen,
  email: Mail,
  deal: Kanban,
};

export function Header({ onMenuToggle, sidebarCollapsed }: HeaderProps) {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ----------- Search state -----------
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search suggestions
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}&limit=8`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: SearchSuggestion[] = (data.data ?? data.suggestions ?? []).map((s: any) => ({
          id: s.id,
          entityType: s.entityType,
          title: s.title,
          subtitle: s.subtitle ?? s.entityType?.replace(/_/g, ' '),
          href: getEntityHref(s.entityType, s.entityId ?? s.id),
        }));
        setSearchResults(mapped);
        setSearchOpen(mapped.length > 0);
      }
    } catch {
      // Search failures are silent
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  // TODO: Replace with real notification count from API
  const notificationCount = 3;

  return (
    <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar */}
      <div className="hidden flex-1 md:block" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
            placeholder="Search transactions, contacts, documents..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[var(--color-secondary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
          />

          {/* Search suggestions dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {searchResults.map((result) => {
                const Icon = ENTITY_ICONS[result.entityType] ?? FileText;
                return (
                  <Link
                    key={result.id}
                    href={result.href}
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-700">{result.title}</p>
                      <p className="truncate text-xs capitalize text-gray-400">{result.subtitle}</p>
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-gray-100 px-4 py-2">
                <button
                  type="submit"
                  className="text-xs font-medium text-[var(--color-secondary)] hover:underline"
                >
                  View all results for &ldquo;{searchQuery}&rdquo;
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Mobile search - icon only */}
      <div className="flex-1 md:hidden" />

      {/* Right-side actions */}
      <div className="flex items-center gap-2">
        {/* Mobile search trigger */}
        <button
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 md:hidden"
          aria-label="Search"
          // TODO: Open mobile search overlay
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Notification bell */}
        <button
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Notifications"
          // TODO: Open notifications panel
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-danger)] text-[10px] font-bold text-white">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
            aria-label="User menu"
            aria-expanded={dropdownOpen}
          >
            {/* Avatar */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                {initials}
              </div>
            )}
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium text-gray-700">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'hidden h-4 w-4 text-gray-400 transition-transform lg:block',
                dropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {/* User info (mobile-only since desktop shows in header) */}
              <div className="border-b border-gray-100 px-4 py-3 lg:hidden">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <User className="h-4 w-4 text-gray-400" />
                Profile
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </Link>

              <div className="border-t border-gray-100" />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
