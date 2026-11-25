/* "How it works": animated circuits showing how each input turns into 1s and 0s for the processor.
 * Live from the micro:bit when connected, or in pretend mode with on-screen controls. */
'use strict';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const toBits = (v, n) => { const m = 2 ** n; return (((Math.round(v) % m) + m) % m).toString(2).padStart(n, '0'); };
const GND = (x, y) => `<line x1="${x - 20}" y1="${y}" x2="${x + 20}" y2="${y}" class="w"/><line x1="${x - 13}" y1="${y + 7}" x2="${x + 13}" y2="${y + 7}" class="w"/>` +
  `<line x1="${x - 6}" y1="${y + 14}" x2="${x + 6}" y2="${y + 14}" class="w"/><text x="${x + 28}" y="${y + 10}" class="t-s l">GND = 0 V</text>`;
const RES = (x, y1, y2) => { const s = (y2 - y1) / 7; let p = `${x},${y1}`;
  for (let i = 1; i < 7; i++) p += ` ${x + (i % 2 ? -11 : 11)},${y1 + s * i}`; return `<polyline points="${p} ${x},${y2}" class="w res"/>`; };
const CPU_BOX = (x, y, pinLabel, id) => `<g class="cpu-box"><rect x="${x}" y="${y}" width="170" height="100" rx="12"/>
  <text x="${x + 85}" y="${y + 26}" class="t-b">🧠 Processor</text><text x="${x + 85}" y="${y + 46}" class="t-s">${pinLabel}</text>
  <text x="${x + 85}" y="${y + 76}" class="t-big" id="${id}">–</text></g>`;
const I2C = (x1, x2, y) => `<g class="i2c"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="w"/><text x="${(x1 + x2) / 2}" y="${y - 8}" class="t-s">SDA</text>
  <line x1="${x1}" y1="${y + 30}" x2="${x2}" y2="${y + 30}" class="w"/><text x="${(x1 + x2) / 2}" y="${y + 48}" class="t-s">SCL</text>
  <g class="pkt"><rect x="${x1}" y="${y - 5}" width="18" height="10" rx="3"/></g><g class="pkt p2"><rect x="${x1}" y="${y - 5}" width="18" height="10" rx="3"/></g></g>`;

/* Pull-up circuit shared by buttons and touch pins. */
function pullUpSVG(o) {
  return `<svg viewBox="0 0 580 290" class="how-svg">
    <text x="20" y="24" class="t-s l">3.3 V from the regulator</text>
    <line x1="20" y1="34" x2="210" y2="34" class="w pw"/>
    <line x1="130" y1="34" x2="130" y2="52" class="w hi" id="${o.id}-top"/>
    ${RES(130, 52, 112)}
    <text x="150" y="78" class="t-b l">${o.res}</text><text x="150" y="96" class="t-s muted-t l">“pull-up resistor”</text>
    <path d="M130,112 V140 H370" class="w sig" id="${o.id}-sig"/>
    <circle cx="130" cy="140" r="5" class="dot"/>
    <g id="${o.id}-volt" class="volt"><rect x="180" y="120" width="110" height="26" rx="13"/><text x="235" y="138">3.3 V → 1</text></g>
    ${o.middle}
    ${GND(130, 252)}
    <path d="M130,40 V250" class="flow" id="${o.id}-flow"/>
    ${CPU_BOX(370, 90, o.pin, o.id + '-read')}
  </svg>`;
}

