import { Suspense } from 'react';

// Sign-in screens read ?next= from the URL, so they render per visit.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-dvh bg-card" />}>{children}</Suspense>;
}
