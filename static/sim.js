/* micro:bit simulator: a floating panel (bottom-right, every tab) with a pretend micro:bit.
 * Python runs in the browser with Skulpt (vendor/skulpt) using the modules in sim-modules.js.
 * "Connecting" it makes the app talk to it exactly like a real board on the serial line: it
 * answers the MicroPython REPL / raw-REPL protocol, so Run, the console, sensors, the tour,
 * the Inside lessons, quizzes and Bit all work with it unchanged. */
'use strict';

/* =============================================================== state */
const SIM = {
  skulpt: null, open: false, running: false, stop: false, sleepers: new Set(),
  leds: new Array(25).fill(0), displayOn: true, animToken: 0,
  buttons: { a: { down: false, presses: 0, was: false }, b: { down: false, presses: 0, was: false } },
  tilt: { x: 0, y: 0 }, faceDown: false, momentary: null, lastGesture: '', gestureHistory: new Set(), gestureList: [],
  temp: 21, light: 120, heading: 0, magnet: 0, calibrated: false,
  pins: {}, radio: { on: false, group: 0, inbox: [] }, music: { ticks: 4, bpm: 120, token: 0, note: '' }, muted: false,
  fs: {}, ns: {}, boot: performance.now(),
  mode: 'friendly', rawBuf: '', line: '', cont: [], escape: false, lastCR: false,
  log: [], output: '',
};
try { SIM.fs = JSON.parse(localStorage.getItem('microbit-sim-fs') || '{}') || {}; } catch {}
const saveFs = () => { try { localStorage.setItem('microbit-sim-fs', JSON.stringify(SIM.fs)); } catch {} };
const pinState = (n) => (SIM.pins[n] = SIM.pins[n] || { out: null, value: 0, touched: false, input: 0 });

function simLog(msg) {
  SIM.log.push({ t: new Date(), msg }); if (SIM.log.length > 60) SIM.log.shift();
  const el = $('sim-log'); if (el) renderLog();
}

/* ================================================================ font */
// 5×5 glyphs ('#' = lit). Lower-case letters use the capitals.
const SIM_FONT = {
  ' ': ['.....', '.....', '.....', '.....', '.....'], '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....'], '#': ['.#.#.', '#####', '.#.#.', '#####', '.#.#.'],
  '$': ['.####', '#.#..', '.###.', '..#.#', '####.'], '%': ['##..#', '##.#.', '..#..', '.#.##', '#..##'],
  '&': ['.##..', '#..#.', '.##..', '#..#.', '.##.#'], "'": ['..#..', '..#..', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '..#..', '..#..', '...#.'], ')': ['.#...', '..#..', '..#..', '..#..', '.#...'],
  '*': ['.....', '.#.#.', '..#..', '.#.#.', '.....'], '+': ['.....', '..#..', '.###.', '..#..', '.....'],
  ',': ['.....', '.....', '.....', '..#..', '.#...'], '-': ['.....', '.....', '.###.', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '..#..'], '/': ['....#', '...#.', '..#..', '.#...', '#....'],
  '0': ['.##..', '#..#.', '#..#.', '#..#.', '.##..'], '1': ['..#..', '.##..', '..#..', '..#..', '.###.'],
  '2': ['###..', '...#.', '.##..', '#....', '####.'], '3': ['####.', '...#.', '..#..', '#..#.', '.##..'],
  '4': ['..##.', '.#.#.', '#..#.', '#####', '...#.'], '5': ['#####', '#....', '####.', '....#', '####.'],
  '6': ['...#.', '..#..', '.###.', '#...#', '.###.'], '7': ['#####', '...#.', '..#..', '.#...', '#....'],
  '8': ['.###.', '#...#', '.###.', '#...#', '.###.'], '9': ['.###.', '#...#', '.###.', '..#..', '.#...'],
  ':': ['.....', '..#..', '.....', '..#..', '.....'], ';': ['.....', '..#..', '.....', '..#..', '.#...'],
  '<': ['...#.', '..#..', '.#...', '..#..', '...#.'], '=': ['.....', '.###.', '.....', '.###.', '.....'],
  '>': ['.#...', '..#..', '...#.', '..#..', '.#...'], '?': ['.###.', '....#', '..##.', '.....', '..#..'],
  '@': ['.###.', '#...#', '#.#.#', '#.##.', '.##..'], 'A': ['.##..', '#..#.', '####.', '#..#.', '#..#.'],
  'B': ['###..', '#..#.', '###..', '#..#.', '###..'], 'C': ['.###.', '#....', '#....', '#....', '.###.'],
  'D': ['###..', '#..#.', '#..#.', '#..#.', '###..'], 'E': ['####.', '#....', '###..', '#....', '####.'],
  'F': ['####.', '#....', '###..', '#....', '#....'], 'G': ['.###.', '#....', '#..##', '#...#', '.###.'],
  'H': ['#..#.', '#..#.', '####.', '#..#.', '#..#.'], 'I': ['###..', '.#...', '.#...', '.#...', '###..'],
  'J': ['####.', '...#.', '...#.', '#..#.', '.##..'], 'K': ['#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  'L': ['#....', '#....', '#....', '#....', '####.'], 'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#'], 'O': ['.##..', '#..#.', '#..#.', '#..#.', '.##..'],
  'P': ['###..', '#..#.', '###..', '#....', '#....'], 'Q': ['.##..', '#..#.', '#..#.', '.##..', '...#.'],
  'R': ['###..', '#..#.', '###..', '#.#..', '#..#.'], 'S': ['.###.', '#....', '.##..', '...#.', '###..'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..'], 'U': ['#..#.', '#..#.', '#..#.', '#..#.', '.##..'],
  'V': ['#...#', '#...#', '#...#', '.#.#.', '..#..'], 'W': ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  'X': ['#..#.', '#..#.', '.##..', '#..#.', '#..#.'], 'Y': ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  'Z': ['####.', '...#.', '..#..', '.#...', '####.'], '[': ['.###.', '.#...', '.#...', '.#...', '.###.'],
  '\\': ['#....', '.#...', '..#..', '...#.', '....#'], ']': ['.###.', '...#.', '...#.', '...#.', '.###.'],
  '^': ['..#..', '.#.#.', '.....', '.....', '.....'], '_': ['.....', '.....', '.....', '.....', '#####'],
  '`': ['.#...', '..#..', '.....', '.....', '.....'], '{': ['..##.', '..#..', '.#...', '..#..', '..##.'],
  '|': ['..#..', '..#..', '..#..', '..#..', '..#..'], '}': ['.##..', '..#..', '...#.', '..#..', '.##..'],
  '~': ['.....', '.#...', '#.#.#', '...#.', '.....'], '°': ['.#...', '#.#..', '.#...', '.....', '.....'],
};
const glyph = (ch) => SIM_FONT[ch] || SIM_FONT[ch.toUpperCase()] || SIM_FONT['?'];
const glyphFrame = (ch) => glyph(ch).join('').split('').map((c) => (c === '#' ? 9 : 0));

/* ============================================================= display */
function setLeds(arr) { SIM.leds = arr.slice(0, 25); drawLeds(); }
const blank = () => new Array(25).fill(0);

// Promise that resolves early if the running program is stopped (Ctrl-C).
function interruptible(p) {
  return new Promise((res) => { SIM.sleepers.add(res); p.then(() => { SIM.sleepers.delete(res); res(); }); });
}
const wait = (ms) => interruptible(new Promise((r) => setTimeout(r, Math.max(0, ms))));

function animate(frames, delay, loop, clearAfter) {
  const token = ++SIM.animToken;
  return new Promise((res) => {
    let i = 0;
    const step = () => {
      if (token !== SIM.animToken) return res();
      if (i >= frames.length) {
        if (loop && frames.length) i = 0;
        else { if (clearAfter) setLeds(blank()); return res(); }
      }
      setLeds(frames[i++]);
      setTimeout(step, delay);
    };
    step();
  });
}
function scrollFrames(text) {
  const cols = [];
  for (const ch of text) {
    const g = glyph(ch);
    let w = 5; while (w > 1 && g.every((r) => r[w - 1] === '.')) w--;
    if (ch === ' ') w = 3;
    for (let x = 0; x < w; x++) cols.push(g.map((r) => (r[x] === '#' ? 9 : 0)));
    cols.push([0, 0, 0, 0, 0]);
  }
  const padded = [...Array(5).fill([0, 0, 0, 0, 0]), ...cols, ...Array(5).fill([0, 0, 0, 0, 0])];
  const frames = [];
  for (let s = 0; s + 5 <= padded.length; s++) {
    const f = blank();
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) f[y * 5 + x] = padded[s + x][y];
    frames.push(f);
  }
  return frames;
}

