/* micro:bit v1 manager: Web Serial (console, MicroPython REPL, files),
 * WebUSB/DAPLink (flashing), and the local server's USB-drive flashing API. */
'use strict';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cToF = (c) => Math.round(+c * 9 / 5 + 32);
let boardId = null;  // e.g. '9900' (v1.3) or '9901' (v1.5), from the USB serial number
const enc = new TextEncoder();
const MICROBIT_VID = 0x0d28, DAPLINK_PID = 0x0204;
const BOARDS = { '9900': 'micro:bit v1.3', '9901': 'micro:bit v1.5', '9903': 'micro:bit v2.0',
  '9904': 'micro:bit v2.0', '9905': 'micro:bit v2.2', '9906': 'micro:bit v2.2' };

/* ------------------------------------------------------------------ terminal */
const term = $('term');
let lastText = null;

function termWrite(text, cls) {
  const stick = term.scrollTop + term.clientHeight >= term.scrollHeight - 30;
  text = text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/\r/g, '');
  for (const part of text.split(/(\x08)/)) {
    if (part === '\x08') {
      if (lastText && lastText.data.length) lastText.data = lastText.data.slice(0, -1);
      continue;
    }
    const clean = part.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
    if (!clean) continue;
    if (window.onTermText) window.onTermText(clean, cls);
    if (cls) {
      const span = document.createElement('span');
      span.className = cls; span.textContent = clean;
      term.appendChild(span); lastText = null;
    } else {
      if (!lastText || lastText.parentNode !== term || lastText !== term.lastChild) {
        lastText = document.createTextNode(''); term.appendChild(lastText);
      }
      lastText.data += clean;
    }
  }
  while (term.childNodes.length > 2000) term.removeChild(term.firstChild);
  if (stick) term.scrollTop = term.scrollHeight;
}
const sys = (msg) => termWrite(`\n[${msg}]\n`, 'sys');

/* -------------------------------------------------------------------- serial */
let port = null, writer = null, reader = null, wantSerial = false;
let capture = null;   // when set, incoming text goes here instead of the terminal
let runState = null;  // tracks a program started with "Run" (raw REPL, non-blocking)

function onText(t) {
  if (capture) { capture.buf += t; capture.waiter && capture.waiter(); return; }
  if (runState) return onRunText(t);
  termWrite(t);
}

// Output of a "Run" program: stdout, \x04, stderr, \x04, '>'. Then leave raw REPL.
function onRunText(t) {
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '\x04') {
      if (out) termWrite(out, runState.eot ? 'err' : undefined); out = '';
      runState.eot++; continue;
    }
    if (runState.eot >= 2 && ch === '>') {
      runState = null; capture = { buf: '', waiter: null };
      write('\x02').then(() => sleep(300)).finally(() => { capture = null; termWrite('\n>>> '); });
      return;
    }
    out += ch;
  }
  if (out) termWrite(out);
}

async function write(data) {
  if (!writer) throw new Error('Serial is not connected');
  await writer.write(typeof data === 'string' ? enc.encode(data) : data);
}
// The nRF51 UART buffer is tiny; trickle larger payloads.
async function writeSlow(str) {
  const bytes = enc.encode(str);
  for (let i = 0; i < bytes.length; i += 32) { await write(bytes.slice(i, i + 32)); await sleep(8); }
}

async function serialConnect(p) {
  port = p || await navigator.serial.requestPort({ filters: [{ usbVendorId: MICROBIT_VID }] });
  await port.open({ baudRate: +$('baud').value });
  writer = port.writable.getWriter();
  wantSerial = true;
  setSerialUI(true);
  sys(`connected at ${$('baud').value} baud`);
  readLoop(port);
}

async function readLoop(p) {
  const dec = new TextDecoder();
  while (p === port && p.readable) {
    reader = p.readable.getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        onText(dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if (p === port) { sys('serial link lost: ' + e.message); await serialCleanup(); }
      return;
    } finally { try { reader.releaseLock(); } catch {} }
  }
}

async function serialCleanup() {
  const p = port; port = null; runState = null; capture = null;
  try { await reader?.cancel(); } catch {}
  try { writer?.releaseLock(); } catch {}
  try { await p?.close(); } catch {}
  writer = reader = null;
  setSerialUI(false);
}

