import type { Profile } from '@/lib/api';
import { initials } from '@/lib/format';

// Duck portraits from the Figma file (duck/yellow VP, duck/pink MK, duck/brown JR, duck/green SL).
// Everyone else gets an initials circle in their avatar_color.
const DUCKS: [prefix: string, src: string][] = [
  ['vinnie', '/avatars/duck-yellow.png'],
  ['maya', '/avatars/duck-purple.png'],
  ['jordan', '/avatars/duck-brown.png'],
  ['sam', '/avatars/duck-green.png'],
];

export type AvatarUser = Pick<Profile, 'username' | 'display_name' | 'avatar_color'>;

export default function Avatar({
  user,
  size = 32,
  className = '',
}: {
  user: AvatarUser;
  size?: number;
  className?: string;
}) {
  const duck = DUCKS.find(([prefix]) => user.username.toLowerCase().startsWith(prefix))?.[1];
  const style = { width: size, height: size, backgroundColor: duck ? undefined : user.avatar_color };

  if (duck) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={duck} alt={user.display_name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <div
      role="img"
      aria-label={user.display_name}
      style={{ ...style, fontSize: Math.round(size / 3) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
    >
      {initials(user.display_name)}
    </div>
  );
}
