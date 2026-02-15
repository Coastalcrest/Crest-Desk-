import { redirect } from 'next/navigation';

/**
 * Landing page — redirects authenticated users to /dashboard,
 * unauthenticated users to /login.
 *
 * TODO: Replace with real auth check once the auth module is wired up.
 */
export default function HomePage() {
  // Placeholder: always redirect to login until auth is implemented
  redirect('/login');
}