async function serialDisconnect() { wantSerial = false; await serialCleanup(); sys('disconnected'); }

if ('serial' in navigator) {
  navigator.serial.addEventListener('disconnect', (e) => {
    if (e.target === port) { sys('micro:bit unplugged or reset its USB'); serialCleanup(); }
  });
  // The board re-enumerates after drive flashing: reconnect automatically.
  navigator.serial.addEventListener('connect', async (e) => {
    if (!wantSerial || port) return;
    await sleep(800);
    try { await serialConnect(e.target); } catch (err) { sys('auto-reconnect failed: ' + err.message); }
  });
}

/* --------------------------------------------------------------- REPL helpers */
let chain = Promise.resolve();
function lock(fn) { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; }

function waitFor(test, ms, what) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { capture.waiter = null;
      reject(new Error(`No reply from the micro:bit${what ? ' (' + what + ')' : ''}. Is MicroPython running on it?`)); }, ms);
    capture.waiter = () => {
      const r = test(capture.buf);
      if (r) { clearTimeout(t); capture.waiter = null; resolve(r); }
    };
    capture.waiter();
  });
}

async function rawEnter() {
  runState = null;
  capture = { buf: '', waiter: null };
  await write('\r\x03\x03'); await sleep(60);
  capture.buf = '';
  await write('\x01');
  await waitFor((b) => b.includes('raw REPL; CTRL-B to exit\r\n>'), 2500, 'entering raw REPL');
}
async function rawRun(code, ms = 6000) {
  capture.buf = '';
  await writeSlow(code); await write('\x04');
  const m = await waitFor((b) => b.match(/OK([\s\S]*?)\x04([\s\S]*?)\x04>/), ms, 'running code');
  if (m[2].trim()) {
    const lines = m[2].trim().split('\n');
    throw new Error(lines[lines.length - 1].trim());
  }
  return m[1].replace(/\r/g, '');
}
async function rawExit() {
  if (!capture) return;
  capture.buf = '';
  try { await write('\x02'); await waitFor((b) => b.endsWith('>>> '), 1500); } catch {}
  capture = null;
}
// Run a function holding the REPL in raw mode for its whole duration.
const rawSession = (fn) => lock(async () => {
  try { await rawEnter(); return await fn(rawRun); } finally { await rawExit(); }
});
const rawExec = (code, ms) => rawSession((run) => run(code, ms));

const pyStr = (s) => JSON.stringify(s);
function pyBytes(u8) {
  let s = "b'";
  for (const b of u8) s += (b >= 32 && b < 127 && b !== 39 && b !== 92) ? String.fromCharCode(b) : '\\x' + b.toString(16).padStart(2, '0');
  return s + "'";
}

/* --------------------------------------------------------------- Run / stop */
function runCode(code) {
  return lock(async () => {
    try {
      await rawEnter();
      capture.buf = '';
      await writeSlow(code.replace(/\r\n/g, '\n')); await write('\x04');
      const b = await waitFor((x) => x.includes('OK') && x, 4000, 'starting program');
      const rest = b.slice(b.indexOf('OK') + 2);
      capture = null;
      runState = { eot: 0 };
      sys('running — press Stop or Ctrl‑C to interrupt');
      if (rest) onRunText(rest);
    } catch (e) { await rawExit(); throw e; }
  });
}
const stopCode = () => write('\x03');

