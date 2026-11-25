/* Quiz: multiple-choice questions on what the tour and Inside tab teach, plus hands-on
 * challenges checked live on the micro:bit. Uses helpers from app.js and inside/howitworks. */
'use strict';

// q: question, a: [correct, wrong, wrong, wrong], why: explanation, learn: where to read more
const QUESTIONS = [
  { q: 'Which part of the micro:bit actually runs your program?', a: ['The processor (nRF51822)', 'The interface chip', 'The accelerometer', 'The LED screen'],
    why: 'The processor is the brain. MicroPython and your program live there.', learn: { part: 'cpu' } },
  { q: 'What is the interface chip\'s job?', a: ['Handling USB and copying programs into the processor', 'Running your program', 'Measuring temperature', 'Lighting the LEDs'],
    why: 'It acts like a USB drive and flashes programs into the processor. Your code never runs on it.', learn: { part: 'kl26' } },
  { q: 'Button A is being pressed. What does its processor pin read?', a: ['0', '1', '255', '3.3'],
    why: 'Pressing connects the wire to GND (0 V), so the pin reads 0. On the micro:bit, 0 means pressed!', learn: { topic: 'buttons' } },
  { q: 'What does a pull-up resistor do for a button?', a: ['Holds the wire at 3.3 V (a 1) when the button isn\'t pressed', 'Makes the button harder to press', 'Stores the program', 'Makes the LEDs brighter'],
    why: 'Without it, the wire would “float” and give random readings when the switch is open.', learn: { topic: 'buttons' } },
  { q: 'To use a touch pin, what should you hold with your other hand?', a: ['GND', '3V', 'Button B', 'The USB cable'],
    why: 'Your body completes the circuit from the pin to GND, which pulls the pin\'s voltage down.', learn: { topic: 'touch' } },
  { q: 'What is inside the accelerometer chip?', a: ['A tiny weight on springs', 'A tiny compass needle', 'A tiny camera', 'A tiny battery'],
    why: 'When you tilt or shake the board, the weight moves and changes the capacitance of tiny plates.', learn: { topic: 'accel' } },
  { q: 'How do the sensors send their numbers to the processor?', a: ['Over the I²C bus (two wires: SDA and SCL)', 'Over Wi-Fi', 'Through the USB cable', 'By flashing the LEDs'],
    why: 'I²C uses one wire for data (SDA) and one for the clock beat (SCL). Each chip has its own address.', learn: { topic: 'accel' } },
  { q: 'How does the micro:bit measure light?', a: ['It uses its LEDs backwards', 'With a tiny camera', 'With a solar panel', 'With the temperature sensor'],
    why: 'Light drains charge from the LEDs. The faster it drains, the brighter it is.', learn: { topic: 'light' } },
  { q: 'The micro:bit is lying flat on a table. About what does the accelerometer\'s z show?', a: ['−1000 (gravity!)', '0', '255', '16'],
    why: 'Gravity always pulls. Lying flat, z reads about −1000, which is 1 g.', learn: { topic: 'accel' } },
  { q: 'How many LEDs are on the micro:bit screen?', a: ['25', '16', '9', '100'],
    why: 'A 5 × 5 grid makes 25 red LEDs.', learn: { part: 'leds' } },
  { q: 'How are the 25 LEDs actually wired?', a: ['As 3 rows × 9 columns', 'Each with its own wire (25 wires)', 'In one long chain', 'As 5 rows × 5 columns'],
    why: '3 × 9 needs only 12 processor pins instead of 25. The 5 × 5 layout is just how they\'re placed.', learn: { topic: 'screen' } },
  { q: 'Only one row of LEDs is on at a time. Why does the picture look steady?', a: ['The rows switch so fast your eyes blend them (persistence of vision)', 'The LEDs remember being on', 'The battery keeps them glowing', 'The processor uses magic'],
    why: 'It scans about every 6 milliseconds, far too fast for your eyes to notice.', learn: { topic: 'screen' } },
  { q: 'How many times per second does the clock crystal tick?', a: ['16 million', '16', '1,000', '1 billion'],
    why: '16 MHz means 16,000,000 ticks a second, the processor\'s heartbeat.', learn: { part: 'crystal' } },
  { q: 'How much RAM (working memory) does the micro:bit v1 have?', a: ['16 KB', '16 GB', '1 MB', '256 KB'],
    why: '16 KB is tiny! (256 KB is its flash memory, where programs are stored.)', learn: { part: 'cpu' } },
  { q: 'What does the voltage regulator do?', a: ['Turns USB\'s 5 V down to about 3.3 V', 'Counts button presses', 'Sends radio messages', 'Measures the light level'],
    why: '5 V would be too much for the chips. The regulator makes a safe 3.3 V.', learn: { part: 'reg' } },
  { q: 'The micro:bit reads 20 °C. What is that in Fahrenheit?', a: ['68 °F', '36 °F', '52 °F', '100 °F'],
    why: '°F = °C × 9 ÷ 5 + 32 → 20 × 9 ÷ 5 = 36, then 36 + 32 = 68 °F.', learn: { topic: 'temp' } },
  { q: 'Where is the micro:bit\'s temperature sensor?', a: ['Inside the processor chip', 'In the battery socket', 'Under button B', 'In the antenna'],
    why: 'It measures the processor chip itself, so it often reads a little warmer than the room.', learn: { topic: 'temp' } },
  { q: 'What is the micro:bit\'s radio antenna?', a: ['A zig-zag copper track printed on the board', 'A metal rod you pull out', 'A wire inside the USB cable', 'One of the LEDs'],
    why: 'It\'s a carefully shaped line of copper in the top corner of the board.', learn: { part: 'antenna' } },
  { q: 'What turns a sensor\'s tiny electrical signal into a number?', a: ['An ADC (analogue-to-digital converter)', 'A pull-up resistor', 'The USB socket', 'The reset button'],
    why: 'The ADC measures the voltage and turns it into a number the processor can use.', learn: { topic: 'accel' } },
  { q: 'One bit can hold…', a: ['Either 0 or 1', 'Any number from 0 to 9', 'A whole word', 'A picture'],
    why: 'A bit is the smallest piece of computer information: just 0 or 1.', learn: { topic: 'binary' } },
  { q: 'What is 101 in binary as a normal number?', a: ['5', '101', '3', '6'],
    why: '101 = (1 × 4) + (0 × 2) + (1 × 1) = 5.', learn: { topic: 'binary' } },
  { q: 'How many bits are in a byte?', a: ['8', '2', '10', '16'],
    why: 'A byte is 8 bits. The accelerometer sends each reading as 2 bytes (16 bits).', learn: { topic: 'binary' } },
  { q: 'What is 1111 in binary as a normal number?', a: ['15', '4', '1111', '16'],
    why: '1111 = 8 + 4 + 2 + 1 = 15. Each place is worth double the one to its right.', learn: { topic: 'binary' } },
  { q: 'What is the biggest number one byte (8 bits) can hold?', a: ['255', '8', '256', '100'],
    why: 'All 8 switches on: 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255. With 0, that makes 256 different numbers.', learn: { topic: 'binary' } },
  { q: 'How is the letter A stored inside a computer?', a: ['As the number 65 (01000001)', 'As a tiny picture of an A', 'As the word “A”', 'It can\'t be stored'],
    why: 'Every letter has a number code. A = 65, B = 66, and so on, all stored as bits.', learn: { topic: 'binary' } },
  { q: 'What can the magnetometer detect?', a: ['The Earth\'s magnetic field and magnets', 'Sound', 'Light', 'Heat'],
    why: 'That\'s why it works as a compass, and why a fridge magnet makes the number jump.', learn: { topic: 'compass' } },
  { q: 'Two micro:bits want to talk by radio. What must match?', a: ['Their radio group number', 'Their colour', 'Their battery level', 'Their names'],
    why: 'Only micro:bits in the same group (0–255) hear each other.', learn: { part: 'antenna' } },
  { q: 'How does the processor talk to the buttons, LEDs and pins?', a: ['Through GPIO pins (on/off wires)', 'Over the radio', 'Through the interface chip', 'Over the I²C bus'],
    why: 'GPIO pins are wires the processor can switch on and off, or read as 1 or 0.', learn: { part: 'buttons' } },
  { q: 'Which link does the interface chip use to put your program into the processor?', a: ['SWD (a debug link)', 'I²C', 'The radio', 'The LED screen'],
    why: 'SWD is a special programming link. The serial link (UART) carries console text.', learn: { part: 'kl26' } },
];

