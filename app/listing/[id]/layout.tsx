import { Suspense } from 'react';

// The listing id is a runtime param, so the page renders per visit behind this skeleton.
export default function ListingLayout({ children }: LayoutProps<'/listing/[id]'>) {
  return <Suspense fallback={<div className="min-h-dvh animate-pulse bg-card" />}>{children}</Suspense>;
}
