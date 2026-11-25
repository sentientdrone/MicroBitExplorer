/* 🌍 Bit's Blocky World: walk Bit around a blocky island built like a giant micro:bit.
 * 9 stations each teach one part (a little puzzle, a short lesson, then a quiz question)
 * and give a ⭐ chip. Free to play, no battery. Progress (the chips) is saved in HS.games.world,
 * so it follows a kid's account. Uses games/arcadeFrame/stats/HS/saveHS/LOOKS/look/esc/shuffle/
 * boardReact/confetti from other files. */
'use strict';

const BW_W = 34, BW_H = 26;
const BW_SPAWN = [16, 11];
const BW_HAPPY = ['00000', '01010', '00000', '10001', '01110'];  // Image.HAPPY
const BW_MAGNET = [12, 23];                                      // where the lost magnet is
const BW_TARGET = 13;                                            // the binary bridge number
const BW_CHIP_BUCKS = 10, BW_ALL_BUCKS = 50;
// [top colour, side colour] for each kind of block
const BW_COL = {
  grass: ['#6cc24a', '#8a5a2b'], sand: ['#ecd9a0', '#c8b27a'], path: ['#d8b67e', '#a8875a'], stone: ['#a3a9b0', '#7f868e'],
  board: ['#1f7a50', '#145238'], gold: ['#e8c04a', '#b38f22'], wireoff: ['#8f8150', '#6e6036'], wireon: ['#ffd84a', '#d4a514'],
  chip: ['#2a2d33', '#16181c'], led: ['#5a1f1f', '#3a1414'], ledon: ['#ff4d3d', '#c22a1d'], btn: ['#1f7a50', '#145238'],
  wood: ['#b9844e', '#83582c'], leaves: ['#3aa04a', '#2a7a37'], trunk: ['#8b5a2b', '#6b421d'], usb: ['#c3cad3', '#8f98a3'],
  tower: ['#e5534b', '#b3362f'], towerw: ['#f2f2f2', '#c8c8c8'], lever: ['#6b7280', '#4b5260'], water: ['#3d8bfd', '#2a64c4'], hot: ['#ff9a5a', '#d9692e'],
};

