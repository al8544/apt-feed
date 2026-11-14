// Figma "Toggle": on/off switch (Map filters, Compare metrics).
export default function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={on ? '/icons/toggle-on.svg' : '/icons/toggle-off.svg'} alt="" width={46} height={28} />
    </button>
  );
}
