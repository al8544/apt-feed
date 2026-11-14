// Plain input types for lib/match (design doc §7). No database or network imports here, on purpose:
// callers map their rows into these shapes.

export type MemberStatus = 'invited' | 'requested' | 'active' | 'declined' | 'left';

// profiles.habits (§5.3): sleep, cleanliness 1-5, guests, smoking, noise. Missing = unknown.
export type Habits = {
  sleep?: 'early' | 'late' | 'flexible';
  cleanliness?: number; // 1 (relaxed) - 5 (very tidy)
  guests?: 'rarely' | 'sometimes' | 'often';
  smoking?: boolean;
  noise?: 'quiet' | 'moderate' | 'loud';
  pets?: boolean;
};

export type Member = {
  userId: string;
  status: MemberStatus;
  budgetMax: number | null; // the most this person pays per month as their SHARE (§7.1)
};

export type Person = {
  userId: string;
  budgetMax: number | null;
  moveIn: string | null; // 'YYYY-MM-DD'
  neighborhoods: string[];
  habits: Habits;
  dealbreakerTags: string[];
};

export type Listing = {
  id: string;
  rentMin: number; // listings.price ("from")
  rentMax: number | null;
  beds: number;
  pets: boolean | null; // null = the kit doesn't say
  neighborhood: string;
  tags?: string[]; // structured listing features to check against dealbreakers; undefined = unknown
};

export type FlockNeeds = {
  members: Member[];
  bedroomsNeeded: number | null; // null = one per active member
  areas: string[]; // accepted neighborhoods; [] = anywhere
  needsPets: boolean; // someone in the flock has a pet
  dealbreakers: string[]; // listing tags the flock refuses, e.g. 'no-laundry'
};

// §7.2
export type Criterion = { key: string; ok: boolean | null; detail: string }; // null = unknown (missing data)
export type Share = { userId: string; share: number };
export type Fit = { passes: boolean; criteria: Criterion[]; fitPct: number; suggestedSplit: Share[] };
