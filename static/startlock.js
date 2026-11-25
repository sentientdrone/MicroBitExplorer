/* Start-up lock: when a grown-up turns it on (👩‍🏫 parent / teacher mode), this computer shows a
 * lock screen every time the app is opened or reloaded, until someone types the code.
 * The code starts as 1234 and can be changed. It's stored hashed in this browser only, so like the
 * parent / teacher code it's a simple lock for the classroom, not strong security.
 * A tiny script in index.html's <head> hides the page before anything is drawn, so the app never
 * flashes on screen before the lock appears. Uses hashCode/checkCode_/teacherHasCode/teacherDialog/esc. */
'use strict';

const STARTLOCK_KEY = 'microbit-startlock';
const STARTLOCK_FIRST_CODE = '1234';
const STARTLOCK_MAX_TRIES = 5, STARTLOCK_WAIT_S = 30;

function startLockData() { try { return JSON.parse(localStorage.getItem(STARTLOCK_KEY) || 'null'); } catch { return null; } }
const startLockOn = () => !!startLockData()?.on;
async function setStartLock(code) {
  const salt = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(STARTLOCK_KEY, JSON.stringify({ on: true, salt, hash: await hashCode(code, salt) }));
}
function clearStartLock() { localStorage.removeItem(STARTLOCK_KEY); }

