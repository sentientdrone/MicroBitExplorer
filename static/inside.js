/* "Inside" tab: the chips and parts that make the micro:bit work, how they connect,
 * and live readings from the parts that can be measured. Uses helpers from app.js. */
'use strict';

/* --------------------------------------------------------------- parts */
const PARTS = {
  computer: {
    icon: '💻', name: 'Your computer', chip: 'outside the micro:bit',
    what: 'Where you write programs. It sends them down the USB cable and shows what the micro:bit prints.',
    helps: 'Talks only to the interface chip, never straight to the processor.',
  },
  usb: {
    icon: '🔌', name: 'USB socket', chip: 'Micro-USB (type B)',
    what: 'The socket on the back where the cable goes in. It carries power (5 V) and data.',
    helps: 'Feeds power to the regulator and data to the interface chip.',
  },
  kl26: {
    icon: '🧑‍✈️', name: 'Interface chip', chip: 'NXP Kinetis KL26Z running DAPLink',
    what: 'A second, separate computer on the board whose only job is to look after the USB connection. ' +
      'It pretends to be a USB drive called MICROBIT, and when you drop a .hex file on it, it copies the program into the processor.',
    helps: 'Programs the processor through a debug link called SWD, and passes text both ways over a serial (UART) link: that\'s the console in this app. It also runs the yellow LED and the reset button.',
    specs: ['ARM Cortex‑M0+ at 48 MHz', '256 KB flash, 32 KB RAM', 'Not used by your programs at all'],
    fun: 'Your program never runs on this chip. It\'s like a helpful receptionist that passes messages to the real brain.',
    live: 'interface',
  },
  reset: {
    icon: '🔁', name: 'Reset button + yellow LED', chip: 'on the back, next to USB',
    what: 'The reset button restarts the program. The yellow LED flashes while data moves over USB.',
    helps: 'Both are wired to the interface chip, which then restarts the processor.',
  },
  reg: {
    icon: '🔋', name: 'Voltage regulator', chip: 'power-supply chip near the USB socket',
    what: 'USB gives 5 volts, which is too much for the chips. The regulator turns it down to about 3.3 volts.',
    helps: 'Powers every other chip. Without it, the 5 V from USB would damage them.',
    fun: 'With batteries (2 × AAA = 3 V) the regulator isn\'t needed: the batteries already supply a safe voltage.',
  },
  battery: {
    icon: '🪫', name: 'Battery socket', chip: 'JST-PH 2-pin connector',
    what: 'Plug in a 2 × AAA battery pack to run without a computer.',
    helps: 'Powers all the chips directly. Programs saved as main.py start by themselves.',
  },
  cpu: {
    icon: '🧠', name: 'Processor (the brain)', chip: 'Nordic nRF51822',
    what: 'Runs your program: MicroPython lives here. Every 16 millionths of a second it follows one tiny instruction.',
    helps: 'The boss of the board. It asks the sensors for readings over the I²C bus, switches the LEDs on and off, ' +
      'reads the buttons and pins, and has its own built-in radio and temperature sensor.',
    specs: ['ARM Cortex‑M0 at 16 MHz', '256 KB flash (stores programs)', '16 KB RAM (working memory)',
      'Built-in 2.4 GHz radio (Bluetooth / micro:bit radio)', 'Built-in temperature sensor'],
    fun: '16 KB of RAM is about the size of this paragraph a hundred times over. A phone has around 500,000 times more.',
    live: 'cpu',
  },
  crystal: {
    icon: '💓', name: 'Clock crystal', chip: '16 MHz quartz crystal',
    what: 'A tiny piece of quartz that vibrates exactly 16 million times a second.',
    helps: 'It\'s the processor\'s heartbeat: every tick, the processor does one step. It also keeps the radio on exactly the right frequency.',
    live: 'clock',
  },
  antenna: {
    icon: '📡', name: 'Antenna', chip: 'a zig-zag copper track on the board',
    what: 'Not a separate part: it\'s a carefully shaped line of copper printed on the circuit board, in the top corner.',
    helps: 'Sends and catches the processor\'s 2.4 GHz radio waves so micro:bits can message each other.',
    fun: 'Wi-Fi and microwave ovens use the same 2.4 GHz band.',
  },
  accel: {
    icon: '📈', name: 'Accelerometer', chip: '',
    what: 'Feels movement and gravity in three directions (x, y, z). Detects shakes, tilts and falling.',
    helps: 'The processor asks it for a reading over the I²C bus, two shared wires that several chips listen on, each with its own address.',
    live: 'accel',
  },
  mag: {
    icon: '🧲', name: 'Magnetometer (compass)', chip: '',
    what: 'Measures magnetic fields: the Earth\'s, so it can be a compass, and magnets nearby.',
    helps: 'Shares the I²C bus with the accelerometer. The processor combines both readings to work out which way is north even when the board is tilted.',
    live: 'mag',
  },
  leds: {
    icon: '💡', name: 'LED matrix (front)', chip: '25 red LEDs, wired as 3 rows × 9 columns',
    what: 'The 5 × 5 screen. It can also sense light by running the LEDs backwards.',
    helps: 'The processor lights the LEDs one group at a time, very fast. Your eyes blend it into one steady picture.',
    fun: 'Only a third of the LEDs are ever actually on at the same moment. The rest is a trick of your eyes called persistence of vision!',
    live: 'leds',
  },
  buttons: {
    icon: '🔘', name: 'Buttons A and B (front)', chip: 'push switches on processor pins 5 and 11',
    what: 'Press them to tell your program to do something.',
    helps: 'Each one connects a processor pin to ground when pressed, and the processor notices the pin change.',
    live: 'buttons',
  },
  edge: {
    icon: '📌', name: 'Edge connector', chip: '25 gold strips along the bottom',
    what: 'Connects the micro:bit to the outside world: crocodile clips, motors, speakers, add-on boards.',
    helps: 'Most strips connect straight to processor pins. Some are shared: pins 3, 4 and 10 also drive the LED screen and pins 5 and 11 are the buttons.',
    live: 'pins',
  },
};