const TOPICS = {
  buttons: {
    icon: '🔘', title: 'Buttons A and B', part: 'buttons',
    intro: 'A button is just a switch. The clever part is the resistor that decides what the processor sees when the switch is open.',
    steps: [
      '<b>Not pressed:</b> the switch is open, so no electricity can reach GND. The pull-up resistor “pulls” the wire up to 3.3 V. The processor sees <b>HIGH = 1</b>.',
      '<b>Pressed:</b> the switch connects the wire straight to GND (0 V). Electricity flows through the resistor to ground, and the wire drops to 0 V. The processor sees <b>LOW = 0</b>.',
      'So on the micro:bit, <b>0 means pressed</b>! MicroPython flips it for you: <code>button_a.is_pressed()</code> gives True when the pin reads 0.',
      'The processor checks the pins thousands of times a second. It also ignores tiny flickers when the metal contacts bounce. That\'s called <b>debouncing</b>.',
    ],
    svg: () => pullUpSVG({
      id: 'hb', res: '10 kΩ', pin: 'pin 5 (button A)',
      middle: `<circle cx="130" cy="170" r="5" class="dot"/><circle cx="130" cy="214" r="5" class="dot"/>
        <line x1="130" y1="140" x2="130" y2="170" class="w sig" id="hb-sig2"/>
        <line x1="130" y1="214" x2="162" y2="176" class="w lever" id="hb-lever"/>
        <line x1="130" y1="214" x2="130" y2="252" class="w"/>
        <text x="176" y="200" class="t-b l" id="hb-name">Button A</text><text x="176" y="218" class="t-s muted-t l">(click the switch)</text>`,
    }),
    poll: 'print(pin5.read_digital(), pin11.read_digital())',
    parse: ([a, b]) => ({ a: a === '0', b: b === '0' }),
    sim: () => ({ a: !!H.sim.a, b: !!H.sim.b }),
    controls: '<label class="check"><input type="radio" name="hb-which" value="a" checked> Show button A</label>' +
      '<label class="check"><input type="radio" name="hb-which" value="b"> Show button B</label>' +
      '<span class="muted">Pretend: click the switch in the picture, or hold</span> <button data-hold="a">A</button> <button data-hold="b">B</button>',
    bind() {
      document.querySelectorAll('[name=hb-which]').forEach((r) => (r.onchange = () => { H.which = r.value; }));
      H.which = 'a';
      const hold = (k, v) => { H.sim[k] = v; };
      document.querySelectorAll('[data-hold]').forEach((b) => {
        b.onpointerdown = () => hold(b.dataset.hold, true);
        b.onpointerup = b.onpointerleave = () => hold(b.dataset.hold, false);
      });
      $('hb-lever').style.cursor = 'pointer';
      $('hb-lever').onpointerdown = () => hold(H.which, true);
    },
    render(s) {
      const pressed = H.which === 'b' ? s.b : s.a;
      $('hb-name').textContent = H.which === 'b' ? 'Button B' : 'Button A';
      document.querySelector('#hb-read').previousElementSibling.textContent = H.which === 'b' ? 'pin 11 (button B)' : 'pin 5 (button A)';
      $('hb-lever').setAttribute('x2', pressed ? 130 : 162); $('hb-lever').setAttribute('y2', pressed ? 170 : 176);
      pullUpState('hb', !pressed);
      $('hb-read').textContent = pressed ? 'reads 0 → pressed!' : 'reads 1 → not pressed';
      return { sample: pressed ? 0 : 1, bits: toBits(pressed ? 0 : 1, 1), label: 'pin value' };
    },
    range: [0, 1], graphLabel: 'pin voltage (1 = 3.3 V, 0 = 0 V)', step: true,
  },

  touch: {
    icon: '👆', title: 'Touch pins 0, 1, 2', part: 'edge',
    intro: 'Touch pins work like a button, except YOU are the switch! Your body lets a tiny bit of electricity through.',
    steps: [
      'Each touch pin has a <b>very weak pull-up</b>: a 10 MΩ resistor (that\'s 10 million ohms!). It holds the pin at 3.3 V, so the processor reads <b>1</b>.',
      'When you hold <b>GND</b> with one hand and touch the pin with the other, electricity flows from the pin, through your body, to GND.',
      'Your body resists electricity much less than 10 MΩ, so the pin\'s voltage drops low and the processor reads <b>0 = touched</b>.',
      'The current is tiny, far too small to feel. Wet fingers work even better, because water lets electricity through more easily.',
    ],
    svg: () => pullUpSVG({
      id: 'ht', res: '10 MΩ (very weak)', pin: 'pin 0',
      middle: `<line x1="130" y1="140" x2="130" y2="164" class="w sig" id="ht-sig2"/>
        <rect x="110" y="164" width="40" height="14" rx="3" class="pad"/><text x="160" y="176" class="t-s l">gold pin 0 pad</text>
        <g id="ht-body" class="body"><rect x="96" y="186" width="68" height="44" rx="10"/><text x="130" y="206" class="t-b">🧍 you</text>
          <text x="130" y="222" class="t-s">≈ 1 MΩ</text></g>
        <line x1="130" y1="230" x2="130" y2="252" class="w"/><text x="176" y="212" class="t-s muted-t l">(click “you” to touch)</text>`,
    }),
    poll: 'print(int(pin0.is_touched()), int(pin1.is_touched()), int(pin2.is_touched()))',
    parse: (v) => ({ t: v.map((x) => x === '1') }),
    sim: () => ({ t: [!!H.sim.t0, false, false] }),
    controls: '<span class="muted">Pretend: hold</span> <button data-hold="t0">👆 touch pin 0</button>',
    bind() {
      const set0 = (v) => { H.sim.t0 = v; };
      const b = document.querySelector('[data-hold="t0"]');
      b.onpointerdown = () => set0(true); b.onpointerup = b.onpointerleave = () => set0(false);
      $('ht-body').onpointerdown = () => set0(true); $('ht-body').onpointerup = $('ht-body').onpointerleave = () => set0(false);
    },
    render(s) {
      const t = s.t[0];
      $('ht-body').classList.toggle('on', t);
      pullUpState('ht', !t, t ? '≈0.3 V → 0' : '3.3 V → 1');
      $('ht-read').textContent = t ? 'reads 0 → touched!' : 'reads 1 → not touched';
      const others = s.t.slice(1).map((x, i) => `pin ${i + 1}: ${x ? 'touched' : '—'}`).join(' · ');
      setHowNote(others);
      return { sample: t ? 0 : 1, bits: toBits(t ? 0 : 1, 1), label: 'pin value' };
    },
    range: [0, 1], graphLabel: 'pin 0 (1 = not touched, 0 = touched)', step: true,
  },

  accel: {
    icon: '📈', title: 'Accelerometer', part: 'accel',
    intro: 'Inside the chip is a microscopic machine (a “MEMS”): a tiny weight on springs, much thinner than a hair.',
    steps: [
      'When you tilt or shake the micro:bit, the tiny weight gets pushed one way and squashes its springs, just like you lean when a car turns.',
      'The weight has metal plates next to fixed plates. When it moves, the gap changes, and so does how much electric charge the plates hold (their <b>capacitance</b>).',
      'A circuit called an <b>ADC</b> (analogue-to-digital converter) turns that tiny change into a number. There\'s one for each direction: x, y and z.',
      'The processor asks for the numbers over the <b>I²C bus</b>: two wires, SDA for data and SCL for the clock beat. Each bit is sent on one beat of the clock.',
    ],
    svg: () => `<svg viewBox="0 0 580 290" class="how-svg">
      <rect x="14" y="30" width="250" height="220" rx="14" class="chip"/>
      <text x="139" y="52" class="t-b">Accelerometer chip (zoomed in)</text>
      <line x1="40" y1="100" x2="40" y2="200" class="w"/><line x1="238" y1="100" x2="238" y2="200" class="w"/>
      <g id="ha-mass-g"><polyline id="ha-spl" class="w spring"/><polyline id="ha-spr" class="w spring"/>
        <rect id="ha-mass" x="109" y="120" width="60" height="60" rx="6" class="mass"/>
        <text id="ha-mass-t" x="139" y="155" class="t-s">weight</text></g>
      <line x1="80" y1="96" x2="200" y2="96" class="w plate"/><line x1="80" y1="204" x2="200" y2="204" class="w plate"/>
      <text x="139" y="88" class="t-s muted-t">fixed plates</text>
      <text x="139" y="236" class="t-s" id="ha-dir">tilt: level</text>
      <rect x="276" y="118" width="80" height="54" rx="8" class="adc"/><text x="316" y="140" class="t-b">ADC</text><text x="316" y="158" class="t-s">→ number</text>
      <line x1="264" y1="145" x2="276" y2="145" class="w"/>
      ${I2C(356, 400, 130)}
      ${CPU_BOX(400, 95, boardId === '9901' ? 'over the I²C bus' : 'I²C address 0x1D', 'ha-read')}
    </svg>`,
    poll: 'print(accelerometer.get_x(), accelerometer.get_y(), accelerometer.get_z())',
    parse: ([x, y, z]) => ({ x: +x, y: +y, z: +z }),
    sim: () => ({ x: +(H.sim.ax ?? 0), y: 0, z: -1000 }),
    controls: '<label>Pretend tilt left/right <input type="range" id="ha-slider" min="-1000" max="1000" value="0"></label>',
    bind() { $('ha-slider').oninput = (e) => { H.sim.ax = +e.target.value; }; },
    render(s) {
      const off = clamp(s.x / 1000, -1, 1) * 50;
      const mx = 109 + off;
      $('ha-mass').setAttribute('x', mx); $('ha-mass-t').setAttribute('x', mx + 30);
      const spring = (x1, x2) => { let p = `${x1},150`; const n = 8; for (let i = 1; i < n; i++) p += ` ${x1 + (x2 - x1) * i / n},${150 + (i % 2 ? -10 : 10)}`; return p + ` ${x2},150`; };
      $('ha-spl').setAttribute('points', spring(40, mx)); $('ha-spr').setAttribute('points', spring(mx + 60, 238));
      $('ha-dir').textContent = Math.abs(s.x) < 150 ? 'tilt: level' : s.x < 0 ? '◀ tilted left' : 'tilted right ▶';
      $('ha-read').textContent = `x = ${s.x}`;
      setHowNote(`y = ${s.y} · z = ${s.z} (about −1000 lying flat: that's gravity, 1 g)`);
      return { sample: s.x, bits: toBits(s.x, 16), label: 'x value, 16 bits (2 bytes)' };
    },
    range: [-1100, 1100], graphLabel: 'x acceleration (milli-g)',
  },

  compass: {
    icon: '🧲', title: 'Compass (magnetometer)', part: 'mag',
    intro: 'The Earth is a giant, weak magnet. The magnetometer measures magnetic fields in three directions.',
    steps: [
      'Inside the chip are tiny sensors made of special materials whose electrical behaviour changes when a magnetic field passes through them.',
      'There\'s one sensor for each direction: x, y and z. Together they tell which way the field points and how strong it is.',
      'Just like the accelerometer, an ADC turns each reading into a number and the processor collects it over the same <b>I²C bus</b>.',
      'To find north, the processor combines the magnetic readings with the accelerometer\'s tilt. That\'s why it needs calibrating first.',
    ],
    svg: () => `<svg viewBox="0 0 580 290" class="how-svg">
      <rect x="14" y="30" width="250" height="220" rx="14" class="chip"/>
      <text x="139" y="52" class="t-b">Magnetometer chip</text>
      ${[0, 1, 2, 3].map((i) => `<path d="M30,${90 + i * 36} C100,${70 + i * 36} 180,${110 + i * 36} 250,${90 + i * 36}" class="field"/>`).join('')}
      <g id="hm-needle" style="transform-origin:139px 150px"><polygon points="139,92 149,150 139,160 129,150" class="needle-n"/>
        <polygon points="139,208 149,150 139,140 129,150" class="needle-s"/></g>
      <text x="139" y="236" class="t-s" id="hm-dir">field direction</text>
      <rect x="276" y="118" width="80" height="54" rx="8" class="adc"/><text x="316" y="140" class="t-b">ADC</text><text x="316" y="158" class="t-s">→ number</text>
      <line x1="264" y1="145" x2="276" y2="145" class="w"/>
      ${I2C(356, 400, 130)}
      ${CPU_BOX(400, 95, boardId === '9901' ? 'over the I²C bus' : 'I²C address 0x0E', 'hm-read')}
    </svg>`,
    poll: 'print(compass.get_x(), compass.get_y(), compass.get_field_strength())',
    parse: ([x, y, s]) => ({ x: +x, y: +y, s: +s }),
    sim: () => { const a = (H.sim.ang ?? 0) * Math.PI / 180, s = H.sim.mag ? 400000 : 50000; return { x: Math.round(Math.sin(a) * s), y: Math.round(Math.cos(a) * s), s }; },
    controls: '<label>Pretend to turn it <input type="range" id="hm-slider" min="0" max="359" value="0"></label> ' +
      '<label class="check"><input type="checkbox" id="hm-magnet"> 🧲 bring a magnet close</label>',
    bind() { $('hm-slider').oninput = (e) => { H.sim.ang = +e.target.value; }; $('hm-magnet').onchange = (e) => { H.sim.mag = e.target.checked; }; },
    render(s) {
      const ang = Math.atan2(s.x, s.y) * 180 / Math.PI;
      $('hm-needle').style.transform = `rotate(${ang}deg)`;
      $('hm-dir').textContent = s.s > 150000 ? '🧲 strong magnet nearby!' : 'Earth\'s magnetic field';
      $('hm-read').textContent = `${Math.round(s.s / 1000)} µT`;
      setHowNote(`x = ${s.x} · y = ${s.y} (nanotesla). Earth's field is about 25–65 µT.`);
      return { sample: s.s / 1000, bits: toBits(clamp(s.x, -32768, 32767), 16), label: 'x value, 16 bits' };
    },
    range: [0, 300], graphLabel: 'field strength (µT)',
  },

  light: {
    icon: '☀️', title: 'Light sensing with LEDs', part: 'leds',
    intro: 'The micro:bit has no light sensor! Instead it uses a trick: LEDs can work backwards.',
    steps: [
      'Normally electricity goes into an LED and light comes out. But light shining <b>into</b> an LED makes a tiny bit of electricity.',
      'The processor briefly switches some LEDs around the “wrong” way, which fills them with a little electric charge, like filling a bucket.',
      'Light knocks the charge out. In bright light the bucket empties <b>fast</b>, and in the dark it empties <b>slowly</b>.',
      'The processor times how long the bucket takes to empty and turns that into a light level from 0 (dark) to 255 (bright). It does this between screen refreshes, so you don\'t notice.',
    ],
    svg: () => `<svg viewBox="0 0 580 290" class="how-svg">
      <g id="hl-rays"></g>
      <path d="M70,150 a40,40 0 0 1 80,0 v50 h-80 z" class="led-body"/>
      <line x1="95" y1="200" x2="95" y2="245" class="w"/><line x1="125" y1="200" x2="125" y2="235" class="w"/>
      <text x="110" y="268" class="t-s">LED, used backwards</text>
      <path d="M160,175 H230" class="w"/><text x="195" y="166" class="t-s">charge leaks</text>
      <rect x="235" y="90" width="70" height="120" rx="6" class="bucket"/><rect x="237" y="92" width="66" height="116" rx="5" class="water" id="hl-water"/>
      <text x="270" y="232" class="t-s">charge “bucket”</text>
      <text x="270" y="252" class="t-s" id="hl-time">empties in –</text>
      <path d="M305,150 H370" class="w"/><text x="338" y="142" class="t-s">timer</text>
      ${CPU_BOX(370, 100, 'light level 0–255', 'hl-read')}
    </svg>`,
    poll: 'print(display.read_light_level())',
    parse: ([l]) => ({ l: +l }),
    sim: () => ({ l: +(H.sim.l ?? 60) }),
    controls: '<label>Pretend brightness 🌑 <input type="range" id="hl-slider" min="0" max="255" value="60"> ☀️</label>',
    bind() { $('hl-slider').oninput = (e) => { H.sim.l = +e.target.value; }; },
    render(s) {
      const n = Math.round(s.l / 32);
      if ($('hl-rays').childElementCount !== n) {
        $('hl-rays').innerHTML = Array.from({ length: n }, (_, i) =>
          `<line x1="${30 + i * 22}" y1="20" x2="${70 + i * 8}" y2="100" class="ray"/>`).join('');
      }
      const ms = (2 + (255 - s.l) / 8).toFixed(1);  // illustration: brighter empties faster
      $('hl-water').style.animationDuration = `${(0.4 + (255 - s.l) / 90).toFixed(2)}s`;
      $('hl-time').textContent = `empties in ~${ms} ms (example)`;
      $('hl-read').textContent = `light = ${s.l}`;
      setHowNote(s.l < 30 ? 'Dark: the bucket drains slowly.' : s.l > 150 ? 'Bright: the bucket drains fast!' : 'Medium light.');
      return { sample: s.l, bits: toBits(s.l, 8), label: 'light level, 8 bits' };
    },
    range: [0, 255], graphLabel: 'light level (0–255)',
  },

  temp: {
    icon: '🌡️', title: 'Temperature', part: 'cpu',
    intro: 'The thermometer is built right into the processor chip. It measures the chip\'s own temperature.',
    steps: [
      'Electronic parts called transistors let electricity through a little differently when they\'re warm or cold.',
      'A special circuit inside the processor measures this change. Warmer means a small, predictable change in voltage.',
      'The processor\'s ADC turns that voltage into a number of degrees Celsius. No I²C needed: it\'s all inside one chip.',
      'We work out Fahrenheit with maths: °F = °C × 9 ÷ 5 + 32. Because the chip warms itself up while it works, readings are often a little above room temperature.',
    ],
    svg: () => `<svg viewBox="0 0 580 290" class="how-svg">
      <rect x="20" y="40" width="300" height="200" rx="16" class="chip"/>
      <text x="170" y="64" class="t-b">🧠 Processor chip (nRF51822)</text>
      <rect x="44" y="90" width="110" height="80" rx="8" class="adc"/><text x="99" y="120" class="t-b">sensor</text><text x="99" y="140" class="t-s">transistor</text>
      <path d="M154,130 H190" class="w"/>
      <rect x="190" y="104" width="80" height="54" rx="8" class="adc"/><text x="230" y="126" class="t-b">ADC</text><text x="230" y="144" class="t-s">→ °C</text>
      <text x="170" y="210" class="t-big" id="hc-read">–</text>
      <rect x="400" y="40" width="34" height="180" rx="17" class="thermo"/><circle cx="417" cy="236" r="26" class="thermo-bulb"/>
      <rect x="408" y="60" width="18" height="170" rx="9" class="thermo-fill" id="hc-fill"/>
      <text x="455" y="100" class="t-big l" id="hc-f">– °F</text><text x="455" y="124" class="t-b l" id="hc-c">– °C</text>
    </svg>`,
    poll: 'print(temperature())',
    parse: ([t]) => ({ t: +t }),
    sim: () => ({ t: +(H.sim.t ?? 22) }),
    controls: '<label>Pretend temperature ❄️ <input type="range" id="hc-slider" min="-5" max="45" value="22"> 🔥</label>',
    bind() { $('hc-slider').oninput = (e) => { H.sim.t = +e.target.value; }; },
    render(s) {
      const h = clamp((s.t + 5) / 50, 0.05, 1) * 170;
      $('hc-fill').setAttribute('y', 230 - h); $('hc-fill').setAttribute('height', h);
      $('hc-read').textContent = `${s.t} °C`;
      $('hc-f').textContent = `${cToF(s.t)} °F`; $('hc-c').textContent = `${s.t} °C`;
      setHowNote(`${s.t} × 9 ÷ 5 + 32 = ${(s.t * 9 / 5 + 32).toFixed(1)} °F`);
      return { sample: s.t, bits: toBits(s.t, 8), label: 'temperature, 8 bits' };
    },
    range: [-5, 45], graphLabel: 'temperature (°C)',
  },

  screen: {
    icon: '💡', title: 'The LED screen (an output!)', part: 'leds',
    intro: 'This one goes the other way: the processor sends signals OUT to light the LEDs. But there\'s a secret trick.',
    steps: [
      'Wiring 25 LEDs separately would use 25 processor pins. Instead they\'re wired as a grid of <b>3 rows × 9 columns</b>, which needs only 12 pins.',
      'An LED lights when its <b>row</b> wire is HIGH (3.3 V) and its <b>column</b> wire is LOW (0 V), so electricity flows through it.',
      'The processor lights one row at a time: row 1, then row 2, then row 3, over and over, so only the LEDs in one row are ever on at once.',
      'At full speed this happens about every 6 milliseconds, way too fast for your eyes. Your brain blends it into one steady picture: <b>persistence of vision</b>. Slow it down below to see the trick!',
    ],
    svg: () => {
      let a = '', b = '';
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        const [r, c] = LED_MAP[y][x];
        a += `<g class="sled" data-i="${y * 5 + x}" data-r="${r}"><rect x="${30 + x * 40}" y="${50 + y * 40}" width="26" height="30" rx="5"/>` +
          `<text x="${43 + x * 40}" y="${70 + y * 40}">${r}.${c}</text></g>`;
      }
      for (let r = 1; r <= 3; r++) {
        b += `<text x="292" y="${68 + (r - 1) * 60}" class="t-s row-t" id="hs-row${r}">row ${r}</text>`;
        for (let c = 1; c <= 9; c++) b += `<rect x="${320 + (c - 1) * 26}" y="${52 + (r - 1) * 60}" width="18" height="24" rx="4" class="wled" data-rc="${r}.${c}"/>`;
      }
      for (let c = 1; c <= 9; c++) b += `<text x="${329 + (c - 1) * 26}" y="236" class="t-s">${c}</text>`;
      return `<svg viewBox="0 0 580 270" class="how-svg">
        <text x="125" y="34" class="t-b">What you see (5 × 5)</text><text x="430" y="34" class="t-b">How it's wired (3 × 9)</text>
        ${a}${b}<text x="430" y="256" class="t-s">column</text></svg>`;
    },
    poll: "print(''.join(str(display.get_pixel(x, y)) for y in range(5) for x in range(5)))",
    parse: ([p]) => ({ p: (p || '').padEnd(25, '0') }),
    sim: () => ({ p: H.sim.p || '0909099999999990999000900' }),
    controls: '<label>Scan speed: 🐢 <input type="range" id="hs-speed" min="0" max="4" value="0"> ⚡</label> <span id="hs-speed-t" class="muted"></span>' +
      '<span class="muted">· Pretend: click LEDs on the left to draw</span>',
    bind() {
      const names = ['1 row per second', '3 rows per second', '10 rows per second', '30 rows per second', 'real speed (~160 per second)'];
      const upd = () => { H.scanSpeed = +$('hs-speed').value; $('hs-speed-t').textContent = names[H.scanSpeed]; };
      $('hs-speed').oninput = upd; upd();
      document.querySelectorAll('.sled').forEach((g) => (g.onclick = () => {
        const p = (H.sim.p || this.sim().p).split(''); const i = +g.dataset.i; p[i] = p[i] === '0' ? '9' : '0'; H.sim.p = p.join('');
      }));
      startScan();
    },
    render(s) {
      H.pattern = s.p;
      return { sample: H.scanRow || 1, bits: s.p.slice(0, 5).replace(/[1-9]/g, '1'), label: 'top row: 1 = LED on' };
    },
    range: [0, 4], graphLabel: 'which row is lit right now', step: true,
  },

  binary: {
    icon: '🔢', title: 'Binary: how computers count', part: 'cpu',
    intro: 'Every number, letter and picture inside the micro:bit is stored as 1s and 0s. Flip the switches and count like a computer!',
    steps: [
      'A computer only knows two things: electricity <b>on</b> or <b>off</b>. We write them as <b>1</b> and <b>0</b>. One of these is called a <b>bit</b>, just like a button pin reading 1 or 0.',
      'Put bits side by side and each place is worth <b>double</b> the one to its right: 1, 2, 4, 8, 16, 32, 64, 128. Add up the places that have a 1. So <code>101</code> = 4 + 0 + 1 = <b>5</b>.',
      '8 bits together make a <b>byte</b>, which can count from 0 (all off) to 255 (all on). The light level fits in one byte. The accelerometer needs two bytes (16 bits), and uses a trick called <b>two\'s complement</b> for negative numbers.',
      'Letters are numbers too! The letter <b>A</b> is stored as 65 = <code>01000001</code>. Everything in a computer (words, pictures, music and your program) is really just lots of bits.',
    ],
    svg: () => {
      let g = '';
      for (let i = 0; i < 8; i++) {
        const x = 44 + i * 66, val = 2 ** (7 - i);
        g += `<g class="bn-bit" data-b="${7 - i}" role="button" tabindex="0" aria-label="bit worth ${val}">
          <text x="${x}" y="40" class="t-b">${val}</text>
          <circle cx="${x}" cy="82" r="22" class="bn-bulb"/>
          <rect x="${x - 16}" y="120" width="32" height="54" rx="16" class="bn-sw"/><circle cx="${x}" cy="158" r="12" class="bn-knob"/>
          <text x="${x}" y="204" class="t-big bn-digit">0</text></g>`;
      }
      return `<svg viewBox="0 0 580 290" class="how-svg">
        <text x="290" y="16" class="t-s muted-t">each place is worth double the one to its right</text>
        ${g}
        <text x="290" y="240" class="t-b" id="bn-eq">all switches off = 0</text>
        <text x="200" y="276" class="t-big" id="bn-dec">= 0</text>
        <text x="390" y="276" class="t-s" id="bn-chr">as a letter: —</text>
      </svg>`;
    },
    poll: 'print(button_a.get_presses(), button_b.get_presses())',
    parse([a, b]) {
      if (H.binFirst) { H.binFirst = false; return { v: H.bin }; }   // ignore presses from before the lesson
      if (+b > 0) H.bin = 0;
      H.bin = (H.bin + +a) & 255;
      return { v: H.bin };
    },
    sim: () => ({ v: H.bin }),
    controls: '<button id="bn-inc">➕ Add 1</button><button id="bn-dec">➖ Take 1</button><button id="bn-reset">↺ Reset</button>' +
      '<span class="muted">or click the switches · On the micro:bit: press <b>A</b> to add 1, <b>B</b> to reset</span>',
    bind() {
      H.bin = 0; H.binFirst = true; H.binShown = -1;
      const flip = (b) => { H.bin ^= 1 << b; };
      document.querySelectorAll('.bn-bit').forEach((g) => {
        g.onclick = () => flip(+g.dataset.b);
        g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(+g.dataset.b); } };
      });
      $('bn-inc').onclick = () => { H.bin = (H.bin + 1) & 255; };
      $('bn-dec').onclick = () => { H.bin = (H.bin + 255) & 255; };
      $('bn-reset').onclick = () => { H.bin = 0; };
    },
    render(s) {
      const v = s.v;
      document.querySelectorAll('.bn-bit').forEach((g) => {
        const on = (v >> +g.dataset.b) & 1;
        g.classList.toggle('on', !!on); g.querySelector('.bn-digit').textContent = on;
      });
      const parts = []; for (let b = 7; b >= 0; b--) if ((v >> b) & 1) parts.push(2 ** b);
      $('bn-eq').textContent = parts.length ? parts.join(' + ') : 'all switches off';
      $('bn-dec').textContent = `= ${v}`;
      $('bn-chr').textContent = v >= 33 && v <= 126 ? `as a letter: “${String.fromCharCode(v)}”` : 'as a letter: —';
      // Show the 5 smallest bits on the micro:bit's middle row (16 8 4 2 1)
      const low = v & 31;
      if (port && !H.pretend && H.binShown !== low) {
        H.binShown = low;
        const row = toBits(low, 5).replace(/1/g, '9');
        rawExec(MB + `display.show(Image('00000:00000:${row}:00000:00000'))`, 3000).catch(() => {});
      }
      setHowNote(port && !H.pretend
        ? `The micro:bit's middle row shows the 5 smallest bits (16 8 4 2 1): ${toBits(low, 5)}`
        : `${toBits(v, 8)} in binary = ${v} in normal numbers`);
      return { sample: v, bits: toBits(v, 8), label: 'the same number as one byte (8 bits)' };
    },
    range: [0, 255], graphLabel: 'the number', step: true,
  },
};

