// Run: node --test lib/costar/media.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickGallery, type KitAttachment } from './media.ts';

const att = (id: string, over: Partial<KitAttachment> = {}): KitAttachment => ({
  attachmentType: 4, attachmentTypeExtension: 6, videoExternalReferenceType: 0, dimensions: { width: 1800, height: 900 },
  attachmentUri: `https://cdn.test/i2/${id}/112/image.jpg`, ...over,
});

test('orders building, then interior, then lobby, then aerial, keeping kit order inside a type; upgrades the size', () => {
  const g = pickGallery([att('aer', { attachmentType: 1 }), att('int1', { attachmentType: 33 }), att('b1'), att('lob', { attachmentType: 6 }), att('b2')]);
  assert.deepEqual(g, ['b1', 'b2', 'int1', 'lob', 'aer'].map((id) => `https://cdn.test/i2/${id}/113/image.jpg`));
});

test('leaves out floor plans, plat maps, documents, Matterport, links that are not published, tiny images', () => {
  const g = pickGallery([
    att('plan', { attachmentType: 10 }), att('plat', { attachmentType: 9 }), att('doc', { attachmentTypeExtension: 52 }),
    att('tour', { videoExternalReferenceType: 36 }), att('planimg', { videoExternalReferenceType: 60 }),
    att('nolink', { attachmentUri: null }), att('thumb', { dimensions: { width: 180, height: 140 } }), att('ok'),
  ]);
  assert.deepEqual(g, ['https://cdn.test/i2/ok/113/image.jpg']);
});

test('drops the primary photo and duplicates (same picture at another size), and caps the count', () => {
  const g = pickGallery([att('p'), att('a'), att('a'), att('b')], 'https://cdn.test/i2/p/113/image.jpg');
  assert.deepEqual(g, ['a', 'b'].map((id) => `https://cdn.test/i2/${id}/113/image.jpg`));
  assert.equal(pickGallery(Array.from({ length: 30 }, (_, i) => att(`x${i}`)), null, 12).length, 12);
});

test('no attachments gives an empty gallery, never an error', () => {
  assert.deepEqual(pickGallery(null), []);
  assert.deepEqual(pickGallery([]), []);
});
