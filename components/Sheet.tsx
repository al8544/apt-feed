'use client';
import { useEffect } from 'react';

// Bottom sheet modal, sized to the phone frame (Figma: "Sheet" in Book a tour / Map filters).
export default function Sheet({
  open,
  onClose,
  title,
  subtitle,
  action,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  action?: React.ReactNode; // top-right text button, e.g. "Reset"
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/45" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rough absolute bottom-0 flex max-h-[85dvh] w-full max-w-[430px] flex-col gap-4 rounded-t-[28px] px-4 pt-2.5 pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto h-[5px] w-10 shrink-0 rounded-[3px] bg-line" />
        <div className="flex shrink-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[30px] font-bold text-ink">{title}</h2>
            {subtitle && <p className="truncate text-base text-muted">{subtitle}</p>}
          </div>
          {action && <div className="pt-2 text-lg font-bold text-accent">{action}</div>}
        </div>
        <div className="no-scrollbar -mx-4 min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