/* ------------------------------------------------------------------- files */
async function listFiles() {
  const out = await rawExec(
    "import os\nfor n in os.listdir():\n try:\n  s=os.size(n)\n except Exception:\n  s=-1\n print(n+'|'+str(s))");
  return out.split('\n').filter(Boolean).map((l) => { const i = l.lastIndexOf('|'); return { name: l.slice(0, i), size: +l.slice(i + 1) }; });
}
async function readFile(name) {
  const hex = await rawExec(
    `f=open(${pyStr(name)},'rb')\nwhile True:\n c=f.read(32)\n if not c:\n  break\n print(''.join('%02x'%b for b in c),end='')\nf.close()`, 30000);
  const u8 = new Uint8Array(hex.length / 2);
  for (let i = 0; i < u8.length; i++) u8[i] = parseInt(hex.substr(i * 2, 2), 16);
  return u8;
}
function writeFile(name, data, onProgress) {
  const u8 = typeof data === 'string' ? enc.encode(data) : data;
  return rawSession(async (run) => {
    await run(`f=open(${pyStr(name)},'wb')\nw=f.write`);
    try {
      for (let i = 0; i < u8.length; i += 256) {
        const lines = [];
        for (let j = i; j < Math.min(i + 256, u8.length); j += 64) lines.push(`w(${pyBytes(u8.slice(j, j + 64))})`);
        await run(lines.join('\n'));
        onProgress && onProgress(Math.min(1, (i + 256) / u8.length));
      }
    } finally { await run('f.close()'); }
  });
}
const removeFile = (name) => rawExec(`import os\nos.remove(${pyStr(name)})`);

/* ------------------------------------------------------------------ WebUSB */
let usbDevice = null;

async function usbConnect() {
  usbDevice = await navigator.usb.requestDevice({ filters: [{ vendorId: MICROBIT_VID, productId: DAPLINK_PID }] });
  showBoard(usbDevice.serialNumber);
  setPill('pill-usb', 'on');
  $('btn-usb').textContent = 'WebUSB ready';
  updateFlashButtons();
}
if ('usb' in navigator) {
  navigator.usb.addEventListener('disconnect', (e) => {
    if (e.device === usbDevice) { usbDevice = null; setPill('pill-usb', ''); $('btn-usb').textContent = 'Connect WebUSB'; updateFlashButtons(); }
  });
  navigator.usb.getDevices().then((ds) => {
    const d = ds.find((x) => x.vendorId === MICROBIT_VID);
    if (d) { usbDevice = d; showBoard(d.serialNumber); setPill('pill-usb', 'on'); $('btn-usb').textContent = 'WebUSB ready'; updateFlashButtons(); }
  });
}

async function flashUsb(buffer) {
  const target = new DAPjs.DAPLink(new DAPjs.WebUSB(usbDevice));
  target.on(DAPjs.DAPLink.EVENT_PROGRESS, (p) => { $('flash-progress').value = p; });
  await target.connect();
  try { await target.flash(buffer); } finally { try { await target.disconnect(); } catch {} }
}

/* -------------------------------------------------------------- USB drive */
let drives = [], serverOK = false;

async function pollDrive() {
  try {
    const r = await fetch('/api/drive');
    drives = (await r.json()).drives; serverOK = true;
  } catch { drives = []; serverOK = false; }
  const d = drives[0];
  setPill('pill-drive', d ? 'on' : '');
  if (!serverOK) $('i-drive').textContent = 'needs the local server (run server.py)';
  else if (!d) $('i-drive').textContent = 'not mounted';
  else {
    $('i-drive').textContent = d.path + (d.fail ? `  — last flash failed: ${d.fail}` : '');
    const det = d.details;
    const fw = det['Interface Version'] || det['Version'];
    if (fw) $('i-fw').textContent = 'DAPLink ' + fw + (+fw < 249 ? ' (too old for WebUSB flashing; drive flashing works)' : '');
    showBoard(det['Unique ID']);
  }
  updateFlashButtons();
}

