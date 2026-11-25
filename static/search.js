/* Search: one box that finds answers across the Tour, the Inside map, the How-it-works lessons,
 * the quiz questions and the Blocks drawers, and jumps straight to the right place. */
'use strict';

const strip = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

// Words kids might type that mean the same thing as words in the lessons.
const SYNONYMS = {
  cpu: 'processor', brain: 'processor', chip: 'processor', microcontroller: 'processor',
  compass: 'magnetometer', magnet: 'magnetometer', north: 'compass', tilt: 'accelerometer', shake: 'accelerometer',
  motion: 'accelerometer', move: 'accelerometer', gravity: 'accelerometer', temp: 'temperature', hot: 'temperature',
  cold: 'temperature', fahrenheit: '°f', celsius: '°c', bit: 'binary', bits: 'binary', byte: 'binary', bytes: 'binary', number: 'binary',
  ones: 'binary', zeros: 'binary', dark: 'light', bright: 'light', touch: 'touch', touched: 'touch',
  screen: 'led', display: 'led', lights: 'led', leds: 'led', sound: 'music', speaker: 'music', song: 'music',
  wireless: 'radio', bluetooth: 'radio', message: 'radio', battery: 'power', usb: 'usb', volt: 'voltage',
  volts: 'voltage', resistor: 'resistor', memory: 'ram', clock: 'crystal', speed: 'mhz', i2c: 'i²c',
  button: 'button', buttons: 'button', pressed: 'press', program: 'program', code: 'program', flash: 'flashing',
};

let INDEX = null;
function buildIndex() {
  const idx = [];
  const norm = (x) => x.toLowerCase().replace(/micro:bits?/g, 'microbit');
  const add = (e) => idx.push({ ...e, hay: norm(e.title + ' ' + e.text), titleL: norm(e.title) });

  // How-it-works lessons
  for (const [id, t] of Object.entries(TOPICS)) {
    add({ kind: 'Lesson', icon: t.icon, title: t.title, text: strip(t.intro + ' ' + t.steps.join(' ')),
      go: () => { showView('inside'); setInsideMode('how', id); } });
  }
  // Parts map
  sensorChips();
  for (const [id, p] of Object.entries(PARTS)) {
    add({ kind: 'Part', icon: p.icon, title: p.name, text: strip([p.chip, p.what, p.helps, (p.specs || []).join('. '), p.fun || ''].join(' ')),
      go: () => { showView('inside'); setInsideMode('map'); selectPart(id); } });
  }
  // Tour steps
  STEPS.forEach((s, i) => {
    let text = ''; try { text = strip(s.html()); } catch {}
    add({ kind: 'Tour', icon: '🎓', title: s.title.replace(/^\S+\s/, ''), text,
      go: () => { $('btn-tour').click(); go(i); } });
  });
  // Quiz questions: the answer is shown right in the result
  for (const q of QUESTIONS) {
    add({ kind: 'Quiz answer', icon: '🏆', title: q.q, text: strip(q.a[0] + '. ' + q.why), answer: q.a[0], why: strip(q.why),
      go: () => goLearn(q.learn) });
  }
  // Blocks drawers
  for (const c of TOOLBOX.contents.filter((c) => c.kind === 'category')) {
    const blocks = (c.contents || []).filter((b) => b.kind === 'block').map((b) => {
      const def = Blockly.Blocks[b.type]; const j = BLOCK_TEXT[b.type]; return j || (def ? b.type.replace(/^mb_|_/g, ' ') : '');
    });
    add({ kind: 'Blocks', icon: '🧩', title: c.name.replace(/^\S+\s/, '') + ' blocks', text: blocks.join(', '),
      go: () => {
        showView('blocks');
        setTimeout(() => {
          const tb = ws.getToolbox(); const it = tb.getToolboxItems().find((x) => x.getName && x.getName() === c.name);
          if (it) tb.setSelectedItem(it);
        }, 50);
      } });
  }
  // Manager features
  [
    ['Install MicroPython', 'Flash a program · install MicroPython hex · needed for REPL, sensors, files', () => { showView('manager'); $('card-flash').scrollIntoView({ block: 'center' }); }],
    ['Serial console', 'console REPL output print Ctrl-C Ctrl-D connect serial baud', () => { showView('manager'); $('card-console').scrollIntoView({ block: 'center' }); }],
    ['Files on the micro:bit', 'files main.py upload download delete file system storage', () => { showView('manager'); $('card-files').scrollIntoView({ block: 'center' }); }],
    ['Sensor readings', 'temperature light accelerometer buttons live sensors read °F °C', () => { showView('manager'); $('card-py').scrollIntoView({ block: 'center' }); }],
  ].forEach(([title, text, fn]) => add({ kind: 'Manager', icon: '🧰', title, text, go: fn }));
  return idx;
}