// micro:bit v1: display (x, y) → wiring (row, column)
const LED_MAP = [
  [[1, 1], [2, 4], [1, 2], [2, 5], [1, 3]],
  [[3, 4], [3, 5], [3, 6], [3, 7], [3, 8]],
  [[2, 2], [1, 9], [2, 3], [3, 9], [2, 1]],
  [[1, 8], [1, 7], [1, 6], [1, 5], [1, 4]],
  [[3, 3], [2, 7], [3, 1], [2, 6], [3, 2]],
];

function pullUpState(id, high, text) {
  const v = $(id + '-volt');
  v.classList.toggle('low', !high);
  v.querySelector('text').textContent = text || (high ? '3.3 V → 1' : '0 V → 0');
  for (const s of [id + '-sig', id + '-sig2']) $(s)?.classList.toggle('low', !high);
  $(id + '-flow').classList.toggle('on', !high);
}

/* ------------------------------------------------- LED scan animation */
let scanTimer = null;
function startScan() {
  clearInterval(scanTimer);
  H.scanRow = 1;
  let last = 0;
  scanTimer = setInterval(() => {
    if (H.topic !== 'screen' || $('view-inside').hidden) return;
    const per = [1000, 333, 100, 33, 0][H.scanSpeed ?? 0];
    const now = performance.now();
    if (per && now - last < per) return;
    last = now;
    H.scanRow = per ? (H.scanRow % 3) + 1 : 0;   // 0 = real speed: everything looks on
    const p = H.pattern || TOPICS.screen.sim().p;
    document.querySelectorAll('.sled').forEach((g) => {
      const on = p[+g.dataset.i] !== '0'; const rowOn = !H.scanRow || +g.dataset.r === H.scanRow;
      g.classList.toggle('want', on); g.classList.toggle('on', on && rowOn);
      g.classList.toggle('row', !!H.scanRow && +g.dataset.r === H.scanRow);
    });
    const lit = new Set();
    document.querySelectorAll('.sled').forEach((g) => { if (p[+g.dataset.i] !== '0') lit.add(g.querySelector('text').textContent); });
    document.querySelectorAll('.wled').forEach((w) => {
      const r = +w.dataset.rc.split('.')[0];
      w.classList.toggle('want', lit.has(w.dataset.rc));
      w.classList.toggle('on', lit.has(w.dataset.rc) && (!H.scanRow || r === H.scanRow));
    });
    for (let r = 1; r <= 3; r++) $('hs-row' + r)?.classList.toggle('on', !H.scanRow || r === H.scanRow);
  }, 16);
}

