/* 🌍 Bit's Blocky World: walk Bit around blocky worlds and learn about the micro:bit.
 *   World 1 🏝️ Micro:bit Island  – the parts of the board
 *   World 2 🏜️ Circuit Canyon    – electricity, pins and sound
 *   World 3 🏰 Code Castle       – coding ideas
 * Each world has stations with a little puzzle, a short lesson and a quiz question that wins a ⭐ chip.
 * Finishing every chip in a world unlocks the next one. Free to play, no battery.
 * Chips are saved in HS.games.world (world 1 ids as they are, later worlds as "w2_…", "w3_…"),
 * so they follow a kid's account.
 * Uses games/arcadeFrame/arcadeStop/stats/HS/saveHS/BB/LOOKS/look/esc/shuffle/boardReact/confetti from other files. */
'use strict';

const BW_CHIP_BUCKS = 10, BW_WORLD_BUCKS = 50;
const BW_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
// [top colour, side colour] for each kind of block
const BW_COL = {
  // world 1
  grass: ['#6cc24a', '#8a5a2b'], sand: ['#ecd9a0', '#c8b27a'], path: ['#d8b67e', '#a8875a'], stone: ['#a3a9b0', '#7f868e'],
  board: ['#1f7a50', '#145238'], gold: ['#e8c04a', '#b38f22'], wireoff: ['#8f8150', '#6e6036'], wireon: ['#ffd84a', '#d4a514'],
  chip: ['#2a2d33', '#16181c'], led: ['#5a1f1f', '#3a1414'], ledon: ['#ff4d3d', '#c22a1d'], btn: ['#1f7a50', '#145238'],
  wood: ['#b9844e', '#83582c'], leaves: ['#3aa04a', '#2a7a37'], trunk: ['#8b5a2b', '#6b421d'], usb: ['#c3cad3', '#8f98a3'],
  tower: ['#e5534b', '#b3362f'], towerw: ['#f2f2f2', '#c8c8c8'], lever: ['#6b7280', '#4b5260'], water: ['#3d8bfd', '#2a64c4'], hot: ['#ff9a5a', '#d9692e'],
  // world 2
  rsand: ['#e9b872', '#c08a46'], rock: ['#c4643c', '#93462a'], chasm: ['#3b2a22', '#2a1d17'], copper: ['#b9773f', '#8a5426'], copperon: ['#ffb347', '#e08a1e'],
  gap: ['#5b3d2a', '#3f2a1d'], batt: ['#2f2f2f', '#1a1a1a'], bulb: ['#fff3b0', '#e8d36a'], bulboff: ['#77776a', '#55554a'], crate: ['#c58c4b', '#8e5f2b'],
  resist: ['#d8c49a', '#a8946a'], cactus: ['#3f9e4d', '#2d7438'], pinpad: ['#e8c04a', '#a8841c'], dial: ['#4a4f58', '#30343a'],
  note0: ['#ff6b6b', '#c94545'], note1: ['#ffa94d', '#c97a26'], note2: ['#ffd43b', '#c9a514'], note3: ['#69db7c', '#3ba64c'], note4: ['#4dabf7', '#2a7fc4'],
  clipr: ['#e03131', '#a61e1e'], clipk: ['#343a40', '#1d2125'],
  // world 3
  snow: ['#f4f8fb', '#c9d6e0'], spath: ['#dde6ee', '#b4c2ce'], brick: ['#8f8ca8', '#66637e'], cobble: ['#b9b6c9', '#8e8ba3'], carpet: ['#8250df', '#5e33a8'],
  gate: ['#7a4b2a', '#553118'], ice: ['#bfe6ff', '#8cc7ec'], icerock: ['#7d8b99', '#5a6672'], flagtile: ['#ffffff', '#c9d6e0'], pine: ['#2f7d4f', '#1f5a37'],
  pinet: ['#7a4a1f', '#5a3515'], dice: ['#ffffff', '#d0d0d0'], bell: ['#e8c04a', '#b38f22'], towercap: ['#5e33a8', '#43237a'], darkwater: ['#2b5d9e', '#1f4577'], plate: ['#9aa0a6', '#6b7178'],
};

function bwRng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function bwGrid(W, H, fill) {   // a blank map plus little helpers for building it
  const t = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t.push({ stack: [], ...fill(x, y) });
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? t[y * W + x] : null);
  const set = (x, y, o) => Object.assign(at(x, y), o);
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y); };
  return { W, H, t, at, set, rect };
}
// sprinkle decorations (trees, cacti…) on plain ground, away from anything important
function bwDecorate(g, { seed, ground, keepOut, place }) {
  const rnd = bwRng(seed);
  g.rect(0, 0, g.W - 1, g.H - 1, (x, y) => {
    const c = g.at(x, y);
    if (c.ty !== ground || c.h !== 1 || c.st || c.icon || c.label || c.stack.length || keepOut(x, y)) return;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const n = g.at(x + dx, y + dy);
      if (n && (n.ty !== ground || n.st || n.icon || n.solid || n.label || n.h === 0)) return;
    }
    place(c, rnd(), x, y);
  });
}
let bwAudio = null;
function bwTone(freq, ms = 220, type = 'square') {
  try {
    bwAudio = bwAudio || new (window.AudioContext || window.webkitAudioContext)();
    const o = bwAudio.createOscillator(), gn = bwAudio.createGain(), t0 = bwAudio.currentTime;
    o.type = type; o.frequency.value = freq;
    gn.gain.setValueAtTime(0.07, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + ms / 1000);
    o.connect(gn).connect(bwAudio.destination); o.start(t0); o.stop(t0 + ms / 1000);
  } catch { /* no sound, no problem */ }
}

/* ======================================================================
 * 🏝️ WORLD 1: Micro:bit Island
 * ==================================================================== */
