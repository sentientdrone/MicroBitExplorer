/* Bit's Python mode: checks MicroPython code in the Manager's code editor for common mistakes,
 * explains tracebacks from the console, answers Python questions and gives Python versions of
 * the how-to recipes. Works offline. Uses globals from app.js, blocks.js and helper.js. */
'use strict';

const editor = () => $('code');
const MB_NAMES = /\b(display|button_[ab]|accelerometer|compass|sleep|Image|pin\d+|temperature|running_time|music|radio)\b/;
const KNOWN_IMAGES = new Set(ICONS.map(([, v]) => v).concat(['HEART', 'ALL_CLOCKS', 'ALL_ARROWS', 'CLOCK1', 'CLOCK2', 'CLOCK3', 'CLOCK4', 'CLOCK5',
  'CLOCK6', 'CLOCK7', 'CLOCK8', 'CLOCK9', 'CLOCK10', 'CLOCK11', 'CLOCK12', 'ARROW_NE', 'ARROW_SE', 'ARROW_SW', 'ARROW_NW', 'STICKFIGURE',
  'MUSIC_CROTCHET', 'MUSIC_QUAVERS', 'XMAS', 'DUCK']));

// Jump to a line in the code editor and select it
function showLine(n) {
  showView('manager');
  const ta = editor(), lines = ta.value.split('\n');
  if (n < 1 || n > lines.length) return;
  const start = lines.slice(0, n - 1).reduce((a, l) => a + l.length + 1, 0);
  ta.focus(); ta.setSelectionRange(start, start + lines[n - 1].length);
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 18;
  ta.scrollTop = Math.max(0, (n - 4) * lh);
  ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
const lineBtn = (n, label = `Show me line ${n}`) => [label, () => showLine(n), true];

/* ------------------------------------------------------ static check */
function stripStrings(line) {
  return line.replace(/#.*$/, '').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '""');
}

function checkPython() {
  const src = editor().value;
  const tips = [];
  const err = explainPyError();
  if (err) tips.push(err);
  if (!src.trim()) {
    tips.push({ html: '📝 The code editor is empty! Ask me something like <b>“how do I make a dice?”</b> and I\'ll give you some Python to start with.' });
    return tips;
  }
  const lines = src.split('\n');
  const usesMB = MB_NAMES.test(src.replace(/#.*$/gm, ''));
  if (usesMB && !/^\s*(from microbit import \*|import microbit)/m.test(src)) {
    tips.push({ html: '📦 Your code uses micro:bit things (like <code>display</code> or <code>button_a</code>) but doesn\'t <b>import</b> them. Add this as the very first line:<pre>from microbit import *</pre>',
      actions: [['➕ Add it for me', () => { editor().value = 'from microbit import *\n' + editor().value; say('✅ Added <code>from microbit import *</code> at the top.'); }, true]] });
  }
  if (/^\t/m.test(src) && /^ +\S/m.test(src)) {
    tips.push({ html: '↹ Your code mixes <b>tabs</b> and <b>spaces</b> for indenting. Python gets confused! Use 4 spaces everywhere.',
      actions: [['🧹 Fix it for me', () => { editor().value = editor().value.replace(/\t/g, '    '); say('✅ Swapped every tab for 4 spaces.'); }, true]] });
  }
  let depth = 0, found = 0;
  const indentOf = (l) => l.match(/^\s*/)[0].replace(/\t/g, '    ').length;
  for (let i = 0; i < lines.length && found < 6; i++) {
    const raw = lines[i], code = stripStrings(raw).trimEnd(), s = code.trim();
    const n = i + 1;
    if (!s) continue;
    if (/^(if|elif|else|for|while|def|try|except|finally|with|class)\b/.test(s) && !s.endsWith(':')) {
      tips.push({ html: `➿ Line ${n} starts with <code>${esc(s.split(/[\s(:]/)[0])}</code> but doesn't end with a <b>colon</b> <code>:</code>. Lines like this always need one.`, actions: [lineBtn(n)] }); found++;
    }
    if (/^(if|elif|while)\b/.test(s) && /[^=!<>]=[^=]/.test(s.replace(/\(.*\)/, ''))) {
      tips.push({ html: `🟰 Line ${n} uses <code>=</code> in a check. In Python, <code>=</code> <b>stores</b> a value and <code>==</code> <b>compares</b>. Use <code>==</code> here.`, actions: [lineBtn(n)] }); found++;
    }
    if (s.endsWith(':')) {
      const next = lines.slice(i + 1).findIndex((l) => l.trim() && !l.trim().startsWith('#'));
      if (next === -1 || indentOf(lines[i + 1 + next]) <= indentOf(raw)) {
        tips.push({ html: `⇥ Line ${n} ends with <code>:</code>, so the next line must be <b>indented</b> (moved right with 4 spaces). That's how Python knows which lines belong inside.`, actions: [lineBtn(n)] }); found++;
      }
    }
    const m = s.match(/\b(button_[ab]\.(?:is_pressed|was_pressed|get_presses)|accelerometer\.(?:get_[xyz]|current_gesture)|compass\.heading|temperature|running_time|display\.read_light_level|display\.clear|pin\d+\.(?:is_touched|read_digital|read_analog))\b(?!\s*\()/);
    if (m) { tips.push({ html: `🔘 Line ${n}: <code>${esc(m[1])}</code> is missing its brackets. Write <code>${esc(m[1])}()</code> so it actually runs and gives you an answer.`, actions: [lineBtn(n)] }); found++; }
    const c = s.match(/\b(Print|Sleep|Display|While|If|For|true|false|none|TRUE|FALSE)\b/);
    if (c) {
      const fix = { Print: 'print', Sleep: 'sleep', Display: 'display', While: 'while', If: 'if', For: 'for', true: 'True', false: 'False', none: 'None', TRUE: 'True', FALSE: 'False' }[c[1]];
      tips.push({ html: `🔠 Line ${n}: Python cares about capital letters. Write <code>${fix}</code>, not <code>${esc(c[1])}</code>.`, actions: [lineBtn(n)] }); found++;
    }
    const sl = s.match(/\bsleep\(\s*(\d*\.?\d+)\s*\)/);
    if (sl && +sl[1] < 20) { tips.push({ html: `⏱️ Line ${n}: <code>sleep(${sl[1]})</code> only waits ${sl[1]} <b>millisecond${sl[1] === '1' ? '' : 's'}</b> (thousandths of a second). For 1 second, use <code>sleep(1000)</code>.`, actions: [lineBtn(n)] }); found++; }
    for (const im of s.matchAll(/\bImage\.([A-Za-z_0-9]+)/g)) {
      if (!KNOWN_IMAGES.has(im[1])) { tips.push({ html: `🖼️ Line ${n}: there's no picture called <code>Image.${esc(im[1])}</code>. Try <code>Image.HAPPY</code>, <code>Image.HEART</code> or <code>Image.SMILE</code>. They're always in CAPITALS.`, actions: [lineBtn(n)] }); found++; }
    }
    const rest = raw.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, '').replace(/#.*$/, '');  // drop complete strings + comments
    if (/['"]/.test(rest)) { tips.push({ html: `💬 Line ${n} has a quote mark <code>"</code> or <code>'</code> that's never closed. Words in Python need a quote at the start <b>and</b> the end.`, actions: [lineBtn(n)] }); found++; }
    for (const ch of code) { if (ch === '(' || ch === '[') depth++; if (ch === ')' || ch === ']') depth--; }
    if (depth < 0) { tips.push({ html: `🔚 Line ${n} closes a bracket <code>)</code> that was never opened.`, actions: [lineBtn(n)] }); found++; depth = 0; }
  }
  if (depth > 0) tips.push({ html: '🔓 Somewhere a bracket <code>(</code> is opened but never closed with <code>)</code>. Count your brackets!' });
  if (/while\s+True\s*:/.test(src) && !/sleep\(/.test(src) && /(print|display\.)/.test(src)) {
    tips.push({ html: '⏩ Your <code>while True:</code> loop never pauses, so it runs super fast. Add <code>sleep(100)</code> inside it so the micro:bit has time to breathe.' });
  }
  if (!tips.length) {
    tips.push({ html: `✅ I couldn't spot any mistakes! Press <b>Run</b> to try it${port ? '' : ' (connect the micro:bit first)'}. If it shows an error in the console, ask me again and I'll explain it.` });
  }
  return tips;
}

/* -------------------------------------------- traceback explanations */
function lastTraceback() {
  const text = $('term').textContent;
  const at = text.lastIndexOf('Traceback (most recent call last)');
  if (at < 0) return null;
  const tb = text.slice(at).split('\n').slice(0, 12).join('\n');
  // ignore it if the code has been run again successfully since (a newer ">>> " after a newer "running")
  return tb;
}

function explainPyError() {
  const tb = lastTraceback(); if (!tb) return null;
  const lines = tb.split('\n').map((l) => l.trim()).filter(Boolean);
  const last = lines.find((l) => /^\w*(Error|Exception|Interrupt)\b/.test(l)) || lines[lines.length - 1];
  const lineNo = +((tb.match(/line (\d+)/g) || []).pop() || '').replace(/\D/g, '') || null;
  const R = [
    [/KeyboardInterrupt/, null],
    [/IndentationError: unexpected indent/, 'A line is pushed right (indented) when it shouldn\'t be. Line it up with the lines above it.'],
    [/IndentationError: (expected an indented block|unindent)/, 'After a line ending in <code>:</code> the next lines must be indented by 4 spaces, and lines in the same block must line up exactly.'],
    [/SyntaxError/, 'Python couldn\'t read that line. Look for a missing <code>:</code>, a bracket or quote that isn\'t closed, or a typo.'],
    [/NameError: name '(\w+)'/, (m) => MB_NAMES.test(m[1])
      ? `<code>${esc(m[1])}</code> is a micro:bit thing, but it wasn't imported. Put <code>from microbit import *</code> at the top.`
      : `Python doesn't know anything called <code>${esc(m[1])}</code>. Check the spelling (and capital letters), or give it a value before you use it.`],
    [/AttributeError: type object 'Image' has no attribute '(\w+)'/, (m) => `There's no picture called <code>Image.${esc(m[1])}</code>. Try <code>Image.HAPPY</code> or <code>Image.HEART</code>.`],
    [/AttributeError: '(\w+)' object has no attribute '(\w+)'/, (m) => `<code>${esc(m[2])}</code> isn't something a ${esc(m[1].replace('MicroBit', ''))} can do. Check the spelling. For example, it's <code>is_pressed()</code>, not <code>ispressed()</code>.`],
    [/TypeError: can't convert .* to str|must be str|unsupported types for __add__: 'str'|can only concatenate|cannot concatenate/, 'You tried to join <b>words</b> and a <b>number</b> with <code>+</code>. Turn the number into words first: <code>"Score: " + str(score)</code>'],
    [/TypeError: (?:function )?takes (\d+) positional arguments? but (\d+)/, (m) => `A function was given ${m[2]} things inside its brackets, but it only wants ${m[1]}. Check the commas.`],
    [/TypeError: 'int' object is not callable|object isn't callable/, 'There are brackets <code>()</code> after something that isn\'t a function, maybe a variable with the same name as a function.'],
    [/ValueError: (index out of range|brightness)/, 'An LED number was out of range: <b>x</b> and <b>y</b> must be 0 to 4, and brightness 0 to 9.'],
    [/ImportError: no module named '(\w+)'/, (m) => `The micro:bit doesn't have a module called <code>${esc(m[1])}</code>. Check the spelling. The usual one is <code>from microbit import *</code>.`],
    [/MemoryError/, 'Your program used up all of the micro:bit\'s memory (just 16 KB!). Make lists smaller or remove some code.'],
    [/ZeroDivisionError/, 'Something was divided by <b>zero</b>, which is impossible.'],
    [/OSError: 28|ENOSPC/, 'The micro:bit\'s storage is full. Delete some files in the Files panel.'],
  ];
  for (const [re, text] of R) {
    const m = last.match(re);
    if (!m) continue;
    if (text === null) return null;
    const body = typeof text === 'function' ? text(m) : text;
    return { html: `🐞 The micro:bit reported an error${lineNo ? ` on <b>line ${lineNo}</b>` : ''}:<div class="hm-err"><code>${esc(last)}</code></div>${body}`,
      actions: lineNo ? [lineBtn(lineNo)] : [] };
  }
  return { html: `🐞 The micro:bit reported: <div class="hm-err"><code>${esc(last)}</code></div>${lineNo ? `Have a look at line ${lineNo}.` : 'Check the line you changed last.'}`, actions: lineNo ? [lineBtn(lineNo)] : [] };
}

/* ------------------------------------------------------ concepts */
const PY_CONCEPTS = [
  { keys: 'indent indentation indented spaces tab tabs line up block', html: '⇥ <b>Indentation</b> means pushing lines to the right with spaces. Python uses it to know which lines belong <b>inside</b> an <code>if</code>, loop or function:<pre>if button_a.is_pressed():\n    display.show(Image.HAPPY)   # inside the if\nsleep(100)                      # outside</pre>Use 4 spaces each time.' },
  { keys: 'import from module microbit library', html: '📦 <code>import</code> brings in ready-made tools. <code>from microbit import *</code> gives you <code>display</code>, <code>button_a</code>, <code>sleep</code> and more. Put it at the top of every micro:bit program.' },
  { keys: 'variable variables store remember box value', html: '📦 A <b>variable</b> is a named box that remembers a value:<pre>score = 0\nscore = score + 1\ndisplay.scroll(score)</pre>' },
  { keys: 'loop loops while true forever repeat for range again', html: '🔁 <b>Loops</b> repeat code. <code>while True:</code> repeats forever, and <code>for i in range(3):</code> repeats 3 times:<pre>for i in range(3):\n    display.scroll("hi")</pre>' },
  { keys: 'if else elif condition decision check compare', html: '🔀 <code>if</code> checks something and picks what to do:<pre>if temperature() > 25:\n    display.show(Image.SAD)\nelif temperature() < 10:\n    display.show(Image.ASLEEP)\nelse:\n    display.show(Image.HAPPY)</pre>' },
  { keys: 'equals == = double equal compare assign', html: '🟰 <code>=</code> <b>stores</b> a value (<code>x = 5</code>). <code>==</code> <b>asks</b> if two things are the same (<code>if x == 5:</code>).' },
  { keys: 'function functions def define call', html: '🧩 A <b>function</b> is a named recipe you can use again and again:<pre>def celebrate():\n    display.show(Image.HAPPY)\n    sleep(500)\n\ncelebrate()   # use it</pre>' },
  { keys: 'string strings text words quotes letters', html: '🔤 A <b>string</b> is text inside quotes: <code>"hello"</code>. To join text and a number, turn the number into text with <code>str()</code>: <code>"Score " + str(score)</code>' },
  { keys: 'print console output', html: '💬 <code>print("hello")</code> sends text to the <b>console</b> on the computer. Handy for checking what your code is doing!' },
  { keys: 'sleep pause wait millisecond milliseconds delay', html: '⏱️ <code>sleep(1000)</code> waits 1000 <b>milliseconds</b> = 1 second. <code>sleep(500)</code> is half a second.' },
  { keys: 'comment comments hash note', html: '#️⃣ Anything after <code>#</code> is a <b>comment</b>: a note for humans. Python ignores it.' },
  { keys: 'list lists array items', html: '📋 A <b>list</b> holds lots of values in order: <code>pets = ["cat", "dog"]</code>. <code>pets[0]</code> is the first one, <code>"cat"</code>.' },
  { keys: 'true false boolean bool', html: '✅ <code>True</code> and <code>False</code> (with capital letters!) are <b>booleans</b>: yes/no answers, like <code>button_a.is_pressed()</code> gives.' },
  { keys: 'traceback error errors bug red', html: '🐞 A <b>traceback</b> is Python telling you what went wrong. The <b>last line</b> says the problem and the <b>line number</b> says where. Ask me “check my code” and I\'ll explain it!' },
  { keys: 'repl >>> prompt console type interactive', html: '⌨️ The <b>REPL</b> is the <code>&gt;&gt;&gt;</code> prompt in the console. Type a line of Python and the micro:bit runs it straight away. Try <code>display.scroll("hi")</code>!' },
];

function recipeToPython(r) {
  const tmp = new Blockly.Workspace();
  try {
    for (const json of r.blocks) Blockly.serialization.blocks.append(json, tmp);
    return toPython(tmp);
  } finally { tmp.dispose(); }
}

function pyRecipeMessage(r) {
  if (!r.blocks) return say(`<b>${esc(r.title)}</b>: ${r.say}`);
  const code = recipeToPython(r);
  say(`<b>${esc(r.title)}</b> in Python:<pre class="hm-code">${esc(code)}</pre>`, {
    actions: [
      ['📥 Put it in the code editor', () => {
        const ta = editor();
        if (ta.value.trim() && !confirm('Replace the code in the editor with this example?')) return;
        ta.value = code; showView('manager'); ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
        say('✅ It\'s in the editor. Press <b>Run</b> to try it, then change it to make it your own!');
      }, true],
      ['📋 Copy', () => { navigator.clipboard?.writeText(code); say('📋 Copied!'); }],
    ],
  });
}

function askPython(q) {
  if (STUCK.test(q) || /^check/i.test(q)) {
    const tips = checkPython();
    say(tips.length > 1 ? `I read your Python and found <b>${tips.length}</b> things:` : 'I read your Python:');
    tips.forEach((t) => say(t.html, { actions: t.actions }));
    return;
  }
  if (/^(hi|hello|hey)\b/i.test(q)) return say('Hello! 👋 I can check your Python, explain errors, or answer questions like “what is indentation?”.');
  const words = q.toLowerCase().split(/[^a-z0-9=>]+/).filter((w) => w.length > 1);
  let best = null, bestScore = 0;
  for (const c of PY_CONCEPTS) {
    const keys = c.keys.split(' ');
    const s = words.filter((w) => keys.includes(w) || (w.length > 3 && keys.some((k) => k.length > 3 && (k.startsWith(w) || w.startsWith(k))))).length;
    if (s > bestScore) { best = c; bestScore = s; }
  }
  const recipe = matchRecipe(q);
  const howTo = /\b(how|make|build|create|program|code for|example)\b/i.test(q);
  if (recipe && (howTo || !best)) { pyRecipeMessage(recipe); return; }
  if (best) { say(best.html); if (recipe) say('Want an example program?', { actions: [[`🐍 ${recipe.title}`, () => pyRecipeMessage(recipe)]] }); return; }
  say('Hmm, I\'m not sure about that one. 🤔 Try one of these:', {
    actions: ['Check my code', 'What is indentation?', 'How do I make a dice?', 'What does = vs == mean?', 'What is a loop?'].map((t) => [t, () => ask(t)]),
  });
}
