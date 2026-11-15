// Records the app in a phone-sized window as a 60 fps video, performing the demo script (scripts/demo-script.mjs) scene by scene.
// Playwright's own recorder is capped near 25 fps, so this takes Chrome's raw screencast frames and assembles them at 60 fps with ffmpeg.
//   npm run dev:local                          (app on :3000, in another terminal)
//   node scripts/record-demo.mjs <take>        take: new-user | in-flock | hunt | ducktective
// Writes recordings/<take>.mp4 plus <take>.marks.json (where each scene starts and ends) and <take>.events.json (every mouse action worth
// zooming on: what, where on screen, when). The editor zooms only on those events. Resets the local database to the take's scenario first.
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { SCENES } from './demo-script.mjs';

const take = process.argv[2] ?? 'in-flock';
const BASE = 'http://localhost:3000';
const OUT = 'recordings';
const W = 393, H = 852;
const dur = (id) => SCENES.find((s) => s.id === id).dur;
const fitScene = (id) => SCENES.find((s) => s.id === id).fit;

if (spawnSync('node', ['scripts/seed-demo.mjs', take === 'new-user' ? 'new-user' : 'in-flock'], { stdio: 'inherit' }).status !== 0) process.exit(1);
rmSync(`${OUT}/.tmp`, { recursive: true, force: true });
mkdirSync(`${OUT}/.tmp/frames`, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true });
const page = await context.newPage();

const frames = [], writes = [];
const cdp = await context.newCDPSession(page);
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const file = `${OUT}/.tmp/frames/${String(frames.length).padStart(6, '0')}.jpg`;
  frames.push({ file, ts: metadata.timestamp });
  writes.push(writeFile(file, Buffer.from(data, 'base64')));
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });

// Hide Next.js's dev overlay and draw a cursor dot (a video of a web page shows no cursor).
await page.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const hide = document.createElement('style');
    hide.textContent = 'nextjs-portal { display: none !important; }';
    document.head.appendChild(hide);
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(69,39,14,.35);border:2px solid #45270e;pointer-events:none;transition:transform .12s;left:-50px;top:-50px';
    document.documentElement.appendChild(dot);
    addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { dot.style.transform = 'scale(.6)'; }, true);
    addEventListener('mouseup', () => { dot.style.transform = 'scale(1)'; }, true);
  });
});

// ---------- the scene clock ----------
const nowS = () => Date.now() / 1000;                       // wall clock; turned into seconds-into-the-video once the first frame is known
const marks = {}, events = [];
let sceneId = null, sceneT0 = 0;
const wait = (ms) => page.waitForTimeout(ms);
const until = async (t) => { const ms = (sceneT0 + t - nowS()) * 1000; if (ms > 0) await wait(ms); }; // wait until t seconds into the scene

async function scene(id, fn) {
  sceneId = id; sceneT0 = nowS(); marks[`${id}:start`] = sceneT0;
  await fn();
  if (!fitScene(id)) await until(dur(id));
  marks[`${id}:end`] = nowS();
  const over = nowS() - sceneT0 - dur(id);
  if (!fitScene(id) && over > 0.4) console.warn(`  scene "${id}" ran ${over.toFixed(1)}s over its ${dur(id)}s`);
  sceneId = null;
}

