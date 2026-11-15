'use client';
import { type Member, type Pin } from '@/lib/api';
import { listSummary, money, parseDateOnly } from '@/lib/format';
import Avatar from './Avatar';
import Sheet from './Sheet';

const HABIT_LABEL: Record<string, string> = {
  early: 'Early to bed', late: 'Night owl', flexible: 'Flexible hours',
  rarely: 'Rarely has guests', sometimes: 'Sometimes has guests', often: 'Often has guests',
  quiet: 'Prefers quiet', moderate: 'Moderate noise', loud: 'Fine with loud',
};

// Everything a flockmate has shared: basics, what they wrote, habits and their commute pin.
export default function MemberSheet({ member, pin, onClose }: { member: Member | null; pin: Pin | null; onClose: () => void }) {
  return (
    <Sheet open={!!member} onClose={onClose} title={member ? member.display_name : ''} subtitle={member ? `@${member.username}${member.role === 'admin' ? ' · admin' : ''}` : undefined}>
      {member && <Details member={member} pin={pin} />}
    </Sheet>
  );
}

function Details({ member: m, pin }: { member: Member; pin: Pin | null }) {
  const h = m.habits ?? {};
  const habits = [
    h.sleep && HABIT_LABEL[h.sleep],
    h.cleanliness != null && `Tidiness ${h.cleanliness}/5`,
    h.guests && HABIT_LABEL[h.guests],
    h.noise && HABIT_LABEL[h.noise],
    h.smoking != null && (h.smoking ? 'Smokes' : 'Does not smoke'),
  ].filter(Boolean) as string[];
  const rows: [string, string | null][] = [
    ['Budget', m.budget_max != null ? `Up to ${money(m.budget_max)} a month` : null],
    ['Bedrooms', m.beds_min != null ? `${m.beds_min}+` : null],
    ['Pets', m.pets == null ? null : m.pets ? 'Has or needs pets' : 'No pets'],
    ['Neighborhoods', m.neighborhoods?.length ? listSummary(m.neighborhoods) : null],
    ['Move-in', m.move_in ? parseDateOnly(m.move_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null],
    ['Commute pin', pin ? pin.label ?? 'Set on the map' : null],
    ['Habits', habits.length ? habits.join(' · ') : null],
  ];
  const prose: [string, string | null | undefined][] = [
    ['About', m.about ?? m.bio],
    ['Looking for', m.looking_for],
    ['Dealbreakers', m.dealbreakers_text],
  ];
  return (
    <div className="flex flex-col gap-3 pb-2">
      <Avatar user={m} size={64} />
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 text-[17px]">
          <span className="w-[118px] shrink-0 text-muted">{label}</span>
          <span className={value ? 'text-ink' : 'text-muted'}>{value ?? 'Not shared'}</span>
        </div>
      ))}
      {prose.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <h3 className="text-[19px] font-bold text-ink">{label}</h3>
          <p className={`text-[17px] whitespace-pre-line ${value?.trim() ? 'text-ink' : 'text-muted'}`}>{value?.trim() || 'Nothing written yet.'}</p>
        </div>
      ))}
    </div>
  );
}