// Hands-on challenges: checked live on the micro:bit. check(out) gets the printed text.
const CHALLENGES = [
  { q: 'Press button B!', icon: '🔘', code: 'print(int(button_b.is_pressed()))', check: (o) => o === '1',
    why: 'Pressing B pulled pin 11 down to 0 V, and the processor saw it.' },
  { q: 'Press A and B together!', icon: '🔘', code: 'print(int(button_a.is_pressed() and button_b.is_pressed()))', check: (o) => o === '1',
    why: 'Both pins read 0 at the same time.' },
  { q: 'Touch pin 1 (hold GND with your other hand)!', icon: '👆', code: 'print(int(pin1.is_touched()))', check: (o) => o === '1',
    why: 'Your body connected pin 1 to GND and pulled its voltage down.' },
  { q: 'Turn the micro:bit screen-down!', icon: '🙃', code: "print(accelerometer.current_gesture())", check: (o) => o === 'face down',
    why: 'The tiny weight in the accelerometer felt gravity pulling the other way.' },
  { q: 'Make it dark! Cover the LED screen with your hand.', icon: '🌑', code: 'print(display.read_light_level())', check: (o) => +o < 15,
    why: 'Less light reached the LEDs, so their charge drained slowly.' },
  { q: 'Shake the micro:bit!', icon: '🤝', code: "print(int(accelerometer.was_gesture('shake')))", check: (o) => o === '1',
    why: 'The accelerometer felt a big, quick push back and forth.' },
  { q: 'Tilt the micro:bit to the left!', icon: '↩️', code: 'print(accelerometer.get_x())', check: (o) => +o < -500,
    why: 'Tilting left made the x reading go strongly negative.' },
];