const BW1_HAPPY = ['00000', '01010', '00000', '10001', '01110'];  // Image.HAPPY
const BW1_MAGNET = [12, 23];
const BW1_TARGET = 13;
const BW1 = {
  n: 1, name: 'Micro:bit Island', emoji: '🏝️', sea: 'water', W: 34, H: 26, spawn: [16, 11],
  blurb: 'A giant micro:bit island. Learn what every part of the board does.',
  stations: {
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
      extra: (w) => `<div class="bw-grids"><div>Goal ${bwLedGrid((x, y) => BW1_HAPPY[y][x] === '1')}</div><div>Now ${bwLedGrid((x, y) => w.led(x, y))}</div></div>`,
      lesson: 'The 25 LEDs look like a 5 × 5 grid, but they\'re wired as <b>3 rows × 9 columns</b> to save pins. The processor lights one row at a time, so fast that your eyes see the whole picture at once. The LEDs can even work backwards to measure light!',
      q: ['Only one row of LEDs is lit at a time. Why does the picture look steady?', 'It switches faster than your eyes can see', 'The LEDs are glued on', 'The battery holds them on'],
      why: 'The rows take turns hundreds of times a second, which is too fast for eyes to notice.' },
    binary: { name: 'The binary bridge', emoji: '🔢', marker: [26, 10],
      task: (w) => (w.bridge ? null : `The bridge to the Radio Tower is up! Flip the 4 levers to make <b>${BW1_TARGET}</b> in binary. The levers are worth 8, 4, 2 and 1. Stand next to a lever and press <b>Space</b>.`),
      extra: (w) => `<p class="bw-bin">${w.levers().map((l) => `<span><small>${l.lever}</small><b>${l.on ? 1 : 0}</b></span>`).join('')} = <b>${w.leverValue()}</b> <span class="muted">(goal ${BW1_TARGET})</span></p>`,
      lesson: `Computers count with only <b>0 and 1</b> (off and on). Each place is worth double the one on its right: 8, 4, 2, 1. ${BW1_TARGET} = 8 + 4 + 1, so it's <b>1101</b> in binary. A byte is 8 bits, which can count up to 255.`,
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
  },
  order: ['usb', 'processor', 'buttons', 'leds', 'binary', 'radio', 'temp', 'compass', 'accel'],
  hints: { usb: 'far west', processor: 'north of the start', buttons: 'left and right of the LED garden', leds: 'south of the start',
    binary: 'east, by the water', radio: 'on the east island', temp: 'south-west', compass: 'north-east', accel: 'the big hill, north-west' },

  build(done) {
    const g = bwGrid(34, 26, (x, y) => {
      const s = ((x - 16.5) / 16) ** 4 + ((y - 12.5) / 12) ** 4;  // a rounded-square island
      return s > 1 ? { h: 0, ty: 'water' } : { h: 1, ty: s > 0.72 ? 'sand' : 'grass' };
    });
    const { at, set, rect } = g;
    const path = (x0, y0, x1, y1) => rect(x0, y0, x1, y1, (x, y) => { const c = at(x, y); if (c.ty === 'grass' || c.ty === 'sand') c.ty = 'path'; });
    rect(2, 2, 8, 8, (x, y) => { const d = Math.max(Math.abs(x - 5), Math.abs(y - 5)); if (d <= 3) set(x, y, { h: 4 - d, ty: d === 0 ? 'stone' : 'grass' }); });
    set(5, 5, { st: 'accel' });
    rect(9, 13, 23, 20, (x, y) => set(x, y, { ty: 'board' }));
    rect(10, 20, 22, 20, (x, y) => set(x, y, { ty: 'gold' }));
    rect(14, 14, 18, 18, (x, y) => set(x, y, { ty: done.includes('leds') && BW1_HAPPY[y - 14][x - 14] === '1' ? 'ledon' : 'led', led: true }));
    set(11, 16, { ty: 'btn', btn: 'A', st: 'buttons' }); set(21, 16, { ty: 'btn', btn: 'B', st: 'buttons' });
    set(13, 14, { stack: ['wood'], solid: true, st: 'leds' });
    rect(14, 3, 18, 7, (x, y) => set(x, y, { ty: 'gold' }));
    rect(15, 4, 17, 6, (x, y) => set(x, y, { ty: 'chip', stack: ['chip'], solid: true, st: 'processor' }));
    at(16, 5).label = 'nRF51';
    const lit = done.includes('buttons');
    const wire = (x, y, w) => set(x, y, { ty: lit ? 'wireon' : 'wireoff', wire: w });
    rect(11, 8, 11, 15, (x, y) => wire(x, y, 'A')); rect(12, 8, 15, 8, (x, y) => wire(x, y, 'A'));
    rect(21, 8, 21, 15, (x, y) => wire(x, y, 'B')); rect(17, 8, 20, 8, (x, y) => wire(x, y, 'B'));
    path(16, 8, 16, 12); path(5, 11, 15, 11); path(5, 9, 5, 11); path(17, 11, 26, 11); path(26, 12, 26, 12);
    path(4, 13, 8, 13); path(7, 18, 8, 18); path(16, 21, 16, 22);
    rect(2, 12, 3, 13, (x, y) => set(x, y, { ty: 'usb', stack: ['usb', 'usb'], solid: true, st: 'usb', slot: y === 13 }));
    rect(4, 19, 6, 20, (x, y) => set(x, y, { h: 0, ty: 'hot' }));
    set(7, 19, { stack: ['towerw', 'tower', 'tower'], solid: true, st: 'temp' });
    set(25, 4, { ty: 'stone', stack: ['stone', 'stone'], solid: true, st: 'compass' });
    set(...BW1_MAGNET, { magnet: true });
    rect(27, 8, 28, 16, (x, y) => set(x, y, { h: 0, ty: 'water' }));
    rect(27, 8, 33, 8, (x, y) => set(x, y, { h: 0, ty: 'water' })); rect(27, 16, 33, 16, (x, y) => set(x, y, { h: 0, ty: 'water' }));
    const bits = BW1_TARGET.toString(2).padStart(4, '0');
    [8, 4, 2, 1].forEach((v, i) => set(22 + i, 10, { ty: 'stone', stack: ['lever'], solid: true, lever: v, on: done.includes('binary') && bits[i] === '1' }));
    set(26, 10, { stack: ['wood'], solid: true, st: 'binary' });
    [27, 28].forEach((x) => set(x, 12, done.includes('binary') ? { h: 1, ty: 'wood' } : {}));
    set(30, 12, { stack: ['tower', 'towerw', 'tower', 'towerw', 'tower', 'towerw'], solid: true, st: 'radio' });
    const busy = new Set(['path', 'board', 'gold', 'wireoff', 'wireon', 'btn', 'led', 'ledon', 'hot', 'chip', 'usb', 'wood', 'stone']);
    const rnd = bwRng(42);
    rect(0, 0, 33, 25, (x, y) => {
      const c = at(x, y);
      if (c.ty !== 'grass' || c.h !== 1 || c.st || c.magnet || c.stack.length) return;
      if (x <= 9 && y <= 9) return;
      if (x >= 29 && y >= 9 && y <= 15) return;
      if (Math.abs(x - 16) <= 2 && Math.abs(y - 11) <= 2) return;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const n = at(x + dx, y + dy);
        if (n && (busy.has(n.ty) || n.st || n.magnet || n.lever || n.solid)) return;
      }
      if (Math.sin(x * 0.55) + Math.cos(y * 0.5) + Math.sin((x + y) * 0.33) > 1.25) c.h = 2;
      const r = rnd();
      if (r < 0.10) Object.assign(c, { stack: r < 0.04 ? ['trunk', 'trunk', 'leaves', 'leaves'] : ['trunk', 'leaves', 'leaves'], solid: true });
      else if (r < 0.13) Object.assign(c, { h: 2, ty: 'stone' });
    });
    return g;
  },

  setup({ at, map, toast, talk, isDone, P }) {
    const levers = () => [0, 1, 2, 3].map((i) => at(22 + i, 10));
    const w = {
      pressed: { A: isDone('buttons'), B: isDone('buttons') },
      bridge: isDone('binary'), magnetFound: isDone('compass'), compassOn: false,
      led: (x, y) => at(14 + x, 14 + y).ty === 'ledon',
      ledsMatch: () => { for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (w.led(x, y) !== (BW1_HAPPY[y][x] === '1')) return false; return true; },
      levers, leverValue: () => levers().reduce((s, l) => s + (l.on ? l.lever : 0), 0),
    };
    return {
      w,
      onTalk(id) { if (id === 'compass' && !w.magnetFound && !w.compassOn) { w.compassOn = true; toast('🧭 Your compass is on! Follow the needle at the top right.'); } },
      onEnter(c) {
        if (c.btn && !w.pressed[c.btn]) {
          w.pressed[c.btn] = true;
          map.t.forEach((tl) => { if (tl.wire === c.btn) tl.ty = 'wireon'; });
          boardReact(`display.show('${c.btn}')`);
          if (w.pressed.A && w.pressed.B) { toast('⚡ Both signals reached the processor!'); if (!isDone('buttons')) setTimeout(() => talk('buttons'), 500); }
          else toast(`🔘 Button ${c.btn} pressed! Its pin now reads <b>0</b>. The signal runs along the gold wire to the processor.`);
        }
        if (c.magnet && !w.magnetFound && w.compassOn) {
          w.magnetFound = true; c.magnet = false;
          toast('🧲 You found the magnet! Go back to the 🧭 Compass Stone.', 3500);
          setTimeout(() => talk('compass'), 600);
        }
        if (c.st === 'accel') toast('⛰️ You made it to the top! Press Space.');
      },
      onUse(here, front) {
        if (here.led) {
          here.ty = here.ty === 'ledon' ? 'led' : 'ledon';
          if (w.ledsMatch() && !isDone('leds')) { boardReact('display.show(Image.HAPPY)'); toast('😊 That\'s Image.HAPPY!'); setTimeout(() => talk('leds'), 500); }
          return true;
        }
        if (front?.lever) {
          front.on = !front.on;
          const v = w.leverValue();
          if (v === BW1_TARGET && !w.bridge) {
            w.bridge = true;
            [27, 28].forEach((x) => Object.assign(at(x, 12), { h: 1, ty: 'wood' }));
            boardReact(`display.scroll('${BW1_TARGET}', wait=False)`);
            toast(`🌉 ${BW1_TARGET.toString(2)} = ${BW1_TARGET}! The bridge is down.`, 3500);
            if (!isDone('binary')) setTimeout(() => talk('binary'), 700);
          } else toast(`🔢 ${levers().map((l) => (l.on ? 1 : 0)).join('')} = <b>${v}</b> <span class="muted">(goal ${BW1_TARGET})</span>`);
          return true;
        }
        return false;
      },
      hint(here, front, k) { return here.led ? `${k}: switch this LED` : front?.lever ? `${k}: flip the lever` : null; },
      drawTile(ctx, c, X, tY, now, v) {
        const { T, D, BH } = v;
        if (c.led) {
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X, tY, T, 3); ctx.fillRect(X, tY, 3, D); ctx.fillRect(X + T - 3, tY, 3, D); ctx.fillRect(X, tY + D - 3, T, 3);
          if (c.ty === 'ledon') { ctx.fillStyle = 'rgba(255,120,100,.35)'; ctx.fillRect(X - 3, tY - 3, T + 6, D + 6); ctx.fillStyle = '#ffd1c9'; ctx.fillRect(X + T / 2 - 5, tY + D / 2 - 4, 10, 8); }
        }
        if (c.slot) { ctx.fillStyle = '#2b3036'; ctx.fillRect(X + 6, tY + D + 8, T - 12, 10); }
        if (c.btn) {
          const down = v.standing(c);
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
        if (c.magnet && w.compassOn && !w.magnetFound && v.near(4)) {
          ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🧲', X + T / 2, tY + D / 2 + 6 + Math.sin(now / 200) * 2);
        }
      },
      drawOver(ctx, now, v) {   // radio waves from the tower
        const [X, Y] = v.screen(30, 12, 7);
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const r = ((now / 25 + i * 20) % 60) + 6; ctx.globalAlpha = 1 - r / 66; ctx.beginPath(); ctx.arc(X + v.T / 2, Y, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        ctx.globalAlpha = 1;
      },
      drawHud(ctx, cw, ch, now, v) {
        if (w.compassOn && !w.magnetFound) bwCompass(ctx, cw, Math.atan2((BW1_MAGNET[1] - v.py) * v.D, (BW1_MAGNET[0] - v.px) * v.T), '🧲 magnet');
        if (Math.abs(P.y - 10) <= 3 && P.x >= 20 && P.x <= 27 && !w.bridge) bwHudText(ctx, `${levers().map((l) => (l.on ? 1 : 0)).join('')} = ${w.leverValue()}  (goal ${BW1_TARGET})`);
      },
    };
  },
};

/* ======================================================================
 * 🏜️ WORLD 2: Circuit Canyon
 * ==================================================================== */