async function flashDrive(buffer) {
  const r = await fetch('/api/drive/flash', { method: 'POST', body: buffer,
    headers: { 'Content-Type': 'application/octet-stream', 'X-Drive': drives[0]?.path || '' } });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

/* ---------------------------------------------------------------------- UI */
function setPill(id, state) { const el = $(id); el.classList.remove('on', 'busy'); if (state) el.classList.add(state); }
function showBoard(sn) {
  if (!sn) return;
  boardId = sn.slice(0, 4);
  $('i-sn').textContent = sn;
  $('i-board').textContent = BOARDS[sn.slice(0, 4)] || `unknown board (ID ${sn.slice(0, 4)})`;
}
function setSerialUI(on) {
  // Let other tabs (quiz, tour…) know the connection changed, so they don't show stale "connect" prompts.
  document.dispatchEvent(new CustomEvent('serial-change', { detail: { connected: on } }));
  setPill('pill-serial', on ? 'on' : '');
  $('btn-serial').textContent = on ? 'Disconnect serial' : 'Connect serial';
  $('btn-serial').classList.toggle('primary', !on);
  $('baud').disabled = on;
  for (const el of document.querySelectorAll('.needs-serial, #send-input, #btn-send')) el.disabled = !on;
  $('lbl-upload').classList.toggle('disabled', !on);
  if (!on) { $('sensor-live').checked = false; }
}
function status(id, msg, kind) { const el = $(id); el.textContent = msg; el.className = 'status' + (kind ? ' ' + kind : ''); }
const NO_MP = /Is MicroPython running/;
const guard = (id) => (fn) => async (...a) => {
  try { await fn(...a); } catch (e) {
    status(id, NO_MP.test(e.message) ? 'MicroPython isn\'t running on the micro:bit.' : e.message, 'bad');
    if (NO_MP.test(e.message)) offerInstall($(id));
  }
};
function offerInstall(el) {
  const b = document.createElement('button');
  b.className = 'small primary'; b.textContent = 'Install MicroPython';
  b.onclick = () => $('btn-install-mp').click();
  el.appendChild(b);
}

// --- connection
$('btn-serial').onclick = guard('flash-status')(async () => { port ? await serialDisconnect() : await serialConnect(); });
$('btn-usb').onclick = guard('flash-status')(usbConnect);

// --- flashing
let hexBuf = null;
function loadHex(file) {
  if (!file) return;
  file.arrayBuffer().then((b) => {
    hexBuf = b;
    $('drop-label').innerHTML = `<b>${file.name.replace(/</g, '&lt;')}</b> (${(b.byteLength / 1024).toFixed(0)} KB) — ready`;
    status('flash-status', '');
    updateFlashButtons();
  });
}
let flashing = false;
function updateFlashButtons() {
  $('btn-flash-usb').disabled = flashing || !(hexBuf && usbDevice);
  $('btn-flash-drive').disabled = flashing || !(hexBuf && drives.length);
  $('btn-install-mp').disabled = flashing || !(usbDevice || drives.length);
  $('btn-install-mp').title = (usbDevice || drives.length) ? ''
    : 'Connect WebUSB, or start server.py with the MICROBIT drive mounted';
}
$('hexfile').onchange = (e) => loadHex(e.target.files[0]);
const drop = $('drop');
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
drop.ondragleave = () => drop.classList.remove('over');
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); loadHex(e.dataTransfer.files[0]); };

async function doFlash(how, buf = hexBuf, label = 'Flashing') {
  const prog = $('flash-progress');
  flashing = true; updateFlashButtons();
  prog.hidden = false; prog.removeAttribute('value');
  setPill(how === 'usb' ? 'pill-usb' : 'pill-drive', 'busy');
  status('flash-status', `${label}… the yellow LED on the back blinks while it writes.`);
  const t0 = performance.now();
  try {
    if (how === 'usb') { prog.value = 0; await flashUsb(buf); }
    else await flashDrive(buf);
    status('flash-status', `Done in ${((performance.now() - t0) / 1000).toFixed(1)} s.` +
      (how === 'drive' ? ' The board restarts and its drive remounts in a few seconds.' : ''), 'ok');
    return true;
  } catch (e) {
    let msg = e.message;
    if (how === 'usb' && /claim|access|denied|permission/i.test(msg)) msg += ' — install the udev rule from the README, then replug.';
    else if (how === 'usb') msg += ' — if your DAPLink firmware is older than 0249, use "Flash via USB drive".';
    status('flash-status', 'Flash failed: ' + msg, 'bad');
    return false;
  } finally {
    prog.hidden = true; flashing = false;
    setPill('pill-usb', usbDevice ? 'on' : ''); pollDrive();
  }
}
$('btn-flash-usb').onclick = () => doFlash('usb');
$('btn-flash-drive').onclick = () => doFlash('drive');

