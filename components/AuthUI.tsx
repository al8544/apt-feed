import Link from 'next/link';

// Figma "Button" (73:2338): full-width; Primary = dark, Secondary = tan with an outline.
export function Button({
  children,
  secondary = false,
  href,
  ...props
}: { children: React.ReactNode; secondary?: boolean; href?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `rough flex w-full items-center justify-center rounded-[10px] px-5 py-3.5 text-[22px] font-bold disabled:opacity-40 ${
    secondary ? 'border-2 border-ink text-ink [--fill:var(--color-surface)]' : 'text-card [--fill:var(--color-ink)]'
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button {...props} className={cls}>
      {children}
    </button>
  );
}

// Figma "Text Field" (73:2339).
export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="text-[17px] font-bold text-ink">{label}</span>
      <input
        {...props}
        className="rough rounded-md border-2 border-line px-4 py-3 text-[19px] text-ink outline-none placeholder:text-muted focus:border-ink [--fill:var(--color-surface)]"
      />
    </label>
  );
}

// Back chevron + heading used by 00b and 00c.
export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <Link href="/welcome" aria-label="Back" className="self-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/left.svg" alt="" width={20} height={20} />
      </Link>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-4xl font-bold text-ink">{title}</h1>
        <p className="text-lg text-muted">{subtitle}</p>
      </div>
    </>
  );
}

// Only same-site paths, so a crafted ?next= can't send someone off-site after sign-in.
export const safeNext = (next: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/flocks');
