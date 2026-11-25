/* Teacher quizzes: a teacher writes a quiz on the class server and gets a quiz code; kids type
 * the code in the Quiz tab to take it. Answers are checked by the server; scores are saved for
 * the teacher. Teacher quizzes win the newer outfits and 10 Bit Bucks per right answer.
 * Uses globals from quiz.js, helper.js and explorer.js. */
'use strict';

const TQ = { quiz: null, i: 0, answers: [], score: 0, selected: null, answered: false };

/* ------------------------------------------------- Quiz tab start page */
const _kidQuizStart = quizStart;
quizStart = function () {
  _kidQuizStart();
  const teacher = !!(CL && getTeacherToken());
  const card = document.createElement('div');
  card.className = 'qz-card tq-card';
  card.innerHTML = `
    <h2>🏫 Teacher quiz</h2>
    <p>Got a <b>quiz code</b> from your teacher? Type it here. Teacher quizzes win the <b>new outfits</b> and
      <b>🪙 10 Bit Bucks</b> for every right answer.</p>
    <form id="tq-join" class="tq-join"><input id="tq-code" class="ex-code-in" maxlength="12" placeholder="Quiz code" autocomplete="off" aria-label="Quiz code">
      <button class="primary">Start ▶</button></form>
    <p class="tdlg-err" id="tq-err"></p>
    ${teacher ? '<p><button id="tq-manage" class="primary">👩‍🏫 Make &amp; manage class quizzes</button></p>' : '<p class="muted">👩‍🏫 Teachers: log in on the 🌍 Explorer tab to write quizzes.</p>'}`;
  $('quiz-main').appendChild(card);
  $('tq-join').onsubmit = (e) => { e.preventDefault(); startTeacherQuiz($('tq-code').value); };
  $('tq-manage')?.addEventListener('click', openQuizManager);
};

async function startTeacherQuiz(code) {
  code = (code || '').trim().toUpperCase();
  const err = (m) => { const el = $('tq-err'); if (el) el.textContent = m; };
  if (!code) return err('Type the quiz code your teacher gave you.');
  if (!CL?.code && !getTeacherToken()) return err('First join your class in the 🌍 Explorer tab (you need the class code).');
  if (!getMe() && !getTeacherToken()) return pickAccount('to take the quiz', () => { showView('quiz'); startTeacherQuiz(code); });
  try {
    const q = await exApi('/quiz/' + encodeURIComponent(code));
    QZ.token++; QZ.answered = true; QZ.selected = null;  // park the Kid quiz so its keys don't interfere
    if (q.game) return startLiveGame(q);
    Object.assign(TQ, { quiz: q, i: 0, answers: [], score: 0 });
    boardReact(`display.scroll(${JSON.stringify(q.title.slice(0, 20))}, wait=False)`);
    tqShowQuestion();
  } catch (e) { err(e.message); }
}

/* ------------------------------------------------------------ playing */
function tqHeader() {
  const n = TQ.quiz.questions.length;
  return `<div class="qz-top"><span>🏫 <b>${esc(TQ.quiz.title)}</b> · Question <b>${TQ.i + 1}</b> of ${n}</span>
    <span class="qz-top-r"><span class="qz-score">⭐ ${TQ.score}</span><button class="small" id="tq-quit">✕ Quit</button></span></div>
    <div class="qz-progress"><i style="width:${(TQ.i / n) * 100}%"></i></div>`;
}

function tqShowQuestion() {
  const item = TQ.quiz.questions[TQ.i];
  TQ.selected = null; TQ.answered = false;
  $('quiz-main').innerHTML = `<div class="qz-card">${tqHeader()}
    <h2 class="qz-q">${esc(item.q)}</h2>
    <div class="qz-answers" role="radiogroup">${item.answers.map((a, k) => `<button class="qz-ans tq-ans c${k}" role="radio" aria-checked="false" data-k="${k}"><span class="qz-key">${'ABCD'[k]}</span>${esc(a)}</button>`).join('')}</div>
    <div class="qz-submit-row" id="tq-submit-row"><span class="muted">Pick an answer, then press Submit.</span>
      <button class="primary qz-submit" id="tq-submit" disabled>Submit answer ✔</button></div>
    <div id="tq-feedback"></div></div>`;
  $('tq-quit').onclick = () => { if (confirm('Quit this quiz? Your score won\'t be saved.')) quizStart(); };
  document.querySelectorAll('.tq-ans').forEach((b) => (b.onclick = () => {
    if (TQ.answered) return;
    TQ.selected = +b.dataset.k;
    document.querySelectorAll('.tq-ans').forEach((x) => { x.classList.toggle('sel', x === b); x.setAttribute('aria-checked', x === b); });
    $('tq-submit').disabled = false;
  }));
  $('tq-submit').onclick = tqSubmit;
}

