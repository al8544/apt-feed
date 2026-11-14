import { Suspense } from 'react';

// The calendar depends on today's date, so it renders per-visit behind this skeleton.
export default function ToursLayout({ children }: LayoutProps<'/tours'>) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between pb-4">
            <div className="h-8 w-24 rounded bg-surface" />
            <div className="size-9 rounded-[9px] bg-surface" />
          </div>
          <div className="mb-4 h-5 w-36 rounded bg-surface" />
          <div className="mb-6 h-[280px] rounded-[7px] bg-surface" />
          <div className="flex flex-col gap-2.5">
            <div className="h-[94px] rounded-[7px] bg-surface" />
            <div className="h-[94px] rounded-[7px] bg-surface" />
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
