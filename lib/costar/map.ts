// CoStar apartment-listing record -> our rows (docs/DESIGN.md §5.1, §6.1). Pure functions, no I/O.
// Field names are from the kit's models/apartment-listing.md; one record = one community, with floor plans in apartmentModels[].

export type KitFloorPlan = {
  id: number;
  name?: string | null;
  numBeds?: number | null;
  numBaths?: number | null;
  minSquareFeet?: number | null;
  maxSquareFeet?: number | null;
  minRent?: number | null;
  maxRent?: number | null;
  rentPricingType?: number | null; // 1 PerUnit, 2 PerBed, 3 PerBedroom
  numUnitsAvailable?: number | null;
};

export type KitRecord = {
  id: number;
  propertyId: number | null;
  buildingName?: string | null;
  address?: {
    streetNumber?: string | null;
    streetDirection?: string | null;
    streetName?: string | null;
    streetType?: string | null;
    streetSuffix?: string | null;
    city?: string | null;
    state?: string | null;
    postCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  propertyManagementCompanyName?: string | null;
  primaryPhoto?: { attachmentUri?: string | null } | null;
  apartmentModels?: KitFloorPlan[];
};

export type CommunityRow = {
  costar_property_id: string;
  name: string | null;
  address: string | null;
  city: string;
  postal_code: string | null;
  lat: number;
  lng: number;
  neighborhood: null; // the kit has none; derived later from a canonical LA list (§6.1)
  management_company: string | null;
  primary_photo_url: string | null;
  raw: KitRecord;
};

export type ListingRow = {
  costar_floorplan_id: string;
  address: string | null;
  neighborhood: null;
  lat: number;
  lng: number;
  beds: number;
  baths: number;
  sqft: number | null;
  rent_min: number;
  rent_max: number;
  price: number; // "from" price = rent_min; the range stays in rent_min / rent_max
  pets: null; // unknown: the kit has no pet policy on this record
  photos: string[];
  source: 'costar';
  active: true;
  raw: KitFloorPlan;
};

export type SkipReason =
  | 'no property id'
  | 'not in Los Angeles'
  | 'no coordinates'
  | 'floor plan: no rent'
  | 'floor plan: not priced per unit'
  | 'floor plan: no bedrooms'
  | 'floor plan: no bathrooms';

export type Mapped =
  | { skipped: SkipReason } // the whole record is out
  | { community: CommunityRow; listings: ListingRow[]; skippedPlans: SkipReason[] };

const clean = (s?: string | null) => (s ?? '').trim();

export const isLosAngeles = (r: KitRecord) =>
  clean(r.address?.state).toUpperCase() === 'CA' && clean(r.address?.city).toLowerCase() === 'los angeles';

export function streetAddress(a: NonNullable<KitRecord['address']>): string | null {
  const s = [a.streetNumber, a.streetDirection, a.streetName, a.streetType, a.streetSuffix].map(clean).filter(Boolean).join(' ');
  return s || null;
}

// The kit gives a size-112 thumbnail; 113 is 1400x720, big enough for a card.
export const photoUrl = (uri?: string | null) => (uri ? uri.replace('/112/', '/113/') : null);

// ZIP is five or nine digits without a hyphen; keep the five.
const zip5 = (z?: string | null) => (clean(z).match(/^\d{5}/)?.[0] ?? null);

export function mapRecord(r: KitRecord): Mapped {
  if (r.propertyId == null) return { skipped: 'no property id' };
  if (!isLosAngeles(r)) return { skipped: 'not in Los Angeles' };
  const a = r.address;
  const lat = a?.latitude, lng = a?.longitude;
  if (a == null || lat == null || lng == null || (lat === 0 && lng === 0)) return { skipped: 'no coordinates' };

  const address = streetAddress(a);
  const photo = photoUrl(r.primaryPhoto?.attachmentUri);
  const community: CommunityRow = {
    costar_property_id: String(r.propertyId),
    name: clean(r.buildingName) || null,
    address,
    city: 'Los Angeles',
    postal_code: zip5(a.postCode),
    lat,
    lng,
    neighborhood: null,
    management_company: clean(r.propertyManagementCompanyName) || null,
    primary_photo_url: photo,
    raw: r,
  };

  const listings: ListingRow[] = [];
  const skippedPlans: SkipReason[] = [];
  for (const m of r.apartmentModels ?? []) {
    const minRent = m.minRent ?? 0;
    if (minRent <= 0) { skippedPlans.push('floor plan: no rent'); continue; } // 0 or null = no rent given
    if ((m.rentPricingType ?? 1) !== 1) { skippedPlans.push('floor plan: not priced per unit'); continue; } // per bed / per bedroom isn't comparable
    if (m.numBeds == null) { skippedPlans.push('floor plan: no bedrooms'); continue; }
    if (m.numBaths == null) { skippedPlans.push('floor plan: no bathrooms'); continue; }
    listings.push({
      costar_floorplan_id: String(m.id),
      address,
      neighborhood: null,
      lat,
      lng,
      beds: m.numBeds,
      baths: m.numBaths,
      sqft: m.minSquareFeet && m.minSquareFeet > 0 ? m.minSquareFeet : null,
      rent_min: minRent,
      rent_max: Math.max(m.maxRent ?? minRent, minRent),
      price: minRent,
      pets: null,
      photos: photo ? [photo] : [],
      source: 'costar',
      active: true,
      raw: m,
    });
  }
  return { community, listings, skippedPlans };
}
