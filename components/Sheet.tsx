'use client';
import { useEffect } from 'react';
import { X } from 'lucide-react';

// Bottom sheet modal, sized to the phone frame.
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-walnut/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 flex max-h-[85dvh] w-full max-w-[430px] flex-col rounded-t-[20px] bg-cream pb-[calc(16px+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-line" />
        <div className="flex items-center px-4 pt-3 pb-2">
          <h2 className="flex-1 text-[17px] font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full bg-surface">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
      </div>
    </div>
  );
}
