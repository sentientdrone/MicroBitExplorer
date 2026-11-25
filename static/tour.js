/* Guided tour of the connected micro:bit v1: explains each part and reads it live.
 * Uses the serial/REPL helpers from app.js (port, rawExec, serialConnect, ...). */
'use strict';

const isV15 = () => boardId === '9901';
const boardName = () => BOARDS[boardId] || 'micro:bit v1';
const MB = 'from microbit import *\n';

/* ---------------------------------------------------- board picture */
const BOARD_SVG = (() => {
  let leds = '';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    leds += `<rect class="led" data-i="${r * 5 + c}" x="${103 + c * 21}" y="${48 + r * 21}" width="8" height="13" rx="2"/>`;
  }
  // edge connector: 5 big pads with small strips in between
  const pads = [['0', 18], ['1', 76], ['2', 134], ['3V', 192], ['GND', 250]];
  let edge = '';
  for (let x = 14; x < 290; x += 6.4) edge += `<rect class="strip" x="${x}" y="196" width="3.4" height="30"/>`;
  for (const [label, x] of pads) {
    const g = label === '3V' || label === 'GND' ? 't-power' : 't-pin' + label;
    edge += `<g id="${g}" class="pad"><rect x="${x}" y="186" width="34" height="44" rx="4"/>` +
      `<circle cx="${x + 17}" cy="201" r="7" class="hole"/><text x="${x + 17}" y="224">${label}</text></g>`;
  }
  return `<svg viewBox="0 0 302 240" class="tour-board" aria-label="micro:bit front">
    <rect id="t-board" x="6" y="6" width="290" height="228" rx="20" class="pcb"/>
    <text x="151" y="30" class="silk">micro:bit</text>
    <g id="t-btnA" class="btn"><rect x="22" y="88" width="44" height="44" rx="6"/><circle cx="44" cy="110" r="13"/><text x="44" y="150">A</text></g>
    <g id="t-btnB" class="btn"><rect x="236" y="88" width="44" height="44" rx="6"/><circle cx="258" cy="110" r="13"/><text x="258" y="150">B</text></g>
    <g id="t-leds">${leds}</g>
    <g id="t-edge">${edge}</g>
  </svg>`;
})();

/* ------------------------------------------------------------ steps */
const tile = (id, label) => `<div class="tour-tile"><span>${label}</span><b id="${id}">–</b></div>`;
const bar = (id, label) => `<div class="tour-bar"><span>${label}</span><div><i id="${id}"></i></div><b id="${id}-v">–</b></div>`;
const setBar = (id, v, max = 2048, oneSided = false) => {
  const el = $(id); if (!el) return;
  if (oneSided) { el.style.left = '0'; el.style.width = Math.max(0, Math.min(1, v / max)) * 100 + '%'; }
  else {
    const pct = Math.max(-1, Math.min(1, v / max)) * 50;
    el.style.left = (pct < 0 ? 50 + pct : 50) + '%'; el.style.width = Math.abs(pct) + '%';
  }
  $(id + '-v').textContent = v;
};
const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
const HEART = '01010:11111:11111:01110:00100';

