/* Block editor for kids: micro:bit v1 blocks -> MicroPython.
 * Uses Blockly (vendor/blockly) and the serial/REPL helpers from app.js. */
'use strict';

const G = python.pythonGenerator;
G.INDENT = '    ';  // standard Python: 4 spaces per indent level
const O = python.Order;
const I = () => G.INDENT;

/* ----------------------------------------------------------- dropdowns */
const ICONS = [['❤️ heart', 'HEART'], ['💗 small heart', 'HEART_SMALL'], ['😀 happy', 'HAPPY'], ['🙂 smile', 'SMILE'],
  ['😢 sad', 'SAD'], ['😕 confused', 'CONFUSED'], ['😠 angry', 'ANGRY'], ['😴 asleep', 'ASLEEP'], ['😲 surprised', 'SURPRISED'],
  ['😜 silly', 'SILLY'], ['😎 fabulous', 'FABULOUS'], ['😐 meh', 'MEH'], ['✔️ yes', 'YES'], ['❌ no', 'NO'],
  ['🦆 duck', 'DUCK'], ['🏠 house', 'HOUSE'], ['🐢 tortoise', 'TORTOISE'], ['🦋 butterfly', 'BUTTERFLY'], ['🦒 giraffe', 'GIRAFFE'],
  ['🐍 snake', 'SNAKE'], ['🐰 rabbit', 'RABBIT'], ['🐮 cow', 'COW'], ['👻 ghost', 'GHOST'], ['💀 skull', 'SKULL'],
  ['☂️ umbrella', 'UMBRELLA'], ['🗡️ sword', 'SWORD'], ['🎯 target', 'TARGET'], ['👕 t-shirt', 'TSHIRT'], ['🛼 skate', 'ROLLERSKATE'],
  ['🎵 music note', 'MUSIC_QUAVER'], ['🍕 pac-man', 'PACMAN'], ['💎 diamond', 'DIAMOND'], ['⬛ square', 'SQUARE'],
  ['🔺 triangle', 'TRIANGLE'], ['♟️ chessboard', 'CHESSBOARD'], ['⬆️ arrow up', 'ARROW_N'], ['➡️ arrow right', 'ARROW_E'],
  ['⬇️ arrow down', 'ARROW_S'], ['⬅️ arrow left', 'ARROW_W']];
const GESTURES = [['shake', 'shake'], ['logo up', 'up'], ['logo down', 'down'], ['tilt left', 'left'], ['tilt right', 'right'],
  ['screen up', 'face up'], ['screen down', 'face down'], ['free fall', 'freefall'], ['3g', '3g'], ['6g', '6g'], ['8g', '8g']];
const MELODIES = ['DADADADUM', 'ENTERTAINER', 'PRELUDE', 'ODE', 'NYAN', 'RINGTONE', 'FUNK', 'BLUES', 'BIRTHDAY', 'WEDDING',
  'FUNERAL', 'PUNCHLINE', 'PYTHON', 'BADDY', 'CHASE', 'BA_DING', 'WAWAWAWAA', 'JUMP_UP', 'JUMP_DOWN', 'POWER_UP', 'POWER_DOWN']
  .map((m) => [m.toLowerCase().replace(/_/g, ' '), m]);
const NOTES = [['Low C', '131'], ['Middle C', '262'], ['C♯', '277'], ['D', '294'], ['D♯', '311'], ['E', '330'], ['F', '349'],
  ['F♯', '370'], ['G', '392'], ['G♯', '415'], ['A', '440'], ['A♯', '466'], ['B', '494'], ['High C', '523']];
const TOUCH_PINS = [['P0', '0'], ['P1', '1'], ['P2', '2']];
const ALL_PINS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20].map((n) => ['P' + n, String(n)]);
const ANALOG_PINS = [0, 1, 2, 3, 4, 10].map((n) => ['P' + n, String(n)]);

/* -------------------------------------------------------------- colours */
const C = { basic: 200, input: 290, led: 250, music: 20, radio: 330, pins: 0, console: 160 };

/* ------------------------------------------------------- block shapes */
const hat = (type, message, args, colour, tooltip) => ({
  type, message0: message, args0: args || [], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }],
  colour, tooltip, hat: 'cap' });
const stmt = (type, message, args, colour, tooltip, inline = true) => ({
  type, message0: message, args0: args || [], previousStatement: null, nextStatement: null, colour, tooltip, inputsInline: inline });
const val = (type, message, args, colour, output, tooltip) => ({
  type, message0: message, args0: args || [], output, colour, tooltip, inputsInline: true });
const dd = (name, options) => ({ type: 'field_dropdown', name, options });
const vin = (name, check) => ({ type: 'input_value', name, ...(check ? { check } : {}) });

const ledRows = [];
for (let r = 0; r < 5; r++) {
  ledRows.push({
    [`message${r + 1}`]: '%1 %2 %3 %4 %5',
    [`args${r + 1}`]: [0, 1, 2, 3, 4].map((c) => ({ type: 'field_checkbox', name: `L${r}${c}`, checked: false })),
  });
}