const BW_STATIONS = {
  usb: { name: 'The USB port', emoji: '🔌', marker: [3, 13],
    lesson: 'This giant USB port leads to the <b>interface chip</b>. When you plug the micro:bit into a computer, the interface chip pretends to be a USB drive called <b>MICROBIT</b>. Drop a program on it and the interface chip copies (<i>flashes</i>) it into the processor. Your code never runs on the interface chip: it\'s the delivery robot!',
    q: ['What does the interface chip do?', 'Copies your program into the processor', 'Runs your program', 'Lights up the LEDs'],
    why: 'The interface chip handles USB and flashing. The processor runs your program.' },
  processor: { name: 'The processor', emoji: '🧠', marker: [16, 5],
    lesson: 'This big black block is the <b>processor</b> (an nRF51822), the brain of the micro:bit. It runs your program one tiny step at a time, <b>16 million</b> ticks every second. Its <b>flash memory</b> (256 KB) keeps your program when the power is off, and its <b>RAM</b> (16 KB) is scratch space while it runs. The gold pins around it connect it to everything else.',
    q: ['Which memory keeps your program when you unplug the micro:bit?', 'Flash memory', 'RAM', 'The LEDs'],
    why: 'Flash keeps its contents without power. RAM forgets everything when the power goes off.' },
  buttons: { name: 'Buttons A and B', emoji: '🔘', marker: [11, 16], marker2: [21, 16],
    task: (w) => (w.pressed.A && w.pressed.B ? null : `Step on giant button <b>A</b> and button <b>B</b>, then watch the gold wires carry the signal to the processor. ${w.pressed.A ? '✅ A' : '◻️ A'} ${w.pressed.B ? '✅ B' : '◻️ B'}`),
    lesson: 'Each button is wired to a pin on the processor. A <b>pull-up resistor</b> holds the wire at 3 V, which the processor reads as <b>1</b>. Pressing the button connects the wire to GND (0 V), so the pin reads <b>0</b>. On the micro:bit, 0 means pressed!',
    q: ['Button A is pressed. What does its processor pin read?', '0', '1', '25'],
    why: 'Pressing connects the wire to GND (0 V), so the pin reads 0.' },
  leds: { name: 'The LED garden', emoji: '💡', marker: [13, 14],
    task: (w) => (w.ledsMatch() ? null : 'Make the garden show <b>Image.HAPPY</b>. Stand on an LED and press <b>Space</b> (or ✋ Use) to switch it on or off.'),
    lesson: 'The 25 LEDs look like a 5 × 5 grid, but they\'re wired as <b>3 rows × 9 columns</b> to save pins. The processor lights one row at a time, so fast that your eyes see the whole picture at once. The LEDs can even work backwards to measure light!',
    q: ['Only one row of LEDs is lit at a time. Why does the picture look steady?', 'It switches faster than your eyes can see', 'The LEDs are glued on', 'The battery holds them on'],
    why: 'The rows take turns hundreds of times a second, which is too fast for eyes to notice.' },
  binary: { name: 'The binary bridge', emoji: '🔢', marker: [26, 10],
    task: (w) => (w.bridge ? null : `The bridge to the Radio Tower is up! Flip the 4 levers to make <b>${BW_TARGET}</b> in binary. The levers are worth 8, 4, 2 and 1. Stand next to a lever and press <b>Space</b>.`),
    lesson: `Computers count with only <b>0 and 1</b> (off and on). Each place is worth double the one on its right: 8, 4, 2, 1. ${BW_TARGET} = 8 + 4 + 1, so it's <b>1101</b> in binary. A byte is 8 bits, which can count up to 255.`,
    q: ['What is 0110 in binary as a normal number?', '6', '110', '3'],
    why: '0×8 + 1×4 + 1×2 + 0×1 = 6.' },
  radio: { name: 'The Radio Tower', emoji: '📡', marker: [30, 12],
    lesson: 'micro:bits send messages to each other by <b>radio</b>, on the same 2.4 GHz band as Bluetooth. Every micro:bit in the same <b>group</b> hears the message, like walkie-talkies on one channel. In Python: <code>radio.on()</code>, <code>radio.config(group=7)</code>, <code>radio.send("hi")</code>.',
    q: ['Two micro:bits can\'t hear each other. What should match?', 'Their radio group', 'Their LED brightness', 'Their temperature'],
    why: 'Only micro:bits in the same radio group hear each other.' },
  temp: { name: 'The hot spring', emoji: '🌡️', marker: [7, 19],
    lesson: 'The micro:bit\'s temperature sensor is <b>inside the processor</b>. It measures the chip itself, which warms up a little while it works, so it usually reads a bit warmer than the room. <code>temperature()</code> gives °C. For °F: °C × 9 ÷ 5 + 32.',
    q: ['The room is 20 °C. What will the micro:bit probably read?', 'A little more, like 22 °C', 'Exactly 0 °C', '100 °C'],
    why: 'The sensor is in the processor, which runs a little warm.' },
  compass: { name: 'The Compass Stone', emoji: '🧭', marker: [25, 4],
    task: (w) => (w.magnetFound ? null : 'Someone dropped a <b>magnet</b> on the island! Your compass (top right) now points at it. Follow the needle and step on the magnet.'),
    lesson: 'The compass (<b>magnetometer</b>) senses magnetic fields. Normally it feels the Earth\'s field and points north, but a magnet nearby pulls much harder, just like the one you found! That\'s why you calibrate the compass and keep magnets away from it.',
    q: ['What does the micro:bit compass sense?', 'Magnetic fields', 'Light', 'Sound'],
    why: 'The magnetometer measures magnetic fields, from the Earth or from magnets.' },
  accel: { name: 'Tilt Hill', emoji: '⛰️', marker: [5, 5],
    lesson: 'You climbed to the top! The <b>accelerometer</b> has a tiny weight on springs inside. Even sitting still it feels <b>gravity</b> pulling down (about 1024 milli-g), so it knows which way is down. Tilt the board and gravity pulls a different way; shake it and the weight jiggles.',
    q: ['The micro:bit sits still on a table. What does the accelerometer feel?', 'Gravity pulling down', 'Nothing at all', 'The wind'],
    why: 'Gravity always pulls, so even a still micro:bit reads about 1024 milli-g downwards.' },
};
const BW_ORDER = ['usb', 'processor', 'buttons', 'leds', 'binary', 'radio', 'temp', 'compass', 'accel'];
const BW_HINTS = { usb: 'far west', processor: 'north of the start', buttons: 'left and right of the LED garden', leds: 'south of the start',
  binary: 'east, by the water', radio: 'on the east island', temp: 'south-west', compass: 'north-east', accel: 'the big hill, north-west' };

const bwChips = () => { const g = games(); if (!Array.isArray(g.world)) g.world = []; return g.world; };