const BW2_TUNE = ['E', 'D', 'C', 'D', 'E', 'E', 'E'];
const BW2_NOTES = { C: 262, D: 294, E: 330, G: 392, A: 440 };
const BW2_TOUCH = ['GND', '2', '0', '1'];
const BW2 = {
  n: 2, name: 'Circuit Canyon', emoji: '🏜️', sea: 'chasm', W: 30, H: 22, spawn: [15, 11],
  blurb: 'A desert of copper wires. Learn about electricity, pins and sound.',
  stations: {
    battery: { name: 'The battery pack', emoji: '🔋', marker: [5, 5],
      task: (w) => (w.aaa >= 2 ? null : `The battery pack is empty! Find the <b>2 AAA batteries</b> lost in the canyon. Found: <b>${w.aaa}/2</b>`),
      lesson: 'The micro:bit runs on about <b>3 volts</b>. Away from the computer, a pack of <b>2 AAA batteries</b> (1.5 V each) plugs into the small white socket. On USB it gets 5 V and turns it down to about 3.3 V. Volts are the "push" that makes electricity flow.',
      q: ['About how many volts does the micro:bit battery pack give?', 'About 3 V', '230 V', '100 V'],
      why: 'Two AAA batteries give 1.5 V + 1.5 V = 3 V.' },
    circuit: { name: 'The broken circuit', emoji: '💡', marker: [13, 3], reset: true,
      task: (w) => (w.lit ? null : 'The light bulb is dark because there\'s a <b>gap</b> in the copper wire. Push the copper block (<b>Cu</b>) into the gap to finish the circuit! Walk into the block to push it.'),
      lesson: 'Electricity only flows around a complete loop, called a <b>circuit</b>: out of the battery, along the wire, through the bulb and back to the battery. Any gap stops the flow. That\'s exactly what a switch does on purpose!',
      q: ['Why didn\'t the bulb light up at first?', 'The circuit had a gap', 'The bulb was too big', 'It was daytime'],
      why: 'Electricity needs a complete loop. A gap breaks the circuit.' },
    resistor: { name: 'Resistor Ridge', emoji: '〰️', marker: [21, 5],
      lesson: 'A <b>resistor</b> slows down the flow of electricity (the <i>current</i>). Without one, an LED lets too much current through and burns out. The coloured stripes on a real resistor tell you how strong it is, in <b>ohms (Ω)</b>. The micro:bit\'s own LEDs already have resistors built in.',
      q: ['What does a resistor do?', 'Slows down the electric current', 'Stores your program', 'Makes a sound'],
      why: 'Resistors limit the current, which protects parts like LEDs.' },
    touch: { name: 'The touch pins', emoji: '👆', marker: [12, 17],
      task: (w) => (w.touch >= 4 ? null : `Touch the pins in this order: <b>GND → 2 → 0 → 1</b>. Stop on each gold pad. ${BW2_TOUCH.map((p, i) => (i < w.touch ? '✅' : '◻️') + ' ' + p).join(' ')}`),
      lesson: 'Pins <b>0, 1 and 2</b> can tell when you touch them. Hold <b>GND</b> with one hand and touch a pin with the other: a tiny bit of electricity flows through your body and the micro:bit notices. In Python: <code>pin0.is_touched()</code>.',
      q: ['To use a touch pin, what else should you be touching?', 'GND', '3V', 'Button B'],
      why: 'Your body completes the circuit from the pin to GND.' },
    music: { name: 'The music floor', emoji: '🎵', marker: [23, 10],
      task: (w) => (w.tune >= BW2_TUNE.length ? null : `Play this tune by walking on the notes: <b>${BW2_TUNE.join(' ')}</b>. To play the same note again, press Space on it. Played: <b>${w.tune}/${BW2_TUNE.length}</b>`),
      lesson: 'The micro:bit v1 has no speaker of its own. Connect headphones or a buzzer to <b>pin 0</b> and <b>GND</b>, then try <code>music.play(music.BA_DING)</code> or <code>music.pitch(440)</code>. The <b>pitch</b> (how many times the sound wiggles each second) decides if a note sounds high or low.',
      q: ['On the micro:bit v1, which pin plays music by default?', 'Pin 0', 'Pin 2', 'The 3V pin'],
      why: 'Music comes out of pin 0 (and GND) unless you choose another pin.' },
    analog: { name: 'The analog slope', emoji: '🎚️', marker: [14, 19],
      task: (w) => (w.analog ? null : 'Digital pins only read 0 or 1, but analog pins read numbers from 0 to 1023. Walk along the slope and <b>stop on 512</b>, the middle!'),
      lesson: '<b>Digital</b> means just two values: 0 (off) or 1 (on). <b>Analog</b> means anything in between. <code>pin1.read_analog()</code> measures the voltage on a pin and gives a number from <b>0</b> (0 V) to <b>1023</b> (3 V), so 512 is about halfway. It\'s great for dials and sensors.',
      q: ['pin1.read_analog() gives a number from 0 up to…', '1023', '1', '9'],
      why: 'Analog readings go from 0 to 1023.' },
    clips: { name: 'Crocodile clips', emoji: '🐊', marker: [27, 9],
      lesson: 'Crocodile clips grab the big pins so you can connect buzzers, lights and sensors without soldering. One rule: <b>never connect 3V straight to GND</b> with just a wire. That\'s a <b>short circuit</b>: far too much current flows, things get hot and the batteries drain fast.',
      q: ['What happens if a wire connects 3V straight to GND?', 'A short circuit: too much current and heat', 'The micro:bit gets faster', 'Nothing at all'],
      why: 'With nothing in the way, a huge current flows. That\'s a short circuit.' },
  },
  order: ['battery', 'circuit', 'resistor', 'touch', 'music', 'analog', 'clips'],
  hints: { battery: 'north-west, the batteries are far apart', circuit: 'the copper loop, north', resistor: 'north-east', touch: 'the gold pads, south',
    music: 'the coloured notes, east', analog: 'the long slope, south-west', clips: 'far east' },

  build(done) {
    const g = bwGrid(30, 22, () => ({ h: 1, ty: 'rsand' }));
    const { at, set, rect } = g;
    const rnd = bwRng(7);
    rect(0, 0, 29, 21, (x, y) => { const e = Math.min(x, y, 29 - x, 21 - y); if (e === 0 || (e === 1 && rnd() < 0.45)) set(x, y, { h: 0, ty: 'chasm' }); });
    [[2, 2, 3, 4], [25, 15, 27, 17], [18, 1, 20, 2]].forEach(([x0, y0, x1, y1]) => rect(x0, y0, x1, y1, (x, y) => set(x, y, { h: 3, ty: 'rock' })));
    // 🔋 the battery pack and the 2 lost AAA batteries
    set(5, 5, { stack: ['batt', 'batt'], solid: true, st: 'battery', label: '+', labelColor: '#fff' });
    set(6, 5, { stack: ['batt', 'batt'], solid: true, st: 'battery', label: '−', labelColor: '#fff' });
    if (!done.includes('battery')) { set(2, 15, { icon: '🔋', collect: 'aaa' }); set(26, 3, { icon: '🔋', collect: 'aaa' }); }
    // 💡 the copper circuit loop with a gap, a battery cell and a bulb
    const lit = done.includes('circuit');
    rect(10, 3, 16, 7, (x, y) => { if (x === 10 || x === 16 || y === 3 || y === 7) set(x, y, { ty: lit ? 'copperon' : 'copper', copper: true }); });
    set(13, 3, { stack: [lit ? 'bulb' : 'bulboff'], solid: true, st: 'circuit', bulb: true });
    set(10, 5, { stack: ['batt'], solid: true, label: '3V', labelColor: '#fff' });
    if (!lit) { set(13, 7, { ty: 'gap', copper: false, gap: true }); set(13, 9, { stack: ['crate'], solid: true, push: true, label: 'Cu', labelColor: '#5b3d2a' }); }
    // 〰️ resistor, 🐊 clips
    set(21, 5, { stack: ['resist', 'resist'], solid: true, st: 'resistor', label: '220Ω', labelColor: '#5b3d2a' });
    set(27, 9, { stack: ['clipr', 'clipr'], solid: true, st: 'clips' }); set(27, 10, { stack: ['clipk', 'clipk'], solid: true, st: 'clips' });
    // 👆 touch pads, 🎵 notes, 🎚️ analog slope
    [['GND', 7], ['0', 10], ['1', 13], ['2', 16]].forEach(([p, x]) => set(x, 15, { ty: 'pinpad', pin: p, label: p, labelColor: '#3b2f00' }));
    set(12, 17, { stack: ['wood'], solid: true, st: 'touch' });
    Object.keys(BW2_NOTES).forEach((n, i) => set(21 + i, 12, { ty: 'note' + i, note: n, label: n, labelColor: '#fff' }));
    set(23, 10, { stack: ['wood'], solid: true, st: 'music' });
    for (let i = 0; i <= 10; i++) set(3 + i, 19, { ty: 'dial', analog: Math.round(i * 1023 / 10), label: String(Math.round(i * 1023 / 10)), labelColor: '#fff' });
    set(14, 19, { stack: ['wood'], solid: true, st: 'analog' });
    // cacti
    bwDecorate(g, { seed: 11, ground: 'rsand',
      keepOut: (x, y) => (x >= 9 && x <= 17 && y <= 11) || (Math.abs(x - 15) <= 2 && Math.abs(y - 11) <= 2) || (y >= 13 && y <= 20 && x <= 18) || (x >= 20 && y >= 9 && y <= 14),
      place: (c, r) => { if (r < 0.09) Object.assign(c, { stack: r < 0.04 ? ['cactus', 'cactus', 'cactus'] : ['cactus', 'cactus'], solid: true }); else if (r < 0.13) Object.assign(c, { h: 2, ty: 'rock' }); } });
    return g;
  },

  setup({ at, map, toast, talk, isDone, P }) {
    const w = { aaa: isDone('battery') ? 2 : 0, lit: isDone('circuit'), touch: isDone('touch') ? 4 : 0, tune: isDone('music') ? BW2_TUNE.length : 0, analog: isDone('analog') };
    const playNote = (c) => {
      bwTone(BW2_NOTES[c.note], 260, 'triangle'); c.flash = performance.now();
      if (w.tune >= BW2_TUNE.length) return;
      if (c.note === BW2_TUNE[w.tune]) {
        w.tune++;
        if (w.tune === BW2_TUNE.length) { toast('🎶 You played the whole tune!'); boardReact('display.show(Image.MUSIC_QUAVERS)'); setTimeout(() => talk('music'), 700); }
      } else { w.tune = c.note === BW2_TUNE[0] ? 1 : 0; toast(`🎵 Oops, that was <b>${c.note}</b>. Start again: ${BW2_TUNE.join(' ')}`); }
    };
    return {
      w,
      onEnter(c) {
        if (c.collect === 'aaa') {
          c.collect = null; c.icon = null; w.aaa++; bwTone(880, 120);
          toast(w.aaa >= 2 ? '🔋🔋 Both batteries found! Take them back to the battery pack.' : `🔋 A AAA battery! ${w.aaa}/2`);
        }
        if (c.note) playNote(c);
      },
      onStop(c) {
        if (c.pin && w.touch < 4) {
          if (c.pin === BW2_TOUCH[w.touch]) {
            w.touch++; bwTone(500 + w.touch * 120, 150);
            if (w.touch === 4) { toast('👆 Touched! The micro:bit felt every pin.'); boardReact('display.show(Image.YES)'); setTimeout(() => talk('touch'), 600); }
            else toast(`👆 <b>${c.pin}</b>! Next: <b>${BW2_TOUCH[w.touch]}</b>`);
          } else if (c.pin !== BW2_TOUCH[w.touch - 1]) {
            w.touch = c.pin === BW2_TOUCH[0] ? 1 : 0; bwTone(150, 250, 'sawtooth');
            toast(`❌ Wrong pin. The order is <b>${BW2_TOUCH.join(' → ')}</b>${w.touch ? '. GND ✅, now 2.' : ''}`);
          }
        }
        if (c.analog !== undefined) {
          toast(`🎚️ <code>read_analog()</code> = <b>${c.analog}</b>`);
          if (c.analog === 512 && !w.analog) { w.analog = true; bwTone(660, 300); setTimeout(() => talk('analog'), 700); }
        }
      },
      onUse(here) { if (here.note) { playNote(here); return true; } return false; },
      onPush(b) {
        if (!b.gap) return;
        Object.assign(b, { stack: [], solid: false, push: false, label: null, gap: false, copper: true });
        map.t.forEach((tl) => { if (tl.copper) tl.ty = 'copperon'; });
        at(13, 3).stack = ['bulb']; w.lit = true;
        [523, 659, 784].forEach((f, i) => setTimeout(() => bwTone(f, 180), i * 120));
        boardReact('display.show(Image.YES)');
        toast('💡 The circuit is complete! The bulb lights up!', 3000);
        if (!isDone('circuit')) setTimeout(() => talk('circuit'), 900);
      },
      reset(id) {
        if (id !== 'circuit' || w.lit) return;
        map.t.forEach((tl) => { if (tl.push) Object.assign(tl, { stack: [], solid: false, push: false, label: null }); });
        bwStepAside(P, 13, 9, 13, 10);
        Object.assign(at(13, 9), { stack: ['crate'], solid: true, push: true, label: 'Cu', labelColor: '#5b3d2a' });
        toast('🔄 The copper block is back where it started.');
      },
      hint(here, front, k) { return here.note ? `${k}: play ${here.note}` : null; },
      drawTile(ctx, c, X, tY, now, v) {
        if (c.bulb && w.lit) {
          const gr = ctx.createRadialGradient(X + v.T / 2, tY + v.D / 2, 4, X + v.T / 2, tY + v.D / 2, 60);
          gr.addColorStop(0, 'rgba(255,240,150,.7)'); gr.addColorStop(1, 'rgba(255,240,150,0)'); ctx.fillStyle = gr; ctx.fillRect(X - 50, tY - 50, v.T + 100, v.D + 100);
        }
        if (c.gap) { ctx.strokeStyle = '#ffb347'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.strokeRect(X + 4, tY + 4, v.T - 8, v.D - 8); ctx.setLineDash([]); }
        if (c.note && c.flash && now - c.flash < 300) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(X, tY, v.T, v.D); }
        if (c.analog !== undefined) { ctx.fillStyle = `rgba(255,214,0,${c.analog / 1023 * 0.8})`; ctx.fillRect(X + 3, tY + 3, v.T - 6, v.D - 6); }
      },
      drawHud(ctx, cw, ch, now, v) {
        const { P } = v;
        if (P.x >= 19 && P.x <= 27 && P.y >= 9 && P.y <= 14 && w.tune < BW2_TUNE.length) bwHudText(ctx, `🎵 ${BW2_TUNE.map((n, i) => (i < w.tune ? `[${n}]` : n)).join(' ')}`);
        if (P.y >= 13 && P.y <= 17 && P.x >= 5 && P.x <= 18 && w.touch < 4) bwHudText(ctx, `👆 ${BW2_TOUCH.map((p, i) => (i < w.touch ? `[${p}]` : p)).join(' → ')}`);
      },
    };
  },
};