async function tqSubmit() {
  if (TQ.answered || TQ.selected === null) return;
  TQ.answered = true;
  $('tq-submit').disabled = true;
  let res;
  try { res = await exApi(`/quiz/${TQ.quiz.code}/check`, { method: 'POST', body: { i: TQ.i, choice: TQ.selected } }); }
  catch (e) { TQ.answered = false; $('tq-submit').disabled = false; $('tq-feedback').innerHTML = `<p class="tdlg-err">${esc(e.message)}</p>`; return; }
  $('tq-submit-row').remove();
  TQ.answers[TQ.i] = TQ.selected;
  if (res.correct) TQ.score++;
  document.querySelectorAll('.tq-ans').forEach((b) => {
    b.disabled = true;
    if (+b.dataset.k === res.correctIndex) b.classList.add('right');
    else if (+b.dataset.k === TQ.selected) b.classList.add('wrong');
  });
  boardReact(res.correct ? 'display.show(Image.YES)' : 'display.show(Image.NO)');
  const last = TQ.i === TQ.quiz.questions.length - 1;
  $('tq-feedback').innerHTML = `<div class="qz-fb ${res.correct ? 'ok' : 'no'}"><b>${res.correct ? '🎉 Correct!' : '❌ Not quite.'}</b>
      <p>${res.correct ? '' : `The answer is <b>${esc(res.correctText)}</b>. `}${esc(res.why || '')}</p></div>
    <button class="primary qz-next" id="tq-next">${last ? 'See my results 🏁' : 'Next question →'}</button>`;
  $('tq-next').onclick = () => { if (last) tqFinish(); else { TQ.i++; tqShowQuestion(); } };
  $('tq-next').focus();
}