Blockly.common.defineBlocksWithJsonArray([
  // events
  hat('mb_on_start', '🚀 on start', [], C.basic, 'Runs once when the program starts.'),
  hat('mb_forever', '🔁 forever', [], C.basic, 'Runs over and over again, forever.'),
  hat('mb_on_button', '🔘 when button %1 pressed', [dd('BTN', [['A', 'a'], ['B', 'b'], ['A+B', 'ab']])], C.input,
    'Runs when you press a button.'),
  hat('mb_on_gesture', '🤚 when %1', [dd('G', GESTURES)], C.input, 'Runs when the micro:bit is moved this way.'),
  hat('mb_on_pin_touched', '👆 when pin %1 touched', [dd('PIN', TOUCH_PINS)], C.input,
    'Hold GND with one hand and touch the pin with the other.'),
  hat('mb_every', '⏱️ every %1 ms', [{ type: 'field_number', name: 'MS', value: 1000, min: 20 }], C.input,
    'Runs again and again with this much time in between (1000 ms = 1 second).'),
  hat('mb_on_radio', '📡 when radio receives a message', [], C.radio,
    'Runs when another micro:bit sends a radio message in the same group.'),

  // basic: display
  stmt('mb_show_icon', 'show icon %1', [dd('ICON', ICONS)], C.basic, 'Shows a picture on the LEDs.'),
  Object.assign(stmt('mb_show_leds', 'show LEDs', [], C.basic, 'Tick the LEDs you want to light up.', false),
    ...ledRows),
  stmt('mb_scroll', 'scroll %1', [vin('TEXT')], C.basic, 'Scrolls words or numbers across the screen.'),
  stmt('mb_show', 'show %1', [vin('TEXT')], C.basic, 'Shows a number or letters one at a time.'),
  stmt('mb_clear', 'clear screen', [], C.basic, 'Turns all the LEDs off.'),
  stmt('mb_pause', '⏸️ pause %1 ms', [vin('MS', 'Number')], C.basic, 'Waits. 1000 ms = 1 second.'),
  stmt('mb_print', '💬 say in console %1', [vin('TEXT')], C.console, 'Prints to the "micro:bit says" box on the computer.'),

  // LEDs
  stmt('mb_plot', 'light x %1 y %2 brightness %3', [vin('X', 'Number'), vin('Y', 'Number'), vin('B', 'Number')], C.led,
    'Lights one LED. x and y go from 0 to 4, brightness from 0 to 9.'),
  stmt('mb_unplot', 'turn off x %1 y %2', [vin('X', 'Number'), vin('Y', 'Number')], C.led, 'Turns one LED off.'),
  val('mb_point', 'brightness at x %1 y %2', [vin('X', 'Number'), vin('Y', 'Number')], C.led, 'Number',
    'How bright one LED is (0 to 9).'),

  // input: sensors
  val('mb_button_pressed', 'button %1 is pressed', [dd('BTN', [['A', 'a'], ['B', 'b'], ['A+B', 'ab']])], C.input, 'Boolean',
    'True while the button is held down.'),
  val('mb_button_presses', 'number of presses of button %1', [dd('BTN', [['A', 'a'], ['B', 'b']])], C.input, 'Number',
    'How many times the button was pressed since you last asked (then starts again from 0).'),
  val('mb_is_gesture', 'is %1', [dd('G', GESTURES)], C.input, 'Boolean', 'True if the micro:bit is being moved this way right now.'),
  val('mb_accel', '📈 acceleration %1', [dd('AXIS', [['x', 'x'], ['y', 'y'], ['z', 'z'], ['strength', 'strength']])], C.input,
    'Number', 'How hard the micro:bit is moving or tilting. 1024 is about 1 g (gravity).'),
  val('mb_tilt', '📐 tilt %1 (degrees)', [dd('AXIS', [['forward/back', 'pitch'], ['left/right', 'roll']])], C.input, 'Number',
    'How far the micro:bit is tilted, from -90 to 90 degrees.'),
  val('mb_heading', '🧭 compass heading', [], C.input, 'Number',
    'Which way the micro:bit points: 0 = North, 90 = East. The first time, it asks you to tilt it to fill the screen.'),
  val('mb_magnet', '🧲 magnetic force %1', [dd('AXIS', [['strength', 'strength'], ['x', 'x'], ['y', 'y'], ['z', 'z']])], C.input,
    'Number', 'Detects magnets! Bring one close and watch the number change.'),
  stmt('mb_calibrate', '🧭 calibrate compass', [], C.input, 'Tilt the micro:bit to fill the screen with dots.'),
  val('mb_temperature', '🌡️ temperature in %1', [dd('UNIT', [['°C', 'C'], ['°F', 'F']])], C.input, 'Number',
    'How warm it is near the micro:bit, in Celsius or Fahrenheit.'),
  val('mb_light', '☀️ light level', [], C.input, 'Number', 'How bright it is, from 0 (dark) to 255 (bright). Uses the LEDs as a sensor.'),
  val('mb_pin_touched', 'pin %1 is touched', [dd('PIN', TOUCH_PINS)], C.input, 'Boolean',
    'True while you touch the pin (and hold GND).'),
  val('mb_running_time', '⏱️ running time (ms)', [], C.input, 'Number', 'How long the program has been running.'),

  // music
  stmt('mb_melody', '🎶 play melody %1 %2', [dd('M', MELODIES), dd('WAIT', [['until done', 'True'], ['in background', 'False']])],
    C.music, 'Connect headphones or a speaker to P0 and GND.'),
  stmt('mb_tone', '🎵 play tone %1 for %2 ms', [vin('FREQ', 'Number'), vin('MS', 'Number')], C.music,
    'Plays a sound. Connect headphones or a speaker to P0 and GND.'),
  val('mb_note', 'note %1', [dd('NOTE', NOTES)], C.music, 'Number', 'The frequency of a musical note.'),
  stmt('mb_tempo', 'set tempo to %1 bpm', [vin('BPM', 'Number')], C.music, 'How fast melodies play.'),
  stmt('mb_stop_music', '🔇 stop music', [], C.music, 'Stops any sound.'),

  // radio
  stmt('mb_radio_group', 'radio set group %1', [vin('G', 'Number')], C.radio,
    'Only micro:bits in the same group (0–255) hear each other.'),
  stmt('mb_radio_send', 'radio send %1', [vin('MSG')], C.radio, 'Sends a message to other micro:bits nearby.'),
  val('mb_radio_msg', 'received message', [], C.radio, 'String', 'The last message that arrived by radio.'),

  // pins
  val('mb_digital_read', 'digital read pin %1', [dd('PIN', ALL_PINS)], C.pins, 'Number', '1 if the pin is on, 0 if it is off.'),
  stmt('mb_digital_write', 'digital write pin %1 to %2', [dd('PIN', ALL_PINS), dd('V', [['1 (on)', '1'], ['0 (off)', '0']])], C.pins,
    'Turns a pin on or off, e.g. for an LED.'),
  val('mb_analog_read', 'analog read pin %1', [dd('PIN', ANALOG_PINS)], C.pins, 'Number', 'A number from 0 to 1023.'),
  stmt('mb_analog_write', 'analog write pin %1 to %2', [dd('PIN', TOUCH_PINS), vin('V', 'Number')], C.pins,
    'Sets a pin between 0 and 1023, e.g. to dim an LED.'),
  stmt('mb_servo', 'servo on pin %1 to %2 degrees', [dd('PIN', TOUCH_PINS), vin('DEG', 'Number')], C.pins,
    'Turns a servo motor to an angle from 0 to 180.'),
]);