/* ======================================================================
 * 🏰 WORLD 3: Code Castle
 * ==================================================================== */
const BW3_RINK = ['.........', '....#....', '.....#...', '..#.#.##.', '.G.......', '.....##..', '..#.....#'];   // x 2–10, y 16–22
const BW3_BUGS = [[8, 12], [23, 5], [3, 12], [27, 18]];
const BW3 = {
  n: 3, name: 'Code Castle', emoji: '🏰', sea: 'darkwater', W: 30, H: 25, spawn: [15, 20],
  blurb: 'A snowy castle full of puzzles. Learn loops, ifs, variables and more.',
  stations: {
    sequence: { name: 'The ice puzzle', emoji: '🧊', marker: [12, 17],
      task: (w) => (w.ice ? null : 'Slide across the ice to the 🏁 flag! On ice you keep sliding until you bump into something, so plan your moves, like the steps of a program. Slid off? Just walk back on.'),
      lesson: 'You just made an <b>algorithm</b>: a list of steps, in the right order, that solves a problem. Programs work the same way: the micro:bit runs your blocks or lines of code <b>one after another, from top to bottom</b>. Change the order and you get a different result!',
      q: ['What is an algorithm?', 'A list of steps that solves a problem', 'A kind of battery', 'A broken wire'],
      why: 'An algorithm is a set of steps in order, like a recipe.' },
    loop: { name: 'The loop tower', emoji: '🔁', marker: [19, 7],
      task: (w) => (w.laps >= 3 ? null : `Run all the way around the tower <b>3 times</b>, like a loop that repeats 3 times. Each lap ends at the ▶ on the south side. Laps: <b>${w.laps}/3</b>`),
      lesson: 'A <b>loop</b> repeats code so you don\'t have to write it again and again. <code>for i in range(3):</code> repeats 3 times, and <code>while True:</code> repeats forever. That\'s why most micro:bit programs keep checking their buttons and sensors inside a <code>while True:</code> loop.',
      q: ['Which loop keeps going forever?', 'while True:', 'for i in range(3):', 'if True:'],
      why: 'while True: never stops repeating.' },
    ifgate: { name: 'The if gate', emoji: '🚪', marker: [9, 8], reset: true,
      task: (w) => (w.boxOnPlate() ? null : 'This gate opens <b>if</b> something is on the pressure plate. Standing on it works… but then you can\'t walk through! Push the 📦 box onto the plate instead.'),
      lesson: '<code>if plate_pressed: open_gate()</code>. An <b>if</b> checks a condition and only runs its code when the condition is <b>True</b>. Add <code>else:</code> for what to do when it\'s False. Programs make decisions this way, like <code>if button_a.is_pressed():</code>.',
      q: ['When does the code inside an if run?', 'Only when its condition is True', 'Always', 'Never'],
      why: 'An if runs its inside code only when the condition is True.' },
    variable: { name: 'The variable vault', emoji: '🪙', marker: [11, 4],
      task: (w) => (w.coins >= 5 ? null : `Collect the <b>5 coins</b> in the vault. Each one runs <code>score = score + 1</code>. Right now <code>score = ${w.coins}</code>.`),
      lesson: 'A <b>variable</b> is a named box that remembers a value. <code>score = 0</code> makes the box, and <code>score = score + 1</code> takes what\'s in it, adds one and puts it back. Show it with <code>display.scroll(score)</code>.',
      q: ['score is 4. What is it after score = score + 1?', '5', '4', '1'],
      why: '4 + 1 = 5, and the new value is stored back in score.' },
    random: { name: 'The dice room', emoji: '🎲', marker: [22, 11],
      task: (w) => (w.six ? null : 'Roll the giant dice until you get a <b>6</b>! Stand next to it and press Space (or ✋ Use).'),
      lesson: '<code>random.randint(1, 6)</code> picks a whole number from 1 to 6, and you can\'t know which one. Games use <b>random</b> numbers so they\'re different every time. Make a micro:bit dice: <code>import random</code>, then on shake <code>display.show(random.randint(1, 6))</code>.',
      q: ['What can random.randint(1, 6) give you?', 'Any whole number from 1 to 6', 'Always 6', 'Only 1 or 2'],
      why: 'It picks any whole number from 1 to 6, including 1 and 6.' },
    debug: { name: 'The bug hunt', emoji: '🐞', marker: [18, 19],
      task: (w) => (w.bugs >= 4 ? null : `4 bugs are crawling around the castle! Catch them all by walking into them. Caught: <b>${w.bugs}/4</b>`),
      lesson: 'A <b>bug</b> is a mistake in a program, and fixing it is <b>debugging</b>. Good debuggers read the error message (Bit can explain them!), check the code one line at a time, and test again after every change. Every programmer makes bugs, even the experts.',
      q: ['Your program shows the wrong picture. What is a good first step?', 'Read the code carefully to find the mistake', 'Throw the micro:bit away', 'Add random lines and hope'],
      why: 'Reading the code carefully, step by step, is how you find bugs.' },
    events: { name: 'The event bell', emoji: '🔔', marker: [15, 10],
      task: (w) => (w.ev.size >= 3 ? null : `Make 3 <b>events</b> happen: step on the <b>A</b>, <b>B</b> and <b>👋 shake</b> pads. ${['A', 'B', 'shake'].map((e) => (w.ev.has(e) ? '✅ ' : '◻️ ') + e).join(' ')}`),
      lesson: 'An <b>event</b> is something that happens, like a button press or a shake. Event blocks such as <i>on button A pressed</i> or <i>on shake</i> run their code whenever that event happens. In Python you check for them inside your loop: <code>if accelerometer.was_gesture("shake"):</code>.',
      q: ['A program says "on shake: show a heart". When does the heart show?', 'Whenever the micro:bit is shaken', 'Only when the program starts', 'Never'],
      why: 'Event code runs every time its event happens.' },
  },
  order: ['sequence', 'loop', 'ifgate', 'variable', 'random', 'debug', 'events'],
  hints: { sequence: 'the frozen lake, south-west', loop: 'the purple tower inside the castle', ifgate: 'the wooden gate inside the castle, west',
    variable: 'behind the if gate', random: 'east side of the castle', debug: 'everywhere! the sign is south', events: 'the gold bell in the middle of the castle' },

  build(done) {
    const g = bwGrid(30, 25, () => ({ h: 1, ty: 'snow' }));
    const { at, set, rect } = g;
    const rnd = bwRng(3);
    rect(0, 0, 29, 24, (x, y) => {
      const e = Math.min(x, y, 29 - x, 24 - y);
      if (e === 0 || (e === 1 && rnd() < 0.4 && !(x <= 12 && y >= 14))) set(x, y, { h: 0, ty: 'darkwater' });
    });
    // the castle: walls with battlements, a courtyard, a gate on the south side
    rect(6, 3, 24, 14, (x, y) => {
      if (x === 6 || x === 24 || y === 3 || y === 14) set(x, y, { h: (x + y) % 2 ? 4 : 3, ty: 'brick' });
      else set(x, y, { ty: 'cobble' });
    });
    set(15, 14, { h: 1, ty: 'cobble' });
    rect(15, 15, 15, 19, (x, y) => set(x, y, { ty: 'spath' }));
    // 🚪 the vault (behind the if gate) with its 🪙 coins
    rect(7, 8, 12, 8, (x, y) => set(x, y, { h: 3, ty: 'brick' })); rect(12, 4, 12, 8, (x, y) => set(x, y, { h: 3, ty: 'brick' }));
    const gateDone = done.includes('ifgate');
    set(9, 8, { h: 1, ty: 'cobble', st: 'ifgate', gate: true, stack: gateDone ? [] : ['gate', 'gate'], solid: !gateDone });
    set(9, 11, { ty: 'plate', plate: true });
    set(gateDone ? 9 : 11, 11, { stack: ['crate'], solid: true, push: true, label: '📦' });
    if (!done.includes('variable')) [[8, 4], [10, 4], [8, 6], [10, 6], [9, 5]].forEach(([x, y]) => set(x, y, { icon: '🪙', collect: 'coin' }));
    set(11, 4, { stack: ['wood'], solid: true, st: 'variable' });
    // 🔁 the loop tower with its running track
    rect(18, 6, 20, 8, (x, y) => set(x, y, { ty: 'carpet' }));
    set(19, 7, { ty: 'carpet', stack: ['brick', 'brick', 'brick', 'towercap'], solid: true, st: 'loop' });
    set(19, 8, { lap: 'S', label: '▶', labelColor: '#fff' }); set(20, 7, { lap: 'E', label: '·', labelColor: '#fff' });
    set(19, 6, { lap: 'N', label: '·', labelColor: '#fff' }); set(18, 7, { lap: 'W', label: '·', labelColor: '#fff' });
    // 🎲 dice, 🔔 bell and event pads
    set(22, 11, { stack: ['dice'], solid: true, st: 'random', dice: done.includes('random') ? 6 : 1 });
    set(15, 10, { stack: ['bell'], solid: true, st: 'events' });
    [['A', 13], ['B', 15], ['shake', 17]].forEach(([e, x]) => set(x, 12, { ty: 'plate', ev: e, label: e === 'shake' ? '👋' : e, labelColor: '#fff' }));
    // 🧊 the frozen lake
    BW3_RINK.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = 2 + c, y = 16 + r;
      if (ch === '#') set(x, y, { ty: 'ice', stack: ['icerock'], solid: true });
      else if (ch === 'G') set(x, y, { ty: 'flagtile', goal: true, icon: done.includes('sequence') ? '' : '🏁' });
      else set(x, y, { ty: 'ice', ice: true });
    }));
    set(12, 17, { stack: ['wood'], solid: true, st: 'sequence' });
    // 🐞 bugs and their sign
    if (!done.includes('debug')) BW3_BUGS.forEach(([x, y]) => set(x, y, { icon: '🐞', collect: 'bug' }));
    set(18, 19, { stack: ['wood'], solid: true, st: 'debug' });
    // pine trees and snow drifts
    bwDecorate(g, { seed: 21, ground: 'snow',
      keepOut: (x, y) => (x >= 5 && x <= 25 && y >= 2 && y <= 15) || (x <= 13 && y >= 14) || (Math.abs(x - 15) <= 2 && y >= 16) || BW3_BUGS.some(([bx, by]) => Math.abs(bx - x) <= 3 && Math.abs(by - y) <= 3) || (x >= 16 && x <= 20 && y >= 17),
      place: (c, r) => { if (r < 0.12) Object.assign(c, { stack: r < 0.05 ? ['pinet', 'pine', 'pine', 'pine'] : ['pinet', 'pine', 'pine'], solid: true }); else if (r < 0.17) c.h = 2; } });
    return g;
  },

  setup({ at, map, toast, talk, isDone, P, shake }) {
    const plate = at(9, 11), gate = at(9, 8);
    const w = {
      ice: isDone('sequence'), laps: isDone('loop') ? 3 : 0, sides: new Set(), coins: isDone('variable') ? 5 : 0,
      six: isDone('random'), rolls: 0, bugs: isDone('debug') ? 4 : 0, ev: new Set(isDone('events') ? ['A', 'B', 'shake'] : []),
      boxOnPlate: () => !!plate.push,
    };
    let bugClock = 0;
    const updateGate = () => {
      const open = !!plate.push || (P.x === 9 && P.y === 11);
      if (open && gate.solid) { gate.stack = []; gate.solid = false; bwTone(392, 150); }
      if (!open && !gate.solid && !(P.x === 9 && P.y === 8)) { gate.stack = ['gate', 'gate']; gate.solid = true; bwTone(196, 150); }
      return open;
    };
    const rnd = bwRng(Date.now() & 0xffff);
    return {
      w,
      onEnter(c) {
        if (c.collect === 'coin') {
          c.collect = null; c.icon = null; w.coins++; bwTone(988, 90); setTimeout(() => bwTone(1319, 120), 90);
          toast(`🪙 <code>score = score + 1</code> → score is now <b>${w.coins}</b>`);
          if (w.coins === 5 && !isDone('variable')) { boardReact("display.scroll('5', wait=False)"); setTimeout(() => talk('variable'), 700); }
        }
        if (c.collect === 'bug') {
          c.collect = null; c.icon = null; w.bugs++; bwTone(1200, 60); bwTone(600, 120);
          toast(w.bugs >= 4 ? '🐞 All 4 bugs caught! Go to the 🐞 bug hunt sign.' : `🐞 Bug squashed! ${w.bugs}/4`);
          if (w.bugs === 4 && !isDone('debug')) setTimeout(() => talk('debug'), 900);
        }
        if (c.plate && c === plate && updateGate() && !plate.push) toast('🚪 The gate opens… but only while you stand here!');
        if (c.lap && w.laps < 3) {
          if (c.lap === 'S') {
            if (['N', 'E', 'W'].every((s) => w.sides.has(s))) {
              w.laps++; bwTone(523 + w.laps * 100, 160);
              toast(w.laps >= 3 ? '🔁 3 laps! The loop is done.' : `🔁 Lap ${w.laps}/3! Again!`);
              if (w.laps === 3 && !isDone('loop')) setTimeout(() => talk('loop'), 700);
            }
            w.sides.clear();
          } else w.sides.add(c.lap);
        }
        if (c.ev && !w.ev.has(c.ev)) {
          w.ev.add(c.ev);
          if (c.ev === 'shake') { shake(600); boardReact('display.show(Image.SURPRISED)'); toast('👋 <b>on shake</b> → the whole castle wobbles!'); }
          else { boardReact(`display.show('${c.ev}')`); toast(`🔘 <b>on button ${c.ev} pressed</b> → show "${c.ev}"`); }
          bwTone(c.ev === 'A' ? 523 : c.ev === 'B' ? 659 : 784, 300, 'sine');
          if (w.ev.size === 3 && !isDone('events')) setTimeout(() => talk('events'), 800);
        }
        if (c.goal && !w.ice) {
          w.ice = true; c.icon = ''; [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => bwTone(f, 150), i * 110));
          toast('🏁 You made it across the ice!'); if (!isDone('sequence')) setTimeout(() => talk('sequence'), 700);
        }
      },
      onLeave(c) { if (c === plate) setTimeout(updateGate, 0); },
      onPush(b, x, y, from) { if (b === plate || from === plate) { updateGate(); if (plate.push) toast('📦 The box holds the plate down. The gate stays open!'); } },
      onUse(here, front) {
        if (front?.dice) {
          w.rolls++;
          let n = 1 + Math.floor(rnd() * 6);
          if (!w.six && w.rolls >= 6) n = 6;   // don't let anyone roll forever
          front.rolling = performance.now(); front.dice = n;
          bwTone(300 + n * 60, 120);
          setTimeout(() => {
            toast(`🎲 <code>random.randint(1, 6)</code> → <b>${n}</b>${n === 6 ? '!' : ''}`);
            boardReact(`display.show('${n}')`);
            if (n === 6 && !w.six) { w.six = true; setTimeout(() => talk('random'), 600); }
          }, 450);
          return true;
        }
        return false;
      },
      reset(id) {
        if (id !== 'ifgate') return;
        map.t.forEach((tl) => { if (tl.push) Object.assign(tl, { stack: [], solid: false, push: false, label: null }); });
        bwStepAside(P, 11, 11, 12, 11);
        Object.assign(at(11, 11), { stack: ['crate'], solid: true, push: true, label: '📦' });
        updateGate(); toast('🔄 The box is back where it started.');
      },
      tick(dt, now) {   // the bugs crawl around a little
        if ((bugClock += dt) < 1300) return;
        bugClock = 0;
        map.t.forEach((c, i) => {
          if (c.collect !== 'bug' || c.moved === now || rnd() < 0.4) return;
          const x = i % map.W, y = Math.floor(i / map.W), home = BW3_BUGS.find(([hx, hy]) => Math.abs(hx - x) <= 3 && Math.abs(hy - y) <= 3);
          const [dx, dy] = Object.values(BW_DIRS)[Math.floor(rnd() * 4)];
          const n = at(x + dx, y + dy);
          if (!n || !home || Math.abs(home[0] - x - dx) > 3 || Math.abs(home[1] - y - dy) > 3) return;
          if (n.solid || n.h !== c.h || n.icon || n.collect || n.st || n.ev || n.plate || n.lap || n.ice || n.goal || (P.x === x + dx && P.y === y + dy)) return;
          Object.assign(n, { icon: '🐞', collect: 'bug', moved: now }); c.icon = null; c.collect = null;
        });
      },
      hint(here, front, k) { return front?.dice ? `${k}: roll the dice` : null; },
      drawTile(ctx, c, X, tY, now, v) {
        const { T, D } = v;
        if (c.gate && c.solid) { ctx.fillStyle = '#3d2412'; for (let i = 0; i < 4; i++) ctx.fillRect(X + 5 + i * 9, tY + 2, 3, D - 4); }
        if (c.plate) { ctx.strokeStyle = v.standing(c) || c.push ? '#3fb950' : '#5f646c'; ctx.lineWidth = 3; ctx.strokeRect(X + 4, tY + 3, T - 8, D - 6); }
        if (c.ice) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(X + 6, tY + 5, 10, 2); ctx.fillRect(X + 22, tY + 15, 8, 2); }
        if (c.dice) {
          const rolling = c.rolling && now - c.rolling < 450;
          const n = rolling ? 1 + Math.floor((now / 60) % 6) : c.dice;
          ctx.fillStyle = '#222';
          const pips = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[n];
          pips.forEach(([px, py]) => { ctx.beginPath(); ctx.arc(X + 10 + px * 10, tY + 6 + py * 7, 2.6, 0, Math.PI * 2); ctx.fill(); });
        }
      },
      drawHud(ctx, cw, ch, now, v) {
        const { P } = v;
        if (P.x >= 16 && P.x <= 22 && P.y >= 4 && P.y <= 10 && w.laps < 3) bwHudText(ctx, `🔁 Lap ${w.laps}/3  ${['N', 'E', 'W'].map((s) => (w.sides.has(s) ? '✓' : '·')).join(' ')}`);
        if (P.x >= 7 && P.x <= 11 && P.y >= 4 && P.y <= 7 && w.coins < 5) bwHudText(ctx, `score = ${w.coins}`);
      },
    };
  },
};