/* =============================================================== sound */
let actx = null, osc = null, oscGain = null;
function audio() {
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch {}
  return actx;
}
function tone(freq, label) {
  stopTone();
  SIM.music.note = freq > 0 ? (label || `${Math.round(freq)} Hz`) : '';
  drawSpeaker();
  if (freq <= 0 || SIM.muted) return;
  const a = audio(); if (!a) return;
  osc = a.createOscillator(); oscGain = a.createGain();
  osc.type = 'square'; osc.frequency.value = freq; oscGain.gain.value = 0.035;
  osc.connect(oscGain).connect(a.destination); osc.start();
}
function stopTone() { try { osc?.stop(); } catch {} osc = null; SIM.music.note = ''; drawSpeaker(); }
const NOTE_SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function parseNote(str, state) {
  const m = /^([a-gr])(#|b)?(\d)?(?::(\d+))?$/i.exec(str.trim());
  if (!m) return null;
  if (m[3]) state.octave = +m[3];
  if (m[4]) state.dur = +m[4];
  if (m[1].toLowerCase() === 'r') return { freq: 0, dur: state.dur, label: 'rest' };
  const semi = NOTE_SEMI[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (state.octave + 1) + semi;
  return { freq: 440 * 2 ** ((midi - 69) / 12), dur: state.dur, label: `${m[1].toUpperCase()}${m[2] || ''}${state.octave}` };
}
async function playMelody(list, loop) {
  const token = ++SIM.music.token;
  const tick = 60000 / SIM.music.bpm / SIM.music.ticks;
  pinState(0).out = 'music'; drawPins();
  do {
    const st = { octave: 4, dur: 4 };
    for (const s of list) {
      if (token !== SIM.music.token || SIM.stop) { stopTone(); return; }
      const n = parseNote(String(s), st); if (!n) continue;
      tone(n.freq, n.label);
      await wait(n.dur * tick);
    }
  } while (loop && token === SIM.music.token && !SIM.stop);
  if (token === SIM.music.token) { stopTone(); pinState(0).out = null; drawPins(); }
}
async function playPitch(freq, ms) {
  const token = ++SIM.music.token;
  pinState(0).out = 'music'; drawPins();
  tone(freq, `${freq} Hz`);
  if (ms < 0) return;
  await wait(ms);
  if (token === SIM.music.token) { stopTone(); pinState(0).out = null; drawPins(); }
}

/* ============================================================= sensors */
function accel() {
  const { x, y } = SIM.tilt;
  const z = Math.round(Math.sqrt(Math.max(0, 1024 * 1024 - x * x - y * y))) * (SIM.faceDown ? 1 : -1);
  return { x: Math.round(x), y: Math.round(y), z };
}
function currentGesture() {
  if (SIM.momentary && performance.now() - SIM.momentary.t < 700) return SIM.momentary.name;
  const { x, y, z } = accel();
  if (x < -470) return 'left'; if (x > 470) return 'right';
  if (y < -470) return 'up'; if (y > 470) return 'down';
  if (z < -700) return 'face up'; if (z > 700) return 'face down';
  return '';
}
function noteGesture(name) {
  if (name && name !== SIM.lastGesture) { SIM.gestureHistory.add(name); SIM.gestureList.push(name); if (SIM.gestureList.length > 10) SIM.gestureList.shift(); }
  SIM.lastGesture = name;
}
function momentaryGesture(name) {
  SIM.momentary = { name, t: performance.now() };
  SIM.gestureHistory.add(name); SIM.gestureList.push(name);
  simLog(`🤚 gesture: ${name}`);
  const b = $('sim-board'); if (b && name === 'shake') { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  setTimeout(() => { if (SIM.momentary?.name === name) SIM.momentary = null; noteGesture(currentGesture()); drawSensors(); }, 720);
  drawSensors();
}
function field(axis) {
  const earth = 48000, h = SIM.heading * Math.PI / 180;
  const x = Math.round(earth * Math.sin(h)), y = Math.round(earth * Math.cos(h)), z = Math.round(-20000 - SIM.magnet);
  if (axis === 'strength') return Math.round(Math.sqrt(x * x + y * y + z * z));
  return { x, y, z }[axis];
}

/* ===================================================== native _sim module */
const susp = (promise) => ({ __susp: promise });
const SIM_NATIVE = {
  show_image: (px) => { SIM.animToken++; setLeds(px.map((v) => Math.max(0, Math.min(9, v | 0)))); },
  show_text: (text, delay, waitFlag, loop, clear) => {
    if (text.length === 1 && !loop) { SIM.animToken++; setLeds(glyphFrame(text)); if (clear) return susp(wait(delay).then(() => setLeds(blank()))); return; }
    simLog(`💡 display.show("${text.slice(0, 20)}")`);
    const p = animate([...text].map(glyphFrame), delay, loop, clear);
    return waitFlag && !loop ? susp(interruptible(p)) : undefined;
  },
  show_frames: (frames, delay, waitFlag, loop, clear) => {
    const p = animate(frames.map((f) => (typeof f === 'string' ? glyphFrame(f[0] || ' ') : f)), delay, loop, clear);
    return waitFlag && !loop ? susp(interruptible(p)) : undefined;
  },
  scroll: (text, delay, waitFlag, loop) => {
    simLog(`💡 display.scroll("${text.slice(0, 24)}")`);
    const p = animate(scrollFrames(text), delay, loop, false);
    return waitFlag && !loop ? susp(interruptible(p)) : undefined;
  },
  clear: () => { SIM.animToken++; setLeds(blank()); },
  set_pixel: (x, y, v) => { SIM.animToken++; const l = SIM.leds.slice(); l[y * 5 + x] = v; setLeds(l); },
  get_pixel: (x, y) => SIM.leds[y * 5 + x],
  light: () => SIM.light,
  display_on: (on) => { SIM.displayOn = !!on; drawLeds(); },
  display_is_on: () => SIM.displayOn,
  button: (n, what) => {
    const b = SIM.buttons[n];
    if (what === 'pressed') return b.down;
    if (what === 'was') { const w = b.was; b.was = false; return w; }
    const c = b.presses; b.presses = 0; return c;
  },
  accel: (axis) => accel()[axis],
  gesture: () => currentGesture(),
  was_gesture: (name) => { const r = SIM.gestureHistory.has(name); SIM.gestureHistory.delete(name); return r; },
  gestures: () => { const l = SIM.gestureList.slice(); SIM.gestureList = []; return l; },
  calibrate: () => {
    simLog('🧭 compass.calibrate(): tilt to fill the screen');
    const frames = []; const f = blank(); const order = [12, 7, 11, 13, 17, 6, 8, 16, 18, 2, 10, 14, 22, 1, 3, 5, 9, 15, 19, 21, 23, 0, 4, 20, 24];
    for (const i of order) { f[i] = 9; frames.push(f.slice()); }
    return susp(interruptible(animate(frames, 50, false, true)).then(() => { SIM.calibrated = true; drawSensors(); }));
  },
  calibrated: () => SIM.calibrated,
  clear_calibration: () => { SIM.calibrated = false; drawSensors(); },
  heading: () => Math.round(SIM.heading) % 360,
  field: (axis) => field(axis),
  temperature: () => Math.round(SIM.temp),
  running_time: () => Math.round(performance.now() - SIM.boot),
  sleep: (ms) => susp(wait(+ms || 0)),
  mem_free: () => 9000 + Math.floor(Math.random() * 400),
  panic: (n) => { simLog(`😱 panic(${n})`); setLeds(glyphFrame('X')); },
  reset: () => { simLog('🔁 reset()'); setTimeout(() => softReboot(), 0); throw new SimInterrupt(); },
  pin_read_digital: (n) => {
    // like the real board: buttons A and B are wired to pins 5 and 11, which read 0 while pressed
    if (n === 5) return SIM.buttons.a.down ? 0 : 1;
    if (n === 11) return SIM.buttons.b.down ? 0 : 1;
    const p = pinState(n); return p.out === 0 || p.out === 1 ? p.out : (p.touched || p.input > 511 ? 1 : 0);
  },
  pin_write_digital: (n, v) => { const p = pinState(n); if (p.out !== v) simLog(`📌 pin${n} → ${v}`); p.out = v; p.value = v ? 1023 : 0; drawPins(); },
  pin_read_analog: (n) => { const p = pinState(n); return p.touched ? 1023 : Math.round(p.input); },
  pin_write_analog: (n, v) => { const p = pinState(n); p.out = 'analog'; p.value = Math.max(0, Math.min(1023, v)); drawPins(); },
  pin_touched: (n) => !!pinState(n).touched,
  music_play: (list, waitFlag, loop) => { simLog('🎵 music.play()'); const p = playMelody(list, loop); return waitFlag && !loop ? susp(p) : undefined; },
  music_pitch: (freq, ms, waitFlag) => { const p = playPitch(freq, ms); return waitFlag && ms >= 0 ? susp(p) : undefined; },
  music_stop: () => { SIM.music.token++; stopTone(); pinState(0).out = null; drawPins(); },
  music_tempo: (ticks, bpm) => { SIM.music.ticks = ticks || 4; SIM.music.bpm = bpm || 120; },
  music_get_tempo: () => [SIM.music.ticks, SIM.music.bpm],
  radio_on: (on) => { SIM.radio.on = !!on; drawRadio(); },
  radio_group: (g) => { SIM.radio.group = g | 0; drawRadio(); },
  radio_send: (msg) => {
    if (!SIM.radio.on) throw new Sk.builtin.ValueError('radio is not enabled');
    radioEvent('out', msg);
  },
  radio_receive: () => {
    if (!SIM.radio.on) throw new Sk.builtin.ValueError('radio is not enabled');
    const i = SIM.radio.inbox.findIndex((m) => m.group === SIM.radio.group);
    if (i < 0) return null;
    const m = SIM.radio.inbox.splice(i, 1)[0];
    radioEvent('in-read', m.msg);
    return m.msg;
  },
  fs_read: (name) => (name in SIM.fs ? SIM.fs[name] : null),
  fs_write: (name, data) => { SIM.fs[name] = String(data); saveFs(); },
  fs_list: () => Object.keys(SIM.fs),
  fs_remove: (name) => { if (!(name in SIM.fs)) throw new Sk.builtin.OSError('ENOENT'); delete SIM.fs[name]; saveFs(); },
  fs_size: (name) => (name in SIM.fs ? new TextEncoder().encode(SIM.fs[name]).length : 0),
};
class SimInterrupt extends Error { constructor() { super('KeyboardInterrupt'); } }

function toPy(v) {
  if (v === undefined || v === null) return Sk.builtin.none.none$;
  if (v && v.__susp) return new Sk.misceval.promiseToSuspension(v.__susp.then((r) => toPy(r)));
  return Sk.ffi.remapToPy(v);
}
window.__simModule = () => {
  const mod = {};
  for (const [name, fn] of Object.entries(SIM_NATIVE)) {
    mod[name] = new Sk.builtin.func(function (...args) { return toPy(fn(...args.map((a) => Sk.ffi.remapToJs(a)))); });
  }
  return mod;
};
// Names saved from earlier commands, fed back in so the >>> prompt (and raw REPL) remember variables.
window.__simReplNs = () => {
  const mod = {}; const names = [];
  for (const [k, v] of Object.entries(SIM.ns)) { mod[k] = v; names.push(k.replace(/_\$r[nw]\$$/, '')); }
  mod.__all__ = new Sk.builtin.list(names.map((n) => new Sk.builtin.str(n)));
  return mod;
};

/* ============================================================ the runner */
const SKIP_NS = new Set(['__name__', '__doc__', '__file__', '__package__', '__builtins__', '__loader__', '__spec__', 'open', '__all__']);
const PRELUDE = 'from _replns import *\nfrom _simfs import open\n';
const PRELUDE_LINES = 2;

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); });
}
function ensureSkulpt() {
  if (!SIM.skulpt) {
    SIM.skulpt = (async () => {
      if (!window.Sk) { await loadScript('vendor/skulpt/skulpt.min.js'); await loadScript('vendor/skulpt/skulpt-stdlib.js'); }
      const files = Sk.builtinFiles.files;
      files['src/lib/_sim.js'] = 'var $builtinmodule = function () { return window.__simModule(); };';
      files['src/lib/_replns.js'] = 'var $builtinmodule = function () { return window.__simReplNs(); };';
      for (const [name, src] of Object.entries(SIM_PY)) files[`src/lib/${name}.py`] = src;
      Sk.configure({
        output: (t) => simOut(t.replace(/\r?\n/g, '\r\n')),
        read: (f) => { if (files[f] === undefined) throw "File not found: '" + f + "'"; return files[f]; },
        __future__: Sk.python3, yieldLimit: 30, execLimit: null, killableWhile: true, killableFor: true,
      });
    })();
  }
  return SIM.skulpt;
}