async function tqFinish() {
  let res;
  try { res = await exApi(`/quiz/${TQ.quiz.code}/submit`, { method: 'POST', body: { answers: TQ.answers } }); }
  catch (e) { $('tq-feedback').insertAdjacentHTML('beforeend', `<p class="tdlg-err">${esc(e.message)}</p>`); return; }
  const pct = Math.round(res.score / res.total * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
  const reward = awardAccessory(pct, 'teacher');
  const pay = earnBucks(res.score, res.total, 'teacher');
  boardReact(`display.scroll('${res.score}/${res.total}', wait=False)`);
  $('quiz-main').innerHTML = `<div class="qz-card qz-results">
    <div class="qz-stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}">★</span>`).join('')}</div>
    <h2>${res.score} out of ${res.total} <span class="muted">(${pct}%)</span></h2>
    <p class="qz-msg">🏫 ${esc(TQ.quiz.title)}${getMe() ? `: your score is saved for your teacher, ${esc(getMe().name)}.` : ' (teacher preview, not saved)'}</p>
    <p class="qz-pay">🪙 You earned <b>${pay.earned} Bit Bucks</b>${pay.bonus ? ` (including a ${pay.bonus} perfect-score bonus!)` : ''}. You now have ${HS.bucks}. <button class="small" id="tq-shop">🛒 Go to the shop</button></p>
    ${rewardHTML(reward, pct)}
    <div class="row qz-end"><button class="primary" id="tq-home">🏠 Back to quiz start</button></div></div>`;
  if (reward.item) bindReward(reward);
  $('tq-home').onclick = quizStart;
  $('tq-shop').onclick = () => { openWardrobe('shop'); };
  if (stars === 3) confetti();
}

// Number keys / A-D pick an answer, Enter submits then goes on (the Kid quiz handler is parked meanwhile).
document.addEventListener('keydown', (e) => {
  if ($('view-quiz').hidden || !document.querySelector('.tq-ans') || document.querySelector('.lg-game') || e.target.closest('input, textarea, select')) return;
  const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
  const btns = document.querySelectorAll('.tq-ans');
  if (k >= 0 && btns[k] && !TQ.answered) btns[k].click();
  if (e.key === 'Enter') {
    if (!TQ.answered && TQ.selected !== null) { e.preventDefault(); tqSubmit(); }
    else if ($('tq-next')) { e.preventDefault(); $('tq-next').click(); }
  }
});

/* ------------------------------------------------- teacher: manage */
async function openQuizManager() {
  if (!getTeacherToken()) { showView('explorer'); return; }
  let list;
  try { list = (await exApi('/quizzes')).quizzes; } catch (e) { alert(e.message); return; }
  exDialog(`<div class="tdlg-head"><h2>📝 Class quizzes</h2><button id="tqm-close">Done ✓</button></div>
    <p class="muted">Write a quiz, then give the <b>quiz code</b> to your class. Kids type it in the 🏆 Quiz tab. Their scores show up here.</p>
    <div class="row"><button class="primary" id="tqm-new">➕ New quiz</button></div>
    <div class="tqm-list">${list.map((q) => `<div class="tqm-row" data-id="${q.id}">
        <div><b>${esc(q.title)}</b><div class="muted">${q.questions} questions · ${q.kids} kid${q.kids === 1 ? '' : 's'} took it · ${ago(q.created)}</div></div>
        <span class="tqm-code" title="Quiz code">${esc(q.code)}</span>
        <label class="check"><input type="checkbox" data-a="open" ${q.open ? 'checked' : ''}> Open</label>
        <div class="tqm-btns">${q.liveGame ? `<button class="small primary" data-a="watch" data-game="${q.liveGame.id}">📺 LIVE: watch</button>` : '<button class="small primary" data-a="game">🎮 Live game</button>'}<button class="small" data-a="results">📊 Results</button><button class="small" data-a="edit">✏️ Edit</button><button class="small danger" data-a="del">🗑️</button></div>
      </div>`).join('') || '<p class="muted">No quizzes yet. Make your first one!</p>'}</div>
    <p class="tdlg-err" id="tqm-err"></p>`, () => {
    $('tqm-close').onclick = exClose;
    $('tqm-new').onclick = () => editQuiz(null);
    exDlg.querySelectorAll('.tqm-row [data-a]').forEach((el) => {
      const id = el.closest('.tqm-row').dataset.id;
      const act = async () => {
        try {
          if (el.dataset.a === 'open') await exApi('/quizzes/' + id, { method: 'PATCH', body: { open: el.checked } });
          else if (el.dataset.a === 'game') return startGameDialog(id, el.closest('.tqm-row').querySelector('b').textContent);
          else if (el.dataset.a === 'watch') return teacherBoard(el.dataset.game);
          else if (el.dataset.a === 'results') return quizResults(id);
          else if (el.dataset.a === 'edit') return editQuiz(id);
          else if (el.dataset.a === 'del') {
            if (!confirm('Delete this quiz and all its results?')) return;
            await exApi('/quizzes/' + id, { method: 'DELETE' }); openQuizManager();
          }
        } catch (e) { exErr('tqm-err', e.message); }
      };
      if (el.dataset.a === 'open') el.onchange = act; else el.onclick = act;
    });
  });
}

async function editQuiz(id) {
  let quiz = { title: '', questions: [{ q: '', answers: ['', ''], correct: 0, why: '' }] };
  if (id) { try { quiz = await exApi('/quizzes/' + id); } catch (e) { alert(e.message); return; } }
  const qs = quiz.questions.map((q) => ({ ...q, answers: [...q.answers] }));
  const draw = () => {
    exDialog(`<div class="tdlg-head"><h2>${id ? '✏️ Edit quiz' : '➕ New quiz'}</h2><button id="tqe-back">← Back</button></div>
      <label class="tqe-title">Quiz name <input id="tqe-name" maxlength="80" value="${esc(quiz.title)}" placeholder="e.g. Sensors check-up"></label>
      <div id="tqe-qs">${qs.map((q, i) => `<fieldset class="tqe-q" data-i="${i}"><legend>Question ${i + 1}</legend>
          <input class="tqe-text" maxlength="200" value="${esc(q.q)}" placeholder="Type the question">
          <div class="tqe-answers">${q.answers.map((a, k) => `<div class="tqe-ans"><input type="radio" name="tqe-c${i}" value="${k}" ${q.correct === k ? 'checked' : ''} title="This is the right answer" aria-label="Answer ${k + 1} is right">
            <input class="tqe-a" maxlength="100" value="${esc(a)}" placeholder="Answer ${'ABCD'[k]}">
            ${q.answers.length > 2 ? `<button type="button" class="small" data-rm-a="${k}" aria-label="Remove answer">✕</button>` : ''}</div>`).join('')}</div>
          ${q.answers.length < 4 ? '<button type="button" class="small" data-add-a>➕ Answer</button>' : ''}
          <input class="tqe-why" maxlength="300" value="${esc(q.why || '')}" placeholder="Explanation shown after answering (optional)">
          ${qs.length > 1 ? '<button type="button" class="small danger" data-rm-q>🗑️ Remove question</button>' : ''}
        </fieldset>`).join('')}</div>
      <div class="row">${qs.length < 30 ? '<button type="button" id="tqe-addq">➕ Add question</button>' : ''}
        <button class="primary" id="tqe-save">💾 Save quiz</button></div>
      <p class="muted">Tick the circle next to the right answer for each question.</p>
      <p class="tdlg-err" id="tqe-err"></p>`, () => {
      const collect = () => {
        quiz.title = $('tqe-name').value;
        exDlg.querySelectorAll('.tqe-q').forEach((fs) => {
          const q = qs[+fs.dataset.i];
          q.q = fs.querySelector('.tqe-text').value;
          q.answers = [...fs.querySelectorAll('.tqe-a')].map((x) => x.value);
          q.why = fs.querySelector('.tqe-why').value;
          const c = fs.querySelector('input[type=radio]:checked'); q.correct = c ? +c.value : 0;
        });
      };
      $('tqe-back').onclick = () => openQuizManager();
      $('tqe-addq')?.addEventListener('click', () => { collect(); qs.push({ q: '', answers: ['', ''], correct: 0, why: '' }); draw(); });
      exDlg.querySelectorAll('[data-rm-q]').forEach((b) => (b.onclick = () => { collect(); qs.splice(+b.closest('.tqe-q').dataset.i, 1); draw(); }));
      exDlg.querySelectorAll('[data-add-a]').forEach((b) => (b.onclick = () => { collect(); qs[+b.closest('.tqe-q').dataset.i].answers.push(''); draw(); }));
      exDlg.querySelectorAll('[data-rm-a]').forEach((b) => (b.onclick = () => {
        collect(); const q = qs[+b.closest('.tqe-q').dataset.i], k = +b.dataset.rmA;
        q.answers.splice(k, 1); if (q.correct >= q.answers.length || q.correct === k) q.correct = 0; draw();
      }));
      $('tqe-save').onclick = async () => {
        collect();
        const body = { title: quiz.title, questions: qs.map((q) => ({ q: q.q, answers: q.answers.filter((a) => a.trim()), correct: q.correct, why: q.why })) };
        try {
          if (id) { await exApi('/quizzes/' + id, { method: 'PATCH', body }); openQuizManager(); }
          else {
            const j = await exApi('/quizzes', { method: 'POST', body });
            exDialog(`<h2>🎉 Quiz ready!</h2><p>Kids type this <b>quiz code</b> in the 🏆 Quiz tab:</p><div class="ex-bigcode">${esc(j.code)}</div>
              <div class="row"><button class="primary" id="tqe-ok">Done</button></div>`, () => { $('tqe-ok').onclick = () => openQuizManager(); });
          }
        } catch (e) { exErr('tqe-err', e.message); }
      };
    });
  };
  draw();
}

async function quizResults(id) {
  let q;
  try { q = await exApi('/quizzes/' + id); } catch (e) { alert(e.message); return; }
  const best = {};
  for (const r of q.results) if (!best[r.studentId] || r.score > best[r.studentId].score) best[r.studentId] = { ...r, tries: 0 };
  for (const r of q.results) best[r.studentId].tries++;
  const rows = Object.values(best).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const perQ = q.questions.map((item, i) => {
    const got = q.results.filter((r) => r.answers[i] === item.correct).length;
    return { item, pct: q.results.length ? Math.round(got / q.results.length * 100) : 0 };
  });
  exDialog(`<div class="tdlg-head"><h2>📊 ${esc(q.title)}</h2><button id="tqr-back">← Back</button></div>
    <p class="muted">Quiz code <b>${esc(q.code)}</b> · ${rows.length} kid${rows.length === 1 ? '' : 's'} · ${q.results.length} attempt${q.results.length === 1 ? '' : 's'}</p>
    <h3>Scores <span class="muted">(best attempt each)</span></h3>
    <table class="ex-acct"><thead><tr><th>Name</th><th>Score</th><th>Tries</th><th>When</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td><b>${r.score}/${r.total}</b> <span class="muted">${Math.round(r.score / r.total * 100)}%</span></td><td>${r.tries}</td><td class="muted">${ago(r.at)}</td></tr>`).join('')
        || '<tr><td colspan="4" class="muted">Nobody has taken it yet.</td></tr>'}</tbody></table>
    <h3>Questions <span class="muted">(how many got each one right)</span></h3>
    <ol class="tqr-qs">${perQ.map(({ item, pct }) => `<li><div class="tqr-bar"><i style="width:${pct}%"></i></div><b>${pct}%</b> ${esc(item.q)} <span class="muted">→ ${esc(item.answers[item.correct])}</span></li>`).join('')}</ol>
    <div class="row"><button class="small danger" id="tqr-clear">🧹 Clear results</button></div>`, () => {
    $('tqr-back').onclick = () => openQuizManager();
    $('tqr-clear').onclick = async () => {
      if (!confirm('Clear all results for this quiz?')) return;
      await exApi('/quizzes/' + id, { method: 'PATCH', body: { clearResults: true } }); quizResults(id);
    };
  });
}

