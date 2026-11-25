/* Arcade: little games bought with Bit Bucks in the shop. Each game has a battery: every play
 * uses one charge, and charges come back slowly (the "charger"). The games use quiz questions,
 * so playing is practice too. Uses HS/saveHS/BB/esc/QUESTIONS/boardReact/confetti from other files. */
'use strict';

const ARCADE = {
  dig: { name: 'Diamond Dig', icon: '💎', price: 500, color: '#2f81f7',
    blurb: 'Tunnel through the mine for gems: deeper is richer! Hard rocks only break if you answer a question.' },
  snake: { name: 'Quiz Snake', icon: '🐍', price: 700, color: '#1a7f37',
    blurb: 'Steer the snake to eat the right answer and grow. Wrong answers cost a life, and it gets faster!' },
  balloons: { name: 'Balloon Pop', icon: '🎈', price: 900, color: '#d1242f',
    blurb: 'Pop the balloon with the right answer before it floats away. Right answers in a row build combos!' },
};
const GAME_CHARGES = 3;
const RECHARGE_MS = 15 * 60 * 1000;   // one charge every 15 minutes
const LOAD_MS = 4000;                 // the "charging up" loading screen

const games = () => (HS.games = HS.games || { owned: [], charges: {}, updated: {}, best: {} });

function gameCharge(id) {
  const g = games(); const now = Date.now();
  let c = g.charges[id] ?? GAME_CHARGES, t = g.updated[id] ?? now;
  if (c < GAME_CHARGES) {
    const gained = Math.floor((now - t) / RECHARGE_MS);
    if (gained > 0) { c = Math.min(GAME_CHARGES, c + gained); t = c >= GAME_CHARGES ? now : t + gained * RECHARGE_MS; g.charges[id] = c; g.updated[id] = t; }
  }
  return { charges: c, nextMs: c >= GAME_CHARGES ? 0 : Math.max(0, RECHARGE_MS - (now - t)) };
}
function useCharge(id) {
  const { charges } = gameCharge(id);
  if (charges < 1) return false;
  const g = games();
  if (charges >= GAME_CHARGES) g.updated[id] = Date.now();  // the recharge clock starts now
  g.charges[id] = charges - 1; saveHS();
  return true;
}
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const batteryHTML = (id) => {
  const { charges, nextMs } = gameCharge(id);
  return `<span class="arc-batt" title="${charges} of ${GAME_CHARGES} charges">${Array.from({ length: GAME_CHARGES }, (_, i) => `<i class="${i < charges ? 'on' : ''}"></i>`).join('')}</span>
    <span class="arc-batt-t">${charges ? `${charges} play${charges > 1 ? 's' : ''} left` : '🔌 charging'}${nextMs ? ` · next charge in <b data-next="${id}">${mmss(nextMs)}</b>` : ''}</span>`;
};

/* ------------------------------------------------------------ questions */
function arcadeQuestion(n = 3) {
  const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const wrong = shuffle(q.a.slice(1)).slice(0, n - 1);
  const opts = shuffle([{ t: q.a[0], ok: true }, ...wrong.map((t) => ({ t, ok: false }))]);
  return { q: q.q, answers: opts.map((o) => o.t), correct: opts.findIndex((o) => o.ok), why: q.why };
}

