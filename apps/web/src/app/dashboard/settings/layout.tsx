'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Shield, ShieldCheck, Bell, Link2, Palette, Users, Scale } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../stores/auth-store';

const ROLE_LEVEL: Record<string, number> = {
  agent: 0,
  managing_broker: 1,
  principal_broker: 2,
  owner: 3,
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const userLevel = ROLE_LEVEL[user?.role ?? 'agent'] ?? 0;

  const tabs = [
    { label: 'Profile', href: '/dashboard/settings', icon: User },
    { label: 'Account & Security', href: '/dashboard/settings/account', icon: Shield },
    { label: 'Notifications', href: '/dashboard/settings/notifications', icon: Bell },
    { label: 'Connections', href: '/dashboard/settings/connections', icon: Link2 },
    ...(userLevel >= 3
      ? [{ label: 'Branding', href: '/dashboard/settings/branding', icon: Palette }]
      : []),
    ...(userLevel >= 2
      ? [{ label: 'User Management', href: '/dashboard/settings/users', icon: Users }]
      : []),
    ...(userLevel >= 2
      ? [{ label: 'Compliance', href: '/dashboard/settings/compliance', icon: Scale }]
      : []),
    ...(userLevel >= 2
      ? [{ label: 'Security', href: '/dashboard/settings/security', icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="flex flex-col md:flex-row gap-6">
        <nav className="w-full md:w-56 shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive =
                pathname === tab.href ||
                (tab.href !== '/dashboard/settings' && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0',
                    isActive
                      ? 'bg-[#1B3A5C]/5 text-[#1B3A5C] font-medium'
                      : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