// "📝 Class quizzes" in the Explorer teacher bar
document.addEventListener('click', (e) => {
  if (e.target.closest('#ext-quizzes')) { showView('quiz'); openQuizManager(); }
});
if (!$('view-quiz').hidden) quizStart();

/* ===================================================================
 * Live class games: the teacher starts a timed game with a quiz; kids race
 * to answer, the server keeps score, and everyone sees the podium at the end.
 * =================================================================== */
const GAME_MODES = {
  mining: { icon: '⛏️', name: 'Mining', blurb: 'Every right answer digs up an ore. Rare ores are worth more! Most valuable haul wins.' },
  race: { icon: '🏎️', name: 'Speed race', blurb: 'Right answers score 100 points, plus up to 100 more for answering fast. Highest score wins.' },
};
const PODIUM_BUCKS = [50, 30, 20];
const fmtClock = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const placeName = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const oreBadges = (ores) => Object.entries(ores || {}).map(([n, c]) => `<span class="lg-ore" title="${esc(n)}">${(LG.ores.find((o) => o.name === n) || {}).emoji || '⛏️'}×${c}</span>`).join('');

/* ----------------------------------------------- teacher: start + live board */
function startGameDialog(quizId, title) {
  let mode = 'mining';
  exDialog(`<div class="tdlg-head"><h2>🎮 Live game: ${esc(title)}</h2><button id="lgs-back">← Back</button></div>
    <p class="muted">Kids type the quiz code in the 🏆 Quiz tab and jump straight into the game. When time runs out, everyone sees the top 3.</p>
    <div class="lg-modes">${Object.entries(GAME_MODES).map(([k, m]) => `<button class="lg-mode${k === mode ? ' on' : ''}" data-mode="${k}">
      <span class="lg-mode-ico">${m.icon}</span><b>${m.name}</b><span>${m.blurb}</span></button>`).join('')}</div>
    <label class="lg-mins">⏱️ How long? <select id="lgs-mins">${[1, 2, 3, 5, 10, 15, 20, 30].map((m) => `<option value="${m}" ${m === 5 ? 'selected' : ''}>${m} minute${m > 1 ? 's' : ''}</option>`).join('')}</select></label>
    <div class="row"><button class="primary qz-go" id="lgs-start">▶ Start the game</button></div>
    <p class="tdlg-err" id="lgs-err"></p>`, () => {
    $('lgs-back').onclick = openQuizManager;
    exDlg.querySelectorAll('.lg-mode').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; exDlg.querySelectorAll('.lg-mode').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('lgs-start').onclick = async () => {
      try { const g = await exApi(`/quizzes/${quizId}/game`, { method: 'POST', body: { mode, minutes: +$('lgs-mins').value } }); teacherBoard(g.id); }
      catch (e) { exErr('lgs-err', e.message); }
    };
  });
}