function sensorChips() {
  if (boardId === '9901') {
    PARTS.accel.chip = 'ST LSM303AGR or NXP FXOS8700 (motion + compass in one chip)';
    PARTS.mag.chip = 'same combined chip as the accelerometer';
  } else {
    PARTS.accel.chip = 'NXP MMA8652 (I²C address 0x1D)';
    PARTS.mag.chip = 'NXP MAG3110 (I²C address 0x0E)';
  }
}

/* ------------------------------------------------------------ diagram */
const NODES = {
  computer: [14, 186, 96, 60], usb: [138, 194, 84, 44], kl26: [250, 172, 132, 88], reset: [250, 62, 132, 56],
  reg: [250, 318, 132, 56], battery: [140, 318, 90, 56],
  cpu: [452, 160, 150, 112], crystal: [452, 52, 150, 50], antenna: [640, 52, 132, 50],
  accel: [640, 150, 132, 56], mag: [640, 226, 132, 56], leds: [452, 318, 150, 56], buttons: [640, 318, 132, 56],
  edge: [452, 396, 320, 48],
};
// [from, to, label, kind, path?, labelX?, labelY?]  (paths hand-routed so wires don't cross parts)
const WIRES = [
  ['computer', 'usb', 'USB cable', 'data', 'M110,216 H138', 124, 182],
  ['usb', 'kl26', '', 'data', 'M222,216 H250'],
  ['usb', 'reg', '5 V', 'power', 'M180,238 V290 H290 V318', 236, 284],
  ['kl26', 'cpu', 'SWD', 'data', 'M382,208 H452', 417, 202],
  ['kl26', 'cpu', 'UART', 'serial', 'M382,234 H452', 417, 250],
  ['reset', 'kl26', '', 'data', 'M316,118 V172'],
  ['reg', 'kl26', '3.3 V', 'power', 'M350,318 V260', 350, 292],
  ['reg', 'cpu', '3.3 V', 'power', 'M382,346 H426 V262 H452', 426, 300],
  ['battery', 'reg', '', 'power', 'M230,346 H250'],
  ['crystal', 'cpu', '16 MHz', 'clock', 'M527,102 V160', 527, 134],
  ['cpu', 'antenna', '2.4 GHz', 'radio', 'M590,160 V128 H706 V102', 650, 122],
  ['cpu', 'accel', '', 'i2c', 'M602,200 H621 V178 H640'],
  ['cpu', 'mag', 'I²C', 'i2c', 'M602,200 H621 V254 H640', 621, 232],
  ['cpu', 'leds', 'GPIO', 'gpio', 'M527,272 V318', 527, 298],
  ['cpu', 'buttons', 'GPIO', 'gpio', 'M602,262 H630 V346 H640', 630, 330],
  ['cpu', 'edge', 'GPIO', 'gpio', 'M560,272 V296 H614 V396', 614, 384],
];
const wireId = (a, b, k) => `w-${a}-${b}-${k}`;