const BW_WORLDS = [BW1, BW2, BW3];

/* ---------------------------------------------------------------- shared bits */
const bwChips = () => { const g = games(); if (!Array.isArray(g.world)) g.world = []; return g.world; };
const bwCid = (world, id) => (world.n === 1 ? id : `w${world.n}_${id}`);
const bwFound = (world) => world.order.filter((id) => bwChips().includes(bwCid(world, id))).length;
const bwComplete = (world) => bwFound(world) === world.order.length;
const bwUnlocked = (world) => world.n === 1 || bwComplete(BW_WORLDS[world.n - 2]);
function bwSummary() { return { found: BW_WORLDS.reduce((s, wd) => s + bwFound(wd), 0), total: BW_WORLDS.reduce((s, wd) => s + wd.order.length, 0), worlds: BW_WORLDS.length }; }
// when a puzzle resets and its box goes home, move Bit off that spot first
function bwStepAside(P, x, y, toX, toY) { if (P.x === x && P.y === y) { P.x = P.fx = toX; P.y = P.fy = toY; P.t = 1; P.route = P.after = null; } }
const bwLedGrid = (fn) => `<span class="bw-grid">${Array.from({ length: 25 }, (_, i) => `<i class="${fn(i % 5, Math.floor(i / 5)) ? 'on' : ''}"></i>`).join('')}</span>`;
function bwHudText(ctx, text) {
  ctx.font = 'bold 15px ui-monospace, monospace'; const tw = ctx.measureText(text).width + 20;
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(10, 10, tw, 30);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(text, 20, 31);
}
function bwCompass(ctx, cw, angle, label) {
  const cx = cw - 44, cy = 44;
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
  ctx.fillStyle = '#d1242f'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6); ctx.fill();
  ctx.fillStyle = '#2f6fd6'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-4, -6); ctx.lineTo(-4, 6); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#222'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, cx, cy + 44);
}