/* -------------------------------------------------------- generator */
const MICROBIT_NAMES = 'display,button_a,button_b,accelerometer,compass,sleep,temperature,running_time,Image,music,radio,' +
  'math,random,pin0,pin1,pin2,microbit,_rx,_m,_on_start,_forever';
G.addReservedWords(MICROBIT_NAMES);

let EV = null;  // event registry, filled while generating
const body = (b) => G.statementToCode(b, 'DO');
const use = (key, line) => { G.definitions_[key] = line; };
const v = (b, name, fallback = '0') => G.valueToCode(b, name, O.NONE) || fallback;
const num = (b, name, fallback = '0') => { const s = v(b, name, fallback); return /^-?\d+$/.test(s) ? s : `int(${s})`; };

const F = G.forBlock;
F.mb_on_start = (b) => { EV.start.push(body(b)); return ''; };
F.mb_forever = (b) => { EV.forever.push(body(b)); return ''; };
F.mb_on_button = (b) => {
  const k = b.getFieldValue('BTN');
  EV.handlers.push(k === 'ab'
    ? { edge: 'button_a.is_pressed() and button_b.is_pressed()', body: body(b) }
    : { cond: `button_${k}.was_pressed()`, body: body(b) });
  return '';
};
F.mb_on_gesture = (b) => { EV.handlers.push({ cond: `accelerometer.was_gesture('${b.getFieldValue('G')}')`, body: body(b) }); return ''; };
F.mb_on_pin_touched = (b) => { EV.handlers.push({ edge: `pin${b.getFieldValue('PIN')}.is_touched()`, body: body(b) }); return ''; };
F.mb_every = (b) => { EV.handlers.push({ every: Math.max(20, +b.getFieldValue('MS') || 1000), body: body(b) }); return ''; };
F.mb_on_radio = (b) => { useRadio(); EV.handlers.push({ radio: true, body: body(b) }); return ''; };

F.mb_show_icon = (b) => `display.show(Image.${b.getFieldValue('ICON')})\n`;
F.mb_show_leds = (b) => {
  const rows = [];
  for (let r = 0; r < 5; r++) {
    let s = '';
    for (let c = 0; c < 5; c++) s += b.getFieldValue(`L${r}${c}`) === 'TRUE' ? '9' : '0';
    rows.push(s);
  }
  return `display.show(Image('${rows.join(':')}'))\n`;
};
F.mb_scroll = (b) => `display.scroll(str(${v(b, 'TEXT', "''")}))\n`;
F.mb_show = (b) => `display.show(str(${v(b, 'TEXT', "''")}))\n`;
F.mb_clear = () => 'display.clear()\n';
F.mb_pause = (b) => `sleep(${num(b, 'MS', '100')})\n`;
F.mb_print = (b) => `print(${v(b, 'TEXT', "''")})\n`;

F.mb_plot = (b) => `display.set_pixel(${num(b, 'X')}, ${num(b, 'Y')}, max(0, min(9, ${num(b, 'B', '9')})))\n`;
F.mb_unplot = (b) => `display.set_pixel(${num(b, 'X')}, ${num(b, 'Y')}, 0)\n`;
F.mb_point = (b) => [`display.get_pixel(${num(b, 'X')}, ${num(b, 'Y')})`, O.FUNCTION_CALL];