function formatError(e) {
  if (e instanceof SimInterrupt) return 'KeyboardInterrupt: \r\n';
  const s = String(e && e.toString ? e.toString() : e);
  const msg = s.replace(/ on line \d+\s*$/, '').replace(/is not defined/, "isn't defined");
  const tb = (e && e.traceback) || [];
  const mine = tb.filter((t) => /stdin/.test(t.filename || ''));
  let line = (mine[0] || tb[0] || {}).lineno || +((s.match(/on line (\d+)/) || [])[1] || 0);
  line = Math.max(1, line - PRELUDE_LINES);
  return `Traceback (most recent call last):\r\n  File "<stdin>", line ${line}, in <module>\r\n${msg}\r\n`;
}

async function runPython(code, { saveNs = true } = {}) {
  await ensureSkulpt();
  SIM.running = true; SIM.stop = false; drawStatus();
  try { Sk.sysmodules.mp$del_subscript(new Sk.builtin.str('_replns')); } catch {}
  try {
    const mod = await Sk.misceval.asyncToPromise(
      () => Sk.importMainWithBody('<stdin>', false, PRELUDE + code, true),
      { '*': () => { if (SIM.stop) throw new SimInterrupt(); } });
    if (saveNs && mod && mod.$d) for (const [k, v] of Object.entries(mod.$d)) if (!SKIP_NS.has(k)) SIM.ns[k] = v;
    return { ok: true };
  } catch (e) {
    return { err: formatError(e) };
  } finally {
    SIM.running = false; SIM.stop = false; drawStatus();
  }
}
function interrupt() {
  if (!SIM.running) return;
  SIM.stop = true;
  for (const r of SIM.sleepers) r(); SIM.sleepers.clear();
  SIM.music.token++; stopTone();
}