const STEPS = [
  {
    title: '👋 Meet your micro:bit',
    hl: ['t-board'],
    html: () => `
      <p>This tour walks through every part of your <b>${boardName()}</b>. Each step explains a part, then
        reads it <b>live</b> from the board, so you can press, shake and touch things and see what happens.</p>
      <div class="tour-tiles">${tile('t-model', 'Board')}${tile('t-fw', 'USB interface firmware')}
        ${tile('t-mp', 'MicroPython')}${tile('t-ram', 'Free memory')}${tile('t-files', 'Files stored')}</div>
      <p class="tour-note">The brain is a Nordic <b>nRF51822</b> chip: a 16 MHz ARM Cortex‑M0 with 256 KB of flash for
        programs and 16 KB of RAM. That's tiny! A phone has about 500,000 times more memory.</p>`,
    enter() {
      set('t-model', boardName());
      const fw = drives[0]?.details?.['Interface Version'];
      set('t-fw', fw ? 'DAPLink ' + fw : (usbDevice ? 'DAPLink (connected)' : 'unknown'));
    },
    once: true,
    poll: "import os, gc\ngc.collect()\nprint(os.uname().version)\nprint(gc.mem_free())\nn=0\nfor f in os.listdir():\n n+=os.size(f)\nprint(len(os.listdir()), n)",
    render(lines) {
      const m = (lines[0] || '').match(/micro:bit (v[\d.]+)/);
      set('t-mp', m ? m[1] : (lines[0] || '?').slice(0, 30));
      set('t-ram', `${(+lines[1] / 1024).toFixed(1)} KB of 16 KB`);
      const [count, bytes] = (lines[2] || '0 0').split(' ');
      set('t-files', `${count} file(s), ${(+bytes / 1024).toFixed(1)} KB`);
    },
  },
  {
    title: '💡 The LED screen',
    hl: ['t-leds'],
    html: () => `
      <p>The screen is <b>25 red LEDs</b> in a 5 × 5 grid. Each one has 10 brightness levels, from 0 (off) to 9 (brightest).
        Positions go from x = 0 (left) to 4 (right) and y = 0 (top) to 4 (bottom).</p>
      <p>It can show pictures, scroll words, and draw single dots. Try it:</p>`,
    actions: [
      ['❤️ Show a heart', MB + 'display.show(Image.HEART)', HEART],
      ['🔤 Scroll “Hello!”', MB + "display.scroll('Hello!', wait=False)"],
      ['🌗 Brightness levels', MB + 'display.clear()\nfor i in range(10):\n display.set_pixel(i % 5, i // 5, i)', '01234:56789:00000:00000:00000'],
      ['⬛ Clear', MB + 'display.clear()', '00000:00000:00000:00000:00000'],
    ],
  },
  {
    title: '🔘 Buttons A and B',
    hl: ['t-btnA', 't-btnB'],
    html: () => `
      <p>Two buttons on the front, <b>A</b> on the left and <b>B</b> on the right. Programs can check whether a button
        is held down, count how many times it was pressed, or react when both are pressed together (A+B).</p>
      <p><b>Try it:</b> press A, then B, then both.</p>
      <div class="tour-tiles">${tile('t-a', 'Button A')}${tile('t-b', 'Button B')}${tile('t-ab', 'A+B together')}</div>
      <p class="tour-note">There's a third button on the back next to the USB socket: <b>reset</b>. It restarts your program.</p>`,
    poll: MB + 'print(int(button_a.is_pressed()), int(button_b.is_pressed()))',
    render([l]) {
      const [a, b] = l.split(' ');
      this.seen = this.seen || {};
      if (a === '1') this.seen.a = 1; if (b === '1') this.seen.b = 1; if (a === '1' && b === '1') this.seen.ab = 1;
      set('t-a', a === '1' ? '⬇ pressed' : this.seen.a ? '✅ tried' : 'not yet');
      set('t-b', b === '1' ? '⬇ pressed' : this.seen.b ? '✅ tried' : 'not yet');
      set('t-ab', a === '1' && b === '1' ? '⬇ both!' : this.seen.ab ? '✅ tried' : 'not yet');
      $('t-btnA').classList.toggle('down', a === '1'); $('t-btnB').classList.toggle('down', b === '1');
    },
  },
  {
    title: '📈 Accelerometer (motion)',
    hl: ['t-board'],
    html: () => `
      <p>A motion sensor on the back measures pushes and tilts in three directions: <b>x</b> (left/right),
        <b>y</b> (forward/back) and <b>z</b> (up/down). Gravity always pulls, so lying flat, z reads about −1000 (1 g).</p>
      <p>It also spots <b>gestures</b>: shake, tilt left/right, logo up/down, screen up/down and free fall.
        <b>Try it:</b> tilt, flip and shake the micro:bit.</p>
      ${bar('t-ax', 'x')}${bar('t-ay', 'y')}${bar('t-az', 'z')}
      <div class="tour-tiles">${tile('t-gest', 'Gesture now')}${tile('t-gseen', 'Gestures you found')}</div>
      <p class="tour-note">Chip: ${isV15() ? 'ST LSM303AGR or NXP FXOS8700 (motion and compass in one chip)' : 'NXP MMA8652'}.</p>`,
    poll: MB + "print(accelerometer.get_x(), accelerometer.get_y(), accelerometer.get_z(), accelerometer.current_gesture() or '-')",
    render([l]) {
      const p = l.split(' '); const g = p.slice(3).join(' ');
      setBar('t-ax', +p[0]); setBar('t-ay', +p[1]); setBar('t-az', +p[2]);
      set('t-gest', g === '-' ? '—' : g);
      this.seen = this.seen || new Set();
      if (g && g !== '-') this.seen.add(g);
      set('t-gseen', this.seen.size ? `${this.seen.size}/11: ${[...this.seen].join(', ')}` : 'none yet');
    },
  },
  {
    title: '🧭 Compass (magnetometer)',
    hl: ['t-board'],
    html: () => `
      <p>The magnetometer feels <b>magnetic fields</b>: the Earth's (so it works as a compass) and magnets nearby.
        <b>Try it:</b> bring a fridge magnet close and watch the strength jump.</p>
      <p>To point north it needs a one-time <b>calibration</b>: press the button below, then tilt the micro:bit
        around until every LED is lit.</p>
      ${bar('t-mag', 'strength')}
      <div class="tour-tiles">${tile('t-head', 'Heading')}${tile('t-cal', 'Calibrated')}</div>
      <p class="tour-note">Chip: ${isV15() ? 'shared with the accelerometer (LSM303AGR / FXOS8700)' : 'NXP MAG3110'}.
        Heading: 0° = North, 90° = East, 180° = South, 270° = West.</p>`,
    actions: [['🎯 Calibrate now (tilt to fill the screen)', MB + 'compass.calibrate()\ndisplay.show(Image.YES)', null, 120000]],
    poll: MB + 'c = compass.is_calibrated()\nprint(compass.get_field_strength(), int(c), compass.heading() if c else -1)',
    render([l]) {
      const [s, c, h] = l.split(' ').map(Number);
      setBar('t-mag', s, 150000, true);
      set('t-cal', c ? '✅ yes' : 'not yet');
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      set('t-head', h < 0 ? 'calibrate first' : `${h}° ${dirs[Math.round(h / 45) % 8]}`);
    },
  },
  {
    title: '🌡️ Temperature',
    hl: ['t-board'],
    html: () => `
      <p>The processor has a <b>temperature sensor</b> built in. It measures the chip itself, which is usually
        a few degrees warmer than the room. <b>Try it:</b> hold the micro:bit in your hand for a minute.</p>
      <div class="tour-tiles tour-big">${tile('t-tc', 'Celsius')}${tile('t-tf', 'Fahrenheit')}</div>
      <div class="tour-tiles">${tile('t-tmin', 'Lowest seen')}${tile('t-tmax', 'Highest seen')}</div>`,
    actions: [['📟 Show it on the micro:bit in °F', MB + "display.scroll(str(round(temperature() * 9 / 5 + 32)) + 'F', wait=False)"]],
    poll: MB + 'print(temperature())',
    render([l]) {
      const c = +l;
      this.min = Math.min(this.min ?? c, c); this.max = Math.max(this.max ?? c, c);
      set('t-tc', `${c} °C`); set('t-tf', `${cToF(c)} °F`);
      set('t-tmin', `${this.min} °C / ${cToF(this.min)} °F`); set('t-tmax', `${this.max} °C / ${cToF(this.max)} °F`);
    },
  },
  {
    title: '☀️ Light sensing',
    hl: ['t-leds'],
    html: () => `
      <p>There's no separate light sensor: the micro:bit cleverly runs its <b>LEDs backwards</b> to measure light!
        The level goes from 0 (dark) to 255 (bright).</p>
      <p><b>Try it:</b> cover the screen with your hand, then shine a torch on it.</p>
      ${bar('t-light', 'light', 510)}`,
    poll: MB + 'print(display.read_light_level())',
    render([l]) { setBar('t-light', +l, 255, true); },
  },
  {
    title: '📌 Pins and touch',
    hl: ['t-pin0', 't-pin1', 't-pin2', 't-power'],
    html: () => `
      <p>The gold strip along the bottom is the <b>edge connector</b>. The five big rings take crocodile clips:
        <b>0, 1, 2</b> are inputs/outputs, <b>3V</b> gives power and <b>GND</b> is ground. The thin strips are extra pins
        for add-on boards.</p>
      <p>Pins 0, 1 and 2 also work as <b>touch sensors</b>. <b>Try it:</b> hold GND with one hand and touch 0, 1 or 2
        with the other.</p>
      <div class="tour-tiles">${tile('t-p0', 'Pin 0')}${tile('t-p1', 'Pin 1')}${tile('t-p2', 'Pin 2')}</div>
      <p class="tour-note">Pins can also read dials (analog read, 0–1023), switch LEDs on and off, and drive servo motors.</p>`,
    poll: MB + 'print(int(pin0.is_touched()), int(pin1.is_touched()), int(pin2.is_touched()))',
    render([l]) {
      l.split(' ').forEach((t, i) => {
        set('t-p' + i, t === '1' ? '👆 touched' : '—');
        $('t-pin' + i)?.classList.toggle('down', t === '1');
      });
    },
  },
  {
    title: '🎵 Sound',
    hl: ['t-pin0', 't-power'],
    html: () => `
      <p>The micro:bit v1 has <b>no built-in speaker</b>. To hear music, clip headphones or a small speaker to
        <b>pin 0</b> and <b>GND</b>. Then it can play tunes, notes and sound effects.</p>`,
    actions: [
      ['🎂 Play “Happy Birthday”', 'import music\nmusic.play(music.BIRTHDAY, wait=False)'],
      ['⬆ Power-up sound', 'import music\nmusic.play(music.POWER_UP, wait=False)'],
      ['🔇 Stop', 'import music\nmusic.stop()'],
    ],
  },
  {
    title: '📡 Radio',
    hl: ['t-board'],
    html: () => `
      <p>The nRF51822 chip has a <b>2.4 GHz radio</b>. With MicroPython, micro:bits nearby can send each other messages
        (about 10–20 metres). Put them in the same <b>group</b> (0–255) to talk, or different groups to stay private.</p>
      <p>The same radio can do Bluetooth, but MicroPython uses it for the simple micro:bit-to-micro:bit radio instead.</p>
      <p class="tour-note">Try the “Radio chat” example in the 🧩 Blocks tab with two micro:bits.</p>`,
  },
  {
    title: '🔌 Power, USB and the back',
    hl: ['t-power'],
    html: () => `
      <p>Turn the micro:bit over. You'll find:</p>
      <ul>
        <li><b>Micro‑USB socket</b>: power and the link to this computer.</li>
        <li><b>Battery socket</b>: plug in 2 × AAA batteries (3 V) so programs run without a computer.</li>
        <li><b>Reset button</b>: restarts the program.</li>
        <li><b>Yellow LED</b>: flashes while data is moving over USB, for example when you flash a program.</li>
        <li>A second chip (NXP KL26) running <b>DAPLink</b>. It makes the <code>MICROBIT</code> drive appear, flashes
          programs, and carries the serial link this page uses.</li>
      </ul>
      <p class="tour-note">Your board: ${boardName()}, DAPLink ${drives[0]?.details?.['Interface Version'] || '(version unknown)'}.
        Programs saved as <b>main.py</b> start on their own whenever the micro:bit powers up.</p>`,
  },
  {
    title: '🚀 Your turn!',
    hl: ['t-board'],
    html: () => `
      <p>That's everything on your micro:bit: the LED screen, buttons, motion sensor, compass, thermometer,
        light sensing, touch pins, sound, radio and power.</p>
      <p>Now build something! Open the <b>🧩 Blocks</b> tab and try an example from the 📚 menu: the spirit level,
        magnet detector or night light use the sensors you just met.</p>
      <div class="tour-actions"><button class="primary" id="t-go-blocks">🧩 Open Blocks</button></div>`,
    enter() { $('t-go-blocks').onclick = () => { closeTour(); showView('blocks'); }; },
  },
];