// --- MicroPython install (bundled official v1.1.1 hex)
const MP_HEX = 'vendor/micropython-microbit-v1.1.1.hex';
async function installMicroPython() {
  if (!usbDevice && !drives.length) {
    if ('usb' in navigator) await usbConnect();  // asks the user to pick the board
    else throw new Error('Connect WebUSB or mount the MICROBIT drive first.');
  }
  if (!confirm('Install MicroPython v1.1.1?\n\nThis replaces the program on the micro:bit and erases any files stored on it.')) return;
  status('flash-status', 'Loading MicroPython…');
  const r = await fetch(MP_HEX);
  if (!r.ok) throw new Error('could not load the bundled MicroPython hex');
  const buf = await r.arrayBuffer();
  const ok = await doFlash(usbDevice ? 'usb' : 'drive', buf, 'Installing MicroPython');
  if (!ok) return;
  status('flash-status', 'MicroPython installed. The board has restarted with an empty REPL.', 'ok');
  if (port) {
    await sleep(1500);
    try { await write('\r\x03'); sys('MicroPython installed — REPL ready'); } catch {}
  } else if (wantSerial) sys('MicroPython installed — reconnecting…');
}
$('btn-install-mp').onclick = guard('flash-status')(installMicroPython);

// --- console
$('btn-clear').onclick = () => { term.textContent = ''; lastText = null; };
$('btn-ctrlc').onclick = () => port && write('\x03');
$('btn-ctrld').onclick = () => port && write('\x04');
$('send-form').onsubmit = (e) => {
  e.preventDefault();
  const v = $('send-input').value; $('send-input').value = '';
  if (port) write(v + '\r\n');
};
// Type straight into the console for a full REPL (history, tab completion).
const KEYS = { Enter: '\r', Backspace: '\x08', Tab: '\t', Escape: '\x1b', Delete: '\x1b[3~',
  ArrowUp: '\x1b[A', ArrowDown: '\x1b[B', ArrowRight: '\x1b[C', ArrowLeft: '\x1b[D', Home: '\x1b[H', End: '\x1b[F' };
term.addEventListener('keydown', (e) => {
  if (!port || capture) return;
  let s = null;
  if (e.ctrlKey && !e.altKey && e.key.length === 1) {
    if (e.key === 'c' && getSelection().toString()) return; // allow copy
    if (e.key === 'v') return;                               // paste handled below
    s = String.fromCharCode(e.key.toUpperCase().charCodeAt(0) - 64);
  } else if (KEYS[e.key]) s = KEYS[e.key];
  else if (e.key.length === 1 && !e.metaKey) s = e.key;
  if (s !== null) { e.preventDefault(); write(s); }
});
term.addEventListener('paste', (e) => {
  if (!port || capture) return;
  e.preventDefault();
  writeSlow(e.clipboardData.getData('text').replace(/\r?\n/g, '\r'));
});

// --- MicroPython panel
const leds = $('leds');
for (let i = 0; i < 25; i++) {
  const b = document.createElement('button');
  b.type = 'button'; b.onclick = () => b.classList.toggle('on');
  leds.appendChild(b);
}
// a smiley to start with
[6, 8, 15, 19, 21, 22, 23].forEach((i) => leds.children[i].classList.add('on'));
$('btn-leds-clear').onclick = () => [...leds.children].forEach((b) => b.classList.remove('on'));
$('btn-leds-show').onclick = guard('fs-status')(async () => {
  const rows = [];
  for (let r = 0; r < 5; r++) rows.push([...leds.children].slice(r * 5, r * 5 + 5).map((b) => b.classList.contains('on') ? '9' : '0').join(''));
  await rawExec(`from microbit import *\ndisplay.show(Image(${pyStr(rows.join(':'))}))`);
});
$('btn-scroll').onclick = guard('fs-status')(async () => {
  await rawExec(`from microbit import *\ndisplay.scroll(${pyStr($('scroll-text').value)}, wait=False)`);
});