/* ------------------------------------------------------------ opening + picking a world */
let bwActive = null;   // the running world, so key handlers (and tests) know

function openBlockyWorld() {
  if (typeof wardrobe !== 'undefined' && wardrobe) wardrobe.hidden = true;
  const el = arcadeFrame(); el.hidden = false; el.classList.add('arc-free', 'arc-wide');
  $('arc-title').textContent = "🌍 Bit's Blocky World"; stats('');
  bwLoading('🌍', '🧱 Stacking the blocks…', 1500, bwPicker);
}
function bwLoading(icon, title, ms, then) {
  const el = arcadeFrame();
  $('arc-body').innerHTML = `<div class="arc-loading"><div class="arc-ico big">${icon}</div><h2>${title}</h2>
    <div class="arc-loadbar"><i id="arc-load"></i></div><p class="arc-tip">Tip: walk with the arrow keys, WASD or by tapping, and press Space to use things.</p></div>`;
  const t0 = performance.now();
  const loader = setInterval(() => {
    if (el.hidden || !$('arc-load')) { clearInterval(loader); return; }
    const p = Math.min(1, (performance.now() - t0) / ms);
    $('arc-load').style.width = (p * 100) + '%';
    if (p >= 1) { clearInterval(loader); then(); }
  }, 60);
}
function bwPicker() {
  if (arcadeStop) { arcadeStop(); arcadeStop = null; }
  const s = bwSummary();
  stats(`⭐ <b>${s.found}</b>/${s.total} chips · ${BB(HS.bucks)}`);
  $('arc-body').innerHTML = `<div class="bw-pick"><h2>🗺️ Choose a world</h2>
    <p class="muted">Find every ⭐ chip in a world to unlock the next one. Each chip gives ${BW_CHIP_BUCKS} Bit Bucks, and finishing a world gives ${BW_WORLD_BUCKS} more.</p>
    <div class="bw-worlds">${BW_WORLDS.map((wd) => {
      const found = bwFound(wd), open = bwUnlocked(wd), all = found === wd.order.length;
      return `<div class="bw-wcard${open ? '' : ' locked'} bw-w${wd.n}"><span class="bw-wico">${open ? wd.emoji : '🔒'}</span>
        <b>World ${wd.n}: ${wd.name}</b><span class="muted">${wd.blurb}</span>
        <span class="bw-wprog"><i style="width:${found / wd.order.length * 100}%"></i></span>
        <span>${all ? '🏆 ' : '⭐ '}<b>${found}</b>/${wd.order.length} chips${all ? ' · complete!' : ''}</span>
        ${open ? `<button class="primary" data-world="${wd.n}">${found ? '▶ Keep exploring' : '▶ Play'}</button>` : `<span class="bw-lockmsg">🔒 Find all ${BW_WORLDS[wd.n - 2].order.length} chips in World ${wd.n - 1} to unlock</span>`}</div>`;
    }).join('')}</div></div>`;
  document.querySelectorAll('[data-world]').forEach((b) => (b.onclick = () => {
    const wd = BW_WORLDS[+b.dataset.world - 1];
    bwLoading(wd.emoji, `🧱 Building World ${wd.n}: ${wd.name}…`, 1500, () => bwPlay($('arc-body'), wd));
  }));
  $('arc-body').querySelector('[data-world]')?.focus();
}