/* ----------------------------------------------------- shop + arcade tab */
function shopGamesHTML() {
  return `<h3 class="wr-pool">🕹️ Games <span class="muted">(each has a battery: ${GAME_CHARGES} plays, then it recharges)</span></h3>
    <div class="arc-shop">${Object.entries(ARCADE).map(([id, g]) => {
      const own = games().owned.includes(id);
      return `<div class="arc-card" style="--gc:${g.color}"><span class="arc-ico">${g.icon}</span><b>${g.name}</b><span class="muted">${g.blurb}</span>
        ${own ? '<span class="arc-owned">✓ You own this: play it in 🕹️ Games</span>' : `<button class="primary" data-buygame="${id}" ${HS.bucks >= g.price ? '' : 'disabled'}>Buy ${BB(g.price)}</button>`}</div>`;
    }).join('')}</div>`;
}
function bindShopGames() {
  document.querySelectorAll('[data-buygame]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.buygame, g = ARCADE[id];
    if (HS.bucks < g.price || games().owned.includes(id)) return;
    if (!confirm(`Buy ${g.name} for ${g.price} Bit Bucks? It comes fully charged with ${GAME_CHARGES} plays.`)) return;
    HS.bucks -= g.price; games().owned.push(id); games().charges[id] = GAME_CHARGES; saveHS();
    shopMsg = `🕹️ You bought <b>${g.name}</b>! Play it in the 🕹️ Games tab.`;
    renderWardrobe(); if (!hPanel.hidden) renderHelperTop();
  }));
}
function renderArcade() {
  const box = $('wr-games'); if (!box) return;
  const owned = Object.entries(ARCADE).filter(([id]) => games().owned.includes(id));
  const chipsFound = (games().world || []).length;
  const world = typeof openBlockyWorld === 'function' ? `<div class="arc-card arc-world" style="--gc:#1f7a50"><span class="arc-ico">🌍</span><b>Bit's Blocky World <span class="arc-free-tag">FREE</span></b>
      <span class="muted">Walk around a giant micro:bit island and find the ⭐ chips. Each one teaches you a part of the micro:bit.</span>
      <span class="muted">⭐ <b>${chipsFound}</b>/9 chips found · no battery needed</span>
      <button class="primary" id="arc-world">▶ Explore</button></div>` : '';
  box.innerHTML = world + (owned.length ? `<p class="muted">Each play uses one charge. Charges come back by themselves: one every ${RECHARGE_MS / 60000} minutes.</p>
    <div class="arc-shop">${owned.map(([id, g]) => `<div class="arc-card" style="--gc:${g.color}"><span class="arc-ico">${g.icon}</span><b>${g.name}</b>
      <div class="arc-battrow">${batteryHTML(id)}</div>
      <span class="muted">Best score: <b>${games().best[id] || 0}</b></span>
      <button class="primary" data-play="${id}" ${gameCharge(id).charges ? '' : 'disabled'}>▶ Play</button></div>`).join('')}</div>`
    : `<div class="arc-empty"><div class="arc-ico">🕹️</div><p>You haven't bought any arcade games yet.</p><p class="muted">Buy them in the 🛒 Shop with Bit Bucks. They're expensive, so save up!</p>
      <button class="primary" id="arc-toshop">🛒 Go to the shop</button></div>`);
  $('arc-world')?.addEventListener('click', openBlockyWorld);
  $('arc-toshop')?.addEventListener('click', () => wardrobe.querySelector('.wr-tabs [data-t="shop"]').click());
  box.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => launchGame(b.dataset.play)));
}
setInterval(() => {  // tick the "next charge in" countdowns
  document.querySelectorAll('[data-next]').forEach((el) => {
    const { charges, nextMs } = gameCharge(el.dataset.next);
    if (!nextMs || charges >= GAME_CHARGES) { if (typeof renderArcade === 'function') renderArcade(); return; }
    el.textContent = mmss(nextMs);
  });
}, 1000);