/* ============================================= fake serial: the REPL protocol */
let simOutQueue = Promise.resolve();
function simOut(text) {
  if (!text) return;
  SIM.output = (SIM.output + text.replace(/[\x00-\x08\x0b-\x1f]/g, (c) => (c === '\r' ? '' : ''))).slice(-2000);
  drawOutput();
  if (port?.isSim) simOutQueue = simOutQueue.then(() => onText(text));  // keep the order the app expects
}
const BANNER = 'MicroPython v1.9.2 (micro:bit simulator)\r\nType "help()" for more information.\r\n>>> ';

function serialIn(u8) {
  const s = typeof u8 === 'string' ? u8 : new TextDecoder().decode(u8);
  for (const ch of s) handleChar(ch);
}
function handleChar(ch) {
  if (SIM.escape) { if (/[A-Za-z~]/.test(ch)) SIM.escape = false; return; }
  if (ch === '\x1b') { SIM.escape = true; return; }
  switch (ch) {
    case '\x03':
      if (SIM.running) interrupt();
      else if (SIM.mode === 'friendly') { SIM.line = ''; SIM.cont = []; simOut('\r\n>>> '); }
      else SIM.rawBuf = '';
      return;
    case '\x01': SIM.mode = 'raw'; SIM.rawBuf = ''; simOut('\r\nraw REPL; CTRL-B to exit\r\n>'); return;
    case '\x02': if (SIM.mode === 'raw') { SIM.mode = 'friendly'; simOut('\r\n' + BANNER); } return;
    case '\x04':
      if (SIM.mode === 'raw') { const code = SIM.rawBuf; SIM.rawBuf = ''; rawRunCode(code); }
      else if (!SIM.line && !SIM.cont.length && !SIM.running) softReboot();
      return;
  }
  if (SIM.mode === 'raw') { if (!SIM.running) SIM.rawBuf += ch; return; }
  if (SIM.running) return;
  if (ch === '\n' && SIM.lastCR) { SIM.lastCR = false; return; }
  SIM.lastCR = ch === '\r';
  if (ch === '\r' || ch === '\n') { simOut('\r\n'); const l = SIM.line; SIM.line = ''; replLine(l); }
  else if (ch === '\x08' || ch === '\x7f') { if (SIM.line) { SIM.line = SIM.line.slice(0, -1); simOut('\x08 \x08'); } }
  else if (ch >= ' ') { SIM.line += ch; simOut(ch); }
}
async function rawRunCode(code) {
  simOut('OK');
  const res = await runPython(code);
  simOut('\x04' + (res.err || '') + '\x04>');
}
async function replLine(line) {
  if (SIM.cont.length) {
    if (line.trim() === '') { const block = SIM.cont.join('\n'); SIM.cont = []; return runRepl(block); }
    SIM.cont.push(line); simOut('... '); return;
  }
  if (/:\s*$/.test(line)) { SIM.cont = [line]; simOut('... '); return; }
  if (!line.trim()) { simOut('>>> '); return; }
  return runRepl(line);
}
async function runRepl(src) {
  await ensureSkulpt();
  let code = src;
  let isExpr = false;
  try { Sk.compile(`_r = (${src})`, '<stdin>', 'exec', true); isExpr = !/\n/.test(src); } catch {}
  if (isExpr) code = `_r = (${src})\nif _r is not None:\n    print(repr(_r))`;
  const res = await runPython(code);
  if (res.err) simOut(res.err);
  simOut('>>> ');
}
async function softReboot() {
  interrupt();
  simOut('\r\nMPY: soft reboot\r\n');
  SIM.ns = {}; SIM.mode = 'friendly'; SIM.line = ''; SIM.cont = [];
  SIM.radio = { on: false, group: 0, inbox: SIM.radio.inbox }; SIM.music.token++; stopTone(); drawRadio();
  if (SIM.fs['main.py']) {
    simLog('▶ running main.py');
    const res = await runPython(SIM.fs['main.py'], { saveNs: false });
    if (res.err) simOut(res.err);
  }
  simOut(BANNER);
}

