// Hand-drawn icons from the Figma file (public/icons/*.png). They are masks, so they take the text color.
export type DrawnIconName =
  | 'home'
  | 'foryou'
  | 'map'
  | 'calendar'
  | 'flock'
  | 'save'
  | 'thumbsup'
  | 'thumbsdown'
  | 'settings';

export default function DrawnIcon({
  name,
  size = 24,
  width,
  className = '',
}: {
  name: DrawnIconName;
  size?: number;
  width?: number;
  className?: string;
}) {
  const url = `url(/icons/${name}.png)`;
  return (
    <span
      aria-hidden
      className={`drawn-icon ${className}`}
      style={{ width: width ?? size, height: size, maskImage: url, WebkitMaskImage: url }}
    />
  );
}