/* ------------------------------------------------------------ engine */
const H = { topic: null, sim: {}, hist: [], token: 0, pretend: false };

function setHowNote(t) { const el = $('how-note'); if (el) el.textContent = t; }

function drawGraph() {
  const cv = $('how-graph'); if (!cv) return;
  const t = TOPICS[H.topic];
  const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.body); const css = { getPropertyValue: (k) => cs.getPropertyValue(k).trim() };
  const [lo, hi] = t.range;
  const Y = (v) => h - 8 - (clamp(v, lo, hi) - lo) / (hi - lo || 1) * (h - 16);
  g.strokeStyle = css.getPropertyValue('--line'); g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, Y(lo)); g.lineTo(w, Y(lo)); g.moveTo(0, Y(hi)); g.lineTo(w, Y(hi)); g.stroke();
  g.fillStyle = css.getPropertyValue('--muted'); g.font = '11px system-ui';
  g.fillText(String(hi), 4, Y(hi) + 12); g.fillText(String(lo), 4, Y(lo) - 3);
  const n = 160, step = w / (n - 1), pts = H.hist.slice(-n);
  g.strokeStyle = css.getPropertyValue('--accent'); g.lineWidth = 2.5; g.beginPath();
  pts.forEach((v, i) => {
    const x = w - (pts.length - 1 - i) * step, y = Y(v);
    if (i === 0) g.moveTo(x, y);
    else if (t.step) { g.lineTo(x, Y(pts[i - 1])); g.lineTo(x, y); } else g.lineTo(x, y);
  });
  g.stroke();
}

