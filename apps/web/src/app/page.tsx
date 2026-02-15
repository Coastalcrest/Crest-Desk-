import { redirect } from 'next/navigation';

/**
 * Root page -- redirects to the dashboard.
 *
 * The AuthGuard on /dashboard will handle redirecting
 * unauthenticated users to /login.
 */
export default function HomePage() {
  redirect('/dashboard');
}