// Readable text for blocks (used to describe what's in each Blocks drawer)
const BLOCK_TEXT = {};
for (const t of Object.keys(Blockly.Blocks).filter((t) => t.startsWith('mb_'))) {
  try {
    const b = new Blockly.Block(new Blockly.Workspace(), t);
    BLOCK_TEXT[t] = b.inputList.map((i) => i.fieldRow.map((f) => (f instanceof Blockly.FieldLabel ? f.getText() : '')).join(' ')).join(' ')
      .replace(/[^\p{L}\p{N}°+ ]/gu, ' ').replace(/\s+/g, ' ').trim();
  } catch {}
}

function terms(q) {
  return q.toLowerCase().replace(/micro:? ?bits?/g, ' ').split(/[^\p{L}\p{N}°²+]+/u).filter((w) => w.length > 1 || /\d/.test(w))
    .filter((w) => !['the', 'a', 'an', 'is', 'how', 'does', 'do', 'what', 'why', 'it', 'of', 'on', 'in', 'to', 'and', 'can', 'my',
      'i', 'you', 'work', 'works', 'are', 'make', 'use', 'get', 'with', 'for', 'about', 'tell', 'me', 'where', 'which', 'when',
      'show', 'find', 'there', 'this', 'that', 'be', 'many', 'much'].includes(w))
    .map((w) => (SYNONYMS[w] || w.length < 5 ? w : w.replace(/(ing|ed|es|s|e)$/, '')));  // sense→sens, pressed→press
}

