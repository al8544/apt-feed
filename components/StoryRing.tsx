import Avatar, { type AvatarUser } from './Avatar';

export default function StoryRing({ user, hasNew, label }: { user: AvatarUser; hasNew: boolean; label: string }) {
  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
      <div className={`flex size-[72px] items-center justify-center rounded-full ${hasNew ? 'story-ring' : 'bg-line'}`}>
        <div className="flex size-[66px] items-center justify-center rounded-full bg-white">
          <Avatar user={user} size={60} />
        </div>
      </div>
      <p className="w-full truncate text-center text-xs text-ink">{label}</p>
    </div>
  );
}
