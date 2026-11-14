// Figma "Settings Row".
export default function SettingsRow({
  label,
  value,
  onClick,
  danger = false,
  chevron = !danger,
  divider = false,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  chevron?: boolean;
  divider?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-4 py-3.5 text-left text-[21px] ${divider ? 'border-b-[0.5px] border-line' : ''}`}
    >
      <span className={`shrink-0 ${danger ? 'text-danger' : 'text-ink'}`}>{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-muted">{value}</span>
      {chevron && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/icons/chevron-row.svg" alt="" width={18} height={18} className="shrink-0" />
      )}
    </Tag>
  );
}
