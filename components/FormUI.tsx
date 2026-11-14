import Link from 'next/link';

// Figma "Filter Pill" chips: single select (value) or multi select (values).
export function Chips<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: [string, T][];
  selected: (v: T) => boolean;
  onToggle: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="pb-1.5 text-[17px] font-bold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([text, v]) => (
          <button
            type="button"
            key={text}
            aria-pressed={selected(v)}
            onClick={() => onToggle(v)}
            className={`rough rounded-[10px] px-4 py-2 text-base font-bold ${selected(v) ? 'text-card [--fill:var(--color-ink)]' : 'text-ink [--fill:var(--color-surface)]'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// Multi-line version of the Figma "Text Field".
export function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="text-[17px] font-bold text-ink">{label}</span>
      <textarea
        rows={3}
        {...props}
        className="rough resize-none rounded-md border-2 border-line px-4 py-3 text-[19px] text-ink outline-none placeholder:text-muted focus:border-ink [--fill:var(--color-surface)]"
      />
    </label>
  );
}

// Back chevron, optional "Step 1 of 2", title and subtitle (00e–00j).
export function StepHeader({
  back,
  onBack,
  step,
  title,
  subtitle,
}: {
  back?: string;
  onBack?: () => void;
  step?: string;
  title?: string; // omit when the page draws its own title (00j)
  subtitle?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  const chevron = <img src="/icons/left.svg" alt="" width={20} height={20} />;
  return (
    <>
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="self-start pt-1">
          {chevron}
        </button>
      ) : (
        <Link href={back ?? '/flocks'} aria-label="Back" className="self-start pt-1">
          {chevron}
        </Link>
      )}
      {step && <p className="text-base font-bold text-accent">{step}</p>}
      {title && (
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[32px] font-bold text-ink">{title}</h1>
          {subtitle && <p className="text-lg text-muted">{subtitle}</p>}
        </div>
      )}
    </>
  );
}

export const screen =
  'flex min-h-dvh flex-col gap-3 bg-card px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[calc(36px+env(safe-area-inset-bottom))]';