function search(q) {
  INDEX = INDEX || buildIndex();
  const ws_ = terms(q);
  if (!ws_.length) return [];
  const scored = [];
  for (const e of INDEX) {
    let score = 0, all = true;
    for (const w of ws_) {
      const alt = SYNONYMS[w];
      // short words ("bit", "led", "a") must match a whole word; longer ones can match inside words
      const has = (text, x) => (x.length <= 3 ? new RegExp('(^|[^\\p{L}])' + x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u').test(text) : text.includes(x));
      const inTitle = has(e.titleL, w) || (alt && has(e.titleL, alt));
      const inBody = has(e.hay, w) || (alt && has(e.hay, alt));
      if (!inBody) { all = false; continue; }
      score += inTitle ? 6 : 1;
      if (new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(e.hay)) score += 1;  // whole-word bonus
    }
    if (score) scored.push({ e, score: score + (all ? 10 : 0), all });
  }
  const anyAll = scored.some((s) => s.all);
  return scored.filter((s) => !anyAll || s.all).sort((a, b) => b.score - a.score).slice(0, 12).map((s) => s.e);
}

function snippet(e, q) {
  const text = e.why || e.text;
  const ws_ = terms(q).flatMap((w) => [w, SYNONYMS[w]].filter(Boolean));
  const low = text.toLowerCase();
  let at = -1;
  for (const w of ws_) { at = low.indexOf(w); if (at >= 0) break; }
  let s = at < 0 ? text.slice(0, 130) : text.slice(Math.max(0, at - 50), at + 90);
  if (at > 50) s = '…' + s; if (s.length < text.length && !s.endsWith('.')) s += '…';
  s = esc(s);
  for (const w of ws_) s = s.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  return s;
}

/* ------------------------------------------------------------------ UI */
const box = $('search'), panel = $('search-results');
let results = [], active = -1;

function render(q) {
  results = search(q); active = results.length ? 0 : -1;
  if (!q.trim()) { panel.hidden = true; return; }
  panel.hidden = false;
  if (!results.length) {
    panel.innerHTML = `<div class="sr-empty">No answers found for “${esc(q)}”. Try a simpler word like <i>button</i>, <i>binary</i> or <i>temperature</i>.</div>`;
    return;
  }
  // Quiz answers stay hidden until you choose to reveal them, so the search can't spoil the quiz.
  panel.innerHTML = results.map((e, i) => `
    <div class="sr-item${i === active ? ' on' : ''}" data-i="${i}" role="option" tabindex="-1">
      <span class="sr-ico">${e.icon}</span>
      <span class="sr-body"><span class="sr-kind">${e.answer ? 'Quiz question' : e.kind}</span><b>${esc(e.title)}</b>
        ${e.answer
          ? `<span class="sr-hidden"><span class="muted">🙈 Answer hidden. Try to work it out first!</span>
               <button class="small sr-reveal" type="button">👀 Reveal answer</button></span>
             <span class="sr-answer-box" hidden><span class="sr-answer">✅ ${esc(e.answer)}</span><span class="sr-snip">${esc(e.why)}</span></span>`
          : `<span class="sr-snip">${snippet(e, q)}</span>`}</span>
      <span class="sr-go">${e.answer ? 'Learn about it →' : 'Open →'}</span>
    </div>`).join('');
  panel.querySelectorAll('.sr-item').forEach((b) => {
    b.onmousedown = (ev) => ev.preventDefault();  // keep focus in the search box so clicks land
    b.onclick = () => openResult(+b.dataset.i);
  });
  // Revealing needs the parent / teacher code (teacher.js), unless a grown-up has already unlocked it.
  const reveal = (item) => { item.querySelector('.sr-hidden')?.remove(); item.querySelector('.sr-answer-box').hidden = false; };
  panel.querySelectorAll('.sr-reveal').forEach((btn) => {
    if (!teacherUnlocked()) btn.textContent = '🔒 Reveal answer (grown-up code)';
    btn.onclick = async (ev) => {
      ev.stopPropagation();  // reveal only; don't open the lesson
      const item = btn.closest('.sr-item');
      if (teacherUnlocked()) return reveal(item);
      const i = item.dataset.i, q = box.value;
      if (await requireTeacher()) {
        box.value = q; box.focus(); render(q);
        const again = panel.querySelector(`.sr-item[data-i="${i}"]`); if (again) reveal(again);
      }
    };
  });
}

function openResult(i) {
  const e = results[i]; if (!e) return;
  panel.hidden = true; box.blur();
  try { closeTour(); } catch {}
  e.go();
}

function move(d) {
  if (!results.length) return;
  active = (active + d + results.length) % results.length;
  panel.querySelectorAll('.sr-item').forEach((b, i) => b.classList.toggle('on', i === active));
  panel.querySelectorAll('.sr-item')[active].scrollIntoView({ block: 'nearest' });
}

let t = null;
box.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => render(box.value), 80); });
box.addEventListener('focus', () => { if (box.value.trim()) render(box.value); });
box.addEventListener('blur', () => setTimeout(() => { panel.hidden = true; }, 150));
box.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); openResult(active); }
  else if (e.key === 'Escape') { box.value = ''; panel.hidden = true; box.blur(); }
});
// "/" jumps to the search box (unless you're typing somewhere else)
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable], .blocklyWidgetDiv, #term')) { e.preventDefault(); box.focus(); }
});
