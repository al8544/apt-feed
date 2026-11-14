'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createFlock, selectFlock, updatePreferences } from '@/lib/api';
import { BEDROOMS, BUDGETS, LA_AREAS } from '@/lib/flocks';
import { Button, Field } from '@/components/AuthUI';
import { Chips, StepHeader, TextArea, screen } from '@/components/FormUI';
import Toggle from '@/components/Toggle';

type Step = 'type' | 'friends' | 'open-about' | 'open-rules';

// Figma 00e (type) → 00f (friends) or 00g → 00h (open). One page, steps in state.
export default function NewFlockPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(useSearchParams().get('type') === 'open' ? 'open-about' : 'type');
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(0); // index into BUDGETS
  const [beds, setBeds] = useState<number | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [moveIn, setMoveIn] = useState('');
  const [about, setAbout] = useState('');
  const [aboutYou, setAboutYou] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [openToJoin, setOpenToJoin] = useState(true);
  const [rules, setRules] = useState({ budget: true, beds_movein: true, areas: true });
  const [dealbreakers, setDealbreakers] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => window.scrollTo(0, 0), [step]); // each step starts at the top

  const [, min, max] = BUDGETS[budget]!;
  const filters = { budget_min: min, budget_max: max, beds, areas, move_in: moveIn || null };

  async function create(kind: 'friends' | 'open') {
    setBusy(true);
    setError(null);
    try {
      const id = await createFlock({
        name,
        kind,
        filters,
        bedrooms_needed: beds,
        ...(kind === 'open' && {
          about: about || null,
          looking_for: lookingFor || null,
          open_to_join: openToJoin,
          join_rules: rules,
          max_size: beds && beds >= 2 ? beds : null, // one spot per bedroom ("3 of 4 spots")
        }),
      });
      // "About you" and dealbreakers belong to the person, not the flock (Figma dev note).
      if (kind === 'open' && (aboutYou || dealbreakers))
        await updatePreferences({ about: aboutYou || null, dealbreakers_text: dealbreakers || null });
      selectFlock(id);
      router.replace(kind === 'friends' ? '/invite' : '/'); // friends: share the invite link next
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const basics = (
    <>
      <Chips label="Budget per person" options={BUDGETS.map(([t], i) => [t, i])} selected={(i) => i === budget} onToggle={setBudget} />
      <Chips label="Bedrooms" options={BEDROOMS} selected={(v) => v === beds} onToggle={(v) => setBeds(v === beds ? null : v)} />
      <Chips
        label="Areas"
        options={LA_AREAS.map((a) => [a, a])}
        selected={(a) => areas.includes(a)}
        onToggle={(a) => setAreas((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]))}
      />
    </>
  );
  const err = error && (
    <p role="alert" className="text-base text-danger">
      {error}
    </p>
  );

  if (step === 'type')
    return (
      <main className={screen}>
        <StepHeader title="New flock" subtitle="How do you want to flock up?" />
        <TypeCard
          title="Friends flock"
          tag="Quick setup"
          body="Invite people you already know. Set shared filters like budget, beds and area, then start swiping together."
          foot="~1 min · filters only"
          onClick={() => setStep('friends')}
        />
        <TypeCard
          title="Open flock"
          tag="More about you"
          body="Let compatible people you have not met join your flock. Tell them who you are and what you are looking for."
          foot="A few min · tell your story"
          onClick={() => setStep('open-about')}
        />
      </main>
    );

  if (step === 'friends')
    return (
      <form className={screen} onSubmit={(e) => (e.preventDefault(), create('friends'))}>
        <StepHeader onBack={() => setStep('type')} title="Friends flock" subtitle="Set the basics. You can change these later." />
        <Field label="Flock name" placeholder="e.g. The Nest" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        {/* shortcut: Figma's "Invite friends by username or email" needs per-person invites; for now you share a link next. */}
        <p className="text-base text-muted">You&apos;ll get an invite link to share right after.</p>
        {basics}
        {err}
        <div className="flex-1" />
        <Button type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create flock'}
        </Button>
      </form>
    );

  if (step === 'open-about')
    return (
      <form className={screen} onSubmit={(e) => (e.preventDefault(), setStep('open-rules'))}>
        <StepHeader onBack={() => setStep('type')} step="Step 1 of 2" title="Open flock" subtitle="Strangers will read this, so tell them who you are." />
        <Field label="Flock name" placeholder="Give your flock a name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea
          label="About your flock"
          placeholder="What is the vibe? Early birds, movie nights, plant people? What does a normal week look like at home?"
          maxLength={2000}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
        />
        <TextArea
          label="About you"
          placeholder="Work or school, your schedule, how you like to share space, and what makes you a good flockmate."
          maxLength={2000}
          value={aboutYou}
          onChange={(e) => setAboutYou(e.target.value)}
        />
        <TextArea
          label="Who you are looking for"
          placeholder="Describe your ideal flockmate: habits, cleanliness, how social, and anything that matters to you."
          maxLength={2000}
          value={lookingFor}
          onChange={(e) => setLookingFor(e.target.value)}
        />
        {/* Not in Figma 00g: the join rules on the next step compare against these, so the flock needs them. */}
        <h2 className="pt-2 text-[19px] font-bold text-ink">The basics</h2>
        {basics}
        <Field label="Move-in date" type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
        <div className="flex-1" />
        <Button type="submit" disabled={!name.trim()}>
          Next: who can join
        </Button>
      </form>
    );

  return (
    <form className={screen} onSubmit={(e) => (e.preventDefault(), create('open'))}>
      <StepHeader onBack={() => setStep('open-about')} step="Step 2 of 2" title="Who can join?" subtitle="Set the rules. Anyone who fits can hop in." />
      <div className="rough flex items-center gap-3 rounded-lg px-4 py-3.5 [--fill:var(--color-accent-soft)]">
        <div className="flex-1">
          <p className="text-2xl font-bold text-ink">Open to join</p>
          <p className="text-base text-muted">Compatible people join instantly. Everyone else can send a request.</p>
        </div>
        <Toggle on={openToJoin} onChange={setOpenToJoin} label="Open to join" />
      </div>
      <p className="text-[19px] font-bold text-ink">They must match on</p>
      <div className="rough rounded-lg border-2 border-line px-4 py-1 [--fill:var(--color-surface)]">
        {(
          [
            ['budget', 'Budget', 'Their range overlaps yours'],
            ['beds_movein', 'Bedrooms and move-in', 'A free room, move in within 30 days'],
            ['areas', 'Neighborhoods', 'At least one area in common'],
          ] as const
        ).map(([key, title, hint], i) => (
          <div key={key} className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-line' : ''}`}>
            <div className="flex-1">
              <p className="text-[19px] font-bold text-ink">{title}</p>
              <p className="text-[15px] text-muted">{hint}</p>
            </div>
            <Toggle on={rules[key]} onChange={(v) => setRules((r) => ({ ...r, [key]: v }))} label={title} />
          </div>
        ))}
      </div>
      <TextArea
        label="Dealbreakers"
        placeholder="Smoking indoors, overnight guests most weeks, anything you cannot live with. Anyone who clashes cannot auto-join."
        maxLength={2000}
        value={dealbreakers}
        onChange={(e) => setDealbreakers(e.target.value)}
      />
      {err}
      <div className="flex-1" />
      <Button type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create open flock'}
      </Button>
    </form>
  );
}

function TypeCard({ title, tag, body, foot, onClick }: { title: string; tag: string; body: string; foot: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rough flex flex-col gap-1.5 rounded-lg border-2 border-line px-4 py-3.5 text-left [--fill:var(--color-surface)]">
      <span className="flex items-center gap-2">
        <span className="flex-1 text-[22px] font-bold text-ink">{title}</span>
        <span className={`rounded-[7px] px-2.5 py-[3px] text-sm font-bold ${tag === 'Quick setup' ? 'bg-card text-ink' : 'bg-accent-soft text-accent'}`}>{tag}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/chevron.svg" alt="" width={20} height={20} />
      </span>
      <span className="text-base text-muted">{body}</span>
      <span className="text-[15px] font-bold text-ink">{foot}</span>
    </button>
  );
}