/* ------------------------------------------------------------------ the game engine */
function bwPlay(body, world) {
  const T = 40, D = 26, BH = 18;                  // block width, top-face depth, block height (pixels)
  const chips = bwChips();
  const isDone = (id) => chips.includes(bwCid(world, id));
  const map = world.build(world.order.filter(isDone));
  const { at } = map, W = map.W, H = map.H;
  const S = world.stations, ORDER = world.order;
  const P = { x: world.spawn[0], y: world.spawn[1], fx: world.spawn[0], fy: world.spawn[1], t: 1, face: 'down', bump: 0, queue: null, route: null, after: null, slide: null, stopKey: '' };
  const touchy = matchMedia('(pointer: coarse)').matches;
  const held = [];
  let panelOpen = false, raf = 0, last = performance.now(), cam = null, toastTimer = 0, shakeUntil = 0;

  body.innerHTML = `<div class="bw-wrap"><canvas id="bw-cv" aria-label="${esc(world.name)}. Use the arrow keys to walk and Space to use things."></canvas>
      <div id="bw-toast" class="bw-toast" hidden></div><div id="bw-panel" class="bw-panel" hidden></div></div>
    <div class="bw-ctrl">
      <div class="bw-pad">${[['up', '▲', 2, 1], ['left', '◀', 1, 2], ['down', '▼', 2, 2], ['right', '▶', 3, 2]].map(([d, s, c, r]) => `<button data-dir="${d}" style="grid-column:${c};grid-row:${r}" aria-label="Walk ${d}">${s}</button>`).join('')}</div>
      <div class="bw-acts"><button class="primary" id="bw-use">✋ Use <span class="muted">(Space)</span></button><button id="bw-quests">📜 Quests <span class="muted">(Q)</span></button><button id="bw-worlds">🗺️ Worlds</button></div>
    </div>`;
  const cv = $('bw-cv'), ctx = cv.getContext('2d');
  const hud = () => stats(`${world.emoji} <b>${world.n}</b> · ⭐ <b>${bwFound(world)}</b>/${ORDER.length} · ${BB(HS.bucks)}`);
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
  const closePanel = () => { const el = $('bw-panel'); if (el) el.hidden = true; panelOpen = false; };

  const api = { map, at, toast, talk: (id) => talk(id), isDone, P, shake: (ms) => { shakeUntil = performance.now() + ms; } };
  const hooks = world.setup(api);
  const w = hooks.w;

  function talk(id) {
    const s = S[id], done = isDone(id);
    hooks.onTalk?.(id);
    const task = !done && s.task ? s.task(w) : null;
    let html = `<h3>${s.emoji} ${s.name}</h3>`;
    if (task) {
      html += `<p class="bw-task">🎯 ${task}</p>${s.extra ? s.extra(w) : ''}`;
      html += `<div class="row"><button class="primary" id="bw-ok">OK, let's do it!</button>${s.reset ? '<button id="bw-reset">🔄 Reset the puzzle</button>' : ''}</div>`;
      return panel(html, () => { $('bw-ok').onclick = closePanel; $('bw-reset')?.addEventListener('click', () => { closePanel(); hooks.reset?.(id); }); });
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
    const s = S[id], [q, right, ...wrong] = s.q;
    const opts = shuffle([right, ...wrong]);
    panel(`<h3>${s.emoji} Quiz for the ${s.name.replace(/^The /, '')} chip</h3><div class="arc-q"><b>${esc(q)}</b>
      <div class="arc-opts">${opts.map((a, k) => `<button data-k="${k}">${'ABCD'[k]}. ${esc(a)}</button>`).join('')}</div></div><div id="bw-res"></div>`, (el) => {
      el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
        el.querySelectorAll('[data-k]').forEach((x) => (x.disabled = true));
        if (opts[+b.dataset.k] === right) { b.classList.add('ok'); earn(id); }
        else {
          b.classList.add('bad');
          $('bw-res').innerHTML = '<p class="snk-msg bad">❌ Not quite! Have another look at the lesson, then try again.</p><div class="row"><button class="primary" id="bw-again">📖 Read it again</button></div>';
          $('bw-again').onclick = () => talk(id); $('bw-again').focus();
        }
      }));
    });
  }

  function earn(id) {
    if (isDone(id)) return;
    chips.push(bwCid(world, id)); HS.bucks += BW_CHIP_BUCKS;
    const all = bwComplete(world), next = BW_WORLDS[world.n];
    if (all) HS.bucks += BW_WORLD_BUCKS;
    saveHS(); hud(); confetti();
    boardReact(all ? "display.show(Image.HAPPY)\nsleep(400)\ndisplay.scroll('WORLD DONE!', wait=False)" : 'display.show(Image.YES)');
    const s = S[id];
    $('bw-res').innerHTML = `<p class="snk-msg good">🎉 Right! ${esc(s.why)}</p><p class="bw-have">⭐ You got the <b>${s.name.replace(/^The /, '')}</b> chip! +${BW_CHIP_BUCKS} Bit Bucks</p>
      ${all ? `<p class="bw-have big">🏆 You found <b>all ${ORDER.length} chips</b> in ${world.name}! +${BW_WORLD_BUCKS} bonus Bit Bucks!</p>
        <p>${next ? `🔓 <b>World ${next.n}: ${next.name}</b> is unlocked!` : '🎓 You finished <b>every world</b>. You\'re a micro:bit expert!'}</p>`
        : `<p class="muted">${ORDER.length - bwFound(world)} chips to go. Press Q to see where.</p>`}
      <div class="row"><button class="primary" id="bw-ok">Keep exploring</button>${all && next ? `<button id="bw-next">${next.emoji} Go to World ${next.n}</button>` : ''}</div>`;
    $('bw-ok').onclick = closePanel; $('bw-ok').focus();
    $('bw-next')?.addEventListener('click', () => { if (arcadeStop) { arcadeStop(); arcadeStop = null; } bwLoading(next.emoji, `🧱 Building World ${next.n}: ${next.name}…`, 1500, () => bwPlay($('arc-body'), next)); });
  }

  function quests() {
    panel(`<h3>📜 ${world.emoji} World ${world.n} quests: ⭐ ${bwFound(world)}/${ORDER.length}</h3><ul class="bw-quests">${ORDER.map((id) => {
      const s = S[id], done = isDone(id);
      return `<li class="${done ? 'done' : ''}">${done ? '⭐' : '◻️'} ${s.emoji} <b>${s.name}</b> <span class="muted">${done ? 'done!' : world.hints[id]}</span></li>`;
    }).join('')}</ul><p class="muted">Look for the floating signs. Walk up to one and press Space, or tap it.</p>`);
  }

  /* --- moving --- */
  const canWalk = (x0, y0, x1, y1) => {
    const a = at(x0, y0), b = at(x1, y1);
    return !!b && !b.solid && b.h > 0 && Math.abs(b.h - a.h) <= 1;
  };
  function step(dir) {
    const [dx, dy] = BW_DIRS[dir]; P.face = dir;
    const nx = P.x + dx, ny = P.y + dy, tgt = at(nx, ny), cur = at(P.x, P.y);
    if (tgt && tgt.push && tgt.solid) {   // push a box
      const b = at(nx + dx, ny + dy);
      if (!b || b.solid || b.h !== tgt.h || b.h === 0 || b.icon || Math.abs(tgt.h - cur.h) > 1) { P.bump = performance.now(); return false; }
      Object.assign(b, { stack: tgt.stack, solid: true, push: true, label: tgt.label, labelColor: tgt.labelColor });
      Object.assign(tgt, { stack: [], solid: false, push: false, label: null });
      bwTone(140, 90, 'triangle');
      hooks.onPush?.(b, nx + dx, ny + dy, tgt);
    }
    if (!canWalk(P.x, P.y, nx, ny)) { P.bump = performance.now(); return false; }
    hooks.onLeave?.(cur);
    P.fx = P.x; P.fy = P.y; P.x = nx; P.y = ny; P.t = 0;
    return true;
  }
  function onEnter() {
    const c = at(P.x, P.y);
    if (c.ice) { P.slide = P.face; P.route = P.after = null; } else P.slide = null;
    hooks.onEnter?.(c);
  }
  function use() {
    if (panelOpen) return;
    const [dx, dy] = BW_DIRS[P.face];
    const here = at(P.x, P.y), front = at(P.x + dx, P.y + dy);
    if (hooks.onUse?.(here, front)) return;
    if (front?.push) { step(P.face); return; }
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
    const bob = P.slide ? 0 : moving ? Math.abs(Math.sin(now / 70)) * 3 : Math.sin(now / 400);
    x += now - P.bump < 200 ? Math.sin(now / 15) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    const by = y - bob;
    ctx.fillStyle = dark; ctx.fillRect(x - 9, by - 7, 7, 6); ctx.fillRect(x + 2, by - 7, 7, 6);
    ctx.fillStyle = bc; ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.fillRect(x - 11, by - 22, 22, 16); ctx.strokeRect(x - 11, by - 22, 22, 16);
    ctx.fillStyle = glow; ctx.fillRect(x - 3, by - 17, 6, 6);
    ctx.fillStyle = bc; ctx.fillRect(x - 13, by - 44, 26, 22); ctx.strokeRect(x - 13, by - 44, 26, 22);
    if (P.face !== 'up') {
      ctx.fillStyle = '#1b1f24'; ctx.fillRect(x - 10, by - 41, 20, 15);
      const ox = P.face === 'left' ? -3 : P.face === 'right' ? 3 : 0;
      ctx.fillStyle = glow; ctx.fillRect(x - 7 + ox, by - 37, 4, 5); ctx.fillRect(x + 3 + ox, by - 37, 4, 5);
    }
    ctx.strokeStyle = dark; ctx.beginPath(); ctx.moveTo(x, by - 44); ctx.lineTo(x, by - 52); ctx.stroke();
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, by - 54, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  const view = {
    T, D, BH, P,
    standing: (c) => at(P.x, P.y) === c && P.t >= 1,
    screen: (x, y, z) => [x * T - cam.x, y * D - z * BH - cam.y],
    near: () => false, px: 0, py: 0,
  };

  function drawColumn(x, y, now, cw, ch) {
    const c = at(x, y), X = x * T - cam.x, Y = y * D - cam.y;
    const layers = c.h + c.stack.length;
    if (X < -T || X > cw || Y + D < -10 || Y - layers * BH > ch + 10) return;
    if (c.h === 0) {   // water, chasm, hot spring
      ctx.fillStyle = BW_COL[c.ty][0]; ctx.fillRect(X, Y, T, D);
      if (c.ty !== 'chasm') { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(X + ((now / 45 + x * 7 + y * 13) % (T - 8)), Y + 8 + (y % 2) * 8, 8, 2); }
      if (c.ty === 'hot') { ctx.fillStyle = 'rgba(255,255,255,.35)'; const p = ((now / 30 + x * 40) % 40); ctx.beginPath(); ctx.arc(X + T / 2 + Math.sin(now / 300 + x) * 6, Y - p, 4 + p / 10, 0, Math.PI * 2); ctx.fill(); }
      return;
    }
    for (let z = 0; z < layers; z++) {
      const ty = z < c.h ? c.ty : c.stack[z - c.h];
      const top = Y - (z + 1) * BH;
      ctx.fillStyle = BW_COL[ty][1]; ctx.fillRect(X, top + D, T, BH);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(X, top + D + BH - 2, T, 2);
    }
    const topTy = layers > c.h ? c.stack[c.stack.length - 1] : c.ty;
    const tY = Y - layers * BH;
    ctx.fillStyle = BW_COL[topTy][0]; ctx.fillRect(X, tY, T, D);
    ctx.strokeStyle = 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, tY + 0.5, T - 1, D - 1);
    if (topTy === 'leaves' || topTy === 'pine') { ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(X + 6, tY + 4, 8, 6); ctx.fillRect(X + 24, tY + 12, 8, 6); }
    if (topTy === 'pine') { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(X + 4, tY + 2, T - 8, 5); }
    if (topTy === 'crate') { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.strokeRect(X + 4, tY + 3, T - 8, D - 6); }
    view.near = (r) => Math.abs(P.x - x) + Math.abs(P.y - y) <= r;
    hooks.drawTile?.(ctx, c, X, tY, now, view);
    if (c.label) { ctx.fillStyle = c.labelColor || '#e8c04a'; ctx.font = 'bold 12px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(c.label, X + T / 2, tY + D / 2 + 4); }
    if (c.icon) { ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.fillText(c.icon, X + T / 2, tY + D / 2 + 4 + Math.sin(now / 250 + x + y) * 2.5); }
  }

  function draw(now) {
    const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, ch = cv.clientHeight;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const e = P.t < 1 ? (P.slide ? P.t : P.t * (2 - P.t)) : 1;
    const px = P.fx + (P.x - P.fx) * e, py = P.fy + (P.y - P.fy) * e;
    const pz = at(P.fx, P.fy).h + (at(P.x, P.y).h - at(P.fx, P.fy).h) * e;
    view.px = px; view.py = py;
    const want = { x: px * T + T / 2 - cw / 2, y: py * D - pz * BH - ch / 2 + D };
    cam = cam ? { x: cam.x + (want.x - cam.x) * 0.15, y: cam.y + (want.y - cam.y) * 0.15 } : want;
    const shaking = now < shakeUntil;
    if (shaking) { cam = { x: cam.x + Math.sin(now / 20) * 6, y: cam.y + Math.cos(now / 17) * 4 }; }
    ctx.fillStyle = BW_COL[world.sea][0]; ctx.fillRect(0, 0, cw, ch);
    const prow = Math.max(P.y, P.fy);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) drawColumn(x, y, now, cw, ch);
      if (y === prow) drawBit(px * T + T / 2 - cam.x, py * D - pz * BH + D / 2 - cam.y, now, P.t < 1);
    }
    if (P.dest && P.route) {   // where Bit is walking to
      const [dx, dy] = P.dest, c = at(dx, dy), X = dx * T - cam.x, tY = dy * D - (c.h + c.stack.length) * BH - cam.y;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + Math.sin(now / 120) * 0.3; ctx.strokeRect(X + 3, tY + 3, T - 6, D - 6); ctx.globalAlpha = 1;
    }
    hooks.drawOver?.(ctx, now, view);
    for (const id of ORDER) {   // floating station signs (drawn last so they're always visible)
      const s = S[id];
      for (const m of [s.marker, s.marker2].filter(Boolean)) {
        const c = at(m[0], m[1]), X = m[0] * T + T / 2 - cam.x, Y = m[1] * D - (c.h + c.stack.length) * BH - cam.y - 14 + Math.sin(now / 350 + m[0]) * 3;
        if (X < -40 || X > cw + 40 || Y < -40 || Y > ch + 40) continue;
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(X, Y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = isDone(id) ? '#e3b341' : '#2f81f7'; ctx.lineWidth = 3; ctx.stroke();
        ctx.font = '17px system-ui'; ctx.textAlign = 'center'; ctx.fillText(s.emoji, X, Y + 6);
        if (isDone(id)) { ctx.font = '12px system-ui'; ctx.fillText('⭐', X + 13, Y - 9); }
      }
    }
    hooks.drawHud?.(ctx, cw, ch, now, view);
    if (!panelOpen && P.t >= 1 && !P.slide) {   // a "press Space" hint next to things you can use
      const [dx, dy] = BW_DIRS[P.face], here = at(P.x, P.y), front = at(P.x + dx, P.y + dy);
      const k = touchy ? 'Tap ✋' : 'Space';
      const st = here.st || front?.st;
      const hint = hooks.hint?.(here, front, k) || (front?.push ? 'Walk into the box to push it' : st ? `${k}: ${S[st].name}` : '');
      if (hint) {
        ctx.font = 'bold 14px system-ui'; const tw = ctx.measureText(hint).width + 24;
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(cw / 2 - tw / 2, ch - 44, tw, 30);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(hint, cw / 2, ch - 24);
      }
    }
  }

  function frame(now) {
    const dt = Math.min(120, now - last); last = now;
    if (P.t < 1) { P.t = Math.min(1, P.t + dt / (P.slide ? 85 : 150)); if (P.t >= 1) onEnter(); }
    if (P.t >= 1 && P.slide) { if (!step(P.slide)) P.slide = null; }
    else if (P.t >= 1 && P.route && !panelOpen) {   // walking to a tapped spot
      if (P.route.length) { const sx = P.x, sy = P.y; step(P.route.shift()); if (P.x === sx && P.y === sy) P.route = P.after = null; }
      else { const after = P.after; P.route = P.after = null; if (after) { P.face = after; use(); } }
    } else if (P.t >= 1 && P.queue && !panelOpen) { step(P.queue); P.queue = null; }
    else if (P.t >= 1 && held.length && !panelOpen) step(held[held.length - 1]);
    // standing still on a tile for a moment (for pads you have to stop on, not just walk across)
    if (P.t >= 1 && !P.slide && !P.route && !held.length && !P.queue) {
      const key = P.x + ',' + P.y;
      if (key !== P.stopKey) {
        if (!P.stopAt) P.stopAt = now;
        else if (now - P.stopAt > 350) { P.stopKey = key; P.stopAt = 0; hooks.onStop?.(at(P.x, P.y)); }
      }
    } else { P.stopAt = 0; if (P.t < 1) P.stopKey = ''; }
    hooks.tick?.(dt, now);
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
    if (dir) {
      e.preventDefault(); P.route = P.after = null;
      if (!held.includes(dir)) held.push(dir);
      if (!e.repeat && !P.slide) { if (P.t >= 1) step(dir); else P.queue = dir; }
      return;
    }
    if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat && !P.slide) use(); }
    else if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); quests(); }
  };
  const onKeyUp = (e) => { const dir = KEYS[e.key]; if (dir) { const i = held.indexOf(dir); if (i >= 0) held.splice(i, 1); } };
  const onBlur = () => { held.length = 0; };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  body.querySelectorAll('[data-dir]').forEach((b) => {
    const dir = b.dataset.dir;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); P.route = P.after = null; if (!held.includes(dir)) held.push(dir); if (P.t >= 1 && !panelOpen && !P.slide) step(dir); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => { const i = held.indexOf(dir); if (i >= 0) held.splice(i, 1); }));
  });
  // tap (or click) the world: walk there, and use whatever you tapped when you arrive
  function tileAt(mx, my) {
    for (let y = H - 1; y >= 0; y--) for (let x = 0; x < W; x++) {   // front rows cover back rows
      const c = at(x, y), X = x * T - cam.x, Y = y * D - cam.y, top = Y - (c.h + c.stack.length) * BH;
      if (mx >= X && mx < X + T && my >= top && my < Y + D) return [x, y];
    }
    return null;
  }
  function markerAt(mx, my) {
    for (const id of ORDER) for (const m of [S[id].marker, S[id].marker2].filter(Boolean)) {
      const c = at(m[0], m[1]), X = m[0] * T + T / 2 - cam.x, Y = m[1] * D - (c.h + c.stack.length) * BH - cam.y - 14;
      if ((mx - X) ** 2 + (my - Y) ** 2 < 20 ** 2) return m;
    }
    return null;
  }
  function routeTo(goal) {   // shortest walk to any of the goal tiles
    const key = (x, y) => x + ',' + y, prev = new Map([[key(P.x, P.y), null]]), q = [[P.x, P.y]], goals = new Set(goal.map(([x, y]) => key(x, y)));
    while (q.length) {
      const [x, y] = q.shift();
      if (goals.has(key(x, y))) { const steps = []; let k = key(x, y); while (prev.get(k)) { const [px, py, d] = prev.get(k); steps.unshift(d); k = key(px, py); } return steps; }
      for (const [d, [dx, dy]] of Object.entries(BW_DIRS)) {
        const nx = x + dx, ny = y + dy;
        if (prev.has(key(nx, ny)) || !canWalk(x, y, nx, ny)) continue;
        prev.set(key(nx, ny), [x, y, d]); q.push([nx, ny]);
      }
    }
    return null;
  }
  // pointerup (not click): taps on touch screens with touch-action:none don't always make a click
  let downAt = null;
  cv.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', (e) => {
    const moved = downAt ? Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) : 0; downAt = null;
    if (panelOpen || moved > 14 || P.slide) return;
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const hit = markerAt(mx, my) || tileAt(mx, my);
    if (!hit) return;
    const [x, y] = hit, c = at(x, y);
    if (x === P.x && y === P.y) { P.route = P.after = null; use(); return; }
    const usable = c.solid || c.lever;
    if (!usable && c.h > 0) {
      const steps = routeTo([[x, y]]);
      if (steps) { P.route = steps; P.after = null; P.dest = [x, y]; } else toast("Bit can't get there from here.");
      return;
    }
    if (!usable) return;   // water
    // a sign, lever, box, tower…: walk next to it, then face it and use it
    const parts = c.st ? map.t.map((tl, i) => [i % W, Math.floor(i / W), tl]).filter(([, , tl]) => tl.st === c.st && tl.solid) : [[x, y]];
    const sides = parts.flatMap(([px, py]) => Object.entries(BW_DIRS).map(([d, [dx, dy]]) => [px - dx, py - dy, d]))
      .filter(([nx, ny]) => at(nx, ny) && !at(nx, ny).solid && at(nx, ny).h > 0);
    let best = null;
    for (const [nx, ny, d] of sides) {
      const steps = nx === P.x && ny === P.y ? [] : routeTo([[nx, ny]]);
      if (steps && (!best || steps.length < best[0].length)) best = [steps, d];
    }
    if (best) { P.route = best[0]; P.after = best[1]; P.dest = [x, y]; } else toast("Bit can't reach that.");
  });
  $('bw-use').onclick = use;
  $('bw-quests').onclick = quests;
  $('bw-worlds').onclick = bwPicker;

  bwActive = { world, map, P, w, hooks, talk, use, step, chips, isDone };
  arcadeStop = () => {
    cancelAnimationFrame(raf); bwActive = null;
    window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true); window.removeEventListener('blur', onBlur);
  };
  raf = requestAnimationFrame(frame);

  if (!bwFound(world)) {
    const intro = {
      1: `You're <b>${esc(HS.name || 'Bit')}</b>, standing on a <b>giant micro:bit</b> island. Explore it to find all <b>${ORDER.length} ⭐ chips</b>. Each one teaches you a part of the micro:bit.`,
      2: `Welcome to <b>Circuit Canyon</b>, a desert full of copper wires! Find all <b>${ORDER.length} ⭐ chips</b> to learn about electricity, pins and sound. Some puzzles need you to <b>push blocks</b> or <b>stop on pads</b>.`,
      3: `Welcome to <b>Code Castle</b>! Find all <b>${ORDER.length} ⭐ chips</b> to learn the big ideas of coding. Watch out: the lake is <b>slippery</b>, and there are <b>bugs</b> on the loose!`,
    }[world.n];
    panel(`<h3>${world.emoji} World ${world.n}: ${world.name}</h3><p>${intro} Each chip gives you ${BW_CHIP_BUCKS} Bit Bucks, and finishing the world gives ${BW_WORLD_BUCKS} more.</p>
      ${touchy ? '<p>👆 <b>Tap</b> where you want to go, or use the ▲◀▼▶ buttons. Tap a floating sign (or press ✋ Use next to it) to visit it. 📜 Quests shows what\'s left.</p>' : '<p>🕹️ Walk with the <b>arrow keys</b>, <b>WASD</b> or the ▲◀▼▶ buttons, or click where you want to go. Press <b>Space</b> (or ✋ Use) next to a floating sign. Press <b>Q</b> for your quest list.</p>'}
      <div class="row"><button class="primary" id="bw-ok">Let's explore!</button></div>`, () => { $('bw-ok').onclick = closePanel; });
  } else toast(`👋 Welcome back to ${world.name}! ⭐ ${bwFound(world)}/${ORDER.length} chips found.${bwComplete(world) ? '' : ' Press Q for quests.'}`, 3500);
}
