// Run: node --test lib/enrich/apartments-com.test.ts   (fixtures are synthetic, see their headers)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isBlocked, parse, sameImage } from './apartments-com.ts';

const fixture = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), 'utf8');

test('reads photos from JSON-LD and og:image, upgrades http, dedupes, tells floor plans apart', () => {
  const p = parse(fixture('community-with-gallery.html'));
  assert.deepEqual(p.photos, [
    { url: 'https://images.example-cdn.test/gallery/01.jpg', kind: 'photo' }, // http:// upgraded; the og:image duplicate is dropped
    { url: 'https://images.example-cdn.test/gallery/02.jpg', kind: 'photo' },
    { url: 'https://images.example-cdn.test/gallery/03.jpg', kind: 'photo' },
    { url: 'https://images.example-cdn.test/plans/A1.jpg', kind: 'floorplan' },
  ]);
});

test('reads details: pets, de-duplicated amenities (false ones left out), trimmed description', () => {
  const p = parse(fixture('community-with-gallery.html'));
  assert.equal(p.petsAllowed, true);
  assert.deepEqual(p.amenities, ['Pool', 'Laundry in unit']);
  assert.equal(p.description, 'Bright studios and lofts near the 110.');
});

test('a broken JSON-LD block is skipped, not fatal', () => {
  assert.doesNotThrow(() => parse(fixture('community-with-gallery.html')));
});

test('falls back to og:image; a page with nothing readable gives empty results, never an error', () => {
  assert.deepEqual(parse(fixture('only-og-image.html')).photos, [{ url: 'https://images.example-cdn.test/solo.jpg', kind: 'photo' }]);
  const none = parse(fixture('no-data.html'));
  assert.deepEqual(none, { photos: [], petsAllowed: null, amenities: [], description: null });
  assert.deepEqual(parse(''), none);
});

test('recognises a block page and bad statuses so the run can stop', () => {
  assert.equal(isBlocked(200, fixture('blocked.html')), true);
  assert.equal(isBlocked(403, ''), true);
  assert.equal(isBlocked(429, ''), true);
  assert.equal(isBlocked(200, fixture('community-with-gallery.html')), false);
});

test('kit image sizes are the same picture', () => {
  assert.equal(sameImage('https://c/i2/abc/112/image.jpg', 'https://c/i2/abc/116/image.jpg'), true);
  assert.equal(sameImage('https://c/i2/abc/112/image.jpg', 'https://c/i2/xyz/112/image.jpg'), false);
});