F.mb_button_pressed = (b) => {
  const k = b.getFieldValue('BTN');
  return k === 'ab' ? ['(button_a.is_pressed() and button_b.is_pressed())', O.ATOMIC] : [`button_${k}.is_pressed()`, O.FUNCTION_CALL];
};
F.mb_button_presses = (b) => [`button_${b.getFieldValue('BTN')}.get_presses()`, O.FUNCTION_CALL];
F.mb_is_gesture = (b) => [`accelerometer.is_gesture('${b.getFieldValue('G')}')`, O.FUNCTION_CALL];
F.mb_accel = (b) => {
  const a = b.getFieldValue('AXIS');
  if (a !== 'strength') return [`accelerometer.get_${a}()`, O.FUNCTION_CALL];
  use('import_math', 'import math');
  return ['int(math.sqrt(accelerometer.get_x() ** 2 + accelerometer.get_y() ** 2 + accelerometer.get_z() ** 2))', O.FUNCTION_CALL];
};
F.mb_tilt = (b) => {
  use('import_math', 'import math');
  const fn = G.provideFunction_('tilt', [
    `def ${G.FUNCTION_NAME_PLACEHOLDER_}(roll):`,
    // Blockly turns each leading 2 spaces into one G.INDENT (4 spaces)
    '  x = accelerometer.get_x()', '  y = accelerometer.get_y()', '  z = accelerometer.get_z()',
    '  if roll:', '    return int(math.atan2(x, math.sqrt(y * y + z * z)) * 57.2958)',
    '  return int(math.atan2(-y, math.sqrt(x * x + z * z)) * 57.2958)']);
  return [`${fn}(${b.getFieldValue('AXIS') === 'roll' ? 'True' : 'False'})`, O.FUNCTION_CALL];
};
F.mb_heading = () => ['compass.heading()', O.FUNCTION_CALL];
F.mb_magnet = (b) => {
  const a = b.getFieldValue('AXIS');
  return [a === 'strength' ? 'compass.get_field_strength()' : `compass.get_${a}()`, O.FUNCTION_CALL];
};
F.mb_calibrate = () => 'compass.calibrate()\n';
F.mb_temperature = (b) => (b.getFieldValue('UNIT') === 'F'
  ? ['round(temperature() * 9 / 5 + 32)', O.FUNCTION_CALL] : ['temperature()', O.FUNCTION_CALL]);
F.mb_light = () => ['display.read_light_level()', O.FUNCTION_CALL];
F.mb_pin_touched = (b) => [`pin${b.getFieldValue('PIN')}.is_touched()`, O.FUNCTION_CALL];
F.mb_running_time = () => ['running_time()', O.FUNCTION_CALL];

const useMusic = () => use('import_music', 'import music');
F.mb_melody = (b) => { useMusic(); return `music.play(music.${b.getFieldValue('M')}, wait=${b.getFieldValue('WAIT')})\n`; };
F.mb_tone = (b) => { useMusic(); return `music.pitch(${num(b, 'FREQ', '440')}, ${num(b, 'MS', '500')})\n`; };
F.mb_note = (b) => [b.getFieldValue('NOTE'), O.ATOMIC];
F.mb_tempo = (b) => { useMusic(); return `music.set_tempo(bpm=${num(b, 'BPM', '120')})\n`; };
F.mb_stop_music = () => { useMusic(); return 'music.stop()\n'; };

function useRadio() {
  use('import_radio', 'import radio');
  use('radio_on', 'radio.on()');
  use('radio_rx', "_rx = ''");
}
F.mb_radio_group = (b) => { useRadio(); return `radio.config(group=${num(b, 'G', '1')})\n`; };
F.mb_radio_send = (b) => { useRadio(); return `radio.send(str(${v(b, 'MSG', "''")}))\n`; };
F.mb_radio_msg = () => { useRadio(); return ['_rx', O.ATOMIC]; };

F.mb_digital_read = (b) => [`pin${b.getFieldValue('PIN')}.read_digital()`, O.FUNCTION_CALL];
F.mb_digital_write = (b) => `pin${b.getFieldValue('PIN')}.write_digital(${b.getFieldValue('V')})\n`;
F.mb_analog_read = (b) => [`pin${b.getFieldValue('PIN')}.read_analog()`, O.FUNCTION_CALL];
F.mb_analog_write = (b) => `pin${b.getFieldValue('PIN')}.write_analog(max(0, min(1023, ${num(b, 'V')})))\n`;
F.mb_servo = (b) => {
  const p = `pin${b.getFieldValue('PIN')}`;
  return `${p}.set_analog_period(20)\n${p}.write_analog(26 + max(0, min(180, ${num(b, 'DEG', '90')})) * 102 // 180)\n`;
};

// Blockly's version imports `numbers`, which MicroPython doesn't have.
F.math_change = (b) => {
  const name = G.getVariableName(b.getFieldValue('VAR'));
  return `${name} = (${name} or 0) + ${G.valueToCode(b, 'DELTA', O.ADDITIVE) || '0'}\n`;
};

const HATS = new Set(['mb_on_start', 'mb_forever', 'mb_on_button', 'mb_on_gesture', 'mb_on_pin_touched', 'mb_every', 'mb_on_radio']);