/* ------------------------------------------------------ launching a game */
let arcadeEl = null, arcadeStop = null;
function arcadeFrame() {
  if (!arcadeEl) {
    arcadeEl = document.createElement('div'); arcadeEl.className = 'arcade'; arcadeEl.hidden = true;
    arcadeEl.innerHTML = `<div class="arc-box" role="dialog" aria-modal="true" aria-labelledby="arc-title">
      <header class="arc-head"><b id="arc-title"></b><span id="arc-stats" class="arc-stats"></span><button id="arc-close" aria-label="Close">✕</button></header>
      <div id="arc-body" class="arc-body"></div></div>`;
    document.body.appendChild(arcadeEl);
    $('arc-close').onclick = () => {
      if (arcadeStop && !arcadeEl.classList.contains('arc-free') && !confirm('Quit this game? The charge is already used.')) return;
      closeArcade();
    };
  }
  return arcadeEl;
}
function closeArcade() { if (arcadeStop) { arcadeStop(); arcadeStop = null; } if (arcadeEl) arcadeEl.hidden = true; if (wardrobe && !wardrobe.hidden) renderWardrobe(); }
const stats = (html) => { $('arc-stats').innerHTML = html; };

function launchGame(id) {
  const g = ARCADE[id];
  if (!games().owned.includes(id)) return;
  if (!useCharge(id)) { alert(`${g.name} is out of charge. 🔌 It's recharging: next charge in ${mmss(gameCharge(id).nextMs)}.`); return; }
  if (wardrobe) wardrobe.hidden = true;
  arcadeFrame().hidden = false; arcadeEl.classList.remove('arc-free', 'arc-wide');
  $('arc-title').textContent = `${g.icon} ${g.name}`; stats('');
  const tips = { dig: 'Tip: the best gems are near the bottom of the mine!', snake: 'Tip: use the arrow keys, WASD or the on-screen arrows.', balloons: 'Tip: right answers in a row multiply your points!' };
  $('arc-body').innerHTML = `<div class="arc-loading"><div class="arc-ico big">${g.icon}</div><h2>⚡ Charging up ${g.name}…</h2>
    <div class="arc-loadbar"><i id="arc-load"></i></div><p id="arc-loadtxt" class="muted">Warming up the circuits…</p><p class="arc-tip">${tips[id]}</p></div>`;
  const steps = ['Warming up the circuits…', 'Charging the battery…', 'Loading the levels…', 'Polishing the pixels…', 'Almost ready!'];
  // a plain timer (not requestAnimationFrame) so loading keeps going even if the tab is in the background
  const t0 = performance.now();
  const loader = setInterval(() => {
    if (arcadeEl.hidden || !$('arc-load')) { clearInterval(loader); return; }
    const p = Math.min(1, (performance.now() - t0) / LOAD_MS);
    $('arc-load').style.width = (p * 100) + '%';
    $('arc-loadtxt').textContent = steps[Math.min(steps.length - 1, Math.floor(p * steps.length))];
    if (p >= 1) { clearInterval(loader); ({ dig: playDig, snake: playSnake, balloons: playBalloons })[id]($('arc-body'), (score) => arcadeOver(id, score)); }
  }, 60);
}
function arcadeOver(id, score) {
  if (arcadeStop) { arcadeStop(); arcadeStop = null; }
  const g = games(); const best = g.best[id] || 0; const newBest = score > best;
  if (newBest) g.best[id] = score;
  const bucks = Math.min(40, Math.floor(score / 8));
  HS.bucks += bucks; saveHS();
  boardReact(newBest ? "display.show(Image.HAPPY)\nsleep(500)\ndisplay.scroll('BEST!', wait=False)" : `display.scroll('${score}', wait=False)`);
  const { charges, nextMs } = gameCharge(id);
  $('arc-body').innerHTML = `<div class="arc-loading"><div class="arc-ico big">${ARCADE[id].icon}</div><h2>Game over!</h2>
    <div class="arc-final">${score}</div><p>${newBest ? '🏅 <b>New best score!</b>' : `Best: ${best}`}</p>
    <p class="qz-pay">🪙 You earned <b>${bucks} Bit Bucks</b>. You now have ${HS.bucks}.</p>
    <p class="muted">🔋 ${charges} play${charges === 1 ? '' : 's'} left${nextMs ? ` · next charge in ${mmss(nextMs)}` : ''}</p>
    <div class="row" style="justify-content:center">${charges ? `<button class="primary" id="arc-again">▶ Play again</button>` : ''}<button id="arc-done">Done</button></div></div>`;
  $('arc-again')?.addEventListener('click', () => launchGame(id));
  $('arc-done').onclick = () => { closeArcade(); openWardrobe('games'); };
  if (newBest && score > 0) confetti();
}