let boardTimer = null;
async function teacherBoard(gameId) {
  clearInterval(boardTimer);
  let quizCode = '';
  try { quizCode = (await exApi('/quizzes')).quizzes.find((q) => q.liveGame?.id === gameId)?.code || ''; } catch {}
  let g = null, endsAt = 0;
  const draw = () => {
    if (!g || exDlg.hidden || !$('lgb')) { clearInterval(boardTimer); return; }
    const m = GAME_MODES[g.mode];
    if (g.ended) { $('lgb').innerHTML = podiumHTML(g, null) + `<div class="row"><button class="primary" id="lgb-close">Done</button></div>`; $('lgb-close').onclick = openQuizManager; clearInterval(boardTimer); return; }
    $('lgb').innerHTML = `
      <div class="lgb-top"><div><div class="lgb-mode">${m.icon} ${m.name} · ${esc(g.title)}</div>
        <div class="lgb-join">Join with quiz code <b>${esc(quizCode)}</b> in the 🏆 Quiz tab</div></div>
        <div class="lg-clock ${endsAt - Date.now() < 30000 ? 'hurry' : ''}">${fmtClock((endsAt - Date.now()) / 1000)}</div></div>
      <p class="muted">${g.players} player${g.players === 1 ? '' : 's'}</p>
      <ol class="lgb-list">${g.top.map((p) => `<li class="${p.place <= 3 ? 'medal' + p.place : ''}"><span class="lgb-place">${p.place <= 3 ? ['🥇', '🥈', '🥉'][p.place - 1] : p.place}</span>
        <b>${esc(p.name)}</b>${g.mode === 'mining' ? `<span class="lgb-ores">${oreBadges(p.ores)}</span>` : `<span class="muted">${p.correct} right</span>`}<span class="lgb-score">${p.score}</span></li>`).join('') || '<li class="muted">Waiting for players…</li>'}</ol>
      <div class="row"><button class="danger" id="lgb-end">⏹ End the game now</button><button id="lgb-back">← Quizzes</button></div>`;
    $('lgb-end').onclick = async () => { if (!confirm('End the game now and show the winners?')) return; g = await exApi(`/games/${gameId}/end`, { method: 'POST' }); draw(); };
    $('lgb-back').onclick = () => { clearInterval(boardTimer); openQuizManager(); };
  };
  const poll = async () => {
    try { g = await exApi('/games/' + gameId); endsAt = Date.now() + g.secondsLeft * 1000; if (g.ores) LG.ores = g.ores; } catch (e) { if ($('lgb')) $('lgb').innerHTML = `<p class="tdlg-err">${esc(e.message)}</p>`; clearInterval(boardTimer); return; }
    draw();
  };
  exDialog(`<div id="lgb" class="lgb"><p class="muted">Loading the game…</p></div>`);
  exDlg.querySelector('.tdlg').classList.add('lg-wide');
  await poll();
  let n = 0;
  boardTimer = setInterval(() => { if (++n % 4 === 0) poll(); else draw(); }, 500);
}

