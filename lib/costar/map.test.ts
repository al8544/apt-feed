// Run: node --test lib/costar/map.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapRecord, photoUrl, streetAddress, type KitRecord } from './map.ts';

const plan = (over = {}) => ({ id: 1, numBeds: 2, numBaths: 1.5, minSquareFeet: 900, minRent: 3000, maxRent: 3200, rentPricingType: 1, ...over });
const record = (over: Partial<KitRecord> = {}): KitRecord => ({
  id: 10,
  propertyId: 555,
  buildingName: ' City Lights on Fig ',
  address: { streetNumber: '1720', streetDirection: 'S', streetName: 'Figueroa', streetType: 'St', city: 'Los Angeles', state: 'CA', postCode: '900155555', latitude: 34.04, longitude: -118.26 },
  propertyManagementCompanyName: 'Greystar Real Estate Partners',
  primaryPhoto: { attachmentUri: 'https://cdn.example/i2/abc/112/image.jpg' },
  apartmentModels: [plan()],
  ...over,
});

test('maps a community and its floor plans', () => {
  const r = mapRecord(record());
  assert.ok('community' in r);
  assert.equal(r.community.costar_property_id, '555');
  assert.equal(r.community.name, 'City Lights on Fig');
  assert.equal(r.community.address, '1720 S Figueroa St');
  assert.equal(r.community.postal_code, '90015');
  assert.equal(r.community.primary_photo_url, 'https://cdn.example/i2/abc/113/image.jpg');
  assert.equal(r.listings.length, 1);
  const l = r.listings[0]!;
  assert.deepEqual([l.beds, l.baths, l.sqft, l.price, l.rent_min, l.rent_max], [2, 1.5, 900, 3000, 3000, 3200]);
  assert.equal(l.costar_floorplan_id, '1');
  assert.equal(l.pets, null); // unknown, not "no"
  assert.deepEqual(l.photos, ['https://cdn.example/i2/abc/113/image.jpg']);
});

test('skips records outside Los Angeles, case-insensitively inside it', () => {
  assert.deepEqual(mapRecord(record({ address: { city: 'Houston', state: 'TX', latitude: 29.8, longitude: -95.5 } })), { skipped: 'not in Los Angeles' });
  const upper = mapRecord(record({ address: { ...record().address!, city: 'LOS ANGELES' } }));
  assert.ok('community' in upper);
});

test('skips records with no property id or no usable coordinates', () => {
  assert.deepEqual(mapRecord(record({ propertyId: null })), { skipped: 'no property id' });
  assert.deepEqual(mapRecord(record({ address: { ...record().address!, latitude: null } })), { skipped: 'no coordinates' });
  assert.deepEqual(mapRecord(record({ address: { ...record().address!, latitude: 0, longitude: 0 } })), { skipped: 'no coordinates' });
});

test('drops floor plans that cannot be shown honestly, and says why', () => {
  const r = mapRecord(
    record({
      apartmentModels: [
        plan({ id: 1 }),
        plan({ id: 2, minRent: 0 }), // 0 = no rent given
        plan({ id: 3, minRent: null }),
        plan({ id: 4, rentPricingType: 2 }), // per bed
        plan({ id: 5, numBeds: null }),
        plan({ id: 6, numBaths: null }),
      ],
    }),
  );
  assert.ok('community' in r);
  assert.deepEqual(r.listings.map((l) => l.costar_floorplan_id), ['1']);
  assert.deepEqual(r.skippedPlans, ['floor plan: no rent', 'floor plan: no rent', 'floor plan: not priced per unit', 'floor plan: no bedrooms', 'floor plan: no bathrooms']);
});

test('studios (0 beds) are kept, a missing or zero size becomes null, a range never inverts', () => {
  const r = mapRecord(record({ apartmentModels: [plan({ numBeds: 0, minSquareFeet: 0, maxRent: 100 })] }));
  assert.ok('community' in r);
  const l = r.listings[0]!;
  assert.equal(l.beds, 0);
  assert.equal(l.sqft, null);
  assert.equal(l.rent_max, 3000); // maxRent below minRent is clamped up
});

test('a community with no usable floor plans is still a community', () => {
  const r = mapRecord(record({ apartmentModels: [plan({ minRent: 0 })] }));
  assert.ok('community' in r);
  assert.equal(r.listings.length, 0);
});

test('photoUrl and streetAddress helpers', () => {
  assert.equal(photoUrl(null), null);
  assert.equal(photoUrl('https://x/112/a.jpg'), 'https://x/113/a.jpg');
  assert.equal(streetAddress({}), null);
  assert.equal(streetAddress({ streetNumber: '9', streetName: 'Main', streetType: 'Ave' }), '9 Main Ave');
});