/* ======================================================= 💎 Diamond Dig */
function playDig(body, done) {
  const W = 7, H = 7;
  const GEMS = [['💎', 'Diamond', 50], ['💚', 'Emerald', 30], ['🪙', 'Gold', 15], ['🔩', 'Iron', 5]];
  let swings = 20, score = 0, ended = false, pending = null;
  const pick = (y) => {  // deeper rows hide better treasure
    const r = Math.random(), d = y / (H - 1);
    if (r < 0.07) return { kind: 'tnt' };
    if (r < 0.13) return { kind: 'battery' };
    if (r < 0.13 + 0.05 + d * 0.10) return { kind: 'gem', gem: GEMS[0] };
    if (r < 0.31 + d * 0.10) return { kind: 'gem', gem: GEMS[1] };
    if (r < 0.43 + d * 0.06) return { kind: 'gem', gem: GEMS[2] };
    if (r < 0.58) return { kind: 'gem', gem: GEMS[3] };
    return { kind: 'none' };
  };
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push({ x, y, rock: y > 0 && Math.random() < 0.18 + y * 0.03, dug: false, item: pick(y) });
  const at = (x, y) => cells[y * W + x];
  const open = (c) => c.y === 0 || [[0, -1], [1, 0], [-1, 0], [0, 1]].some(([dx, dy]) => { const n = at(c.x + dx, c.y + dy); return n && n.x === c.x + dx && n.dug; });
  body.innerHTML = `<div class="dig"><div class="dig-sky">☀️ <span>Dig down from the grass. Click a block next to your tunnel!</span></div>
    <div class="dig-grid" id="dig-grid" style="--w:${W}"></div><div id="dig-msg" class="dig-msg"></div><div id="dig-quiz"></div></div>`;
  const msg = (h, cls = '') => { $('dig-msg').innerHTML = h; $('dig-msg').className = 'dig-msg ' + cls; };
  const draw = () => {
    stats(`⛏️ <b>${swings}</b> swings · 💎 <b>${score}</b>`);
    $('dig-grid').innerHTML = cells.map((c, i) => {
      if (c.dug) return `<button class="dig-c dug" data-i="${i}" disabled>${c.item.kind === 'gem' ? c.item.gem[0] : c.item.kind === 'tnt' ? '💥' : c.item.kind === 'battery' ? '⚡' : ''}</button>`;
      const cls = c.y === 0 ? 'grass' : c.rock ? 'rock' : 'dirt';
      return `<button class="dig-c ${cls}${open(c) ? ' open' : ''}" data-i="${i}" aria-label="${cls} block">${c.rock ? '🪨' : ''}</button>`;
    }).join('');
    $('dig-grid').querySelectorAll('.dig-c:not(.dug)').forEach((b) => (b.onclick = () => dig(cells[+b.dataset.i], b)));
  };
  const finish = () => { if (ended) return; ended = true; setTimeout(() => done(score), 900); };
  const reveal = (c) => {
    c.dug = true; swings--;
    const it = c.item;
    if (it.kind === 'gem') { score += it.gem[2]; msg(`<span class="pop">${it.gem[0]}</span> You found <b>${it.gem[1]}</b>! +${it.gem[2]}`, 'good'); if (it.gem[2] >= 30) boardReact('display.show(Image.DIAMOND)'); }
    else if (it.kind === 'tnt') { swings = Math.max(0, swings - 3); msg('💣 <b>BOOM!</b> TNT! You lost 3 swings.', 'bad'); $('dig-grid').classList.remove('boom'); void $('dig-grid').offsetWidth; $('dig-grid').classList.add('boom'); boardReact('display.show(Image.NO)'); }
    else if (it.kind === 'battery') { swings += 4; msg('⚡ A battery! <b>+4 swings</b>', 'good'); }
    else msg('Just dirt. Keep digging!');
    draw();
    if (swings <= 0 || !cells.some((x) => !x.dug && open(x))) finish();
  };
  const dig = (c, btn) => {
    if (ended || pending) return;
    if (!open(c)) { btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope'); msg('You can only dig next to your tunnel (or the grass on top).'); return; }
    if (!c.rock) return reveal(c);
    // a hard rock: answer a question to smash it
    pending = c;
    const q = arcadeQuestion(4);
    msg('🪨 <b>Hard rock!</b> Answer the question to smash it.');
    $('dig-quiz').innerHTML = `<div class="arc-q"><b>${esc(q.q)}</b><div class="arc-opts">${q.answers.map((a, k) => `<button data-k="${k}">${'ABCD'[k]}. ${esc(a)}</button>`).join('')}</div></div>`;
    $('dig-quiz').querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      $('dig-quiz').innerHTML = '';
      pending = null;
      if (+b.dataset.k === q.correct) { c.rock = false; swings += 2; msg('💥 <b>SMASH!</b> Right answer: +2 bonus swings!', 'good'); reveal(c); }
      else { swings = Math.max(0, swings - 2); msg(`😖 The pickaxe bounced off! −2 swings. The answer was <b>${esc(q.answers[q.correct])}</b>.`, 'bad'); draw(); if (swings <= 0) finish(); }
    }));
  };
  draw();
  arcadeStop = () => { ended = true; };
}

