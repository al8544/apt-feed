'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';

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
  const controls = useDragControls();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Rendered into <body>: inside a transformed parent (the reels page) a fixed sheet would sit under the bottom nav, hiding its buttons.
  // AnimatePresence replays the last open render while exiting, so nullable children don't blank out.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-center">
        <motion.button
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-black/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: { type: 'spring', damping: 30, stiffness: 320 } }}
          exit={{ y: '100%', transition: { duration: 0.2, ease: 'easeIn' } }}
          drag="y"
          dragControls={controls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.05, bottom: 0.7 }}
          onDragEnd={(_, info) => (info.offset.y > 100 || info.velocity.y > 600) && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="rough absolute bottom-0 flex max-h-[85dvh] w-full max-w-[430px] flex-col gap-4 rounded-t-[10px] px-4 pt-2.5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        >
          {/* Drag the grabber or the title down to close; the content below keeps scrolling and the map keeps panning. */}
          <div onPointerDown={(e) => controls.start(e)} className="-mx-4 -mt-2.5 flex shrink-0 cursor-grab touch-none flex-col gap-4 px-4 pt-2.5 active:cursor-grabbing">
          <div className="mx-auto h-[5px] w-10 shrink-0 rounded-[3px] bg-line" />
          <div className="flex shrink-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[30px] font-bold text-ink">{title}</h2>
              {subtitle && <p className="truncate text-base text-muted">{subtitle}</p>}
            </div>
            {action && <div className="pt-2 text-lg font-bold text-accent">{action}</div>}
        </div>
          </div>
        <div className="no-scrollbar -mx-4 min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
        {footer && <div className="shrink-0">{footer}</div>}
      </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
