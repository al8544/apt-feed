'use client';
import { useState } from 'react';
import { FEEDBACK_REASONS } from '@/lib/api';
import { Chips } from './FormUI';
import Sheet from './Sheet';

const label = (r: string) => r[0]!.toUpperCase() + r.slice(1);

// Figma "02e For You · Nope · Why?": after a thumbs-down, optional reasons the flock agent uses to search again.
export default function ReasonSheet({ open, onSkip, onSubmit }: { open: boolean; onSkip: () => void; onSubmit: (reasons: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (r: string) => setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  const close = (fn: () => void) => { setPicked([]); fn(); };
  return (
    <Sheet
      open={open}
      onClose={() => close(onSkip)}
      title="Why the nope?"
      subtitle="Pick what’s off. Your flock agent re-checks your picks."
      footer={
        <div className="flex gap-3">
          <button onClick={() => close(onSkip)} className="rough flex-1 rounded-lg py-3.5 text-[21px] font-bold text-ink [--fill:var(--color-surface)]">
            Skip
          </button>
          <button
            disabled={!picked.length}
            onClick={() => close(() => onSubmit(picked))}
            className="rough flex-1 rounded-lg py-3.5 text-[21px] font-bold text-card [--fill:var(--color-ink)] disabled:opacity-40"
          >
            Update my picks
          </button>
        </div>
      }
    >
      <Chips label="Pick all that apply" options={FEEDBACK_REASONS.map((r) => [label(r), r])} selected={(r) => picked.includes(r)} onToggle={toggle} />
    </Sheet>
  );
}