/* ---------------------------------------------------------- runner */
let stepIdx = 0, pollToken = 0, tourEl = null;

function buildTour() {
  tourEl = document.createElement('div');
  tourEl.className = 'tour-overlay'; tourEl.hidden = true;
  tourEl.innerHTML = `
    <div class="tour" role="dialog" aria-modal="true" aria-labelledby="t-title">
      <div class="tour-pic">${BOARD_SVG}<div class="tour-step-no" id="t-no"></div></div>
      <div class="tour-body">
        <h2 id="t-title"></h2>
        <div id="t-content"></div>
        <div class="tour-actions" id="t-actions"></div>
        <div class="tour-live" id="t-live"></div>
      </div>
      <div class="tour-foot">
        <button id="t-close">Close</button>
        <div class="tour-dots" id="t-dots"></div>
        <button id="t-prev">← Back</button><button id="t-next" class="primary">Next →</button>
      </div>
    </div>`;
  document.body.appendChild(tourEl);
  $('t-close').onclick = closeTour;
  $('t-prev').onclick = () => go(stepIdx - 1);
  $('t-next').onclick = () => (stepIdx === STEPS.length - 1 ? closeTour() : go(stepIdx + 1));
  tourEl.addEventListener('click', (e) => { if (e.target === tourEl) closeTour(); });
  document.addEventListener('keydown', (e) => {
    if (tourEl.hidden) return;
    if (e.key === 'Escape') closeTour();
    if (e.key === 'ArrowRight') go(stepIdx + 1);
    if (e.key === 'ArrowLeft') go(stepIdx - 1);
  });
  STEPS.forEach((s, i) => {
    const d = document.createElement('button'); d.title = s.title; d.onclick = () => go(i); $('t-dots').appendChild(d);
  });
}