/* ======================================================== 🐍 Quiz Snake */
function playSnake(body, done) {
  const N = 16;
  body.innerHTML = `<div class="snk"><div class="arc-q" id="snk-q"></div><canvas id="snk" width="${N * 24}" height="${N * 24}" class="arc-canvas"></canvas>
    <div class="snk-pad"><button data-d="up">▲</button><div><button data-d="left">◀</button><button data-d="down">▼</button><button data-d="right">▶</button></div></div>
    <p class="muted arc-help">Arrow keys or WASD to steer. Eat the letter of the right answer!</p></div>`;
  const cv = $('snk'), ctx = cv.getContext('2d'), S = 24;
  let snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }], dir = { x: 1, y: 0 }, next = dir;
  let lives = 3, score = 0, speed = 230, q = null, foods = [], flash = null, ended = false, timer = null, paused = 0;
  const free = () => { let p; do { p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; } while (snake.some((s) => s.x === p.x && s.y === p.y) || foods.some((f) => f.x === p.x && f.y === p.y) || Math.abs(p.x - snake[0].x) + Math.abs(p.y - snake[0].y) < 3); return p; };
  const newQ = () => {
    q = arcadeQuestion(3); foods = [];
    q.answers.forEach((_, k) => foods.push({ ...free(), k }));
    $('snk-q').innerHTML = `<b>${esc(q.q)}</b><div class="snk-legend">${q.answers.map((a, k) => `<span><i class="snk-dot c${k}">${'ABC'[k]}</i>${esc(a)}</span>`).join('')}</div>`;
  };
  const hud = () => stats(`${'❤️'.repeat(lives)}${'🖤'.repeat(3 - lives)} · 🍎 <b>${score}</b> · 🐍 ${snake.length}`);
  const hurt = (why) => {
    lives--; flash = { color: 'rgba(209,36,47,.35)', t: performance.now() }; boardReact('display.show(Image.SAD)');
    $('snk-q').insertAdjacentHTML('beforeend', `<div class="snk-msg bad">${why}</div>`);
    if (lives <= 0) { ended = true; clearInterval(timer); setTimeout(() => done(score), 900); }
  };
  const step = () => {
    if (paused > performance.now()) return draw();
    dir = next;
    const head = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N };
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      hurt('🐍 Ouch, you bumped into yourself!');
      snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]; dir = next = { x: 1, y: 0 }; paused = performance.now() + 700; return draw();
    }
    snake.unshift(head);
    const f = foods.find((o) => o.x === head.x && o.y === head.y);
    if (f) {
      if (f.k === q.correct) {
        score += 10 + snake.length; flash = { color: 'rgba(46,160,67,.35)', t: performance.now() }; boardReact('display.show(Image.YES)');
        speed = Math.max(110, speed - 10); clearInterval(timer); timer = setInterval(step, speed);
        newQ(); $('snk-q').insertAdjacentHTML('beforeend', '<div class="snk-msg good">✅ Yum, right answer! You grew.</div>');
      } else {
        snake.pop(); snake.splice(Math.max(3, snake.length - 2));
        const right = q.answers[q.correct];
        newQ(); hurt(`❌ Wrong one! The answer was <b>${esc(right)}</b>.`);
      }
    } else snake.pop();
    hud(); draw();
  };
  const draw = () => {
    ctx.fillStyle = '#10223f'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#16305a'; for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) ctx.fillRect(x * S, y * S, S, S);
    const cols = ['#ff6b6b', '#5ee7ff', '#ffd33d'];
    foods.forEach((f) => { ctx.fillStyle = cols[f.k]; ctx.beginPath(); ctx.arc(f.x * S + S / 2, f.y * S + S / 2, S / 2 - 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#10223f'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABC'[f.k], f.x * S + S / 2, f.y * S + S / 2 + 1); });
    snake.forEach((s, i) => { ctx.fillStyle = i ? '#3cc46d' : '#7ee787'; ctx.fillRect(s.x * S + 2, s.y * S + 2, S - 4, S - 4); });
    const h = snake[0]; ctx.fillStyle = '#10223f';
    ctx.fillRect(h.x * S + 7 + dir.x * 3, h.y * S + 7 + dir.y * 3, 4, 4); ctx.fillRect(h.x * S + 13 + dir.x * 3, h.y * S + 7 + dir.y * 3, 4, 4);
    if (flash && performance.now() - flash.t < 300) { ctx.fillStyle = flash.color; ctx.fillRect(0, 0, cv.width, cv.height); }
  };
  const turn = (d) => {
    const v = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[d];
    if (v && !(v.x === -dir.x && v.y === -dir.y)) next = v;
  };
  const keys = (e) => {
    const d = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[e.key];
    if (d && !arcadeEl.hidden) { e.preventDefault(); turn(d); }
  };
  document.addEventListener('keydown', keys);
  body.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); turn(b.dataset.d); }));
  newQ(); hud(); draw();
  timer = setInterval(step, speed);
  arcadeStop = () => { ended = true; clearInterval(timer); document.removeEventListener('keydown', keys); };
}

