// Figma "Toggle": on/off switch (Map filters, Compare metrics). The rough track color and the knob both animate.
export default function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`rough relative h-7 w-[46px] shrink-0 rounded-full ${on ? '[--fill:var(--color-accent)]' : '[--fill:var(--color-line)]'}`}
    >
      <span
        className="absolute top-1 left-1 size-5 rounded-full bg-card transition-[translate] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ translate: on ? 18 : 0 }}
      />
    </button>
  );
}