/* ------------------------------------------------------- kids: playing */
const LG = { game: null, question: null, selected: null, busy: false, endsAt: 0, timer: null, ores: [], me: null, flash: '', quizCode: '' };

async function startLiveGame(q) {
  LG.ores = q.ores || []; LG.quizCode = q.code;
  try {
    const j = await exApi(`/play/${q.game.id}/join`, { method: 'POST', body: {} });
    applyGame(j); LG.question = j.question || null;
    if (j.ended) return gameOver();
    renderGame();
    clearInterval(LG.timer);
    let n = 0;
    LG.timer = setInterval(async () => {
      if (!document.querySelector('.lg-game')) { clearInterval(LG.timer); return; }
      drawClock();
      if (++n % 4 === 0) {
        try { const st = await exApi(`/play/${LG.game.id}`); applyGame(st); if (st.ended) return gameOver(); drawBoard(); } catch {}
      }
      if (LG.endsAt && Date.now() > LG.endsAt + 1500) { try { const st = await exApi(`/play/${LG.game.id}`); applyGame(st); if (st.ended) gameOver(); } catch {} }
    }, 500);
  } catch (e) { const el = $('tq-err'); if (el) el.textContent = e.message; }
}
function applyGame(g) { LG.game = g; LG.endsAt = Date.now() + g.secondsLeft * 1000; if (g.me) LG.me = g.me; if (g.ores) LG.ores = g.ores; }