function applyState(state) {
  const t = TOPICS[H.topic];
  const r = t.render(state);
  H.hist.push(r.sample); if (H.hist.length > 400) H.hist.shift();
  $('how-bits').innerHTML = r.bits.split('').map((b, i) => `<span class="${b === '1' ? 'one' : ''}${i && i % 8 === 0 ? ' byte' : ''}">${b}</span>`).join('');
  $('how-bits').classList.toggle('many', r.bits.length > 8);
  $('how-bits-l').textContent = r.label;
  drawGraph();
}

async function howLoop(token) {
  while (token === H.token && !$('view-inside').hidden && insideMode === 'how') {
    const t = TOPICS[H.topic];
    let state = null;
    const live = port && !H.pretend;
    if (live) {
      try { state = t.parse((await rawExec(MB + t.poll, 5000)).trim().split(/\s+/)); howStatus('🟢 Live from your micro:bit'); }
      catch (e) {
        if (token !== H.token) return;
        H.pretend = true; $('how-pretend').checked = true;
        howStatus(NO_MP.test(e.message) ? 'MicroPython isn\'t running, so this is pretend mode. ' : e.message + ' (switched to pretend mode)', 'bad');
        if (NO_MP.test(e.message)) offerInstall($('how-status'));
      }
    } else if (!port) howStatus('🎮 Pretend mode: use the controls. Connect the micro:bit to see the real thing.');
    else howStatus('🎮 Pretend mode');
    if (token !== H.token) return;
    applyState(state || t.sim());
    await sleep(live ? 30 : 120);
  }
}
function howStatus(html, kind) { const el = $('how-status'); if (el) { el.innerHTML = html; el.className = 'how-status' + (kind ? ' ' + kind : ''); } }