function toPython(ws) {
  EV = { start: [], forever: [], handlers: [] };
  G.init(ws);
  // Variables start at 0 (not None) so "change by" and maths just work.
  if (G.definitions_.variables) G.definitions_.variables = G.definitions_.variables.replace(/ = None/g, ' = 0');
  use('import_microbit', 'from microbit import *');
  for (const b of ws.getTopBlocks(true)) {
    if (!b.isEnabled()) continue;
    if (HATS.has(b.type) || b.type.startsWith('procedures_def')) G.blockToCode(b);
  }
  const vars = Blockly.Variables.allUsedVarModels(ws).map((m) => G.getVariableName(m.getId()));
  const glob = vars.length ? `${I()}global ${vars.join(', ')}\n` : '';
  const def = (name, code) => `def ${name}():\n${glob}${code || I() + 'pass\n'}\n`;

  let code = '';
  if (EV.start.length) code += def('_on_start', EV.start.join(''));
  EV.forever.forEach((c, i) => { code += def(`_forever${i + 1}`, c); });
  EV.handlers.forEach((h, i) => { code += def(`_event${i + 1}`, h.body); });

  if (EV.start.length) code += '_on_start()\n';
  const loop = [];
  EV.handlers.forEach((h, i) => {
    const call = `_event${i + 1}()`;
    if (h.cond) loop.push(`if ${h.cond}:`, `${I()}${call}`);
    else if (h.edge) {
      code += `_was${i + 1} = False\n`;
      loop.push(`_now = ${h.edge}`, `if _now and not _was${i + 1}:`, `${I()}${call}`, `_was${i + 1} = _now`);
    } else if (h.every) {
      code += `_next${i + 1} = running_time()\n`;
      loop.push(`if running_time() >= _next${i + 1}:`, `${I()}_next${i + 1} = running_time() + ${h.every}`, `${I()}${call}`);
    }
  });
  const radios = EV.handlers.map((h, i) => (h.radio ? i : -1)).filter((i) => i >= 0);
  if (radios.length) {
    loop.push('_m = radio.receive()', 'if _m is not None:', `${I()}_rx = _m`, ...radios.map((i) => `${I()}_event${i + 1}()`));
  }
  EV.forever.forEach((_, i) => loop.push(`_forever${i + 1}()`));
  if (loop.length) code += 'while True:\n' + loop.concat('sleep(10)').map((l) => I() + l).join('\n') + '\n';
  return friendlyNames(G.finish(code).replace(/\n{3,}/g, '\n\n').trim() + '\n');
}

// Give the generated helper functions names a person would choose (on_button_a, on_shake…).
function friendlyNames(py) {
  const used = new Set();
  const nice = (base) => { let n = base, k = 2; while (used.has(n) || new RegExp('\\b' + n + '\\b').test(py)) n = base + '_' + k++; used.add(n); return n; };
  const rename = {};
  const rules = [
    [/if button_([ab])\.was_pressed\(\):\n\s+_event(\d+)\(\)/g, (m) => 'on_button_' + m[1]],
    [/if accelerometer\.was_gesture\('([^']+)'\):\n\s+_event(\d+)\(\)/g, (m) => 'on_' + m[1].replace(/\W+/g, '_')],
    [/_now = pin(\d+)\.is_touched\(\)\n\s+if _now and not _was\d+:\n\s+_event(\d+)\(\)/g, (m) => `on_pin${m[1]}_touched`],
    [/_now = button_a\.is_pressed\(\) and button_b\.is_pressed\(\)\n\s+if _now and not _was\d+:\n\s+_event(\d+)\(\)/g, () => 'on_buttons_a_and_b'],
    [/_next\d+ = running_time\(\) \+ (\d+)\n\s+_event(\d+)\(\)/g, (m) => `every_${m[1]}ms`],
  ];
  for (const [re, name] of rules) for (const m of py.matchAll(re)) { const id = m[m.length - 1].match(/^\d+$/) ? m[m.length - 1] : m[1]; rename['_event' + id] = nice(name(m)); }
  for (const m of py.matchAll(/_rx = _m\n((?:\s+_event\d+\(\)\n)+)/g)) for (const e of m[1].matchAll(/_event(\d+)/g)) rename['_event' + e[1]] = nice('on_radio_message');
  py = py.replace(/\b_event\d+\b/g, (n) => rename[n] || n);
  const forevers = (py.match(/\bdef _forever\d+\(/g) || []).length;
  py = py.replace(/\b_forever(\d+)\b/g, (_, n) => (forevers === 1 ? 'forever' : 'forever_' + n));
  return py.replace(/\b_on_start\b/g, 'on_start');
}

/* ----------------------------------------------------------- toolbox */
const N = (n) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });
const T = (t) => ({ shadow: { type: 'text', fields: { TEXT: t } } });
const B = (type, inputs, fields) => ({ kind: 'block', type, ...(inputs ? { inputs } : {}), ...(fields ? { fields } : {}) });
const cat = (name, colour, contents, extra) => ({ kind: 'category', name, colour, contents, ...extra });

