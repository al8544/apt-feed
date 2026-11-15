// Cuts the screen recordings (scripts/record-demo.mjs) into one 60 fps demo video under 2 minutes, in the app's look: cream background,
// dark-brown Gaegu captions that slide in, a rounded phone on the right. The script (scripts/demo-script.mjs) sets what each scene says and
// how long it lasts. The camera moves ONLY for the mouse actions the recorder logged: it eases in on the thing the cursor is about to click
// or point at, holds while it does, and eases back out. Text fades while the camera is in close.
// Silent on purpose: record your voiceover over it with recordings/voiceover-script.md (timed lines, plus when each zoom lands).
// Needs ffmpeg and recordings/{new-user,in-flock,hunt,ducktective}.mp4 + .marks.json + .events.json.
//   node scripts/edit-demo.mjs          writes recordings/flock-demo.mp4 (1920x1080, 60 fps)
//   ONLY=match,chat node scripts/edit-demo.mjs   renders just those scenes to recordings/.cut/preview.mp4
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { OUTRO, SCENES, TITLE } from './demo-script.mjs';

const R = 'recordings', A = `${R}/assets`, TMP = `${R}/.cut`;
const FONT = { b: `${A}/Gaegu-Bold.ttf`, r: `${A}/Gaegu-Regular.ttf` };
const INK = '0x45270e', MUTED = '0x7a6352', BG = '0xfbf6ec', SAGE = '0xdce6d6';
const load = (take, kind) => JSON.parse(readFileSync(`${R}/${take}.${kind}.json`, 'utf8'));
const data = {};
for (const take of new Set(SCENES.map((s) => s.take))) data[take] = { marks: load(take, 'marks'), events: load(take, 'events') };

// The scene is drawn at 2x (3840x2160) so zooming in stays sharp; layout numbers below are in 1920x1080 units.
const S = 2, PHONE = { x: 1188, y: 50, w: 452, h: 980, k: 980 / 852 }; // the phone screen in layout units; k = layout px per CSS px
const LEAD = 0.8;                                                        // seconds the camera takes to ease in or out

const only = process.env.ONLY?.split(',');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const run = (args) => {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
};
const text = (name, s) => { const f = `${TMP}/${name}.txt`; writeFileSync(f, s); return f; };
const ENC = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'veryfast', '-r', '60', '-an'];
const fade = (d) => `fade=t=in:st=0:d=0.35:color=${BG},fade=t=out:st=${(d - 0.35).toFixed(2)}:d=0.35:color=${BG}`;
const wrap = (s, n) => s.split(' ').reduce((ls, w) => (ls.length && (ls.at(-1) + ' ' + w).length <= n ? [...ls.slice(0, -1), ls.at(-1) + ' ' + w] : [...ls, w]), []).join('\n');

// drawtext that fades in and slides up from below, starting `delay` seconds in; `hide` (0 to 1) fades it out while the camera is in close.
const dt = (file, font, size, color, x, y, delay, extra = '', hide = '0') => {
  const e = `min(1,max(0,(t-${delay})/0.55))`;
  return `drawtext=fontfile=${font}:textfile=${file}:fontsize=${size}:fontcolor=${color}:x=${x}:y='${y}+35*pow(1-${e},3)':alpha='${e}*(1-${hide})'${extra}`;
};
const rounded = (w, h, r, color) =>
  `color=c=${color}:s=${w}x${h}:r=60,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*lte(pow(max(max(${r}-X,X-(${w - 1}-${r})),0),2)+pow(max(max(${r}-Y,Y-(${h - 1}-${r})),0),2),${r * r})'`;
const css = (cx, cy) => [PHONE.x + cx * PHONE.k, PHONE.y + cy * PHONE.k];