// ---------- the mouse ----------
let mouse = [W / 2, H * 0.62];
const ease = (x) => x * x * (3 - 2 * x);
async function glide(x, y, ms) {
  const [x0, y0] = mouse, n = Math.max(6, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) {
    const e = ease(i / n);
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await wait(ms / n);
  }
  mouse = [x, y];
}
// A moment worth zooming on: the camera eases in on `box` (CSS px) as the cursor arrives, holds `hold` seconds, then eases out.
function log(box, zoom) {
  if (!zoom || !sceneId) return null;
  const e = { scene: sceneId, t: nowS(), x: box.x, y: box.y, w: box.width ?? box.w, h: box.height ?? box.h, z: zoom.z, hold: zoom.hold ?? 1.2 };
  events.push(e);
  return e;
}
// Glide to an element and click it. `at` = seconds into the scene when the cursor arrives; without it, do it now.
async function tap(locator, { at, zoom, ms = 650, click = true, pause = 0, dwell = 120 } = {}) {
  await locator.waitFor({ state: 'visible' });
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (at != null) await until(at - 0.12 - ms / 1000);
  await glide(box.x + box.width / 2, box.y + box.height / 2, ms);
  const e = log(box, zoom);
  await wait(dwell);                                       // rest on it a moment before clicking, so the camera shows what is about to happen
  if (click) { await page.mouse.down(); await page.mouse.up(); }
  if (pause) await wait(pause);
  return e;
}
const hover = (locator, opts) => tap(locator, { ...opts, click: false });
async function typeIn(locator, text, { at, delay = 60, zoom, ms } = {}) {
  const e = await tap(locator, { at, zoom, ms });
  if (e) e.hold = Math.max(e.hold, (text.length * delay) / 1000 + 0.9);
  await page.keyboard.type(text, { delay });
  return e;
}
// Drag like a finger (swiping a gallery).
async function drag(from, to, { at, zoomBox, zoom }) {
  if (at != null) await until(at - 0.9);
  await glide(from[0], from[1], 600); await wait(150);
  log(zoomBox, zoom);
  await page.mouse.down(); await glide(to[0], to[1], 420); await page.mouse.up();
}
const smoothScroll = (px) => page.evaluate((y) => scrollBy({ top: y, behavior: 'smooth' }), px);
const scrollToHeading = (text) => page.evaluate((t) => [...document.querySelectorAll('h2')].find((h) => h.textContent.includes(t))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), text);
const nav = (label, opts) => tap(page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).last(), opts);

async function signIn(email) {
  await page.goto(`${BASE}/welcome`);
  await wait(1200);
  await tap(page.getByRole('link', { name: 'Sign in' }), { pause: 500 });
  await tap(page.getByLabel('Email'), { ms: 350 }); await page.keyboard.type(email, { delay: 30 });
  await tap(page.getByLabel('Password'), { ms: 350 }); await page.keyboard.type('flock1234', { delay: 30 });
  await tap(page.getByRole('button', { name: /sign in/i }), { pause: 1500 });
}
async function openFlock() {
  await tap(page.getByRole('button', { name: /Our Flock/ }), { pause: 2500 });
}

