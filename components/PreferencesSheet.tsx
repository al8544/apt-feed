'use client';
import { useState } from 'react';
import { updatePreferences, type Profile } from '@/lib/api';
import Sheet from './Sheet';

type Prefs = Pick<Profile, 'budget_max' | 'beds_min' | 'pets' | 'neighborhoods' | 'move_in' | 'bio'>;

const field = 'w-full rounded-xl bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:ring-2 focus:ring-ink/10';

// Edits the current user's preferences, which feed into every group match score.
export default function PreferencesSheet({
  open,
  onClose,
  profile,
  onSaved,
  title = 'Your preferences',
  showBio = false,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSaved: (prefs: Prefs) => void;
  title?: string;
  showBio?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {/* Keyed so the form resets to the latest profile each time it opens. */}
      {profile && <PrefsForm key={String(open)} profile={profile} showBio={showBio} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function PrefsForm({
  profile,
  showBio,
  onClose,
  onSaved,
}: {
  profile: Profile;
  showBio: boolean;
  onClose: () => void;
  onSaved: (prefs: Prefs) => void;
}) {
  const [budget, setBudget] = useState(profile.budget_max?.toString() ?? '');
  const [beds, setBeds] = useState(profile.beds_min?.toString() ?? '');
  const [pets, setPets] = useState(!!profile.pets);
  const [hoods, setHoods] = useState((profile.neighborhoods ?? []).join(', '));
  const [moveIn, setMoveIn] = useState(profile.move_in?.slice(0, 10) ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const prefs: Prefs = {
      budget_max: budget ? Number(budget) : null,
      beds_min: beds ? Number(beds) : null,
      pets,
      neighborhoods: hoods.split(',').map((h) => h.trim()).filter(Boolean),
      move_in: moveIn || null,
      bio: showBio ? bio.trim() || null : profile.bio,
    };
    setSaving(true);
    setError(null);
    try {
      await updatePreferences(prefs);
      onSaved(prefs);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 pb-2">
      {showBio && (
        <label className="flex flex-col gap-1 text-[13px] text-muted">
          Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className={field} />
        </label>
      )}
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-[13px] text-muted">
          Max budget ($/mo)
          <input type="number" inputMode="numeric" min={0} step={50} value={budget} onChange={(e) => setBudget(e.target.value)} className={field} />
        </label>
        <label className="flex w-28 flex-col gap-1 text-[13px] text-muted">
          Min beds
          <input type="number" inputMode="numeric" min={0} max={6} value={beds} onChange={(e) => setBeds(e.target.value)} className={field} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[13px] text-muted">
        Neighborhoods (comma separated)
        <input value={hoods} onChange={(e) => setHoods(e.target.value)} placeholder="Williamsburg, Greenpoint" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-[13px] text-muted">
        Move-in date
        <input type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} className={field} />
      </label>
      <label className="flex items-center justify-between rounded-xl bg-surface px-3 py-3 text-[15px] text-ink">
        I have pets
        <input type="checkbox" checked={pets} onChange={(e) => setPets(e.target.checked)} className="size-5 accent-accent" />
      </label>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <button disabled={saving} className="mt-1 rounded-xl bg-ink py-3 text-[15px] font-semibold text-cream disabled:opacity-50">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