function renderGame() {
  const m = GAME_MODES[LG.game.mode];
  $('quiz-main').innerHTML = `<div class="lg-game qz-card">
    <div class="lg-head"><span class="lg-title">${m.icon} ${m.name}: ${esc(LG.game.title)}</span><span class="lg-clock" id="lg-clock"></span></div>
    <div class="lg-grid">
      <div class="lg-left">
        ${LG.game.mode === 'mining' ? `<div class="lg-mine"><div class="lg-cave" id="lg-cave"><span class="lg-pick">⛏️</span><div id="lg-find" class="lg-find"></div></div>
          <div class="lg-bag" id="lg-bag"></div><div class="lg-legend">${LG.ores.map((o) => `<span>${o.emoji} ${o.value}</span>`).join('')}</div></div>`
        : `<div class="lg-mine"><div class="lg-track"><span class="lg-car" id="lg-car">🏎️</span><span class="lg-flag">🏁</span></div><div id="lg-find" class="lg-find race"></div></div>`}
        <div id="lg-q"></div>
      </div>
      <aside class="lg-side"><div class="lg-me" id="lg-me"></div><h3>🏆 Leaderboard</h3><ol class="lgb-list small" id="lg-board"></ol></aside>
    </div></div>`;
  drawQuestion(); drawBoard(); drawClock();
}
function drawClock() {
  const el = $('lg-clock'); if (!el) return;
  const left = (LG.endsAt - Date.now()) / 1000;
  el.textContent = '⏱️ ' + fmtClock(left); el.classList.toggle('hurry', left < 30);
}
function drawBoard() {
  const g = LG.game, me = LG.me;
  if ($('lg-me')) $('lg-me').innerHTML = me ? `<div class="lg-me-score">${me.score}</div><div>${LG.game.mode === 'mining' ? 'ore value' : 'points'} · <b>${placeName(me.place)}</b> of ${g.players}</div>` : '';
  if ($('lg-bag') && me) $('lg-bag').innerHTML = oreBadges(me.ores) || '<span class="muted">Your bag is empty. Answer to dig!</span>';
  if ($('lg-car') && me && g.top.length) { const best = Math.max(1, g.top[0].score); $('lg-car').style.left = `${Math.min(88, (me.score / best) * 88)}%`; }
  if ($('lg-board')) $('lg-board').innerHTML = g.top.slice(0, 8).map((p) => `<li class="${p.id === me?.id ? 'me' : ''}"><span class="lgb-place">${p.place <= 3 ? ['🥇', '🥈', '🥉'][p.place - 1] : p.place}</span><b>${esc(p.name)}</b><span class="lgb-score">${p.score}</span></li>`).join('');
}
function drawQuestion() {
  const q = LG.question, box = $('lg-q'); if (!box) return;
  LG.selected = null;
  box.innerHTML = `<h2 class="qz-q">${esc(q.q)}</h2>
    <div class="qz-answers">${q.answers.map((a, k) => `<button class="qz-ans lg-ans c${k}" data-k="${k}"><span class="qz-key">${'ABCD'[k]}</span>${esc(a)}</button>`).join('')}</div>
    <div class="qz-submit-row"><span class="muted" id="lg-hint">Pick an answer, then Submit (or press Enter).</span><button class="primary qz-submit" id="lg-submit" disabled>${LG.game.mode === 'mining' ? '⛏️ Dig!' : '🏁 Go!'}</button></div>`;
  box.querySelectorAll('.lg-ans').forEach((b) => (b.onclick = () => {
    if (LG.busy) return; LG.selected = +b.dataset.k;
    box.querySelectorAll('.lg-ans').forEach((x) => x.classList.toggle('sel', x === b)); $('lg-submit').disabled = false;
  }));
  $('lg-submit').onclick = submitGameAnswer;
}
async function submitGameAnswer() {
  if (LG.busy || LG.selected === null) return;
  LG.busy = true; $('lg-submit').disabled = true;
  let r;
  try { r = await exApi(`/play/${LG.game.id}/answer`, { method: 'POST', body: { i: LG.question.i, choice: LG.selected } }); }
  catch (e) {
    LG.busy = false; $('lg-submit').disabled = false; $('lg-hint').textContent = e.message;
    if (/time's up|ended/.test(e.message)) { try { applyGame(await exApi(`/play/${LG.game.id}`)); } catch {} gameOver(); }
    return;
  }
  applyGame(r);
  document.querySelectorAll('.lg-ans').forEach((b) => { b.disabled = true; if (+b.dataset.k === r.correctIndex) b.classList.add('right'); else if (+b.dataset.k === LG.selected) b.classList.add('wrong'); });
  const find = $('lg-find');
  if (r.correct && r.reward?.ore) {
    find.innerHTML = `<span class="lg-pop">${r.reward.emoji}</span><b>${r.reward.ore}! +${r.reward.value}</b>`;
    $('lg-cave')?.classList.remove('dig'); void $('lg-cave')?.offsetWidth; $('lg-cave')?.classList.add('dig');
    boardReact(r.reward.value >= 25 ? 'display.show(Image.DIAMOND)' : 'display.show(Image.YES)');
  } else if (r.correct) {
    find.innerHTML = `<b>+${r.reward.points}</b>${r.reward.bonus ? ` <span class="muted">(${r.reward.bonus} speed bonus!)</span>` : ''}`;
    boardReact('display.show(Image.ARROW_E)');
  } else {
    find.innerHTML = `<b class="bad-t">${LG.game.mode === 'mining' ? '💥 Your pickaxe slipped!' : '🐢 No points'}</b> <span class="muted">It was: ${esc(r.correctText)}</span>`;
    boardReact('display.show(Image.NO)');
  }
  drawBoard();
  setTimeout(() => {
    LG.busy = false;
    if (LG.game.ended) return gameOver();
    LG.question = r.question; if (document.querySelector('.lg-game')) drawQuestion();
  }, r.correct ? 900 : 1600);
}
document.addEventListener('keydown', (e) => {
  if ($('view-quiz').hidden || !document.querySelector('.lg-game') || e.target.closest('input, textarea, select')) return;
  const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
  const btns = document.querySelectorAll('.lg-ans');
  if (k >= 0 && btns[k] && !LG.busy) btns[k].click();
  if (e.key === 'Enter' && LG.selected !== null && !LG.busy) { e.preventDefault(); submitGameAnswer(); }
});

/* ------------------------------------------------------- end: podium */
function podiumHTML(g, me) {
  const top = g.top.slice(0, 3);
  const m = GAME_MODES[g.mode];
  const block = (p, n) => p ? `<div class="pod pod${n}"><div class="pod-name">${['🥇', '🥈', '🥉'][p.place - 1] || ''} ${esc(p.name)}</div><div class="pod-score">${p.score}</div>
    ${g.mode === 'mining' ? `<div class="pod-ores">${oreBadges(p.ores)}</div>` : ''}<div class="pod-step">${placeName(p.place)}</div></div>` : `<div class="pod pod${n} empty"><div class="pod-step">–</div></div>`;
  return `<h2 class="lg-over">⏰ Time's up! ${m.icon} ${m.name} results</h2>
    <div class="podium">${block(top[1], 2)}${block(top[0], 1)}${block(top[2], 3)}</div>
    ${me ? `<p class="lg-you">You placed <b>${placeName(me.place)}</b> out of ${g.players} with <b>${me.score}</b> ${g.mode === 'mining' ? 'ore value' : 'points'}${me.place <= 3 ? ' 🎉' : ''}.</p>` : `<p class="muted">${g.players} player${g.players === 1 ? '' : 's'} took part.</p>`}`;
}
function gameOver() {
  clearInterval(LG.timer);
  const g = LG.game, me = g.me || LG.me;
  let pay = '';
  if (me) {
    let paid = []; try { paid = JSON.parse(localStorage.getItem('microbit-paid-games') || '[]'); } catch {}
    const key = `${g.id}:${me.id}`;
    if (!paid.includes(key)) {
      const amount = me.correct * 10 + (me.place <= 3 ? PODIUM_BUCKS[me.place - 1] : 0);
      HS.bucks += amount; saveHS();
      paid = [...paid, key].slice(-50); try { localStorage.setItem('microbit-paid-games', JSON.stringify(paid)); } catch {}
      pay = `<p class="qz-pay">🪙 You earned <b>${amount} Bit Bucks</b> (${me.correct} right answers${me.place <= 3 ? ` + ${PODIUM_BUCKS[me.place - 1]} podium bonus` : ''}). You now have ${HS.bucks}.</p>`;
    }
    boardReact(me.place === 1 ? "display.show(Image.HAPPY)\nsleep(500)\ndisplay.scroll('1st!', wait=False)" : `display.scroll('#${me.place}', wait=False)`);
  }
  $('quiz-main').innerHTML = `<div class="qz-card qz-results lg-results">${podiumHTML(g, me)}${pay}
    <div class="row qz-end"><button class="primary" id="lg-home">🏠 Back to quiz start</button></div></div>`;
  $('lg-home').onclick = quizStart;
  if (me && me.place <= 3) confetti();
}