const SENSOR_CODE = `from microbit import *
try:
 l=display.read_light_level()
except Exception:
 l='n/a'
print(temperature(),l,accelerometer.get_x(),accelerometer.get_y(),accelerometer.get_z(),int(button_a.is_pressed()),int(button_b.is_pressed()))`;
async function readSensors() {
  const v = (await rawExec(SENSOR_CODE)).trim().split(/\s+/);
  $('s-temp').textContent = `${v[0]} °C / ${cToF(v[0])} °F`;
  $('s-light').textContent = v[1];
  $('s-acc').textContent = `${v[2]} / ${v[3]} / ${v[4]}`;
  $('s-btn').textContent = `${v[5] === '1' ? 'pressed' : '–'} / ${v[6] === '1' ? 'pressed' : '–'}`;
}
$('btn-sensors').onclick = guard('fs-status')(readSensors);
$('sensor-live').onchange = async (e) => {
  while (e.target.checked && port) {
    try { await readSensors(); status('fs-status', ''); }
    catch (err) {
      e.target.checked = false;
      status('fs-status', NO_MP.test(err.message) ? 'MicroPython isn\'t running on the micro:bit.' : err.message, 'bad');
      if (NO_MP.test(err.message)) offerInstall($('fs-status'));
    }
    await sleep(500);
  }
};

// --- code
$('code').addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); }
});
$('btn-run').onclick = guard('fs-status')(() => runCode($('code').value));
$('btn-stop').onclick = guard('fs-status')(stopCode);
$('btn-save-main').onclick = guard('fs-status')(async () => {
  status('fs-status', 'Saving main.py…');
  await writeFile('main.py', $('code').value, (p) => status('fs-status', `Saving main.py… ${Math.round(p * 100)}%`));
  status('fs-status', 'Saved main.py. Press Ctrl‑D (or reset) to run it.', 'ok');
  refreshFiles();
});

// --- files
function fmtSize(n) { return n < 0 ? '?' : n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB'; }
async function refreshFiles() {
  status('fs-status', 'Reading file list…');
  const files = await listFiles();
  const tb = $('files').tBodies[0]; tb.textContent = '';
  if (!files.length) tb.innerHTML = '<tr><td class="muted">No files. Upload one, or Save as main.py.</td></tr>';
  for (const f of files) {
    const tr = tb.insertRow();
    tr.insertCell().textContent = f.name;
    const sz = tr.insertCell(); sz.className = 'num'; sz.textContent = fmtSize(f.size);
    const act = tr.insertCell(); act.className = 'act';
    const mk = (label, fn) => { const b = document.createElement('button'); b.className = 'small'; b.textContent = label;
      b.onclick = guard('fs-status')(fn); act.append(b, ' '); };
    if (/\.(py|txt|csv|json)$/i.test(f.name)) mk('Edit', async () => {
      $('code').value = new TextDecoder().decode(await readFile(f.name));
      $('code').scrollIntoView({ behavior: 'smooth', block: 'center' });
      status('fs-status', `Loaded ${f.name} into the editor.`, 'ok');
    });
    mk('Download', async () => {
      status('fs-status', `Reading ${f.name}…`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([await readFile(f.name)]));
      a.download = f.name; a.click(); URL.revokeObjectURL(a.href);
      status('fs-status', '');
    });
    mk('Delete', async () => {
      if (!confirm(`Delete ${f.name} from the micro:bit?`)) return;
      await removeFile(f.name); refreshFiles();
    });
  }
  status('fs-status', `${files.length} file(s).`);
}
$('btn-files-refresh').onclick = guard('fs-status')(refreshFiles);
$('upload').onchange = guard('fs-status')(async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  if (f.size > 28 * 1024) throw new Error('Too big: the micro:bit v1 file system holds about 30 KB in total.');
  await writeFile(f.name, new Uint8Array(await f.arrayBuffer()), (p) => status('fs-status', `Uploading ${f.name}… ${Math.round(p * 100)}%`));
  status('fs-status', `Uploaded ${f.name}.`, 'ok');
  refreshFiles();
});

/* ------------------------------------------------------------------- init */
if (!('serial' in navigator) || !('usb' in navigator)) {
  $('unsupported').hidden = false;
  if (!('serial' in navigator)) $('btn-serial').disabled = true;
  if (!('usb' in navigator)) $('btn-usb').disabled = true;
}
setSerialUI(false);
pollDrive();
setInterval(pollDrive, 2500);
sys('ready — plug in the micro:bit and press "Connect serial"');