// ---------- the camera ----------
// A path of keyframes [time, zoom, focusX, focusY] (layout units), eased with smoothstep between neighbours, built from the logged mouse actions.
function cameraPath(events, dur) {
  const centre = [960, 540];
  const keys = [[0, 1, ...centre]];
  const add = (t, z, fx, fy) => { if (t > keys.at(-1)[0] + 0.02 && t < dur - 0.04) keys.push([+t.toFixed(2), z, fx, fy]); };
  let prev = null;                                                      // { depart, z, fx, fy }
  for (const e of events) {
    const [fx, fy] = css(e.x + e.w / 2, e.y + e.h / 2);
    const arrive = Math.max(0.1, e.t - 0.15), depart = Math.min(dur - 0.5, e.t + e.hold); // a late action keeps the camera in until the scene's own fade-out
    if (depart <= arrive) continue;
    if (prev && arrive - prev.depart < 1.3) add(arrive, e.z, fx, fy);                       // close together: pan straight over
    else {
      if (prev) add(prev.depart + LEAD, 1, ...centre);                                      // otherwise ease out first
      add(Math.max(0.05, arrive - LEAD), 1, ...centre);
      add(arrive, e.z, fx, fy);
    }
    add(depart, e.z, fx, fy);
    prev = { depart, z: e.z, fx, fy };
  }
  if (prev) add(Math.min(prev.depart + LEAD, dur - 0.08), 1, ...centre);
  return keys.length > 1 ? keys : null;
}
const smooth = (x) => `(${x})*(${x})*(3-2*(${x}))`;
function piece(keys, i) {                                               // one value of the path as an ffmpeg expression of t
  let expr = String(keys.at(-1)[i]);
  for (let k = keys.length - 2; k >= 0; k--) {
    const [t0, , ] = keys[k], t1 = keys[k + 1][0], v0 = keys[k][i], v1 = keys[k + 1][i];
    expr = `if(lt(t,${t1}),${v0}+(${v1 - v0})*${smooth(`clip((t-${t0})/${t1 - t0},0,1)`)},${expr})`;
  }
  return expr;
}
function camera(keys) {
  const Z = `(${piece(keys, 1)})`, FX = `(${piece(keys, 2)})`, FY = `(${piece(keys, 3)})`;
  const pos = (f, size) => `clip(${f}*${Z}-${size / 2},0,${size}*${Z}-${size})`;
  return {
    hide: `min(1,(${Z}-1)*2.5)`,
    filter: `scale=w='1920*${Z}':h='1080*${Z}':eval=frame:flags=bilinear,crop=1920:1080:x='${pos(FX, 1920)}':y='${pos(FY, 1080)}'`,
  };
}

const files = [], lines = [];
let clock = 0;

function card({ head, sub, dur, vo }, name) {
  if (only) return;
  const f = `${TMP}/${name}.mp4`;
  const hf = text(`${name}-h`, head), sf = text(`${name}-s`, wrap(sub, 60));
  run(['-f', 'lavfi', '-i', `color=c=${BG}:s=1920x1080:r=60:d=${dur}`, '-i', `${A}/logo-pond.png`, '-filter_complex',
    `[1:v]scale=420:-1[l];[0:v][l]overlay=(W-w)/2:200,${dt(hf, FONT.b, 150, INK, '(w-text_w)/2', 560, 0.3)},${dt(sf, FONT.r, 48, MUTED, '(w-text_w)/2', 760, 0.6, ':line_spacing=14')},${fade(dur)}`,
    '-t', String(dur), ...ENC, f]);
  files.push(f);
  lines.push({ t: clock, dur, head: name.toUpperCase(), vo, beats: [] });
  clock += dur;
}

// Rounded-corner shapes are the same on every frame, so draw each once to a PNG instead of computing it per frame.
const PW = PHONE.w * S, PH = PHONE.h * S, B = 16;
const shape = (name, w, h, r, color) => {
  const f = `${TMP}/${name}.png`;
  run(['-f', 'lavfi', '-i', rounded(w, h, r, color), '-frames:v', '1', '-update', '1', f]);
  return ['-loop', '1', '-framerate', '60', '-i', f];
};
const SHAPES = [...shape('mask', PW, PH, 72, '0xffffff'), ...shape('frame', PW + 2 * B, PH + 2 * B, 88, INK), ...shape('disc', 1500, 1500, 750, SAGE)];

card(TITLE, 'title');