// ---------- the takes: each scene performs its beats on the script's clock ----------
const takes = {
  async 'new-user'() {
    await page.goto(`${BASE}/welcome`); await wait(1500);
    await scene('join', async () => {                                             // a fast montage, sped up to fit
      const fast = { ms: 350 };
      await tap(page.getByRole('link', { name: 'Create account' }), fast);
      for (const [label, text] of [['Name', 'Pat Rivera'], ['Email', 'pat@flock.test'], ['Password', 'flock1234']]) { await tap(page.getByLabel(label), fast); await page.keyboard.type(text, { delay: 22 }); }
      await tap(page.getByRole('button', { name: 'Create account' }), { ...fast, pause: 1800 });
      await tap(page.getByRole('link', { name: 'Find a flock' }), { ...fast, pause: 1000 });
      for (const chip of ['$3-4k', 'Silver Lake', 'Los Feliz']) await tap(page.getByRole('button', { name: chip }), fast);
      await page.getByLabel('Move-in date').fill('2027-01-10');
      await tap(page.getByRole('button', { name: 'Next' }), { ...fast, pause: 1000 });
      for (const [label, text] of [['About you', 'I just hate pets. Dog hair and cat smell make me sick. I work from home and cook a lot.'],
        ['What you want in roommates and a home', 'A quiet, tidy place with people who share chores.'], [/Dealbreakers/, 'No animals at all.']]) {
        await tap(page.getByLabel(label), fast); await page.keyboard.type(text, { delay: 12 });
      }
      await tap(page.getByRole('button', { name: 'Find my flocks' }), fast);
    });
    const card = page.getByRole('link', { name: /Pet Parents Westside/ });
    await card.waitFor({ timeout: 90000 });                                       // the agent reads your answers (not on screen)
    await wait(800);
    await scene('match', async () => {
      await hover(card.getByText(/% match/), { at: 2.2, zoom: { z: 2.1, hold: 2.8 } });  // the 26%
    });
    await scene('request', async () => {
      await tap(card, { at: 0.6 });
      await until(1.8); await page.getByRole('button', { name: 'Request to join' }).scrollIntoViewIfNeeded();
      await tap(page.getByRole('button', { name: 'Request to join' }), { at: 3.0, dwell: 800, zoom: { z: 1.9, hold: 1.7 } });
    });
  },

  async 'in-flock'() {
    await signIn('vinnie@flock.test'); await openFlock(); await wait(1500);
    await scene('requests', async () => {
      await tap(page.getByRole('link', { name: /Join requests/ }), { at: 0.6 });
      await tap(page.getByRole('button', { name: 'Approve' }).first(), { at: 3.9, dwell: 900, zoom: { z: 1.8, hold: 1.5 } });
    });
    await tap(page.getByRole('link', { name: /Flock/ }).first(), { pause: 1200 });
    await scrollToHeading('Members'); await wait(1500);
    await scene('members', async () => {
      await tap(page.getByRole('button', { name: /Maya Kim's details/ }), { at: 0.9 });
      await hover(page.getByText('Habits', { exact: true }), { at: 3.0, zoom: { z: 1.9, hold: 3 } });
      await until(3.6); await page.evaluate(() => document.querySelector('[role=dialog] .overflow-y-auto')?.scrollBy({ top: 300, behavior: 'smooth' }));
    });
    await page.keyboard.press('Escape'); await wait(1000);
    await scene('chat', async () => {
      await tap(page.getByRole('button', { name: 'Chat' }), { at: 0.7, zoom: { z: 1.8, hold: 1.0 } });
      await typeIn(page.getByPlaceholder('Message the flock…'), 'Booked the Saturday tour for 6pm!', { at: 3.0, delay: 55, zoom: { z: 1.7 } });
      await until(5.8); await page.keyboard.press('Enter');
    });
    await page.keyboard.press('Escape'); await wait(800);
    await scene('pins', async () => {
      await until(0.4); await scrollToHeading('Commute pins');
      await hover(page.locator('.gm-style').first(), { at: 2.6, zoom: { z: 1.9, hold: 3 } });
    });
    await scene('map', async () => {
      await nav('Map', { at: 0.7 });
      await tap(page.getByText('165', { exact: true }).first(), { at: 3.2, zoom: { z: 2.0, hold: 1.8 } });   // the biggest cluster, then in
      await tap(page.locator('[aria-label$=" places here"]').first(), { at: 5.8, zoom: { z: 2.0, hold: 1.6 } });
    });
    await scene('swipe', async () => {
      await nav('For you', { at: 0.7 });
      await tap(page.getByRole('button', { name: 'Yes' }), { at: 2.3, zoom: { z: 1.7, hold: 1.2 } });
      await tap(page.getByRole('button', { name: 'Nope' }), { at: 4.1 });
      await tap(page.getByRole('button', { name: 'Too far' }), { at: 5.7, zoom: { z: 1.9, hold: 1.1 } });   // why the nope
    });
  },

  async hunt() {
    await signIn('vinnie@flock.test'); await openFlock();
    await scene('rankings', async () => {
      await until(0.5); await smoothScroll(420);
      await hover(page.locator('a[href^="/listing/"]').first(), { at: 3.0, zoom: { z: 1.9, hold: 2.4 } });
    });
    await scene('listing', async () => {
      await tap(page.locator('a[href^="/listing/"]').first(), { at: 0.7 });
      await drag([300, 200], [90, 200], { at: 2.4, zoomBox: { x: 0, y: 90, w: 393, h: 230 }, zoom: { z: 1.6, hold: 1.8 } });
      await until(4.2); await smoothScroll(420);
      await hover(page.getByText(/from your pin/), { at: 5.6, zoom: { z: 2.0, hold: 1.0 } });
      await tap(page.getByRole('button', { name: 'Book a tour' }), { at: 7.0, zoom: { z: 1.8, hold: 1.0 } });
    });
    await page.keyboard.press('Escape'); await wait(900);
    await nav('Flock', { pause: 1500 }); await scrollToHeading('Flock rankings'); await wait(1000);
    await scene('pick', async () => {
      await tap(page.getByRole('link', { name: 'Compare', exact: true }), { at: 0.3 });
      const rows = page.locator('button[aria-label^="Select "]');
      await tap(rows.nth(0), { at: 1.3, zoom: { z: 1.6, hold: 2.0 } });
      await tap(rows.nth(1), { at: 2.2, ms: 320 });
      await tap(rows.nth(2), { at: 2.9, ms: 320 });
    });
    await tap(page.getByRole('button', { name: /Compare 3 places/ }), { pause: 1500 });
    await scene('compare', async () => {
      await until(0.6); await smoothScroll(260);
      await hover(page.getByText('Avg distance'), { at: 2.8, zoom: { z: 2.0, hold: 3.0 } });
      await hover(page.getByText('Farthest pin').first(), { at: 4.8, zoom: { z: 2.0, hold: 1.6 } });
    });
    await scene('metrics', async () => {
      await tap(page.getByRole('button', { name: 'Compare metrics' }), { at: 0.5 });
      await tap(page.getByRole('switch', { name: 'Farthest pin' }), { at: 2.4, zoom: { z: 1.9, hold: 1.5 } });
    });
    await page.keyboard.press('Escape'); await wait(900);
    await scene('tours', async () => {
      await nav('Calendar', { at: 0.6 });
      await tap(page.locator('a[href^="/tours/"]').first(), { at: 3.2, zoom: { z: 1.7, hold: 1.8 } });
    });
  },

  async ducktective() {
    await signIn('vinnie@flock.test'); await openFlock();
    await nav('Map'); await wait(3000);
    await scene('dk-ask', async () => {
      await typeIn(page.getByRole('combobox'), '3 bed near Silver Lake under $4k that allows dogs', { at: 0.5, delay: 40, zoom: { z: 1.9 } });
      await tap(page.getByRole('option', { name: /Ask Ducktective/ }), { at: 3.8 });
    });
    await scene('dk-work', async () => {                                             // the agent works (about 45s), sped up to fit
      await wait(1200);
      const e = await hover(page.getByText('Ask Ducktective').first(), { zoom: { z: 1.8 } });
      await page.getByText('Best option', { exact: true }).first().waitFor({ timeout: 150000 });
      if (e) e.hold = nowS() - e.t;                                                   // the camera stays on the panel the whole time
    });
    await scene('dk-result', async () => {
      await hover(page.getByText('Best option', { exact: true }).first(), { at: 0.8, zoom: { z: 1.9, hold: 2.4 } });
      await hover(page.getByText(/Aerial imagery/).first(), { at: 4.2, zoom: { z: 2.0, hold: 2.4 } });
    });
  },
};
if (!takes[take]) { console.error(`No take "${take}". Have: ${Object.keys(takes).join(', ')}`); await browser.close(); process.exit(1); }

try {
  await takes[take]();
} finally {
  await cdp.send('Page.stopScreencast').catch(() => {});
  await Promise.all(writes);
  await context.close();
  await browser.close();
  const start = frames[0].ts, rel = (s) => +(s - start).toFixed(2);
  writeFileSync(`${OUT}/${take}.marks.json`, JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, rel(v)])), null, 1));
  writeFileSync(`${OUT}/${take}.events.json`, JSON.stringify(events.map((e) => ({ ...e, t: rel(e.t) })), null, 1));
  // Each frame is held until the next one arrives; ffmpeg then resamples that to a constant 60 fps.
  const name = (f) => f.file.replace(`${OUT}/.tmp/`, '');
  const list = frames.map((f, i) => `file '${name(f)}'\nduration ${Math.max(0.001, (frames[i + 1]?.ts ?? f.ts + 0.05) - f.ts).toFixed(4)}`);
  writeFileSync(`${OUT}/.tmp/list.txt`, list.join('\n') + `\nfile '${name(frames.at(-1))}'\n`);
  const mp4 = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${OUT}/.tmp/list.txt`, '-vf', 'fps=60', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '14', '-preset', 'fast', `${OUT}/${take}.mp4`], { encoding: 'utf8' });
  console.log(mp4.status === 0 ? `Wrote ${OUT}/${take}.mp4 (${(frames.at(-1).ts - start).toFixed(1)}s, ${events.length} zoom moments)` : `ffmpeg failed: ${mp4.stderr}`);
  rmSync(`${OUT}/.tmp`, { recursive: true, force: true });
}