function showStartLock() {
  if ($('startlock')) return;
  const d = startLockData();
  if (!d?.on) { document.documentElement.classList.remove('startlocked'); return; }
  // nothing behind the lock can be clicked, focused or typed into (remember what we changed)
  const madeInert = [...document.body.children].filter((el) => el.tagName !== 'SCRIPT' && !el.hasAttribute('inert'));
  madeInert.forEach((el) => el.setAttribute('inert', ''));
  const sl = document.createElement('div');
  sl.id = 'startlock'; sl.className = 'lockscreen startlock'; sl.setAttribute('role', 'dialog'); sl.setAttribute('aria-modal', 'true');
  sl.setAttribute('aria-label', 'The app is locked. Type the code to start.');
  document.body.appendChild(sl);
  document.documentElement.classList.remove('startlocked');

  let code = '', tries = 0, waitUntil = 0, waitTimer = 0;
  const unlock = () => {
    clearInterval(waitTimer);
    sl.remove();
    madeInert.forEach((el) => { if (el.isConnected) el.removeAttribute('inert'); });
    // the kid lock screen (if a kid had locked their screen) stays on top of everything else
    if ($('lockscreen')) [...document.body.children].forEach((el) => { if (el.id !== 'lockscreen' && el.tagName !== 'SCRIPT') el.setAttribute('inert', ''); });
  };
  const render = (mode = 'pin', err = '') => {
    const waiting = Date.now() < waitUntil;
    sl.innerHTML = mode === 'pin' ? `
      <div class="ls-card">
        <div class="ls-bot">${typeof botSVG === 'function' ? botSVG() : '🤖'}</div>
        <h1>🔐 micro:bit Manager is locked</h1>
        <p class="ls-sub">Type the code to start</p>
        <div class="ex-pin-dots">${Array.from({ length: Math.max(4, code.length) }, (_, i) => `<i class="${i < code.length ? 'on' : ''}"></i>`).join('')}</div>
        <div class="ex-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}" ${waiting ? 'disabled' : ''}>${n}</button>`).join('')}
          <button data-n="back" aria-label="Delete" ${waiting ? 'disabled' : ''}>⌫</button><button data-n="0" ${waiting ? 'disabled' : ''}>0</button><button data-n="ok" class="primary" aria-label="Unlock" ${waiting ? 'disabled' : ''}>✓</button></div>
        <p class="tdlg-err ls-err" id="sl-err" role="alert">${waiting ? `Too many wrong tries. Wait <b id="sl-wait">${Math.ceil((waitUntil - Date.now()) / 1000)}</b> seconds.` : esc(err)}</p>
        <div class="ls-links"><button id="sl-forgot">🙋 Forgot the code?</button></div>
      </div>` : `
      <div class="ls-card">
        <h1>👩‍🏫 Grown-up unlock</h1>
        ${teacherHasCode() ? `<p class="ls-sub">Type the 👩‍🏫 parent / teacher code for this computer to unlock. Then you can change the start-up code in parent / teacher mode.</p>
        <form id="sl-tform" class="tdlg-form ls-tform"><input type="password" id="sl-tpw" autocomplete="off" placeholder="Parent / teacher code" aria-label="Parent / teacher code">
          <p class="tdlg-err" id="sl-terr" role="alert">${esc(err)}</p>
          <div class="row"><button class="primary">Unlock</button><button type="button" id="sl-back">← Back</button></div></form>`
        : `<p class="ls-sub">Ask the grown-up who set up this computer. If nobody remembers the code, clearing this website's data in the browser settings turns the start-up lock off.</p>
          <div class="row" style="justify-content:center"><button type="button" id="sl-back">← Back</button></div>`}
      </div>`;
    if (mode === 'pin') {
      sl.querySelectorAll('.ex-pad button').forEach((b) => (b.onclick = () => press(b.dataset.n)));
      $('sl-forgot').onclick = () => render('grownup');
      sl.querySelector('.ls-card').tabIndex = -1; sl.querySelector('.ls-card').focus();
    } else {
      $('sl-back').onclick = () => { code = ''; render('pin'); };
      $('sl-tform')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (await checkCode_($('sl-tpw').value)) { setUnlocked(true); unlock(); return; }
        render('grownup', 'That code isn\'t right.');
      });
      setTimeout(() => $('sl-tpw')?.focus(), 30);
    }
  };
  const press = async (n) => {
    if (Date.now() < waitUntil) return;
    if (n === 'back') code = code.slice(0, -1);
    else if (n === 'ok') {
      if (code.length < 4) return render('pin', 'The code has at least 4 numbers.');
      const ok = (await hashCode(code, d.salt)) === d.hash;
      code = '';
      if (ok) return unlock();
      tries++;
      sl.querySelector('.ls-card')?.classList.remove('shake'); void sl.offsetWidth;
      if (tries >= STARTLOCK_MAX_TRIES) {
        tries = 0; waitUntil = Date.now() + STARTLOCK_WAIT_S * 1000;
        clearInterval(waitTimer);
        waitTimer = setInterval(() => { if (Date.now() >= waitUntil) { clearInterval(waitTimer); render('pin'); } else if ($('sl-wait')) $('sl-wait').textContent = Math.ceil((waitUntil - Date.now()) / 1000); }, 500);
        return render('pin');
      }
      render('pin', 'That code isn\'t right. Try again.');
      sl.querySelector('.ls-card')?.classList.add('shake');
      return;
    } else if (code.length < 6) code += n;
    render('pin');
  };
  sl.addEventListener('keydown', (e) => {
    if (!sl.querySelector('.ex-pad')) return;   // grown-up form: let the input handle keys
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('back');
    else if (e.key === 'Enter') { e.preventDefault(); press('ok'); }
  });
  render('pin');
}

/* ----- settings, shown inside 👩‍🏫 parent / teacher mode ----- */
function startLockSettingsHTML() {
  return `<h3>🔐 Start-up lock</h3>
    <p class="muted">${startLockOn()
      ? '<b>On.</b> This computer shows a lock screen every time the app is opened or reloaded, until someone types the start-up code.'
      : `<b>Off.</b> Turn it on to show a lock screen every time the app is opened or reloaded on this computer. The code starts as <b>${STARTLOCK_FIRST_CODE}</b>; you can change it.`}</p>
    <div class="row">${startLockOn()
      ? '<button id="sl-change">✏️ Change start-up code</button><button id="sl-off">🔓 Turn off</button>'
      : `<button id="sl-on" class="primary">🔐 Turn on (code ${STARTLOCK_FIRST_CODE})</button>`}</div>`;
}
function bindStartLockSettings(back) {
  $('sl-on')?.addEventListener('click', async () => {
    await setStartLock(STARTLOCK_FIRST_CODE);
    alert(`🔐 The start-up lock is on. The code is ${STARTLOCK_FIRST_CODE}.\n\nIt will ask for the code the next time the app is opened or reloaded. You can change the code here.`);
    back();
  });
  $('sl-off')?.addEventListener('click', () => {
    if (!confirm('Turn off the start-up lock on this computer? The app will open without a code.')) return;
    clearStartLock(); back();
  });
  $('sl-change')?.addEventListener('click', () => {
    teacherDialog(`<div class="tdlg-head"><h2 id="tdlg-title">✏️ Change the start-up code</h2></div>
      <form id="slc-form" class="tdlg-form">
        <label>New code (4 to 6 numbers) <input id="slc-1" type="password" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]*"></label>
        <label>Type it again <input id="slc-2" type="password" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]*"></label>
        <p class="tdlg-err" id="slc-err" role="alert"></p>
        <div class="row"><button class="primary">💾 Save code</button><button type="button" id="slc-cancel">Cancel</button></div></form>`, () => {
      $('slc-cancel').onclick = back;
      setTimeout(() => $('slc-1')?.focus(), 30);
      $('slc-form').onsubmit = async (e) => {
        e.preventDefault();
        const a = $('slc-1').value, b = $('slc-2').value;
        if (!/^\d{4,6}$/.test(a)) { $('slc-err').textContent = 'Use 4 to 6 numbers.'; return; }
        if (a !== b) { $('slc-err').textContent = 'The two codes don\'t match.'; return; }
        await setStartLock(a);
        alert('✅ The start-up code is changed. The old code doesn\'t work any more.');
        back();
      };
    });
  });
}

showStartLock();