function showLeds(pattern) {
  const bits = pattern.replace(/:/g, '');
  document.querySelectorAll('.tour-board .led').forEach((el, i) => {
    const v = +bits[i]; el.style.opacity = v ? 0.35 + v * 0.072 : ''; el.classList.toggle('on', v > 0);
  });
}

function liveMsg(html, kind) { const el = $('t-live'); el.innerHTML = html; el.className = 'tour-live' + (kind ? ' ' + kind : ''); }

function liveError(e) {
  if (NO_MP.test(e.message)) {
    liveMsg('MicroPython isn\'t running on the micro:bit, so live readings are off. ', 'bad');
    offerInstall($('t-live'));
  } else liveMsg(e.message, 'bad');
}

function needConnection() {
  if (port) return false;
  liveMsg('Connect the micro:bit to see this live. ');
  const b = document.createElement('button'); b.className = 'small primary'; b.textContent = 'Connect serial';
  b.onclick = async () => { try { await serialConnect(); go(stepIdx); } catch (e) { liveError(e); } };
  $('t-live').appendChild(b);
  return true;
}

function go(i) {
  if (i < 0 || i >= STEPS.length) return;
  stepIdx = i;
  const s = STEPS[i];
  const token = ++pollToken;
  $('t-title').textContent = s.title;
  $('t-content').innerHTML = s.html();
  $('t-no').textContent = `${i + 1} / ${STEPS.length}`;
  [...$('t-dots').children].forEach((d, j) => d.classList.toggle('on', j === i));
  $('t-prev').disabled = i === 0;
  $('t-next').textContent = i === STEPS.length - 1 ? 'Finish ✓' : 'Next →';
  document.querySelectorAll('.tour-board .hl').forEach((el) => el.classList.remove('hl'));
  document.querySelectorAll('.tour-board .down').forEach((el) => el.classList.remove('down'));
  for (const id of s.hl || []) $(id)?.classList.add('hl');
  liveMsg('');
  s.seen = undefined; s.min = s.max = undefined;

  const acts = $('t-actions'); acts.textContent = '';
  for (const [label, code, leds, ms] of s.actions || []) {
    const b = document.createElement('button'); b.textContent = label;
    b.onclick = async () => {
      if (needConnection()) return;
      b.disabled = true;
      try { await rawExec(code, ms || 6000); if (leds) showLeds(leds); liveMsg(''); }
      catch (e) { liveError(e); }
      finally { b.disabled = false; }
    };
    acts.appendChild(b);
  }
  s.enter && s.enter();
  if (s.poll) { if (!needConnection()) pollLoop(s, token); }
  else if (s.actions && !port) needConnection();
}

async function pollLoop(s, token) {
  while (!tourEl.hidden && token === pollToken && port) {
    try {
      const out = await rawExec(s.poll, 5000);
      if (token !== pollToken) return;
      s.render(out.trim().split('\n'));
    } catch (e) { if (token === pollToken) liveError(e); return; }
    if (s.once) return;
    await sleep(250);
  }
}

function openTour() {
  if (!tourEl) buildTour();
  if ($('sensor-live')) $('sensor-live').checked = false;  // one live reader at a time
  tourEl.hidden = false;
  go(0);
}
function closeTour() { if (tourEl) { tourEl.hidden = true; pollToken++; } }

$('btn-tour').onclick = openTour;