function bwRng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ------------------------------------------------------------------ the map */
function bwBuildMap(done) {
  const W = BW_W, H = BW_H, t = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = ((x - 16.5) / 16) ** 4 + ((y - 12.5) / 12) ** 4;  // a rounded-square island
    t.push(s > 1 ? { h: 0, ty: 'water', stack: [] } : { h: 1, ty: s > 0.72 ? 'sand' : 'grass', stack: [] });
  }
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? t[y * W + x] : null);
  const set = (x, y, o) => Object.assign(at(x, y), o);
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y); };
  const path = (x0, y0, x1, y1) => rect(x0, y0, x1, y1, (x, y) => { const c = at(x, y); if (c.ty === 'grass' || c.ty === 'sand') c.ty = 'path'; });

  // ⛰️ Tilt Hill: a stepped pyramid you can climb
  rect(2, 2, 8, 8, (x, y) => { const d = Math.max(Math.abs(x - 5), Math.abs(y - 5)); if (d <= 3) set(x, y, { h: 4 - d, ty: d === 0 ? 'stone' : 'grass' }); });
  set(5, 5, { st: 'accel' });
  // the giant micro:bit: green board, gold edge pins, LED garden, buttons
  rect(9, 13, 23, 20, (x, y) => set(x, y, { ty: 'board' }));
  rect(10, 20, 22, 20, (x, y) => set(x, y, { ty: 'gold' }));
  rect(14, 14, 18, 18, (x, y) => set(x, y, { ty: 'led', on: done.includes('leds') && BW_HAPPY[y - 14][x - 14] === '1' }));
  set(11, 16, { ty: 'btn', btn: 'A', st: 'buttons' }); set(21, 16, { ty: 'btn', btn: 'B', st: 'buttons' });
  set(13, 14, { stack: ['wood'], solid: true, st: 'leds' });
  // 🧠 the processor with its gold pins, and the wires from the buttons
  rect(14, 3, 18, 7, (x, y) => set(x, y, { ty: 'gold' }));
  rect(15, 4, 17, 6, (x, y) => set(x, y, { ty: 'chip', stack: ['chip'], solid: true, st: 'processor' }));
  at(16, 5).label = 'nRF51';
  const lit = done.includes('buttons');
  const wire = (x, y, w) => set(x, y, { ty: lit ? 'wireon' : 'wireoff', wire: w });
  rect(11, 8, 11, 15, (x, y) => wire(x, y, 'A')); rect(12, 8, 15, 8, (x, y) => wire(x, y, 'A'));
  rect(21, 8, 21, 15, (x, y) => wire(x, y, 'B')); rect(17, 8, 20, 8, (x, y) => wire(x, y, 'B'));
  // paths
  path(16, 8, 16, 12); path(5, 11, 15, 11); path(5, 9, 5, 11); path(17, 11, 26, 11); path(26, 12, 26, 12);
  path(4, 13, 8, 13); path(7, 18, 8, 18); path(16, 21, 16, 22);
  // 🔌 USB port, 🌡️ hot spring, 🧭 compass stone
  rect(2, 12, 3, 13, (x, y) => set(x, y, { ty: 'usb', stack: ['usb', 'usb'], solid: true, st: 'usb', slot: y === 13 }));
  rect(4, 19, 6, 20, (x, y) => set(x, y, { h: 0, ty: 'hot' }));
  set(7, 19, { stack: ['towerw', 'tower', 'tower'], solid: true, st: 'temp' });
  set(25, 4, { ty: 'stone', stack: ['stone', 'stone'], solid: true, st: 'compass' });
  set(...BW_MAGNET, { magnet: true });
  // 🔢 binary levers, the river and 📡 the Radio Tower island
  rect(27, 8, 28, 16, (x, y) => set(x, y, { h: 0, ty: 'water' }));
  rect(27, 8, 33, 8, (x, y) => set(x, y, { h: 0, ty: 'water' })); rect(27, 16, 33, 16, (x, y) => set(x, y, { h: 0, ty: 'water' }));
  const bits = BW_TARGET.toString(2).padStart(4, '0');
  [8, 4, 2, 1].forEach((v, i) => set(22 + i, 10, { ty: 'stone', stack: ['lever'], solid: true, lever: v, on: done.includes('binary') && bits[i] === '1' }));
  set(26, 10, { stack: ['wood'], solid: true, st: 'binary' });
  [27, 28].forEach((x) => set(x, 12, done.includes('binary') ? { h: 1, ty: 'wood', bridge: true } : { bridge: true }));
  set(30, 12, { stack: ['tower', 'towerw', 'tower', 'towerw', 'tower', 'towerw'], solid: true, st: 'radio' });

  // trees and rocks, kept away from everything important
  const busy = new Set(['path', 'board', 'gold', 'wireoff', 'wireon', 'btn', 'led', 'hot', 'chip', 'usb', 'wood', 'stone']);
  const rnd = bwRng(42);
  rect(0, 0, W - 1, H - 1, (x, y) => {
    const c = at(x, y);
    if (c.ty !== 'grass' || c.h !== 1 || c.st || c.magnet || c.stack.length) return;
    if (x <= 9 && y <= 9) return;                                     // Tilt Hill
    if (x >= 29 && y >= 9 && y <= 15) return;                         // Radio Tower island
    if (Math.abs(x - BW_SPAWN[0]) <= 2 && Math.abs(y - BW_SPAWN[1]) <= 2) return;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const n = at(x + dx, y + dy);
      if (n && (busy.has(n.ty) || n.st || n.magnet || n.lever || n.solid)) return;
    }
    // gentle rolling hills, one block higher
    if (Math.sin(x * 0.55) + Math.cos(y * 0.5) + Math.sin((x + y) * 0.33) > 1.25) c.h = 2;
    const r = rnd();
    if (r < 0.10) Object.assign(c, { stack: r < 0.04 ? ['trunk', 'trunk', 'leaves', 'leaves'] : ['trunk', 'leaves', 'leaves'], solid: true });
    else if (r < 0.13) Object.assign(c, { h: 2, ty: 'stone' });
  });
  return { W, H, t, at };
}

