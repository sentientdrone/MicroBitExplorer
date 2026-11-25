/* Parent / teacher code: a grown-up creates their own code, which unlocks quiz answers
 * (in search) and an answer key. The code is stored (hashed) in this browser only, so it's a
 * simple lock to stop kids peeking, not strong security. */
'use strict';

const TEACHER_KEY = 'microbit-teacher';
const UNLOCK_KEY = 'microbit-teacher-until';
const UNLOCK_MINUTES = 15;

function teacherData() { try { return JSON.parse(localStorage.getItem(TEACHER_KEY) || 'null'); } catch { return null; } }
const teacherHasCode = () => !!teacherData()?.hash;
function teacherUnlocked() {
  try { return +sessionStorage.getItem(UNLOCK_KEY) > Date.now(); } catch { return false; }
}
function setUnlocked(on) {
  try { on ? sessionStorage.setItem(UNLOCK_KEY, String(Date.now() + UNLOCK_MINUTES * 60000)) : sessionStorage.removeItem(UNLOCK_KEY); } catch {}
  updateTeacherBadge();
}

async function hashCode(code, salt) {
  const data = new TextEncoder().encode(salt + ':' + code);
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (const b of data) h = ((h * 33) ^ b) >>> 0; return 'x' + h.toString(16);  // fallback outside localhost
}
async function setCode(code) {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(TEACHER_KEY, JSON.stringify({ salt, hash: await hashCode(code, salt) }));
}
async function checkCode_(code) {
  const d = teacherData(); if (!d) return false;
  return (await hashCode(code, d.salt)) === d.hash;
}

/* ------------------------------------------------------------ dialog */
let tDlg = null;
function teacherDialog(html, onReady) {
  if (!tDlg) {
    tDlg = document.createElement('div'); tDlg.className = 'tour-overlay'; tDlg.hidden = true;
    tDlg.innerHTML = '<div class="tdlg" role="dialog" aria-modal="true" aria-labelledby="tdlg-title"><div id="tdlg-body"></div></div>';
    document.body.appendChild(tDlg);
    tDlg.addEventListener('click', (e) => { if (e.target === tDlg) closeTeacher(); });
    document.addEventListener('keydown', (e) => { if (!tDlg.hidden && e.key === 'Escape') closeTeacher(); });
  }
  $('tdlg-body').innerHTML = html;
  tDlg.hidden = false;
  onReady && onReady();
  setTimeout(() => tDlg.querySelector('input')?.focus(), 30);
}
let tResolve = null;
function closeTeacher(result = false) { if (tDlg) tDlg.hidden = true; if (tResolve) { const r = tResolve; tResolve = null; r(result); } }

const NOTE = '<p class="tdlg-note">🔒 The code is saved in this browser only. It stops kids peeking at answers, but it isn\'t strong security: clearing the browser\'s data removes it.</p>';

function createCodeHTML(title = 'Create a parent / teacher code', intro = 'Choose a code that only grown-ups know. You\'ll need it to unlock quiz answers and the answer key.') {
  return `<h2 id="tdlg-title">👩‍🏫 ${title}</h2><p>${intro}</p>
    <form id="tdlg-form" class="tdlg-form">
      <label>New code <input type="password" id="tc-new" minlength="4" maxlength="32" autocomplete="new-password" required></label>
      <label>Type it again <input type="password" id="tc-again" minlength="4" maxlength="32" autocomplete="new-password" required></label>
      <p class="tdlg-err" id="tc-err"></p>
      <div class="row"><button class="primary">Save code</button><button type="button" id="tc-cancel">Cancel</button></div>
    </form>${NOTE}`;
}
function bindCreate(after) {
  $('tc-cancel').onclick = () => closeTeacher(false);
  $('tdlg-form').onsubmit = async (e) => {
    e.preventDefault();
    const a = $('tc-new').value, b = $('tc-again').value;
    if (a.length < 4) return ($('tc-err').textContent = 'Use at least 4 characters.');
    if (a !== b) return ($('tc-err').textContent = 'The two codes don\'t match. Try again.');
    await setCode(a); setUnlocked(true);
    after ? after() : closeTeacher(true);
  };
}

