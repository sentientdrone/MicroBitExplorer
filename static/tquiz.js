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
  $('tq-shop').onclick = () => { openWardrobe(); document.querySelector('.wr-tabs [data-t="shop"]').click(); };
  if (stars === 3) confetti();
}

// Number keys / A-D pick an answer, Enter submits then goes on (the Kid quiz handler is parked meanwhile).
document.addEventListener('keydown', (e) => {
  if ($('view-quiz').hidden || !document.querySelector('.tq-ans') || e.target.closest('input, textarea, select')) return;
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
        <div class="tqm-btns"><button class="small" data-a="results">📊 Results</button><button class="small" data-a="edit">✏️ Edit</button><button class="small danger" data-a="del">🗑️</button></div>
      </div>`).join('') || '<p class="muted">No quizzes yet. Make your first one!</p>'}</div>
    <p class="tdlg-err" id="tqm-err"></p>`, () => {
    $('tqm-close').onclick = exClose;
    $('tqm-new').onclick = () => editQuiz(null);
    exDlg.querySelectorAll('.tqm-row [data-a]').forEach((el) => {
      const id = el.closest('.tqm-row').dataset.id;
      const act = async () => {
        try {
          if (el.dataset.a === 'open') await exApi('/quizzes/' + id, { method: 'PATCH', body: { open: el.checked } });
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