function showTopic(id) {
  H.topic = id; H.hist = []; H.sim = {};
  const t = TOPICS[id];
  document.querySelectorAll('.how-topics button').forEach((b) => b.classList.toggle('on', b.dataset.t === id));
  $('how-main').innerHTML = `
    <div class="how-head"><span class="inside-ico">${t.icon}</span><div><h2>${t.title}</h2><p>${t.intro}</p></div></div>
    <div class="how-grid">
      <div class="how-pic">${t.svg()}<div class="how-controls">${t.controls}</div><p id="how-note" class="how-note"></p></div>
      <ol class="how-steps">${t.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    </div>
    <div class="how-signal">
      <div class="how-graph-box"><div class="how-cap">📉 Signal over time: ${t.graphLabel}</div><canvas id="how-graph"></canvas></div>
      <div class="how-bits-box"><div class="how-cap">🔢 What the processor receives (binary) ${id === 'binary' ? '' : '<button class="small how-whatbin">What\'s binary?</button>'}</div><div id="how-bits" class="how-bits"></div>
        <div id="how-bits-l" class="muted"></div></div>
    </div>`;
  t.bind();
  document.querySelector('.how-whatbin')?.addEventListener('click', () => showTopic('binary'));
  const token = ++H.token;
  howLoop(token);
}