/* ------------------------------------------------------------------ the game */
let bwActive = null;   // the running world, so key handlers know

function openBlockyWorld() {
  if (typeof wardrobe !== 'undefined' && wardrobe) wardrobe.hidden = true;
  const el = arcadeFrame(); el.hidden = false; el.classList.add('arc-free', 'arc-wide');
  $('arc-title').textContent = "🌍 Bit's Blocky World"; stats('');
  $('arc-body').innerHTML = `<div class="arc-loading"><div class="arc-ico big">🌍</div><h2>🧱 Stacking the blocks…</h2>
    <div class="arc-loadbar"><i id="arc-load"></i></div><p class="arc-tip">Tip: walk with the arrow keys or WASD, and press Space to use things.</p></div>`;
  const t0 = performance.now();
  const loader = setInterval(() => {
    if (el.hidden || !$('arc-load')) { clearInterval(loader); return; }
    const p = Math.min(1, (performance.now() - t0) / 1800);
    $('arc-load').style.width = (p * 100) + '%';
    if (p >= 1) { clearInterval(loader); bwPlay($('arc-body')); }
  }, 60);
}

function bwPlay(body) {
  const T = 40, D = 26, BH = 18;                  // block width, top-face depth, block height (pixels)
  const chips = bwChips();
  const map = bwBuildMap(chips);
  const { at } = map;
  const w = {                                      // puzzle state
    pressed: { A: chips.includes('buttons'), B: chips.includes('buttons') },
    bridge: chips.includes('binary'), magnetFound: chips.includes('compass'), compassOn: false,
    ledsMatch: () => { for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (!!at(14 + x, 14 + y).on !== (BW_HAPPY[y][x] === '1')) return false; return true; },
    leverValue: () => [0, 1, 2, 3].reduce((s, i) => s + (at(22 + i, 10).on ? at(22 + i, 10).lever : 0), 0),
  };
  const P = { x: BW_SPAWN[0], y: BW_SPAWN[1], fx: BW_SPAWN[0], fy: BW_SPAWN[1], t: 1, face: 'down', bump: 0, queue: null };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const held = [];
  let panelOpen = false, raf = 0, last = performance.now(), cam = null, toastTimer = 0;

  body.innerHTML = `<div class="bw-wrap"><canvas id="bw-cv" aria-label="Bit's Blocky World. Use the arrow keys to walk and Space to use things."></canvas>
      <div id="bw-toast" class="bw-toast" hidden></div><div id="bw-panel" class="bw-panel" hidden></div></div>
    <div class="bw-ctrl">
      <div class="bw-pad">${[['up', '▲', 2, 1], ['left', '◀', 1, 2], ['down', '▼', 2, 2], ['right', '▶', 3, 2]].map(([d, s, c, r]) => `<button data-dir="${d}" style="grid-column:${c};grid-row:${r}" aria-label="Walk ${d}">${s}</button>`).join('')}</div>
      <div class="bw-acts"><button class="primary" id="bw-use">✋ Use <span class="muted">(Space)</span></button><button id="bw-quests">📜 Quests <span class="muted">(Q)</span></button></div>
    </div>`;
  const cv = $('bw-cv'), ctx = cv.getContext('2d');
  const hud = () => stats(`⭐ <b>${chips.length}</b>/${BW_ORDER.length} chips · ${BB(HS.bucks)}`);
  hud();

  /* --- messages and panels --- */
  const toast = (html, ms = 2600) => {
    const el = $('bw-toast'); if (!el) return;
    el.innerHTML = html; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  };
  const panel = (html, bind) => {
    const el = $('bw-panel'); el.innerHTML = html + '<button class="bw-x" id="bw-x" aria-label="Close">✕</button>'; el.hidden = false; panelOpen = true; held.length = 0;
    $('bw-x').onclick = closePanel; bind?.(el);
    (el.querySelector('button.primary') || $('bw-x')).focus();
  };
  const closePanel = () => { const el = $('bw-panel'); if (el) el.hidden = true; panelOpen = false; cv.focus?.(); };
  const ledGrid = (fn) => `<span class="bw-grid">${Array.from({ length: 25 }, (_, i) => `<i class="${fn(i % 5, Math.floor(i / 5)) ? 'on' : ''}"></i>`).join('')}</span>`;

  function talk(id) {
    const s = BW_STATIONS[id], done = chips.includes(id);
    if (id === 'compass' && !w.magnetFound && !w.compassOn) { w.compassOn = true; toast('🧭 Your compass is on! Follow the needle at the top right.'); }
    const task = !done && s.task ? s.task(w) : null;
    let html = `<h3>${s.emoji} ${s.name}</h3>`;
    if (task) {
      html += `<p class="bw-task">🎯 ${task}</p>`;
      if (id === 'leds') html += `<div class="bw-grids"><div>Goal ${ledGrid((x, y) => BW_HAPPY[y][x] === '1')}</div><div>Now ${ledGrid((x, y) => at(14 + x, 14 + y).on)}</div></div>`;
      if (id === 'binary') html += `<p class="bw-bin">${[0, 1, 2, 3].map((i) => `<span><small>${at(22 + i, 10).lever}</small><b>${at(22 + i, 10).on ? 1 : 0}</b></span>`).join('')} = <b>${w.leverValue()}</b> <span class="muted">(goal ${BW_TARGET})</span></p>`;
      html += '<div class="row"><button class="primary" id="bw-ok">OK, let\'s do it!</button></div>';
      return panel(html, () => { $('bw-ok').onclick = closePanel; });
    }
    html += `<p>${s.lesson}</p>`;
    if (done) {
      html += '<p class="bw-have">⭐ You already have this chip!</p><div class="row"><button class="primary" id="bw-ok">Keep exploring</button></div>';
      return panel(html, () => { $('bw-ok').onclick = closePanel; });
    }
    html += '<div class="row"><button class="primary" id="bw-quiz">⭐ Quiz me for the chip</button></div>';
    panel(html, () => { $('bw-quiz').onclick = () => quiz(id); });
  }

  function quiz(id) {
    const s = BW_STATIONS[id], [q, right, ...wrong] = s.q;
    const opts = shuffle([right, ...wrong]);
    panel(`<h3>${s.emoji} Quiz for the ${s.name.replace(/^The /, '')} chip</h3><div class="arc-q"><b>${esc(q)}</b>
      <div class="arc-opts">${opts.map((a, k) => `<button data-k="${k}">${'ABCD'[k]}. ${esc(a)}</button>`).join('')}</div></div><div id="bw-res"></div>`, (el) => {
      el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
        el.querySelectorAll('[data-k]').forEach((x) => (x.disabled = true));
        if (opts[+b.dataset.k] === right) { b.classList.add('ok'); earn(id); }
        else {
          b.classList.add('bad');
          $('bw-res').innerHTML = `<p class="snk-msg bad">❌ Not quite! Have another look at the lesson, then try again.</p><div class="row"><button class="primary" id="bw-again">📖 Read it again</button></div>`;
          $('bw-again').onclick = () => talk(id); $('bw-again').focus();
        }
      }));
    });
  }

  function earn(id) {
    if (chips.includes(id)) return;
    chips.push(id); HS.bucks += BW_CHIP_BUCKS;
    const all = chips.length === BW_ORDER.length;
    if (all) HS.bucks += BW_ALL_BUCKS;
    saveHS(); hud(); confetti();
    boardReact(all ? "display.show(Image.HAPPY)\nsleep(400)\ndisplay.scroll('ALL CHIPS!', wait=False)" : 'display.show(Image.YES)');
    const s = BW_STATIONS[id];
    $('bw-res').innerHTML = `<p class="snk-msg good">🎉 Right! ${esc(s.why)}</p><p class="bw-have">⭐ You got the <b>${s.name.replace(/^The /, '')}</b> chip! +${BW_CHIP_BUCKS} Bit Bucks</p>
      ${all ? `<p class="bw-have big">🏆 You found <b>all ${BW_ORDER.length} chips</b>! You know every part of the micro:bit. +${BW_ALL_BUCKS} bonus Bit Bucks!</p>` : `<p class="muted">${BW_ORDER.length - chips.length} chips to go. Press Q to see where.</p>`}
      <div class="row"><button class="primary" id="bw-ok">Keep exploring</button></div>`;
    $('bw-ok').onclick = closePanel; $('bw-ok').focus();
  }

  function quests() {
    panel(`<h3>📜 Quests: ⭐ ${chips.length}/${BW_ORDER.length} chips</h3><ul class="bw-quests">${BW_ORDER.map((id) => {
      const s = BW_STATIONS[id], done = chips.includes(id);
      return `<li class="${done ? 'done' : ''}">${done ? '⭐' : '◻️'} ${s.emoji} <b>${s.name}</b> <span class="muted">${done ? 'done!' : BW_HINTS[id]}</span></li>`;
    }).join('')}</ul><p class="muted">Look for the floating signs. Walk up to one and press Space.</p>`);
  }

  /* --- moving --- */
  const canWalk = (x0, y0, x1, y1) => {
    const a = at(x0, y0), b = at(x1, y1);
    return !!b && !b.solid && b.h > 0 && Math.abs(b.h - a.h) <= 1;
  };
  function step(dir) {
    const [dx, dy] = DIRS[dir]; P.face = dir;
    if (!canWalk(P.x, P.y, P.x + dx, P.y + dy)) { P.bump = performance.now(); return; }
    P.fx = P.x; P.fy = P.y; P.x += dx; P.y += dy; P.t = 0;
  }
  function onEnter() {
    const c = at(P.x, P.y);
    if (c.btn && !w.pressed[c.btn]) {
      w.pressed[c.btn] = true;
      map.t.forEach((tl) => { if (tl.wire === c.btn) tl.ty = 'wireon'; });
      boardReact(`display.show('${c.btn}')`);
      if (w.pressed.A && w.pressed.B) { toast('⚡ Both signals reached the processor!'); if (!chips.includes('buttons')) setTimeout(() => talk('buttons'), 500); }
      else toast(`🔘 Button ${c.btn} pressed! Its pin now reads <b>0</b>. The signal runs along the gold wire to the processor.`);
    }
    if (c.magnet && !w.magnetFound && w.compassOn) {
      w.magnetFound = true; c.magnet = false;
      toast('🧲 You found the magnet! Go back to the 🧭 Compass Stone.', 3500);
      setTimeout(() => talk('compass'), 600);
    }
    if (c.st === 'accel') toast('⛰️ You made it to the top! Press Space.');
  }
  function use() {
    if (panelOpen) return;
    const [dx, dy] = DIRS[P.face];
    const here = at(P.x, P.y), front = at(P.x + dx, P.y + dy);
    if (here.ty === 'led') {
      here.on = !here.on;
      if (w.ledsMatch() && !chips.includes('leds')) { boardReact('display.show(Image.HAPPY)'); toast('😊 That\'s Image.HAPPY!'); setTimeout(() => talk('leds'), 500); }
      return;
    }
    if (front?.lever) {
      front.on = !front.on;
      const v = w.leverValue();
      if (v === BW_TARGET && !w.bridge) {
        w.bridge = true;
        [27, 28].forEach((x) => Object.assign(at(x, 12), { h: 1, ty: 'wood' }));
        boardReact(`display.scroll('${BW_TARGET}', wait=False)`);
        toast(`🌉 ${BW_TARGET.toString(2)} = ${BW_TARGET}! The bridge is down.`, 3500);
        if (!chips.includes('binary')) setTimeout(() => talk('binary'), 700);
      } else toast(`🔢 ${[0, 1, 2, 3].map((i) => (at(22 + i, 10).on ? 1 : 0)).join('')} = <b>${v}</b> <span class="muted">(goal ${BW_TARGET})</span>`);
      return;
    }
    const st = here.st || front?.st;
    if (st) return talk(st);
    toast('Nothing to use here. Walk up to a floating sign!');
  }

  /* --- drawing --- */
  const lookCol = () => {
    const lk = look();
    return { body: (LOOKS.body.find(([n]) => n === lk.body) || LOOKS.body[0]), glow: (LOOKS.glow.find(([n]) => n === lk.glow) || LOOKS.glow[0])[1] };
  };
  function drawBit(x, y, now, moving) {
    const { body: [, bc, dark], glow } = lookCol();
    const bob = moving ? Math.abs(Math.sin(now / 70)) * 3 : Math.sin(now / 400);
    const shake = now - P.bump < 200 ? Math.sin(now / 15) * 2 : 0;
    x += shake;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    const by = y - bob;
    ctx.fillStyle = dark; ctx.fillRect(x - 9, by - 7, 7, 6); ctx.fillRect(x + 2, by - 7, 7, 6);          // feet
    ctx.fillStyle = bc; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.fillRect(x - 11, by - 22, 22, 16); ctx.strokeRect(x - 11, by - 22, 22, 16);                   // body
    ctx.fillStyle = glow; ctx.fillRect(x - 3, by - 17, 6, 6);                                         // chest light
    ctx.fillStyle = bc; ctx.fillRect(x - 13, by - 44, 26, 22); ctx.strokeRect(x - 13, by - 44, 26, 22); // head
    if (P.face !== 'up') {
      ctx.fillStyle = '#1b1f24'; ctx.fillRect(x - 10, by - 41, 20, 15);
      const ox = P.face === 'left' ? -3 : P.face === 'right' ? 3 : 0;
      ctx.fillStyle = glow; ctx.fillRect(x - 7 + ox, by - 37, 4, 5); ctx.fillRect(x + 3 + ox, by - 37, 4, 5);
    }
    ctx.strokeStyle = dark; ctx.beginPath(); ctx.moveTo(x, by - 44); ctx.lineTo(x, by - 52); ctx.stroke();
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, by - 54, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawColumn(x, y, now, cw, ch) {
    const c = at(x, y), X = x * T - cam.x, Y = y * D - cam.y;
    const layers = c.h + c.stack.length;
    if (X < -T || X > cw || Y + D < -10 || Y - layers * BH > ch + 10) return;
    if (c.h === 0) {   // water / hot spring
      ctx.fillStyle = BW_COL[c.ty][0]; ctx.fillRect(X, Y, T, D);
      ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.fillRect(X + ((now / 45 + x * 7 + y * 13) % (T - 8)), Y + 8 + (y % 2) * 8, 8, 2);
      if (c.ty === 'hot') { ctx.fillStyle = 'rgba(255,255,255,.35)'; const p = ((now / 30 + x * 40) % 40); ctx.beginPath(); ctx.arc(X + T / 2 + Math.sin(now / 300 + x) * 6, Y - p, 4 + p / 10, 0, Math.PI * 2); ctx.fill(); }
      return;
    }
    for (let z = 0; z < layers; z++) {
      const ty = z < c.h ? c.ty : c.stack[z - c.h];
      const top = Y - (z + 1) * BH;
      ctx.fillStyle = (ty === 'led' && c.on) ? BW_COL.ledon[1] : BW_COL[ty][1]; ctx.fillRect(X, top + D, T, BH);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(X, top + D + BH - 2, T, 2);
    }
    const topTy = layers > c.h ? c.stack[c.stack.length - 1] : c.ty;
    const tY = Y - layers * BH;
    ctx.fillStyle = (topTy === 'led' && c.on) ? BW_COL.ledon[0] : BW_COL[topTy][0];
    ctx.fillRect(X, tY, T, D);
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, tY + 0.5, T - 1, D - 1);
    if (topTy === 'led') { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X, tY, T, 3); ctx.fillRect(X, tY, 3, D); ctx.fillRect(X + T - 3, tY, 3, D); ctx.fillRect(X, tY + D - 3, T, 3); }
    if (topTy === 'led' && c.on) { ctx.fillStyle = 'rgba(255,120,100,.35)'; ctx.fillRect(X - 3, tY - 3, T + 6, D + 6); ctx.fillStyle = '#ffd1c9'; ctx.fillRect(X + T / 2 - 5, tY + D / 2 - 4, 10, 8); }
    if (topTy === 'leaves') { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(X + 6, tY + 4, 8, 6); ctx.fillRect(X + 24, tY + 12, 8, 6); }
    if (c.slot) { ctx.fillStyle = '#2b3036'; ctx.fillRect(X + 6, tY + D + 8, T - 12, 10); }
    if (c.btn) {  // a big round-ish button cap that goes down when Bit stands on it
      const down = P.x === x && P.y === y && P.t >= 1;
      const capH = down ? 2 : 7;
      ctx.fillStyle = '#3b3f46'; ctx.fillRect(X + 4, tY - 4, T - 8, D + 2);
      ctx.fillStyle = '#111'; ctx.fillRect(X + 8, tY + D - 6 - capH, T - 16, capH + 2);
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(X + 8, tY - capH, T - 16, D - 6);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(c.btn, X + T / 2, tY + D / 2 - capH + 2);
    }
    if (c.lever) {
      const cx = X + T / 2, cy = tY + D / 2;
      ctx.strokeStyle = '#333'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (c.on ? 10 : -10), cy - 18); ctx.stroke();
      ctx.fillStyle = c.on ? '#3fb950' : '#d1242f'; ctx.beginPath(); ctx.arc(cx + (c.on ? 10 : -10), cy - 18, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`${c.lever}: ${c.on ? 1 : 0}`, cx, tY + D + BH - 4);
    }
    if (c.label) { ctx.fillStyle = '#e8c04a'; ctx.font = 'bold 11px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(c.label, X + T / 2, tY + D / 2 + 4); }
    if (c.magnet && w.compassOn && !w.magnetFound && Math.abs(P.x - x) + Math.abs(P.y - y) <= 4) {
      ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🧲', X + T / 2, tY + D / 2 + 6 + Math.sin(now / 200) * 2);
    }
  }

  function draw(now) {
    const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, ch = cv.clientHeight;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const e = P.t < 1 ? P.t * (2 - P.t) : 1;
    const px = P.fx + (P.x - P.fx) * e, py = P.fy + (P.y - P.fy) * e;
    const pz = at(P.fx, P.fy).h + (at(P.x, P.y).h - at(P.fx, P.fy).h) * e;
    const want = { x: px * T + T / 2 - cw / 2, y: py * D - pz * BH - ch / 2 + D };
    cam = cam ? { x: cam.x + (want.x - cam.x) * 0.15, y: cam.y + (want.y - cam.y) * 0.15 } : want;
    ctx.fillStyle = BW_COL.water[0]; ctx.fillRect(0, 0, cw, ch);
    const prow = Math.max(P.y, P.fy);
    for (let y = 0; y < BW_H; y++) {
      for (let x = 0; x < BW_W; x++) drawColumn(x, y, now, cw, ch);
      if (y === prow) drawBit(px * T + T / 2 - cam.x, py * D - pz * BH + D / 2 - cam.y, now, P.t < 1);
    }
    // floating station signs (drawn last so they're always visible)
    for (const id of BW_ORDER) {
      const s = BW_STATIONS[id];
      for (const m of [s.marker, s.marker2].filter(Boolean)) {
        const c = at(m[0], m[1]), X = m[0] * T + T / 2 - cam.x, Y = m[1] * D - (c.h + c.stack.length) * BH - cam.y - 14 + Math.sin(now / 350 + m[0]) * 3;
        if (X < -40 || X > cw + 40 || Y < -40 || Y > ch + 40) continue;
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(X, Y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = chips.includes(id) ? '#e3b341' : '#2f81f7'; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = '17px system-ui'; ctx.textAlign = 'center'; ctx.fillText(s.emoji, X, Y + 6);
        if (chips.includes(id)) { ctx.font = '12px system-ui'; ctx.fillText('⭐', X + 13, Y - 9); }
      }
    }
    {  // radio waves from the tower
      const X = 30 * T + T / 2 - cam.x, Y = 12 * D - 7 * BH - cam.y;
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const r = ((now / 25 + i * 20) % 60) + 6; ctx.globalAlpha = 1 - r / 66; ctx.beginPath(); ctx.arc(X, Y, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // the compass needle points at the magnet while that quest is on
    if (w.compassOn && !w.magnetFound) {
      const cx = cw - 44, cy = 44;
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2((BW_MAGNET[1] - py) * D, (BW_MAGNET[0] - px) * T));
      ctx.fillStyle = '#d1242f'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6); ctx.fill();
      ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#222'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🧲 magnet', cx, cy + 44);
    }
    // the binary readout near the levers
    if (Math.abs(P.y - 10) <= 3 && P.x >= 20 && P.x <= 27 && !w.bridge) {
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(10, 10, 210, 30);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px ui-monospace, monospace'; ctx.textAlign = 'left';
      ctx.fillText(`${[0, 1, 2, 3].map((i) => (at(22 + i, 10).on ? 1 : 0)).join('')} = ${w.leverValue()}  (goal ${BW_TARGET})`, 20, 31);
    }
    // a "press Space" hint next to things you can use
    if (!panelOpen && P.t >= 1) {
      const [dx, dy] = DIRS[P.face], here = at(P.x, P.y), front = at(P.x + dx, P.y + dy);
      const hint = here.ty === 'led' ? 'Space: switch this LED' : front?.lever ? 'Space: flip the lever' : (here.st || front?.st) ? `Space: ${BW_STATIONS[here.st || front.st].name}` : '';
      if (hint) {
        ctx.font = 'bold 14px system-ui'; const tw = ctx.measureText(hint).width + 24;
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(cw / 2 - tw / 2, ch - 44, tw, 30);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(hint, cw / 2, ch - 24);
      }
    }
  }

  function frame(now) {
    const dt = Math.min(50, now - last); last = now;
    if (P.t < 1) { P.t = Math.min(1, P.t + dt / 150); if (P.t >= 1) onEnter(); }
    if (P.t >= 1 && P.queue && !panelOpen) { step(P.queue); P.queue = null; }
    else if (P.t >= 1 && held.length && !panelOpen) step(held[held.length - 1]);
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  /* --- controls --- */
  const KEYS = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  const onKey = (e) => {
    if (!bwActive || arcadeEl.hidden) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    e.stopPropagation();          // keep the simulator's A/B keys and the / search out of the game
    if (panelOpen) { if (e.key === 'Escape') { e.preventDefault(); closePanel(); } return; }
    const dir = KEYS[e.key];
    if (dir) { e.preventDefault(); if (!held.includes(dir)) held.push(dir); if (!e.repeat) { if (P.t >= 1) step(dir); else P.queue = dir; } return; }
    if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) use(); }
    else if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); quests(); }
  };
  const onKeyUp = (e) => { const dir = KEYS[e.key]; if (dir) { const i = held.indexOf(dir); if (i >= 0) held.splice(i, 1); } };
  const onBlur = () => { held.length = 0; };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  body.querySelectorAll('[data-dir]').forEach((b) => {
    const dir = b.dataset.dir;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!held.includes(dir)) held.push(dir); if (P.t >= 1 && !panelOpen) step(dir); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => { const i = held.indexOf(dir); if (i >= 0) held.splice(i, 1); }));
  });
  $('bw-use').onclick = use;
  $('bw-quests').onclick = quests;

  bwActive = { map, P, w, talk, use, step, chips };
  arcadeStop = () => {
    cancelAnimationFrame(raf); bwActive = null;
    window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('blur', onBlur);
  };
  raf = requestAnimationFrame(frame);

  if (!chips.length) {
    panel(`<h3>🌍 Welcome to Bit's Blocky World!</h3>
      <p>You're <b>${esc(HS.name || 'Bit')}</b>, standing on a <b>giant micro:bit</b> island. Explore it to find all <b>${BW_ORDER.length} ⭐ chips</b>. Each one teaches you a part of the micro:bit and gives you ${BW_CHIP_BUCKS} Bit Bucks (and ${BW_ALL_BUCKS} more for finding them all).</p>
      <p>🕹️ Walk with the <b>arrow keys</b>, <b>WASD</b> or the ▲◀▼▶ buttons. Press <b>Space</b> (or ✋ Use) next to a floating sign. Press <b>Q</b> for your quest list.</p>
      <div class="row"><button class="primary" id="bw-ok">Let's explore!</button></div>`, () => { $('bw-ok').onclick = closePanel; });
  } else toast(`👋 Welcome back! ⭐ ${chips.length}/${BW_ORDER.length} chips found.${chips.length < BW_ORDER.length ? ' Press Q for quests.' : ''}`, 3500);
}