/* ======================================================= 🎈 Balloon Pop */
function playBalloons(body, done) {
  body.innerHTML = `<div class="bal"><div class="arc-q" id="bal-q"></div><canvas id="bal" width="420" height="420" class="arc-canvas"></canvas>
    <p class="muted arc-help">Click (or tap) the balloon with the right answer before it floats away!</p></div>`;
  const cv = $('bal'), ctx = cv.getContext('2d');
  const COLORS = ['#ff6b6b', '#5ee7ff', '#ffd33d', '#c9a7ff'];
  let lives = 3, score = 0, combo = 1, rise = 0.55, q = null, balloons = [], bits = [], ended = false, raf = 0, waitUntil = 0, last = performance.now();
  const hud = () => stats(`${'❤️'.repeat(lives)}${'🖤'.repeat(Math.max(0, 3 - lives))} · 🎈 <b>${score}</b>${combo > 1 ? ` · 🔥 x${combo}` : ''}`);
  const legend = (extra = '') => { $('bal-q').innerHTML = `<b>${esc(q.q)}</b><div class="snk-legend">${q.answers.map((a, k) => `<span><i class="snk-dot c${k}">${'ABC'[k]}</i>${esc(a)}</span>`).join('')}</div>${extra}`; };
  const round = () => {
    q = arcadeQuestion(3);
    const lanes = shuffle([70, 210, 350]);
    balloons = q.answers.map((_, k) => ({ k, x: lanes[k] + (Math.random() * 30 - 15), y: 470 + Math.random() * 90, sway: Math.random() * 6.28, speed: rise * (0.85 + Math.random() * 0.35), popped: false }));
    legend(); hud();
  };
  const lose = (why) => {
    lives--; combo = 1; boardReact('display.show(Image.SAD)'); legend(`<div class="snk-msg bad">${why}</div>`); hud();
    if (lives <= 0) { ended = true; setTimeout(() => done(score), 900); return; }
    waitUntil = performance.now() + 1300;
  };
  const burst = (b, good) => { for (let i = 0; i < 14; i++) bits.push({ x: b.x, y: b.y, vx: Math.cos(i) * (2 + Math.random() * 2), vy: Math.sin(i) * (2 + Math.random() * 2), c: good ? COLORS[b.k] : '#555', life: 40 }); };
  const frame = (now) => {
    if (ended && !bits.length) return;
    const dt = Math.min(50, now - last) / 16.7; last = now;
    const g = ctx.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#e8f7ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 420, 420);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; [[60, 60], [300, 90], [200, 40]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 40, 14, 0, 0, 7); ctx.fill(); });
    if (!ended && now > waitUntil) {
      if (waitUntil) { waitUntil = 0; round(); }
      balloons.forEach((b) => { if (!b.popped) { b.y -= b.speed * dt * 1.6; b.sway += 0.03 * dt; } });
      const right = balloons.find((b) => b.k === q.correct);
      if (right && !right.popped && right.y < -40) lose(`💨 The right balloon floated away! It was <b>${esc(q.answers[q.correct])}</b>.`);
    }
    balloons.forEach((b) => {
      if (b.popped) return;
      const x = b.x + Math.sin(b.sway) * 10;
      ctx.strokeStyle = '#666'; ctx.beginPath(); ctx.moveTo(x, b.y + 30); ctx.quadraticCurveTo(x - 8, b.y + 50, x, b.y + 70); ctx.stroke();
      ctx.fillStyle = COLORS[b.k]; ctx.beginPath(); ctx.ellipse(x, b.y, 26, 32, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - 9, b.y - 12, 6, 10, -0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#10223f'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABC'[b.k], x, b.y + 1);
      b.drawX = x;
    });
    bits = bits.filter((p) => p.life-- > 0);
    bits.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.15 * dt; ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 5, 5); });
    raf = requestAnimationFrame(frame);
  };
  cv.addEventListener('pointerdown', (e) => {
    if (ended || waitUntil) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * (420 / r.width), y = (e.clientY - r.top) * (420 / r.height);
    const b = balloons.find((o) => !o.popped && Math.hypot(x - (o.drawX ?? o.x), (y - o.y) * 0.85) < 34);
    if (!b) return;
    b.popped = true;
    if (b.k === q.correct) {
      burst(b, true); score += 10 * combo; combo = Math.min(5, combo + 1); rise = Math.min(1.6, rise + 0.06);
      boardReact('display.show(Image.YES)'); legend('<div class="snk-msg good">🎉 POP! Right answer!</div>'); hud();
      waitUntil = performance.now() + 700;
    } else { burst(b, false); lose(`❌ Not that one! The answer was <b>${esc(q.answers[q.correct])}</b>.`); }
  });
  round(); raf = requestAnimationFrame(frame);
  arcadeStop = () => { ended = true; bits = []; cancelAnimationFrame(raf); };
}