const TOOLBOX = { kind: 'categoryToolbox', contents: [
  cat('🟦 Basic', C.basic, [
    B('mb_on_start'), B('mb_forever'), B('mb_show_icon'), B('mb_show_leds'),
    B('mb_scroll', { TEXT: T('Hello!') }), B('mb_show', { TEXT: N(42) }), B('mb_clear'),
    B('mb_pause', { MS: N(1000) }), B('mb_print', { TEXT: T('Hi computer!') }),
  ]),
  cat('🟪 Input', C.input, [
    { kind: 'label', text: 'Buttons' },
    B('mb_on_button'), B('mb_button_pressed'), B('mb_button_presses'),
    { kind: 'label', text: 'Movement' },
    B('mb_on_gesture'), B('mb_is_gesture'), B('mb_accel'), B('mb_tilt'),
    { kind: 'label', text: 'Compass & magnets' },
    B('mb_heading'), B('mb_magnet'), B('mb_calibrate'),
    { kind: 'label', text: 'Temperature, light, touch, time' },
    B('mb_temperature'), B('mb_light'), B('mb_on_pin_touched'), B('mb_pin_touched'), B('mb_every'), B('mb_running_time'),
  ]),
  cat('💡 LEDs', C.led, [
    B('mb_plot', { X: N(2), Y: N(2), B: N(9) }), B('mb_unplot', { X: N(2), Y: N(2) }), B('mb_point', { X: N(2), Y: N(2) }),
  ]),
  cat('🎵 Music', C.music, [
    { kind: 'label', text: 'Plug headphones into P0 and GND' },
    B('mb_melody'), B('mb_tone', { FREQ: { shadow: { type: 'mb_note' } }, MS: N(500) }), B('mb_note'),
    B('mb_tempo', { BPM: N(120) }), B('mb_stop_music'),
  ]),
  cat('📡 Radio', C.radio, [
    B('mb_radio_group', { G: N(1) }), B('mb_radio_send', { MSG: T('hello') }), B('mb_on_radio'), B('mb_radio_msg'),
  ]),
  cat('📌 Pins', C.pins, [
    B('mb_digital_read'), B('mb_digital_write'), B('mb_analog_read'), B('mb_analog_write', { V: N(1023) }),
    B('mb_servo', { DEG: N(90) }),
  ]),
  { kind: 'sep' },
  cat('🔁 Loops', '%{BKY_LOOPS_HUE}', [
    B('controls_repeat_ext', { TIMES: N(4) }), B('controls_whileUntil'),
    B('controls_for', { FROM: N(1), TO: N(10), BY: N(1) }), B('controls_flow_statements'),
  ]),
  cat('🔀 Logic', '%{BKY_LOGIC_HUE}', [
    B('controls_if'), { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
    B('logic_compare'), B('logic_operation'), B('logic_negate'), B('logic_boolean'),
  ]),
  cat('🔢 Math', '%{BKY_MATH_HUE}', [
    B('math_number'), B('math_arithmetic', { A: N(1), B: N(1) }), B('math_random_int', { FROM: N(1), TO: N(10) }),
    B('math_modulo', { DIVIDEND: N(10), DIVISOR: N(3) }), B('math_round', { NUM: N(3.1) }),
    B('math_single', { NUM: N(9) }), B('math_constrain', { VALUE: N(50), LOW: N(0), HIGH: N(100) }),
  ]),
  cat('🔤 Text', '%{BKY_TEXTS_HUE}', [B('text'), B('text_join'), B('text_length', { VALUE: T('abc') })]),
  cat('📦 Variables', '%{BKY_VARIABLES_HUE}', [], { custom: 'VARIABLE' }),
  cat('🧩 Functions', '%{BKY_PROCEDURES_HUE}', [], { custom: 'PROCEDURE' }),
]};

/* --------------------------------------------------------- examples */
const ex = (blocks) => ({ blocks: { languageVersion: 0, blocks } });
const stack = (arr) => arr.reduceRight((next, b) => (next ? { ...b, next: { block: next } } : b), null);
const EXAMPLES = {
  'Hello & sensors': ex([
    { type: 'mb_on_start', x: 20, y: 20, inputs: { DO: { block: stack([
      { type: 'mb_show_icon', fields: { ICON: 'HEART' } },
      { type: 'mb_scroll', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hi!' } } } } }]) } } },
    { type: 'mb_on_button', x: 20, y: 180, fields: { BTN: 'a' }, inputs: { DO: { block:
      { type: 'mb_scroll', inputs: { TEXT: { block: { type: 'mb_temperature' } } } } } } },
    { type: 'mb_on_button', x: 20, y: 300, fields: { BTN: 'b' }, inputs: { DO: { block:
      { type: 'mb_scroll', inputs: { TEXT: { block: { type: 'mb_light' } } } } } } },
    { type: 'mb_on_gesture', x: 380, y: 20, fields: { G: 'shake' }, inputs: { DO: { block: stack([
      { type: 'mb_show_icon', fields: { ICON: 'SURPRISED' } },
      { type: 'mb_print', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Whoa, I got shaken!' } } } } }]) } } },
    { type: 'mb_on_pin_touched', x: 380, y: 200, fields: { PIN: '0' }, inputs: { DO: { block:
      { type: 'mb_show_icon', fields: { ICON: 'HAPPY' } } } } },
  ]),
  'Spirit level (tilt)': ex([
    { type: 'mb_forever', x: 20, y: 20, inputs: { DO: { block: stack([
      { type: 'mb_clear' },
      { type: 'mb_plot', inputs: {
        X: { block: { type: 'math_arithmetic', fields: { OP: 'ADD' },
          inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
            B: { block: { type: 'math_round', fields: { OP: 'ROUND' }, inputs: { NUM: { block: { type: 'math_arithmetic', fields: { OP: 'DIVIDE' },
              inputs: { A: { block: { type: 'mb_tilt', fields: { AXIS: 'roll' } } }, B: { shadow: { type: 'math_number', fields: { NUM: 20 } } } } } } } } } } } },
        Y: { block: { type: 'math_arithmetic', fields: { OP: 'ADD' },
          inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
            B: { block: { type: 'math_round', fields: { OP: 'ROUND' }, inputs: { NUM: { block: { type: 'math_arithmetic', fields: { OP: 'DIVIDE' },
              inputs: { A: { block: { type: 'mb_tilt', fields: { AXIS: 'pitch' } } }, B: { shadow: { type: 'math_number', fields: { NUM: -20 } } } } } } } } } } } },
        B: { shadow: { type: 'math_number', fields: { NUM: 9 } } } } },
      { type: 'mb_pause', inputs: { MS: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } }]) } } },
  ]),
  'Compass': ex([
    { type: 'mb_on_start', x: 20, y: 20, inputs: { DO: { block: { type: 'mb_calibrate' } } } },
    { type: 'mb_forever', x: 20, y: 120, inputs: { DO: { block: {
      type: 'controls_if', extraState: { elseIfCount: 2, hasElse: true },
      inputs: {
        IF0: { block: { type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: { block: { type: 'mb_heading' } }, B: { block: { type: 'math_number', fields: { NUM: 45 } } } } } },
        DO0: { block: { type: 'mb_show', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'N' } } } } } },
        IF1: { block: { type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: { block: { type: 'mb_heading' } }, B: { block: { type: 'math_number', fields: { NUM: 135 } } } } } },
        DO1: { block: { type: 'mb_show', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'E' } } } } } },
        IF2: { block: { type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: { block: { type: 'mb_heading' } }, B: { block: { type: 'math_number', fields: { NUM: 225 } } } } } },
        DO2: { block: { type: 'mb_show', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'S' } } } } } },
        ELSE: { block: { type: 'mb_show', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: 'W' } } } } } },
      } } } } },
  ]),
  'Magnet detector': ex([
    { type: 'mb_forever', x: 20, y: 20, inputs: { DO: { block: stack([
      { type: 'controls_if', extraState: { hasElse: true }, inputs: {
        IF0: { block: { type: 'logic_compare', fields: { OP: 'GT' }, inputs: { A: { block: { type: 'mb_magnet', fields: { AXIS: 'strength' } } }, B: { block: { type: 'math_number', fields: { NUM: 100000 } } } } } },
        DO0: { block: { type: 'mb_show_icon', fields: { ICON: 'YES' } } },
        ELSE: { block: { type: 'mb_clear' } } } },
      { type: 'mb_print', inputs: { TEXT: { block: { type: 'mb_magnet', fields: { AXIS: 'strength' } } } } },
      { type: 'mb_pause', inputs: { MS: { shadow: { type: 'math_number', fields: { NUM: 200 } } } } }]) } } },
  ]),
  'Radio chat': ex([
    { type: 'mb_on_start', x: 20, y: 20, inputs: { DO: { block: { type: 'mb_radio_group', inputs: { G: { shadow: { type: 'math_number', fields: { NUM: 7 } } } } } } } },
    { type: 'mb_on_button', x: 20, y: 120, fields: { BTN: 'a' }, inputs: { DO: { block: { type: 'mb_radio_send', inputs: { MSG: { shadow: { type: 'text', fields: { TEXT: 'hi' } } } } } } } },
    { type: 'mb_on_radio', x: 20, y: 240, inputs: { DO: { block: stack([
      { type: 'mb_show_icon', fields: { ICON: 'DUCK' } },
      { type: 'mb_print', inputs: { TEXT: { block: { type: 'mb_radio_msg' } } } }]) } } },
  ]),
  'Thermometer & night light': ex([
    { type: 'mb_every', x: 20, y: 20, fields: { MS: 2000 }, inputs: { DO: { block:
      { type: 'mb_print', inputs: { TEXT: { block: { type: 'text_join', extraState: { itemCount: 3 }, inputs: {
        ADD0: { block: { type: 'mb_temperature', fields: { UNIT: 'F' } } }, ADD1: { block: { type: 'text', fields: { TEXT: ' °F, light ' } } },
        ADD2: { block: { type: 'mb_light' } } } } } } } } } },
    { type: 'mb_forever', x: 20, y: 160, inputs: { DO: { block: stack([
      { type: 'controls_if', extraState: { hasElse: true }, inputs: {
        IF0: { block: { type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: { block: { type: 'mb_light' } }, B: { block: { type: 'math_number', fields: { NUM: 20 } } } } } },
        DO0: { block: { type: 'mb_show_icon', fields: { ICON: 'ASLEEP' } } },
        ELSE: { block: { type: 'mb_show_icon', fields: { ICON: 'HAPPY' } } } } },
      { type: 'mb_pause', inputs: { MS: { shadow: { type: 'math_number', fields: { NUM: 500 } } } } }]) } } },
  ]),
  'Melody buttons': ex([
    { type: 'mb_on_button', x: 20, y: 20, fields: { BTN: 'a' }, inputs: { DO: { block: { type: 'mb_melody', fields: { M: 'BIRTHDAY', WAIT: 'False' } } } } },
    { type: 'mb_on_button', x: 20, y: 120, fields: { BTN: 'b' }, inputs: { DO: { block: { type: 'mb_tone',
      inputs: { FREQ: { shadow: { type: 'mb_note', fields: { NOTE: '262' } } }, MS: { shadow: { type: 'math_number', fields: { NUM: 300 } } } } } } } },
    { type: 'mb_on_button', x: 20, y: 220, fields: { BTN: 'ab' }, inputs: { DO: { block: { type: 'mb_stop_music' } } } },
  ]),
};

