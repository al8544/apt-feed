import { Suspense } from 'react';

// The listing id comes from the URL at runtime, so the page renders per visit behind this.
export default function MapListingLayout({ children }: LayoutProps<'/map/[id]'>) {
  return <Suspense fallback={<div className="fixed inset-0 animate-pulse bg-ink" />}>{children}</Suspense>;
}