function center(id) { const [x, y, w, h] = NODES[id]; return [x + w / 2, y + h / 2]; }
function anchor(id, toward) {
  const [x, y, w, h] = NODES[id]; const [cx, cy] = center(id); const [tx, ty] = center(toward);
  const dx = tx - cx, dy = ty - cy;
  if (Math.abs(dx) * h > Math.abs(dy) * w) return [dx > 0 ? x + w : x, cy];
  return [cx, dy > 0 ? y + h : y];
}

function diagramSVG() {
  let wires = '', nodes = '';
  for (const [a, b, label, kind, path, lx, ly] of WIRES) {
    let d = path;
    if (!d) { const [x1, y1] = anchor(a, b); const [x2, y2] = anchor(b, a); d = `M${x1},${y1} L${x2},${y2}`; }
    wires += `<g class="wire ${kind}" id="${wireId(a, b, kind)}"><path d="${d}"/>` +
      (label ? `<text x="${lx}" y="${ly}">${label}</text>` : '') + '</g>';
  }
  for (const [id, [x, y, w, h]] of Object.entries(NODES)) {
    const p = PARTS[id];
    const big = id === 'cpu' || id === 'kl26';
    nodes += `<g class="node${big ? ' big' : ''}${id === 'computer' ? ' outside' : ''}" data-part="${id}" tabindex="0" role="button" aria-label="${p.name}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/>
      <text x="${x + w / 2}" y="${y + h / 2 - (big ? 10 : 2)}" class="ico">${p.icon}</text>
      <text x="${x + w / 2}" y="${y + h / 2 + (big ? 18 : 16)}" class="lbl">${p.name.replace(/ \(.*\)/, '')}</text>
      ${big ? `<text x="${x + w / 2}" y="${y + h / 2 + 34}" class="sub">${id === 'cpu' ? 'nRF51822' : 'KL26 · DAPLink'}</text>` : ''}
    </g>`;
  }
  return `<svg viewBox="0 0 786 456" class="inside-svg" role="img" aria-label="How the parts of the micro:bit connect">
    <rect x="124" y="40" width="656" height="410" rx="18" class="board-outline"/>
    <text x="134" y="34" class="board-label">the micro:bit board</text>
    ${wires}${nodes}</svg>`;
}

/* ---------------------------------------------------------- scenarios */
const SCENARIOS = {
  '📥 Flashing a program': [
    [['computer', 'usb'], ['computer-usb'], 'You drop a .hex file on the MICROBIT drive. It travels down the USB cable…'],
    [['usb', 'kl26'], ['usb-kl26'], '…to the interface chip, which receives the file as if it were a USB stick.'],
    [['kl26', 'reset'], ['reset-kl26'], 'The yellow LED flashes to show data is moving.'],
    [['kl26', 'cpu'], ['kl26-cpu-data'], 'The interface chip writes the program into the processor\'s flash memory through the SWD debug link.'],
    [['cpu', 'crystal'], ['crystal-cpu'], 'Then it resets the processor. With the crystal ticking 16 million times a second, your program starts!'],
  ],
  '🔘 Pressing button A': [
    [['buttons'], [], 'You press button A. It connects processor pin 5 to ground.'],
    [['buttons', 'cpu'], ['cpu-buttons'], 'The processor notices the pin change and runs your “when button A pressed” code.'],
    [['cpu', 'leds'], ['cpu-leds'], 'Your code says show a picture, so the processor scans the LED rows really fast.'],
    [['cpu', 'kl26', 'usb', 'computer'], ['kl26-cpu-serial', 'usb-kl26', 'computer-usb'],
      'If your code prints something, it goes over the serial link, through the interface chip, to this app.'],
  ],
  '📐 Reading the tilt': [
    [['cpu'], [], 'Your program asks for accelerometer.get_x().'],
    [['cpu', 'accel'], ['cpu-accel'], 'The processor sends a question over the I²C bus, addressed to the accelerometer: “what\'s your x reading?”'],
    [['accel', 'cpu'], ['cpu-accel'], 'The accelerometer answers on the same two wires with a number.'],
    [['cpu', 'leds'], ['cpu-leds'], 'Your program uses the number, for example to move a dot on the screen.'],
  ],
  '📡 Sending a radio message': [
    [['cpu'], [], 'radio.send("hi") puts your message into the processor\'s built-in radio.'],
    [['crystal', 'cpu'], ['crystal-cpu'], 'The crystal keeps the radio on precisely the right 2.4 GHz channel.'],
    [['cpu', 'antenna'], ['cpu-antenna'], 'The copper antenna turns the signal into radio waves. Another micro:bit in the same group catches them!'],
  ],
  '🔋 Powering up': [
    [['usb', 'battery'], ['usb-reg', 'battery-reg'], 'Power arrives: 5 V from USB, or 3 V from batteries.'],
    [['reg'], ['usb-reg', 'battery-reg'], 'The regulator brings it to a safe ~3.3 V for the chips.'],
    [['reg', 'kl26', 'cpu'], ['reg-kl26', 'reg-cpu'], 'Both the interface chip and the processor wake up.'],
    [['cpu', 'crystal'], ['crystal-cpu'], 'The crystal starts ticking and the processor runs main.py, if there is one.'],
  ],
};