/* ---------------------------------------------------------------- UI */
let ws = null;
const STORE = 'microbit-blocks-v1';

function kidStatus(msg, kind) {
  const el = $('bk-status'); el.textContent = msg; el.className = 'bk-status' + (kind ? ' ' + kind : '');
}
const kidGuard = (fn) => async (...a) => {
  try { await fn(...a); } catch (e) {
    kidStatus(NO_MP.test(e.message) ? 'The micro:bit needs MicroPython first.' : e.message, 'bad');
    if (NO_MP.test(e.message)) offerInstall($('bk-status'));
  }
};

function updatePreview() {
  if (!ws) return;
  try { $('py-preview').textContent = toPython(ws); } catch (e) { $('py-preview').textContent = '# ' + e.message; }
  try { localStorage.setItem(STORE, JSON.stringify(Blockly.serialization.workspaces.save(ws))); } catch {}
}

function loadExample(name) {
  Blockly.serialization.workspaces.load(EXAMPLES[name], ws);
  tidy();
}
// Lay the top-level stacks out in neat columns so nothing overlaps.
function tidy() {
  const maxH = Math.max(500, ws.getMetrics().viewHeight / ws.scale);
  let x = 20, y = 20, colW = 0;
  for (const b of ws.getTopBlocks(true)) {
    const { height, width } = b.getHeightWidth();
    if (y > 20 && y + height > maxH) { x += colW + 40; y = 20; colW = 0; }
    b.moveTo(new Blockly.utils.Coordinate(x, y));
    y += height + 30; colW = Math.max(colW, width);
  }
  ws.scroll(0, 0);
}