/* ===================================================== connect to the app */
function simConnect() {
  if (port && !port.isSim) { alert('A real micro:bit is connected. Disconnect it first (🧰 Manager → Disconnect serial).'); return false; }
  if (port?.isSim) return true;
  ensureSkulpt();
  port = { isSim: true, close: async () => {}, readable: null, getInfo: () => ({}) };
  writer = { write: async (u8) => serialIn(u8), releaseLock() {} };
  wantSerial = false;
  setSerialUI(true);
  sys('connected to the 🎮 micro:bit simulator');
  simLog('🔌 connected to the app');
  return true;
}
function simDisconnect() { if (port?.isSim) serialDisconnect(); }
document.addEventListener('serial-change', () => { drawStatus(); });

// When the simulator panel is open (or the browser has no Web Serial), "connect" means the simulator.
const _realSerialConnect = serialConnect;
serialConnect = async function (p) {
  if (!p && (SIM.open || !('serial' in navigator))) { if (!SIM.open) openSim(); simConnect(); return; }
  return _realSerialConnect(p);
};
if (typeof ensureSerial === 'function') {
  const _ensure = ensureSerial;
  ensureSerial = async function () { if (!port && (SIM.open || !('serial' in navigator))) { if (!SIM.open) openSim(); simConnect(); return; } return _ensure(); };
}
// The Files panel talks straight to the simulator's file system.
const _lf = listFiles, _rf = readFile, _wf = writeFile, _rm = removeFile;
listFiles = async () => (port?.isSim ? Object.keys(SIM.fs).map((n) => ({ name: n, size: SIM_NATIVE.fs_size(n) })) : _lf());
readFile = async (name) => (port?.isSim ? new TextEncoder().encode(SIM.fs[name] ?? '') : _rf(name));
writeFile = async (name, data, onProgress) => {
  if (!port?.isSim) return _wf(name, data, onProgress);
  SIM.fs[name] = typeof data === 'string' ? data : new TextDecoder().decode(data); saveFs(); onProgress && onProgress(1);
  simLog(`💾 saved ${name}`);
};
removeFile = async (name) => (port?.isSim ? (delete SIM.fs[name], saveFs()) : _rm(name));

