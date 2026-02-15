'use client';

import { AuthGuard } from '../../components/auth-guard';

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        {children}
      </div>
    </AuthGuard>
  );
}