SCENES.forEach((sc, i) => {
  const { marks, events } = data[sc.take];
  const from = marks[`${sc.id}:start`], to = marks[`${sc.id}:end`];
  if (from == null || to == null) throw new Error(`No marks for scene "${sc.id}" in ${sc.take}.marks.json: re-record that take.`);
  const real = to - from, speed = sc.fit ? real / sc.dur : 1, dur = real / speed;
  if (!sc.fit && Math.abs(dur - sc.dur) > 0.5) console.warn(`scene "${sc.id}" lasts ${dur.toFixed(1)}s, the script says ${sc.dur}s`);
  const evs = events.filter((e) => e.scene === sc.id).map((e) => ({ ...e, t: (e.t - from) / speed, hold: e.hold / speed })).sort((a, b) => a.t - b.t);
  lines.push({ t: clock, dur, head: sc.head, vo: sc.vo, beats: evs.map((e, j) => `${(e.t).toFixed(1)}s: zoom on ${sc.zooms?.[j] ?? 'the cursor target'}`) });
  clock += dur;
  if (only && !only.includes(sc.id)) return;

  const f = `${TMP}/s${String(i).padStart(2, '0')}.mp4`;
  const hw = wrap(sc.head, 27), n = hw.split('\n').length;
  const cf = text(`c${i}`, sc.chapter), hf = text(`h${i}`, hw), sf = text(`s${i}`, wrap(sc.cap, 32));
  const keys = cameraPath(evs, dur), cam = keys ? camera(keys) : null, hide = cam ? cam.hide : '0';
  run(['-ss', String(from), '-t', String(real), '-i', `${R}/${sc.take}.mp4`,
    '-f', 'lavfi', '-i', `color=c=${BG}:s=${1920 * S}x${1080 * S}:r=60`, '-i', `${A}/logo-pond.png`, ...SHAPES,
    '-filter_complex',
    `[0:v]setpts=PTS/${speed},fps=60,scale=${PW}:${PH}:flags=lanczos,format=rgba[ph];` +
    `[3:v]alphaextract[m];[ph][m]alphamerge[phone];` +
    `[1:v][5:v]overlay=${PHONE.x * S - 330}:${PHONE.y * S - 260}:shortest=1[a];` +   // a soft sage disc behind the phone
    `[a][4:v]overlay=${PHONE.x * S - B}:${PHONE.y * S - B}:shortest=1[b];` +
    `[b][phone]overlay=${PHONE.x * S}:${PHONE.y * S}:shortest=1[c];[2:v]scale=${220 * S}:-1[l];[c][l]overlay=${140 * S}:${880 * S},` +
    `${cam ? cam.filter : 'scale=1920:1080:flags=lanczos'},` +
    `${dt(cf, FONT.b, 34, MUTED, 140, 250, 0.1, ':expansion=none', hide)},` +
    `${dt(hf, FONT.b, 92, INK, 140, 310, 0.25, ':line_spacing=8', hide)},` +
    `${dt(sf, FONT.r, 44, MUTED, 140, 310 + n * 108 + 24, 0.55, ':line_spacing=10', hide)},${fade(dur)}`,
    '-t', dur.toFixed(2), ...ENC, f]);
  files.push(f);
});

card(OUTRO, 'flock');

writeFileSync(`${TMP}/list.txt`, files.map((f) => `file '${f.replace(`${TMP}/`, '')}'`).join('\n'));
const out = only ? `${TMP}/preview.mp4` : `${R}/flock-demo.mp4`;
// Re-encode the join (not `-c copy`): copying leaves each scene's own stream headers mid-file, and QuickTime stops after the first clip.
// Conservative settings for any player or editor: no B-frames, a keyframe every second, standard colour tags, and a silent audio track.
run(['-f', 'concat', '-safe', '0', '-i', `${TMP}/list.txt`, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-r', '60',
  '-bf', '0', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', '-tag:v', 'avc1', out]);

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
if (!only) writeFileSync(`${R}/voiceover-script.md`, [
  '# Flock demo: voiceover script', '',
  `Total ${mmss(clock)} (${clock.toFixed(0)}s). Each line is timed to its scene (about 2.5 words a second). Under each line: when the camera zooms, and on what, so you can land the words on the moment.`, '',
  ...lines.map((l) => `**${mmss(l.t)}** (${l.dur.toFixed(0)}s)${l.head ? ` · ${l.head}` : ''}\n${l.vo}\n${l.beats.length ? l.beats.map((b) => `  - ${b}`).join('\n') + '\n' : ''}`),
].join('\n'));
console.log(`Wrote ${out}${only ? '' : ` (${mmss(clock)}) and ${R}/voiceover-script.md`}`);
