// Hand-drawn icons from the Figma file, drawn as masks so they take the text color (currentColor).
// [file, box width, box height, mask size, mask x, mask y] — exact values from the design.
const ICONS = {
  nest: ['nest.png', 36, 28, 36, 0, -4],
  feather: ['feather.png', 28, 28, 28, 0, 0],
  migration: ['migration.png', 32, 28, 32, 0, -2],
  calendarTab: ['calendar.png', 28, 28, 25, 1.5, 1.5],
  flock: ['flock.png', 28, 28, 28, 0, 0],
  settings: ['settings.png', 24, 24, 24, 0, 0],
  calendar: ['calendar-sm.png', 22, 22, 22, 0, 0],
  save: ['save.png', 22, 22, 22, 0, 0],
  saveLg: ['save-lg.png', 30, 30, 30, 0, 0],
  thumbsUp: ['thumbsup.png', 32, 32, 32, 0, 0],
  thumbsDown: ['thumbsdown.png', 32, 32, 32, 0, 0],
  undo: ['undo.png', 28, 28, 28, 0, 0],
  back: ['back.png', 26, 26, 26, 0, 0],
} as const;

export type IconName = keyof typeof ICONS;

export default function Icon({ name, scale = 1, className = '' }: { name: IconName; scale?: number; className?: string }) {
  const [file, w, h, size, x, y] = ICONS[name];
  const mask = `url(/icons/${file}) ${x * scale}px ${y * scale}px / ${size * scale}px ${size * scale}px no-repeat`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ width: w * scale, height: h * scale, mask, WebkitMask: mask }}
    />
  );
}