/* ================================================================== UI */
const simFab = document.createElement('button');
simFab.id = 'sim-fab'; simFab.className = 'sim-fab'; simFab.title = 'micro:bit simulator'; simFab.setAttribute('aria-label', 'Open the micro:bit simulator');
simFab.innerHTML = '<span class="sim-fab-grid" id="sim-fab-grid"></span><span class="sim-fab-tag">SIM</span>';
document.body.appendChild(simFab);
const simPanel = document.createElement('section');
simPanel.id = 'sim-panel'; simPanel.className = 'sim-panel'; simPanel.hidden = true; simPanel.setAttribute('aria-label', 'micro:bit simulator');
simPanel.innerHTML = `
  <header class="sim-head">
    <b>🎮 micro:bit simulator</b>
    <span class="sim-run" id="sim-run"></span>
    <button class="small" id="sim-mute" title="Sound on/off">🔊</button>
    <button class="small" id="sim-min" title="Shrink to an icon" aria-label="Minimise">—</button>
  </header>
  <div class="sim-conn" id="sim-conn"></div>
  <div class="sim-stage">
    <div class="sim-board" id="sim-board">
      <div class="sim-top"><span class="sim-speaker" id="sim-speaker" title="Speaker (sound on pin 0)">🔈</span><span class="sim-logo">micro:bit</span><span class="sim-radio" id="sim-radio-ico" title="Radio">📡</span></div>
      <div class="sim-mid">
        <button class="sim-btn" data-btn="a" aria-label="Button A (or press A)">A</button>
        <div class="sim-leds" id="sim-leds">${Array.from({ length: 25 }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div>
        <button class="sim-btn" data-btn="b" aria-label="Button B (or press B)">B</button>
      </div>
      <div class="sim-edge">${['0', '1', '2', '3V', 'GND'].map((p) => `<span class="sim-pad" data-pad="${p}" title="${/\d/.test(p) ? `Pin ${p}: hold to touch` : p}">${p}</span>`).join('')}</div>
    </div>
    <div class="sim-note" id="sim-note"></div>
    <div class="sim-waves" id="sim-waves"></div>
  </div>
  <p class="sim-hint muted">Click A/B (or press the A and B keys) · hold a gold pin to touch it</p>
  <nav class="sim-tabs">${[['motion', '🤚 Motion'], ['sensors', '🌡️ Sensors'], ['pins', '📌 Pins'], ['radio', '📡 Radio'], ['out', '💬 Output']]
    .map(([k, l], i) => `<button data-tab="${k}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</nav>
  <div class="sim-tab" data-tab="motion">
    <div class="sim-row"><div class="sim-tiltpad" id="sim-tiltpad" title="Drag to tilt"><i id="sim-tiltdot"></i></div>
      <div class="sim-col"><div id="sim-accel" class="sim-vals"></div>
        <div class="sim-btns"><button data-g="shake">🤝 Shake</button><button data-g="freefall">🪂 Free fall</button><button data-g="3g">💥 3g</button>
          <button id="sim-flip">🙃 Screen down</button><button id="sim-level">↺ Level</button></div></div></div>
  </div>
  <div class="sim-tab" data-tab="sensors" hidden>
    <label>🌡️ Temperature <b id="sim-temp-v"></b><input type="range" id="sim-temp" min="-10" max="50" step="1"></label>
    <label>☀️ Light level <b id="sim-light-v"></b><input type="range" id="sim-light" min="0" max="255"></label>
    <label>🧭 Compass heading <b id="sim-head-v"></b><input type="range" id="sim-head" min="0" max="359"></label>
    <label>🧲 Magnet nearby <b id="sim-mag-v"></b><input type="range" id="sim-mag" min="0" max="400000" step="5000"></label>
  </div>
  <div class="sim-tab" data-tab="pins" hidden><div id="sim-pins"></div></div>
  <div class="sim-tab" data-tab="radio" hidden>
    <div id="sim-radio-status" class="sim-vals"></div>
    <form id="sim-radio-form" class="sim-row"><input id="sim-radio-msg" placeholder="Message from another micro:bit" maxlength="30">
      <input id="sim-radio-grp" type="number" min="0" max="255" value="0" title="Radio group" aria-label="Radio group"><button class="small primary">📨 Send</button></form>
    <div id="sim-radio-log" class="sim-log"></div>
  </div>
  <div class="sim-tab" data-tab="out" hidden>
    <pre id="sim-output" class="sim-output"></pre>
    <h4>What the program did</h4><div id="sim-log" class="sim-log"></div>
  </div>`;
document.body.appendChild(simPanel);

function drawLeds() {
  const html = SIM.leds.map((v) => (SIM.displayOn && v ? `<i style="--b:${0.18 + v * 0.091}" class="on"></i>` : '<i></i>')).join('');
  const el = $('sim-leds'); if (el) el.innerHTML = html;
  $('sim-fab-grid').innerHTML = SIM.leds.map((v) => `<i class="${SIM.displayOn && v ? 'on' : ''}"></i>`).join('');
}
function drawSpeaker() {
  const sp = $('sim-speaker'), n = $('sim-note'); if (!sp) return;
  sp.classList.toggle('on', !!SIM.music.note); sp.textContent = SIM.muted ? '🔇' : SIM.music.note ? '🔊' : '🔈';
  if (SIM.music.note && SIM.music.note !== 'rest') {
    const el = document.createElement('span'); el.className = 'sim-float'; el.textContent = '♪ ' + SIM.music.note;
    el.style.left = (20 + Math.random() * 50) + '%'; n.appendChild(el); setTimeout(() => el.remove(), 1200);
  }
}
function drawPins() {
  document.querySelectorAll('.sim-pad').forEach((el) => {
    const n = el.dataset.pad; if (!/\d/.test(n)) return;
    const p = pinState(+n);
    el.classList.toggle('touched', !!p.touched);
    el.classList.toggle('high', p.out === 1 || p.out === 'music' || (p.out === 'analog' && p.value > 0));
    el.style.setProperty('--lvl', p.out === 'analog' ? p.value / 1023 : p.out === 1 || p.out === 'music' ? 1 : 0);
  });
  const box = $('sim-pins'); if (!box || box.closest('[hidden]')) return;
  box.innerHTML = [0, 1, 2].map((n) => {
    const p = pinState(n);
    const out = p.out === null ? 'input' : p.out === 'music' ? '🎵 sound' : p.out === 'analog' ? `analog out ${p.value}` : `digital out ${p.out}`;
    return `<div class="sim-pinrow"><b>P${n}</b><button class="small" data-touch="${n}">👆 Hold to touch</button>
      <label class="muted">dial <input type="range" min="0" max="1023" value="${p.input}" data-dial="${n}"></label><span class="sim-vals">${out}</span></div>`;
  }).join('') + `<p class="muted">Other pins: ${Object.entries(SIM.pins).filter(([k, p]) => +k > 2 && p.out !== null).map(([k, p]) => `P${k}=${p.out === 'analog' ? p.value : p.out}`).join(', ') || 'none in use'}</p>`;
  box.querySelectorAll('[data-touch]').forEach((b) => holdTouch(b, +b.dataset.touch));
  box.querySelectorAll('[data-dial]').forEach((r) => (r.oninput = () => { pinState(+r.dataset.dial).input = +r.value; }));
}
function drawSensors() {
  const a = accel(), g = currentGesture();
  if ($('sim-accel')) $('sim-accel').innerHTML = `x <b>${a.x}</b> · y <b>${a.y}</b> · z <b>${a.z}</b><br>gesture: <b>${g || '—'}</b>`;
  $('sim-tiltdot').style.left = `${50 + (SIM.tilt.x / 1024) * 45}%`; $('sim-tiltdot').style.top = `${50 + (SIM.tilt.y / 1024) * 45}%`;
  $('sim-board').style.transform = `perspective(700px) rotateY(${(SIM.tilt.x / 1024) * 35}deg) rotateX(${(-SIM.tilt.y / 1024) * 35}deg)${SIM.faceDown ? ' rotateZ(180deg) scale(.92)' : ''}`;
  $('sim-board').classList.toggle('facedown', SIM.faceDown);
  $('sim-flip').classList.toggle('on', SIM.faceDown);
  $('sim-temp').value = SIM.temp; $('sim-temp-v').textContent = `${SIM.temp} °C / ${Math.round(SIM.temp * 9 / 5 + 32)} °F`;
  $('sim-light').value = SIM.light; $('sim-light-v').textContent = SIM.light;
  $('sim-head').value = SIM.heading; $('sim-head-v').textContent = `${SIM.heading}° ${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(SIM.heading / 45) % 8]}${SIM.calibrated ? '' : ' (not calibrated)'}`;
  $('sim-mag').value = SIM.magnet; $('sim-mag-v').textContent = `${Math.round(field('strength') / 1000)} µT`;
}
function radioEvent(kind, msg) {
  const ico = $('sim-radio-ico'), waves = $('sim-waves');
  if (kind === 'out') { simLog(`📡 radio.send("${msg}") on group ${SIM.radio.group}`); }
  if (kind === 'in') simLog(`📨 message arrived: "${msg}"`);
  SIM.radio.log = (SIM.radio.log || []).concat({ kind, msg, group: kind === 'out' ? SIM.radio.group : undefined, t: new Date() }).slice(-30);
  if (waves) { const w = document.createElement('span'); w.className = 'sim-wave ' + (kind === 'out' ? 'out' : 'in'); waves.appendChild(w); setTimeout(() => w.remove(), 900); }
  ico?.classList.remove('ping'); void ico?.offsetWidth; ico?.classList.add('ping');
  drawRadio();
}
function drawRadio() {
  const st = $('sim-radio-status'); if (!st) return;
  st.innerHTML = `Radio is <b>${SIM.radio.on ? 'on' : 'off'}</b> · group <b>${SIM.radio.group}</b> · ${SIM.radio.inbox.length} waiting`;
  $('sim-radio-log').innerHTML = (SIM.radio.log || []).slice().reverse().map((m) =>
    `<div>${m.kind === 'out' ? '📡 sent' : m.kind === 'in' ? '📨 arrived' : '📥 read'} <b>${esc(m.msg)}</b>${m.group !== undefined ? ` <span class="muted">(group ${m.group})</span>` : ''}</div>`).join('') || '<p class="muted">No radio messages yet.</p>';
}
function drawOutput() {
  const o = $('sim-output'); if (!o) return;
  const stick = o.scrollTop + o.clientHeight >= o.scrollHeight - 20;
  o.textContent = SIM.output.replace(/\x04>?/g, '').replace(/raw REPL; CTRL-B to exit\n>|OK/g, '');
  if (stick) o.scrollTop = o.scrollHeight;
}
function renderLog() {
  $('sim-log').innerHTML = SIM.log.slice().reverse().slice(0, 25).map((l) => `<div><span class="muted">${l.t.toLocaleTimeString()}</span> ${esc(l.msg)}</div>`).join('') || '<p class="muted">Nothing yet. Run a program!</p>';
}
function drawStatus() {
  const on = !!port?.isSim;
  $('sim-run').innerHTML = SIM.running ? '<span class="sim-dot"></span> running <button class="small" id="sim-stop">■ Stop</button>' : '';
  $('sim-stop')?.addEventListener('click', () => (port?.isSim ? write('\x03') : interrupt()));
  simFab.classList.toggle('running', SIM.running);
  $('sim-conn').innerHTML = on
    ? '<span class="sim-ok">🔌 Connected: the app is using this as your micro:bit.</span> <button class="small" id="sim-disc">Disconnect</button>'
    : port ? '<span class="muted">A real micro:bit is connected.</span>'
      : '<button class="primary small" id="sim-connect">🔌 Use the simulator as my micro:bit</button>';
  $('sim-disc')?.addEventListener('click', simDisconnect);
  $('sim-connect')?.addEventListener('click', simConnect);
}

/* ----- inputs */
function press(name, down) {
  const b = SIM.buttons[name];
  if (down && !b.down) { b.presses++; b.was = true; simLog(`🔘 button ${name.toUpperCase()} pressed`); }
  b.down = down;
  simPanel.querySelector(`[data-btn="${name}"]`)?.classList.toggle('down', down);
}
simPanel.querySelectorAll('[data-btn]').forEach((b) => {
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); audio(); press(b.dataset.btn, true); });
  ['pointerup', 'pointerleave'].forEach((ev) => b.addEventListener(ev, () => press(b.dataset.btn, false)));
});
function holdTouch(el, n) {
  const set = (v) => { const p = pinState(n); if (p.touched !== v && v) simLog(`👆 pin ${n} touched`); p.touched = v; drawPins(); };
  el.onpointerdown = (e) => { e.preventDefault(); set(true); };
  el.onpointerup = el.onpointerleave = () => set(false);
}
simPanel.querySelectorAll('.sim-pad').forEach((el) => { if (/\d/.test(el.dataset.pad)) holdTouch(el, +el.dataset.pad); });
document.addEventListener('keydown', (e) => {
  if (!SIM.open || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable], .blocklyWidgetDiv, #term, #lockscreen')) return;
  const k = e.key.toLowerCase(); if (k === 'a' || k === 'b') { press(k, true); e.preventDefault(); }
});
document.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if ((k === 'a' || k === 'b') && SIM.buttons[k].down) press(k, false); });

const tiltPad = $('sim-tiltpad');
const tiltFrom = (e) => {
  const r = tiltPad.getBoundingClientRect();
  SIM.tilt.x = Math.max(-1024, Math.min(1024, ((e.clientX - r.left) / r.width - 0.5) * 2 * 1100));
  SIM.tilt.y = Math.max(-1024, Math.min(1024, ((e.clientY - r.top) / r.height - 0.5) * 2 * 1100));
  noteGesture(currentGesture()); drawSensors();
};
tiltPad.addEventListener('pointerdown', (e) => { tiltPad.setPointerCapture(e.pointerId); tiltFrom(e); });
tiltPad.addEventListener('pointermove', (e) => { if (e.buttons) tiltFrom(e); });
simPanel.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => momentaryGesture(b.dataset.g)));
$('sim-flip').onclick = () => { SIM.faceDown = !SIM.faceDown; noteGesture(currentGesture()); drawSensors(); };
$('sim-level').onclick = () => { SIM.tilt = { x: 0, y: 0 }; SIM.faceDown = false; noteGesture(currentGesture()); drawSensors(); };
$('sim-temp').oninput = (e) => { SIM.temp = +e.target.value; drawSensors(); };
$('sim-light').oninput = (e) => { SIM.light = +e.target.value; drawSensors(); };
$('sim-head').oninput = (e) => { SIM.heading = +e.target.value; drawSensors(); };
$('sim-mag').oninput = (e) => { SIM.magnet = +e.target.value; drawSensors(); };
$('sim-radio-form').onsubmit = (e) => {
  e.preventDefault();
  const msg = $('sim-radio-msg').value; if (!msg) return;
  const group = +$('sim-radio-grp').value || 0;
  if (group === SIM.radio.group && SIM.radio.on) SIM.radio.inbox.push({ group, msg });
  radioEvent('in', msg + (group === SIM.radio.group && SIM.radio.on ? '' : ' (not heard: radio off or another group)'));
  $('sim-radio-msg').value = '';
};
$('sim-mute').onclick = () => { SIM.muted = !SIM.muted; $('sim-mute').textContent = SIM.muted ? '🔇' : '🔊'; if (SIM.muted) { try { osc?.stop(); } catch {} } drawSpeaker(); };
simPanel.querySelectorAll('.sim-tabs button').forEach((b) => (b.onclick = () => {
  simPanel.querySelectorAll('.sim-tabs button').forEach((x) => x.classList.toggle('on', x === b));
  simPanel.querySelectorAll('.sim-tab').forEach((t) => (t.hidden = t.dataset.tab !== b.dataset.tab));
  if (b.dataset.tab === 'pins') drawPins();
  if (b.dataset.tab === 'radio') drawRadio();
  if (b.dataset.tab === 'out') { drawOutput(); renderLog(); }
}));

function openSim() {
  SIM.open = true; simPanel.hidden = false; simFab.hidden = true;
  try { localStorage.setItem('microbit-sim-open', '1'); } catch {}
  ensureSkulpt(); drawLeds(); drawSensors(); drawStatus(); drawPins(); audio();
}
function closeSim() {
  SIM.open = false; simPanel.hidden = true; simFab.hidden = false;
  try { localStorage.removeItem('microbit-sim-open'); } catch {}
}
simFab.onclick = openSim;
$('sim-min').onclick = closeSim;
drawLeds(); drawStatus();
try { if (localStorage.getItem('microbit-sim-open')) openSim(); } catch {}
if (!('serial' in navigator)) sys('no Web Serial in this browser: use the 🎮 simulator (bottom right) as your micro:bit');