// Ask for the code. Resolves true if unlocked (or already unlocked).
function requireTeacher(reason = 'to see quiz answers') {
  if (teacherUnlocked()) return Promise.resolve(true);
  return new Promise((resolve) => {
    tResolve = resolve;
    if (!teacherHasCode()) {
      teacherDialog(`<h2 id="tdlg-title">🙋 Ask a grown-up</h2>
        <p>Quiz answers are locked. A parent or teacher needs to <b>create a code</b> first, then type it ${reason}.</p>
        <div class="row"><button class="primary" id="tc-setup">👩‍🏫 I'm a grown-up: create a code</button><button id="tc-cancel">Not now</button></div>`, () => {
        $('tc-cancel').onclick = () => closeTeacher(false);
        $('tc-setup').onclick = () => teacherDialog(createCodeHTML(), () => bindCreate());
      });
      return;
    }
    teacherDialog(`<h2 id="tdlg-title">🔒 Parent / teacher code</h2>
      <p>Ask a grown-up to type their code ${reason}.</p>
      <form id="tdlg-form" class="tdlg-form">
        <input type="password" id="tc-code" autocomplete="current-password" placeholder="Code" aria-label="Parent or teacher code">
        <p class="tdlg-err" id="tc-err"></p>
        <div class="row"><button class="primary">Unlock 🔓</button><button type="button" id="tc-cancel">Cancel</button></div>
      </form>`, () => {
      $('tc-cancel').onclick = () => closeTeacher(false);
      let tries = 0;
      $('tdlg-form').onsubmit = async (e) => {
        e.preventDefault();
        if (await checkCode_($('tc-code').value)) { setUnlocked(true); closeTeacher(true); return; }
        tries++;
        $('tc-err').textContent = tries >= 3 ? 'That code isn\'t right. (Forgot it? Clearing this site\'s data in the browser settings removes the code.)' : 'That code isn\'t right. Try again.';
        $('tc-code').value = ''; $('tdlg-form').classList.remove('shake'); void $('tdlg-form').offsetWidth; $('tdlg-form').classList.add('shake');
      };
    });
  });
}

/* --------------------------------------------------- teacher panel */
async function openTeacherPanel() {
  if (!teacherHasCode()) { tResolve = null; teacherDialog(createCodeHTML('Set up parent / teacher mode'), () => bindCreate(showTeacherPanel)); return; }
  if (await requireTeacher('to open parent / teacher mode')) showTeacherPanel();
}

function showTeacherPanel() {
  const qs = QUESTIONS.map((q, i) => `<li><b>${esc(q.q)}</b><div class="tk-a">✅ ${esc(q.a[0])}</div><div class="muted">${q.why}</div></li>`).join('');
  const ch = CHALLENGES.map((c) => `<li><b>${c.icon} ${esc(c.q)}</b><div class="muted">${c.why}</div></li>`).join('');
  teacherDialog(`<div class="tdlg-head"><h2 id="tdlg-title">👩‍🏫 Parent / teacher mode</h2><button id="tp-close">Done ✓</button></div>
    <p class="muted">🔓 Unlocked for ${UNLOCK_MINUTES} minutes on this browser tab. Kids can now reveal answers in search.</p>
    <div class="row"><button id="tp-lock" class="primary">🔒 Lock now</button><button id="tp-change">✏️ Change code</button><button id="tp-remove">🗑️ Remove code</button></div>
    ${typeof startLockSettingsHTML === 'function' ? startLockSettingsHTML() : ''}
    <h3>📋 Quiz answer key (${QUESTIONS.length} questions)</h3><ol class="tk-list">${qs}</ol>
    <h3>🖐️ Hands-on challenges</h3><p class="muted">These are checked automatically on the micro:bit.</p><ul class="tk-list">${ch}</ul>`, () => {
    $('tp-close').onclick = () => closeTeacher(true);
    if (typeof bindStartLockSettings === 'function') bindStartLockSettings(showTeacherPanel);
    $('tp-lock').onclick = () => { setUnlocked(false); closeTeacher(false); };
    $('tp-change').onclick = () => teacherDialog(createCodeHTML('Change your code', 'Type a new code. The old one will stop working.'), () => bindCreate(showTeacherPanel));
    $('tp-remove').onclick = () => {
      if (!confirm('Remove the parent / teacher code? Quiz answers will stay locked until a new code is created.')) return;
      localStorage.removeItem(TEACHER_KEY); setUnlocked(false); closeTeacher(false);
    };
  });
}

/* ----------------------------------------------------- header badge */
function updateTeacherBadge() {
  const b = $('btn-teacher'); if (!b) return;
  const on = teacherUnlocked();
  b.classList.toggle('on', on);
  b.textContent = on ? '🔓 Teacher' : '👩‍🏫';
  b.title = on ? 'Parent / teacher mode is unlocked (click for answer key or to lock)' : 'Parent / teacher mode';
}
$('btn-teacher').onclick = openTeacherPanel;
updateTeacherBadge();
setInterval(updateTeacherBadge, 30000);  // re-locks itself after the time runs out