// CSS (body.blocks-mode) makes the editor fill exactly the space below the header, however tall
// the header wraps. Blockly just needs telling whenever its box changes size.
function fitBlocks() { if (ws && !$('view-blocks').hidden) Blockly.svgResize(ws); }
new ResizeObserver(fitBlocks).observe($('blockly'));

function initBlocks() {
  window.scrollTo(0, 0);
  fitBlocks();
  if (ws) { Blockly.svgResize(ws); return; }
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  ws = Blockly.inject('blockly', {
    toolbox: TOOLBOX, renderer: 'zelos', theme: Blockly.Themes.Classic,
    trashcan: true, sounds: false, media: 'vendor/blockly/media/',
    grid: { spacing: 24, length: 2, colour: dark ? '#30363d' : '#dde1e7', snap: true },
    zoom: { controls: true, wheel: true, startScale: 0.75, maxScale: 2, minScale: 0.3 },
    move: { scrollbars: true, drag: true, wheel: true },
  });
  ws.addChangeListener(Blockly.Events.disableOrphans);
  let t = null;
  ws.addChangeListener((e) => { if (!e.isUiEvent) { clearTimeout(t); t = setTimeout(updatePreview, 150); } });
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE)); } catch {}
  try { saved ? Blockly.serialization.workspaces.load(saved, ws) : loadExample('Hello & sensors'); }
  catch { loadExample('Hello & sensors'); }
  updatePreview();
}

async function ensureSerial() {
  if (port) return;
  if (!('serial' in navigator)) throw new Error('Open this page in Chrome or Edge to talk to the micro:bit.');
  await serialConnect();
}

const sel = $('bk-examples');
for (const name of Object.keys(EXAMPLES)) sel.add(new Option(name, name));
sel.onchange = () => {
  if (sel.value && confirm(`Load the "${sel.value}" example? Your current blocks will be replaced.`)) loadExample(sel.value);
  sel.value = '';
};

$('bk-run').onclick = kidGuard(async () => {
  await ensureSerial();
  const code = toPython(ws);
  kidStatus('Sending your program…');
  $('kid-out').textContent = '';
  await runCode(code);
  kidStatus('▶ Running! Try pressing buttons, shaking or tilting the micro:bit.', 'ok');
});
$('bk-stop').onclick = kidGuard(async () => { if (port) await stopCode(); kidStatus('■ Stopped.'); });
$('bk-save').onclick = kidGuard(async () => {
  await ensureSerial();
  kidStatus('Saving to the micro:bit…');
  await writeFile('main.py', toPython(ws), (p) => kidStatus(`Saving to the micro:bit… ${Math.round(p * 100)}%`));
  await write('\x04');  // soft reboot: runs main.py
  kidStatus('💾 Saved! It now runs every time the micro:bit turns on, even on batteries.', 'ok');
});
$('bk-new').onclick = () => { if (confirm('Start a new empty program?')) { ws.clear(); } };
$('bk-python').onclick = () => document.querySelector('.bk-side').classList.toggle('show-py');
$('bk-to-editor').onclick = () => { $('code').value = toPython(ws); showView('manager'); $('code').scrollIntoView({ block: 'center' }); };
$('bk-export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(Blockly.serialization.workspaces.save(ws), null, 1)], { type: 'application/json' }));
  a.download = 'microbit-blocks.json'; a.click(); URL.revokeObjectURL(a.href);
};
$('bk-import').onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { Blockly.serialization.workspaces.load(JSON.parse(await f.text()), ws); kidStatus(`Opened ${f.name}.`, 'ok'); }
  catch (err) { kidStatus('That file is not a blocks project: ' + err.message, 'bad'); }
};
$('kid-clear').onclick = () => { $('kid-out').textContent = ''; };

// Mirror device output into the kid-friendly console
window.onTermText = (text, cls) => {
  const out = $('kid-out');
  const stick = out.scrollTop + out.clientHeight >= out.scrollHeight - 20;
  if (cls === 'sys') return;
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text;
  out.appendChild(span);
  while (out.childNodes.length > 500) out.removeChild(out.firstChild);
  if (stick) out.scrollTop = out.scrollHeight;
};

/* --------------------------------------------------------- view tabs */
function showView(name) {
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.view === name);
  for (const v of ['manager', 'blocks', 'inside', 'quiz', 'explorer', 'videos']) $('view-' + v).hidden = name !== v;
  if (name === 'videos') window.onVideosShow && window.onVideosShow();
  else window.onVideosHide && window.onVideosHide();
  if (name === 'explorer') window.onExplorerShow && window.onExplorerShow();
  document.body.classList.toggle('blocks-mode', name === 'blocks');
  if (name === 'quiz') window.onQuizShow && window.onQuizShow();
  if (name === 'blocks') initBlocks();
  if (name === 'inside') window.onInsideShow && window.onInsideShow();
  else window.onInsideHide && window.onInsideHide();
  try { localStorage.setItem('microbit-view', name); } catch {}
}
for (const b of document.querySelectorAll('.tab')) b.onclick = () => showView(b.dataset.view);
window.addEventListener('resize', fitBlocks);
let startView = 'manager';
try { startView = localStorage.getItem('microbit-view') || 'manager'; } catch {}
showView(startView);