/* --------------------------------------------------------------- live */
const LIVE = {
  cpu: {
    code: 'import gc, machine\ngc.collect()\nprint(machine.freq(), gc.mem_free(), running_time(), temperature())',
    tiles: [['Clock speed', 'i-freq'], ['Free RAM', 'i-ram'], ['Running for', 'i-up'], ['Chip temperature', 'i-temp']],
    render([f, ram, up, t]) {
      set('i-freq', `${(+f / 1e6).toFixed(0)} MHz`);
      set('i-ram', `${(+ram / 1024).toFixed(1)} KB of 16 KB`);
      const s = Math.floor(+up / 1000);
      set('i-up', s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`);
      set('i-temp', `${t} °C / ${cToF(t)} °F`);
    },
  },
  clock: {
    code: 'import machine\nprint(machine.freq())',
    tiles: [['Ticks per second', 'i-ticks'], ['One tick lasts', 'i-tick']],
    render([f]) { set('i-ticks', (+f).toLocaleString()); set('i-tick', `${(1e9 / +f).toFixed(1)} nanoseconds`); },
  },
  accel: {
    code: 'print(accelerometer.get_x(), accelerometer.get_y(), accelerometer.get_z())',
    tiles: [['x', 'i-ax'], ['y', 'i-ay'], ['z', 'i-az']],
    render([x, y, z]) { set('i-ax', x); set('i-ay', y); set('i-az', z); },
  },
  mag: {
    code: 'print(compass.get_x(), compass.get_y(), compass.get_z(), compass.get_field_strength())',
    tiles: [['x', 'i-mx'], ['y', 'i-my'], ['z', 'i-mz'], ['Strength (nT)', 'i-ms']],
    render([x, y, z, s]) { set('i-mx', x); set('i-my', y); set('i-mz', z); set('i-ms', (+s).toLocaleString()); },
  },
  leds: {
    code: 'print(display.read_light_level())',
    tiles: [['Light level the LEDs sense', 'i-light']],
    render([l]) { set('i-light', `${l} / 255`); },
  },
  buttons: {
    code: 'print(int(button_a.is_pressed()), int(button_b.is_pressed()))',
    tiles: [['Button A (pin 5)', 'i-ba'], ['Button B (pin 11)', 'i-bb']],
    render([a, b]) { set('i-ba', a === '1' ? '⬇ pressed' : 'up'); set('i-bb', b === '1' ? '⬇ pressed' : 'up'); },
  },
  pins: {
    code: 'print(int(pin0.is_touched()), int(pin1.is_touched()), int(pin2.is_touched()))',
    tiles: [['Pin 0 touch', 'i-p0'], ['Pin 1 touch', 'i-p1'], ['Pin 2 touch', 'i-p2']],
    render(v) { v.forEach((t, i) => set('i-p' + i, t === '1' ? '👆 touched' : '—')); },
  },
};

/* ------------------------------------------------------------------ UI */
let selected = 'cpu', insideToken = 0, scenarioToken = 0;

function highlight(nodes, wires) {
  const svg = $('inside-diagram');
  svg.querySelectorAll('.lit').forEach((el) => el.classList.remove('lit'));
  for (const n of nodes) svg.querySelector(`[data-part="${n}"]`)?.classList.add('lit');
  for (const w of wires) svg.querySelectorAll(`[id^="w-${w}"]`).forEach((el) => el.classList.add('lit'));
}

function partConnections(id) {
  return WIRES.filter(([a, b]) => a === id || b === id).map(([a, b, label]) => {
    const other = a === id ? b : a;
    return `<li><b>${PARTS[other].icon} ${PARTS[other].name}</b>${label ? ` <span class="muted">(${label})</span>` : ''}</li>`;
  }).join('');
}

function selectPart(id) {
  selected = id;
  const p = PARTS[id];
  $('inside-diagram').querySelectorAll('.node').forEach((n) => n.classList.toggle('sel', n.dataset.part === id));
  const wires = WIRES.filter(([a, b]) => a === id || b === id).map(([a, b, , k]) => `${a}-${b}-${k}`);
  highlight([], wires);
  const live = p.live && LIVE[p.live];
  $('inside-card').innerHTML = `
    <div class="inside-head"><span class="inside-ico">${p.icon}</span><div><h2>${p.name}</h2><div class="muted">${p.chip}</div></div></div>
    <h3>What it does</h3><p>${p.what}</p>
    <h3>How it helps the other parts</h3><p>${p.helps}</p>
    ${p.specs ? `<h3>Specs</h3><ul>${p.specs.map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}
    ${p.fun ? `<p class="inside-fun">💡 ${p.fun}</p>` : ''}
    <h3>Connected to</h3><ul class="inside-conn">${partConnections(id)}</ul>
    ${live ? `<h3>Live from your micro:bit</h3><div class="tour-tiles">${live.tiles.map(([l, i]) => tile(i, l)).join('')}</div>` : ''}
    ${p.live === 'interface' ? `<h3>From your micro:bit</h3><div class="tour-tiles">${tile('i-dl', 'DAPLink version')}${tile('i-usbif', 'USB features')}${tile('i-board', 'Board')}</div>` : ''}
    <div id="inside-live" class="tour-live"></div>`;
  const token = ++insideToken;
  if (p.live === 'interface') {
    const d = drives[0]?.details || {};
    set('i-dl', d['Interface Version'] || (usbDevice ? 'connected' : 'drive not found'));
    set('i-usbif', d['USB Interfaces'] || '—');
    set('i-board', boardId ? boardName() : '—');
  } else if (live) insideLoop(live, token);
}

async function insideLoop(live, token) {
  const msg = (h, k) => { const el = $('inside-live'); if (el) { el.innerHTML = h; el.className = 'tour-live' + (k ? ' ' + k : ''); } };
  if (!port) {
    msg('Connect the micro:bit to see live readings. ');
    const b = document.createElement('button'); b.className = 'small primary'; b.textContent = 'Connect serial';
    b.onclick = async () => { try { await serialConnect(); selectPart(selected); } catch (e) { msg(e.message, 'bad'); } };
    $('inside-live').appendChild(b);
    return;
  }
  while (token === insideToken && port && !$('view-inside').hidden) {
    try {
      const out = await rawExec(MB + live.code, 5000);
      if (token !== insideToken) return;
      live.render(out.trim().split(/\s+/)); msg('');
    } catch (e) {
      if (token !== insideToken) return;
      if (NO_MP.test(e.message)) { msg('MicroPython isn\'t running, so live readings are off. ', 'bad'); offerInstall($('inside-live')); }
      else msg(e.message, 'bad');
      return;
    }
    await sleep(400);
  }
}

async function playScenario(name) {
  const token = ++scenarioToken;
  const steps = SCENARIOS[name];
  const cap = $('inside-caption');
  document.querySelectorAll('.inside-scen button').forEach((b) => b.classList.toggle('on', b.textContent === name));
  for (let i = 0; i < steps.length; i++) {
    if (token !== scenarioToken) return;
    const [nodes, wires, text] = steps[i];
    highlight(nodes, wires);
    cap.innerHTML = `<b>${i + 1}/${steps.length}</b> ${text}`;
    await sleep(2600);
  }
  if (token === scenarioToken) {
    cap.innerHTML = 'Click a part to learn about it, or watch another one.';
    document.querySelectorAll('.inside-scen button').forEach((b) => b.classList.remove('on'));
    selectPart(selected);
  }
}

let insideBuilt = false;
function buildInside() {
  if (insideBuilt) { sensorChips(); selectPart(selected); return; }
  insideBuilt = true;
  sensorChips();
  $('inside-diagram').innerHTML = diagramSVG();
  $('inside-diagram').addEventListener('click', (e) => {
    const n = e.target.closest('.node'); if (n) { scenarioToken++; $('inside-caption').textContent = ''; selectPart(n.dataset.part); }
  });
  $('inside-diagram').addEventListener('keydown', (e) => {
    const n = e.target.closest('.node'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectPart(n.dataset.part); }
  });
  const sc = document.querySelector('.inside-scen');
  for (const name of Object.keys(SCENARIOS)) {
    const b = document.createElement('button'); b.textContent = name; b.onclick = () => playScenario(name); sc.appendChild(b);
  }
  selectPart('cpu');
}
window.onInsideShow = buildInside;
window.onInsideHide = () => { insideToken++; scenarioToken++; };
if (!$('view-inside').hidden) buildInside();