function buildHow() {
  const list = document.querySelector('.how-topics');
  if (!list.childElementCount) {
    for (const [id, t] of Object.entries(TOPICS)) {
      const b = document.createElement('button'); b.dataset.t = id; b.innerHTML = `${t.icon} ${t.title}`;
      b.onclick = () => showTopic(id); list.appendChild(b);
    }
    $('how-pretend').onchange = (e) => { H.pretend = e.target.checked; };
  }
  showTopic(H.topic || 'buttons');
}

/* -------------------------------------------- Map / How-it-works switch */
let insideMode = 'map';
function setInsideMode(mode, topic) {
  insideMode = mode;
  document.querySelectorAll('.inside-mode button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  $('inside-map').hidden = mode !== 'map';
  $('inside-how').hidden = mode !== 'how';
  if (mode === 'how') { insideToken++; scenarioToken++; if (topic) H.topic = topic; buildHow(); }
  else { H.token++; clearInterval(scanTimer); selectPart(selected); }
}
document.querySelectorAll('.inside-mode button').forEach((b) => (b.onclick = () => setInsideMode(b.dataset.mode)));

// "See how it works" link on part cards in the map
const PART_TOPIC = { buttons: 'buttons', edge: 'touch', accel: 'accel', mag: 'compass', leds: 'screen', cpu: 'temp' };
const _selectPart = selectPart;
selectPart = function (id) {
  _selectPart(id);
  if (PART_TOPIC[id]) {
    const b = document.createElement('button'); b.className = 'primary how-link';
    b.textContent = `🔍 See how ${id === 'cpu' ? 'its thermometer' : 'it'} works, step by step`;
    b.onclick = () => setInsideMode('how', PART_TOPIC[id]);
    $('inside-card').querySelector('.inside-head').after(b);
  }
};
const _onInsideHide = window.onInsideHide;
window.onInsideHide = () => { _onInsideHide(); H.token++; };
const _onInsideShow = window.onInsideShow;
window.onInsideShow = () => { _onInsideShow(); if (insideMode === 'how') { insideToken++; buildHow(); } };
window.addEventListener('resize', () => insideMode === 'how' && drawGraph());
// Let go of a pretend press wherever the pointer is released.
window.addEventListener('pointerup', () => { H.sim.a = H.sim.b = H.sim.t0 = false; });
if (!$('view-inside').hidden) selectPart(selected);