/* --------------------------------------------------------------- state */
const QZ = { list: [], i: 0, score: 0, missed: [], answered: false, token: 0, best: 0 };
const QUIZ_BEST = 'microbit-quiz-best';
try { QZ.best = +localStorage.getItem(QUIZ_BEST) || 0; } catch {}

const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Show a reaction on the real micro:bit, if one is connected. Never blocks the quiz.
function boardReact(code) { if (port) rawExec(MB + code, 4000).catch(() => {}); }

/* --------------------------------------------------------------- screens */
function quizStart() {
  QZ.token++;
  const canLive = !!port;
  $('quiz-main').innerHTML = `
    <div class="qz-card qz-start">
      <div class="qz-trophy">🏆</div>
      <h2>🧒 Kid quiz</h2>
      <p>How much do you know about what's inside your micro:bit? Answer questions about the processor, buttons,
        sensors, LEDs and more.</p>
      <div class="qz-opts">
        <div class="qz-seg" role="radiogroup" aria-label="Number of questions">
          <button data-n="5">Quick · 5</button><button data-n="10" class="on">Normal · 10</button><button data-n="15">Long · 15</button>
        </div>
        <label class="check qz-hands"><input type="checkbox" id="qz-hands" ${canLive ? 'checked' : 'disabled'}>
          🖐️ Include hands-on challenges on the real micro:bit ${canLive ? '' : '<span class="muted">(connect serial first)</span>'}</label>
      </div>
      <p class="qz-prize">🎁 Finish to win one of the <b>original outfits</b> for Bit (the better your score, the better the prize; 0% gets a trash can! 🗑️) plus <b>🪙 5 Bit Bucks for every right answer</b> to spend in the shop.</p>
      <button class="primary qz-go" id="qz-go">Start quiz ▶</button>
      ${QZ.best ? `<p class="muted">Your best score so far: <b>${QZ.best}%</b></p>` : ''}
      ${canLive ? '' : `<p class="muted">Tip: connect the micro:bit and it will react to your answers. <button class="small" id="qz-connect">Connect serial</button></p>`}
    </div>`;
  let n = QZ.pendingN || QZ.settings?.n || 10;
  document.querySelectorAll('.qz-seg button').forEach((x) => x.classList.toggle('on', +x.dataset.n === n));
  document.querySelectorAll('.qz-seg button').forEach((b) => (b.onclick = () => {
    n = QZ.pendingN = +b.dataset.n; document.querySelectorAll('.qz-seg button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  $('qz-connect')?.addEventListener('click', async () => { try { await serialConnect(); quizStart(); } catch {} });
  $('qz-go').onclick = () => beginQuiz(n, $('qz-hands').checked);
}

function beginQuiz(n, wantHands) {
  QZ.settings = { n, hands: wantHands };
  {
    const hands = wantHands && port;
    const nCh = hands ? Math.max(1, Math.round(n / 5)) : 0;
    const qs = shuffle(QUESTIONS).slice(0, n - nCh).map((x) => ({ ...x, kind: 'mc' }));
    const chs = shuffle(CHALLENGES).slice(0, nCh).map((x) => ({ ...x, kind: 'hands' }));
    // spread challenges through the quiz
    const list = qs.slice();
    chs.forEach((c, k) => list.splice(Math.floor((k + 1) * list.length / (chs.length + 1)) + k, 0, c));
    Object.assign(QZ, { list, i: 0, score: 0, missed: [] });
    boardReact("display.scroll('Quiz!', wait=False)");
    showQuestion();
  }
}

function startOver() {
  if ((QZ.i > 0 || QZ.answered) && !confirm('Start over? Your answers so far will be lost.')) return;
  quizStart();
}

function header() {
  const pct = (QZ.i / QZ.list.length) * 100;
  return `<div class="qz-top"><span>Question <b>${QZ.i + 1}</b> of ${QZ.list.length}</span>
    <span class="qz-top-r"><span class="qz-score">⭐ ${QZ.score}</span>
      <button class="small qz-restart" onclick="startOver()" title="Go back to the quiz start page">↺ Start over</button></span></div>
    <div class="qz-progress"><i style="width:${pct}%"></i></div>`;
}

function showQuestion() {
  const token = ++QZ.token;
  QZ.answered = false;
  const item = QZ.list[QZ.i];
  if (item.kind === 'hands') return showChallenge(item, token);
  const opts = shuffle(item.a.map((text, k) => ({ text, ok: k === 0 })));
  $('quiz-main').innerHTML = `<div class="qz-card">${header()}
    <h2 class="qz-q">${esc(item.q)}</h2>
    <div class="qz-answers" role="radiogroup">${opts.map((o, k) => `<button class="qz-ans c${k}" role="radio" aria-checked="false" data-ok="${o.ok}"><span class="qz-key">${'ABCD'[k]}</span>${esc(o.text)}</button>`).join('')}</div>
    <div class="qz-submit-row" id="qz-submit-row">
      <span class="muted" id="qz-submit-hint">Pick an answer, then press Submit.</span>
      <button class="primary qz-submit" id="qz-submit" disabled>Submit answer ✔</button>
    </div>
    <div id="qz-feedback"></div></div>`;
  QZ.selected = null;
  document.querySelectorAll('.qz-ans').forEach((b) => (b.onclick = () => selectAnswer(b)));
  $('qz-submit').onclick = submitAnswer;
  watchBoardSubmit(token);
}

function selectAnswer(btn) {
  if (QZ.answered) return;
  QZ.selected = btn;
  document.querySelectorAll('.qz-ans').forEach((b) => { b.classList.toggle('sel', b === btn); b.setAttribute('aria-checked', b === btn); });
  $('qz-submit').disabled = false;
  $('qz-submit-hint').textContent = port ? 'Press Submit (or button A on your micro:bit) to lock it in.' : 'Happy with that? Press Submit to lock it in.';
}

function submitAnswer() {
  if (QZ.answered || !QZ.selected) return;
  $('qz-submit-row').remove();
  answer(QZ.selected);
}

// While a question is waiting, button A on the micro:bit also submits.
async function watchBoardSubmit(token) {
  if (!port) return;
  try { await rawExec(MB + 'button_a.was_pressed()', 3000); } catch { return; }  // forget earlier presses
  while (token === QZ.token && !QZ.answered && port) {
    if (!$('view-quiz').hidden) {
      let out = '';
      try { out = (await rawExec(MB + 'print(int(button_a.was_pressed()))', 3000)).trim(); } catch { return; }
      if (token !== QZ.token || QZ.answered) return;
      if (out === '1') {
        if (QZ.selected) submitAnswer();
        else { const h = $('qz-submit-hint'); if (h) h.textContent = '👆 Pick an answer on the screen first, then press A again.'; }
      }
    }
    await sleep(250);
  }
}

function answer(btn) {
  if (QZ.answered) return;
  QZ.answered = true;
  const item = QZ.list[QZ.i];
  const ok = btn.dataset.ok === 'true';
  document.querySelectorAll('.qz-ans').forEach((b) => {
    b.disabled = true;
    if (b.dataset.ok === 'true') b.classList.add('right');
    else if (b === btn) b.classList.add('wrong');
  });
  if (ok) QZ.score++; else QZ.missed.push(item);
  boardReact(ok ? 'display.show(Image.YES)' : 'display.show(Image.NO)');
  feedback(ok, item.why);
}

function feedback(ok, why, extra = '') {
  const last = QZ.i === QZ.list.length - 1;
  $('qz-feedback').innerHTML = `<div class="qz-fb ${ok ? 'ok' : 'no'}">
      <b>${ok ? pick(['🎉 Correct!', '✅ Nice one!', '🌟 Spot on!', '🚀 You got it!']) : pick(['❌ Not quite.', '🤔 Not this time.', '❌ Close, but no.'])}</b>
      <p>${why}</p>${extra}</div>
    <button class="primary qz-next" id="qz-next">${last ? 'See my results 🏁' : 'Next question →'}</button>`;
  $('qz-next').onclick = next; $('qz-next').focus();
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function next() { QZ.i++; if (QZ.i >= QZ.list.length) showResults(); else showQuestion(); }

/* ----------------------------------------------------- hands-on challenge */
async function showChallenge(item, token) {
  const SECONDS = 20;
  $('quiz-main').innerHTML = `<div class="qz-card">${header()}
    <div class="qz-challenge"><div class="qz-ch-icon">${item.icon}</div>
      <div class="qz-ch-tag">🖐️ Hands-on challenge</div>
      <h2 class="qz-q">${esc(item.q)}</h2>
      <div class="qz-timer"><i id="qz-timer-bar"></i></div>
      <p class="muted" id="qz-ch-status">Watching your micro:bit…</p>
      <button id="qz-skip">Skip</button></div>
    <div id="qz-feedback"></div></div>`;
  let done = false;
  const finish = (ok, msg) => {
    if (done || token !== QZ.token) return;
    done = true; QZ.answered = true;
    $('qz-skip').remove();
    if (ok) QZ.score++; else QZ.missed.push(item);
    boardReact(ok ? 'display.show(Image.HAPPY)' : 'display.show(Image.SAD)');
    feedback(ok, ok ? item.why : msg);
  };
  $('qz-skip').onclick = () => finish(false, 'Skipped. Try it on the micro:bit later!');
  let t0 = performance.now();
  if (item.code.includes('was_gesture')) await rawExec(MB + "accelerometer.was_gesture('shake')", 4000).catch(() => {}); // clear old shakes
  while (!done && token === QZ.token) {
    if ($('view-quiz').hidden) { const p = performance.now(); await sleep(300); t0 += performance.now() - p; continue; } // paused
    const left = SECONDS - (performance.now() - t0) / 1000;
    const bar = $('qz-timer-bar'); if (bar) bar.style.width = Math.max(0, left / SECONDS * 100) + '%';
    if (left <= 0) return finish(false, 'Time\'s up! Have another go in the Tour or the How it works tab.');
    if (!port) return finish(false, 'The micro:bit got disconnected, so this one couldn\'t be checked.');
    try {
      const out = (await rawExec(MB + item.code, 4000)).trim();
      if (token !== QZ.token) return;
      if (item.check(out)) return finish(true);
    } catch (e) {
      return finish(false, NO_MP.test(e.message) ? 'MicroPython isn\'t running on the micro:bit, so this challenge couldn\'t be checked.' : e.message);
    }
    await sleep(150);
  }
}

/* ----------------------------------------------------------- results */
function showResults() {
  QZ.token++;
  const total = QZ.list.length, pct = Math.round(QZ.score / total * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
  const msg = pct === 100 ? 'Perfect score! You\'re a micro:bit expert! 🧠'
    : pct >= 80 ? 'Brilliant! You really know how the micro:bit works.'
      : pct >= 50 ? 'Good job! A little more exploring and you\'ll be an expert.'
        : 'Nice try! Explore the Tour and the Inside tab, then try again.';
  const newBest = pct > QZ.best;
  if (newBest) { QZ.best = pct; try { localStorage.setItem(QUIZ_BEST, String(pct)); } catch {} }
  const reward = typeof awardAccessory === 'function' ? awardAccessory(pct, 'kid') : null;
  const pay = typeof earnBucks === 'function' ? earnBucks(QZ.score, total, 'kid') : null;
  boardReact(stars >= 2 ? `display.show(Image.HAPPY)\nsleep(600)\ndisplay.scroll('${QZ.score}/${total}', wait=False)` : `display.scroll('${QZ.score}/${total}', wait=False)`);
  const review = QZ.missed.map((m, k) => `<li><b>${esc(m.q)}</b>
      ${m.kind === 'mc' ? `<div>Answer: ${esc(m.a[0])}</div>` : ''}
      <div class="muted">${m.why}</div>
      ${m.learn ? `<button class="small qz-learn" data-k="${k}">📖 Learn about this</button>` : ''}</li>`).join('');
  $('quiz-main').innerHTML = `<div class="qz-card qz-results">
    <div class="qz-stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}">★</span>`).join('')}</div>
    <h2>${QZ.score} out of ${total} <span class="muted">(${pct}%)</span></h2>
    <p class="qz-msg">${msg}</p>
    ${pay ? `<p class="qz-pay">🪙 You earned <b>${pay.earned} Bit Bucks</b>${pay.bonus ? ` (including a ${pay.bonus} perfect-score bonus!)` : ''}. You now have ${HS.bucks}. <button class="small" id="qz-shop">🛒 Go to the shop</button></p>` : ''}
    ${reward ? rewardHTML(reward, pct) : ''}
    ${newBest ? '<p class="qz-best">🏅 New best score!</p>' : `<p class="muted">Best score: ${QZ.best}%</p>`}
    ${QZ.missed.length ? `<h3>Questions to look at again</h3><ol class="qz-review">${review}</ol>` : ''}
    <div class="row qz-end"><button class="primary" id="qz-home">🏠 Back to quiz start</button>
      <button id="qz-again">🔁 Play again (${QZ.settings.n} new questions)</button>
      <button id="qz-tour">🎓 Take the tour</button><button id="qz-inside">🔬 Explore Inside</button></div>
  </div>`;
  $('qz-home').onclick = quizStart;
  if (reward?.item) bindReward(reward);
  $('qz-shop')?.addEventListener('click', () => { openWardrobe(); document.querySelector('.wr-tabs [data-t="shop"]').click(); });
  $('qz-again').onclick = () => beginQuiz(QZ.settings.n, QZ.settings.hands);
  $('qz-tour').onclick = () => $('btn-tour').click();
  $('qz-inside').onclick = () => showView('inside');
  document.querySelectorAll('.qz-learn').forEach((b) => (b.onclick = () => goLearn(QZ.missed[+b.dataset.k].learn)));
  if (stars === 3) confetti();
}

function goLearn(l) {
  showView('inside');
  if (l.topic) setInsideMode('how', l.topic);
  else { setInsideMode('map'); selectPart(l.part); }
}

function confetti() {
  const box = document.createElement('div'); box.className = 'qz-confetti';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%'; p.style.animationDelay = Math.random() * 0.8 + 's';
    p.style.background = ['#ff3b30', '#f0b400', '#2f81f7', '#1a7f37', '#8957e5'][i % 5];
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3500);
}

// Number keys 1–4 / A–D answer; Enter goes to the next question.
document.addEventListener('keydown', (e) => {
  if ($('view-quiz').hidden || e.target.closest('input, textarea, select')) return;
  const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
  const btns = document.querySelectorAll('.qz-ans');
  if (k >= 0 && btns[k] && !QZ.answered) btns[k].click();
  if (e.key === 'Enter' && (!e.target.closest('button') || e.target.closest('.qz-ans'))) {
    if (!QZ.answered && QZ.selected) { e.preventDefault(); submitAnswer(); }
    else if (QZ.answered && $('qz-next')) { e.preventDefault(); $('qz-next').click(); }
  }
});

const onQuizStartPage = () => !!$('quiz-main').querySelector('.qz-start');
window.onQuizShow = () => { if (!$('quiz-main').childElementCount || !QZ.list.length || onQuizStartPage()) quizStart(); };
// Connected (or disconnected) serial in another tab: redraw the start page so the
// hands-on option matches. A quiz already in progress is left alone.
document.addEventListener('serial-change', () => { if (onQuizStartPage()) quizStart(); });
if (!$('view-quiz').hidden) quizStart();
