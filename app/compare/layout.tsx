import { Suspense } from 'react';

// Compare pages read the picked ids from the URL, so they render per visit.
export default function CompareLayout({ children }: LayoutProps<'/compare'>) {
  return <Suspense fallback={<div className="min-h-dvh animate-pulse bg-surface" />}>{children}</Suspense>;
}
