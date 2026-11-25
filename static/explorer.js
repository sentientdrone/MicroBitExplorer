/* Class Explorer: share builds with your class, browse classmates' builds, and (for the
 * teacher) see and moderate everything. Talks to a class server (classroom.py), which can be
 * this computer or another computer on the school network. Uses globals from the other files. */
'use strict';

/* ------------------------------------------------------------ state */
const EX_KEY = 'microbit-class', EX_CLAPS = 'microbit-class-claps';
const AUTO_LOCK_MINUTES = 30;
const exLoad = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const exSave = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let CL = exLoad(EX_KEY, null);                 // { server, code, className }: which class this computer joined
let CLAPPED = new Set(exLoad(EX_CLAPS, []));   // "<account id>:<build id>" pairs already clapped here

// The unlocked kid account lives in sessionStorage: closing the browser locks it.
const meKey = () => 'microbit-class-me:' + (CL?.server || location.origin);
function getMe() { try { return JSON.parse(sessionStorage.getItem(meKey())); } catch { return null; } }
function setMe(me) {
  try { me ? sessionStorage.setItem(meKey(), JSON.stringify(me)) : sessionStorage.removeItem(meKey()); } catch {}
  updateAccountBadge();
  if (typeof onAccountChange === 'function') onAccountChange(me);  // load or put away this kid's Bit
}
const EX = { builds: [], filter: 'all', by: '', q: '', teacher: false, timer: null, preview: null };

const teacherKey = () => 'microbit-class-teacher:' + (CL?.server || location.origin);
const getTeacherToken = () => { try { return sessionStorage.getItem(teacherKey()); } catch { return null; } };
const setTeacherToken = (t) => { try { t ? sessionStorage.setItem(teacherKey(), t) : sessionStorage.removeItem(teacherKey()); } catch {} };

function normServer(s) {
  s = (s || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) {
    // Bare IPs / localhost / host:port on the school network are plain http; a real domain
    // name (e.g. a Cloudflare tunnel) is https, and http would get redirected and break POSTs.
    const host = s.split('/')[0].split(':')[0];
    const local = /^(localhost|\d{1,3}(\.\d{1,3}){3}|\[.*\])$/i.test(host) || !host.includes('.') || /\.(local|lan|home|internal)$/i.test(host) || s.includes(':');
    s = (local ? 'http://' : 'https://') + s;
  }
  return new URL(s).origin === location.origin ? '' : s;
}

async function exApi(path, { method = 'GET', body, server = CL?.server, code = CL?.code, owner } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (code) headers['X-Class-Code'] = code;
  const tt = getTeacherToken(); if (tt) headers['X-Teacher-Token'] = tt;
  if (owner) headers['X-Owner-Token'] = owner;
  const me = getMe(); if (me?.token) headers['X-Student-Token'] = me.token;
  let r;
  try { r = await fetch((server || '') + '/api/class' + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error(`Can't reach the class server${server ? ' at ' + server : ''}. Check the address, and that it's running and on the same network.`); }
  let j = null; try { j = await r.json(); } catch {}
  if (r.status === 401) {
    if (/account|unlock/.test(j?.error || '')) setMe(null); else { setTeacherToken(null); EX.teacher = false; }
  }
  if (!r.ok) throw new Error(j?.error || `The class server said: error ${r.status}`);
  return j;
}

const ago = (t) => {
  const s = Math.max(1, Math.round(Date.now() / 1000 - t));
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`; return `${Math.floor(s / 86400)} days ago`;
};

/* ------------------------------------------------------------ dialogs */
let exDlg = null;
function exDialog(html, onReady) {
  if (!exDlg) {
    exDlg = document.createElement('div'); exDlg.className = 'tour-overlay'; exDlg.hidden = true;
    exDlg.innerHTML = '<div class="tdlg ex-dlg" role="dialog" aria-modal="true"><div id="exdlg-body"></div></div>';
    document.body.appendChild(exDlg);
    exDlg.addEventListener('click', (e) => { if (e.target === exDlg) exClose(); });
    document.addEventListener('keydown', (e) => { if (!exDlg.hidden && e.key === 'Escape') exClose(); });
  }
  if (EX.preview) { EX.preview.dispose(); EX.preview = null; }
  exDlg.onkeydown = null;  // the PIN pad sets its own; don't let it leak into other dialogs
  $('exdlg-body').innerHTML = html;
  exDlg.hidden = false;
  onReady && onReady();
  setTimeout(() => exDlg.querySelector('input:not([type=hidden]), textarea')?.focus(), 30);
}
function exClose() { if (EX.preview) { EX.preview.dispose(); EX.preview = null; } if (exDlg) exDlg.hidden = true; }
const exErr = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };

/* ------------------------------------------------------------ join */
function renderJoin(prefill = {}) {
  $('explorer-main').innerHTML = `
    <div class="qz-card ex-join">
      <div class="qz-trophy">🌍</div>
      <h2>Class Explorer</h2>
      <p>See what your classmates have built, share your own projects, and remix their ideas!</p>
      <form id="ex-join" class="ex-form">
        <label>Class server <span class="muted">(ask your teacher, e.g. <code>192.168.1.20:8330</code>. Leave empty for this computer)</span>
          <input id="ex-server" placeholder="This computer" value="${esc(prefill.server || '')}" autocomplete="off"></label>
        <label>Class code <input id="ex-code" placeholder="e.g. K7QM2P" maxlength="12" value="${esc(prefill.code || '')}" autocomplete="off" class="ex-code-in"></label>
        <p class="tdlg-err" id="ex-join-err"></p>
        <button class="primary qz-go">Join my class 🚀</button>
      </form>
      <p class="muted ex-teacher-line">👩‍🏫 Teacher? <button class="small" id="ex-as-teacher">Set up or manage a class</button></p>
    </div>`;
  $('ex-join').onsubmit = async (e) => {
    e.preventDefault();
    exErr('ex-join-err', '');
    let server; try { server = normServer($('ex-server').value); } catch { return exErr('ex-join-err', 'That server address doesn\'t look right.'); }
    const code = $('ex-code').value.trim().toUpperCase();
    if (!code) return exErr('ex-join-err', 'Type the class code your teacher gave you.');
    try {
      const info = await exApi('', { server, code: null });
      if (!info.setup) return exErr('ex-join-err', 'That server has no class yet. Ask your teacher to set one up.');
      const j = await exApi('/join', { method: 'POST', server, code: null, body: { code } });
      CL = { server, code, className: j.name }; exSave(EX_KEY, CL);
      renderGallery(); pickAccount();
    } catch (err) { exErr('ex-join-err', err.message); }
  };
  $('ex-as-teacher').onclick = () => teacherStart();
}

/* ------------------------------------------------------------ teacher: setup / login */
function teacherStart() {
  exDialog(`<h2>👩‍🏫 Teacher: class server</h2>
    <p>Which computer runs your class server? Leave it empty if it's <b>this</b> one.</p>
    <form id="ext-srv" class="tdlg-form"><input id="ext-server" placeholder="This computer" value="${esc(CL?.server || '')}">
      <p class="tdlg-err" id="ext-err"></p><div class="row"><button class="primary">Next →</button><button type="button" id="ext-cancel">Cancel</button></div></form>`, () => {
    $('ext-cancel').onclick = exClose;
    $('ext-srv').onsubmit = async (e) => {
      e.preventDefault();
      let server; try { server = normServer($('ext-server').value); } catch { return exErr('ext-err', 'That address doesn\'t look right.'); }
      try {
        const info = await exApi('', { server, code: null });
        if (!info.writable) return exErr('ext-err', 'That server can\'t save files. Check its data folder.');
        info.setup ? teacherLogin(server, info.name) : teacherSetup(server);
      } catch (err) { exErr('ext-err', err.message); }
    };
  });
}

function teacherSetup(server) {
  exDialog(`<h2>🏫 Create your class</h2>
    <p>This sets up the class on ${server ? `<code>${esc(server)}</code>` : 'this computer'}. You'll get a <b>class code</b> to give your students.</p>
    <form id="ext-setup" class="tdlg-form">
      <label>Class name <input id="ext-cname" maxlength="60" placeholder="e.g. Class 5B"></label>
      <label>Teacher password <input type="password" id="ext-pw" minlength="6" autocomplete="new-password"></label>
      <label>Type it again <input type="password" id="ext-pw2" autocomplete="new-password"></label>
      <p class="tdlg-err" id="ext-err"></p>
      <div class="row"><button class="primary">Create class</button><button type="button" id="ext-cancel">Cancel</button></div></form>
    <p class="tdlg-note">This class password is kept (hashed) on the class server. It's separate from the 👩‍🏫 quiz-answer code on each computer.</p>`, () => {
    $('ext-cancel').onclick = exClose;
    $('ext-setup').onsubmit = async (e) => {
      e.preventDefault();
      if ($('ext-pw').value.length < 6) return exErr('ext-err', 'Use at least 6 characters.');
      if ($('ext-pw').value !== $('ext-pw2').value) return exErr('ext-err', 'The passwords don\'t match.');
      try {
        const j = await exApi('/setup', { method: 'POST', server, code: null, body: { name: $('ext-cname').value, password: $('ext-pw').value } });
        CL = { server, code: j.code, className: j.name }; exSave(EX_KEY, CL);
        setTeacherToken(j.teacherToken); EX.teacher = true;
        showClassCode(j.name, j.code, true);
        renderGallery();
      } catch (err) { exErr('ext-err', err.message); }
    };
  });
}

function teacherLogin(server, className) {
  exDialog(`<h2>🔑 Teacher login</h2><p>Class: <b>${esc(className || '')}</b>${server ? ` on <code>${esc(server)}</code>` : ''}</p>
    <form id="ext-login" class="tdlg-form"><input type="password" id="ext-pw" placeholder="Teacher password" autocomplete="current-password">
      <p class="tdlg-err" id="ext-err"></p><div class="row"><button class="primary">Log in</button><button type="button" id="ext-cancel">Cancel</button></div></form>
    <details class="tdlg-note"><summary>Forgot the teacher password?</summary>
      Whoever runs the class server can set a new one on that computer. Your class code, kid accounts, builds and quizzes stay the same:
      <pre class="hm-code">python3 server.py --reset-teacher-password</pre>
      or with Docker:
      <pre class="hm-code">docker compose --profile class exec class-server python server.py --reset-teacher-password</pre></details>`, () => {
    $('ext-cancel').onclick = exClose;
    $('ext-login').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const prevServer = CL?.server;
        if (!CL || prevServer !== server) { CL = { server, code: null, className }; }
        const j = await exApi('/teacher/login', { method: 'POST', server, code: null, body: { password: $('ext-pw').value } });
        CL.code = CL.code || j.code; CL.className = j.name; exSave(EX_KEY, CL);
        setTeacherToken(j.token); EX.teacher = true;
        exClose(); renderGallery();
      } catch (err) { exErr('ext-err', err.message); $('ext-pw').value = ''; }
    };
  });
}

function showClassCode(name, code, fresh) {
  exDialog(`<h2>${fresh ? '🎉 Your class is ready!' : '🔢 Class code'}</h2>
    <p>Students join <b>${esc(name)}</b> with this code${CL.server ? ` and the server address <code>${esc(CL.server)}</code>` : ''}:</p>
    <div class="ex-bigcode">${esc(code)}</div>
    ${CL.server ? '' : '<p class="muted">Students on other computers also need this computer\'s address. If you run the class server with Docker Compose, that\'s this computer\'s network address followed by <code>:8330</code>.</p>'}
    <div class="row"><button class="primary" id="exc-ok">Done</button></div>`, () => { $('exc-ok').onclick = exClose; });
}


/* ------------------------------------------------------------ kid accounts */
function updateAccountBadge() {
  const el = $('ex-account'); if (!el) return;
  const me = getMe();
  el.innerHTML = me
    ? `<span class="ex-me">🔓 <b>${esc(me.name)}</b></span> <button class="small" id="ex-lock">🔒 Lock</button>`
    : `<button id="ex-unlock" class="ex-kid-login">🧒 Kid login</button>`;
  $('ex-lock')?.addEventListener('click', () => { lockAccount(); drawGrid(); });
  $('ex-unlock')?.addEventListener('click', kidLogin);
}

// A kid takes over this computer. If the teacher is logged in here, log them out first,
// so the kid never gets the teacher's powers.
function kidLogin() {
  if (getTeacherToken()) {
    if (!confirm('Switch to a kid? This logs the teacher out on this computer.')) return;
    setTeacherToken(null); EX.teacher = false; renderGallery();
  }
  pickAccount();
}

function becomeKid(j) {
  const wasTeacher = !!getTeacherToken();
  setTeacherToken(null); EX.teacher = false;
  setMe({ id: j.id, name: j.name, token: j.studentToken });
  touch();
  if (wasTeacher || $('ex-teacherbar')) renderGallery();
}

async function lockAccount() {
  if (!getMe()) return;
  const req = exApi('/lock', { method: 'POST', body: {} });  // headers (with the token) are built right away…
  setMe(null);                                               // …so it's safe to forget the token now
  try { await req; } catch {}
}

// Choose your name, then type your PIN. `why` and `then` let other actions ask for an unlock first.
async function pickAccount(why = '', then = null) {
  let list = [];
  try { list = (await exApi('/students')).students; } catch (e) { alert(e.message); return; }
  exDialog(`<div class="tdlg-head"><h2>🔑 Who are you?</h2><button id="exa-close">✕</button></div>
    <p>${why ? `Unlock your account ${esc(why)}. ` : ''}Tap your name, then type your PIN.</p>
    <div class="ex-names">${list.map((s) => `<button class="ex-name" data-id="${s.id}">${esc(s.name)}</button>`).join('') || '<p class="muted">No accounts yet.</p>'}</div>
    <div class="row"><button id="exa-new">➕ I'm new: make my account</button></div>`, () => {
    $('exa-close').onclick = exClose;
    $('exa-new').onclick = () => newAccount(then);
    exDlg.querySelectorAll('.ex-name').forEach((b) => (b.onclick = () => pinPad(b.dataset.id, b.textContent, then)));
  });
}

function pinPad(id, name, then) {
  let pin = '';
  exDialog(`<h2 class="ex-pin-title">🔒 Hi ${esc(name)}!</h2><p class="ex-pin-sub">Type your PIN</p>
    <div class="ex-pin-dots" id="exp-dots"></div>
    <div class="ex-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}
      <button data-n="back" aria-label="Delete">⌫</button><button data-n="0">0</button><button data-n="ok" class="primary" aria-label="Unlock">✓</button></div>
    <p class="tdlg-err" id="exp-err"></p>
    <div class="row"><button id="exp-back">← Not me</button><span class="muted">Forgot your PIN? Ask your teacher.</span></div>`, () => {
    const dots = () => { $('exp-dots').innerHTML = Array.from({ length: Math.max(4, pin.length) }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join(''); };
    const press = async (n) => {
      if (n === 'back') pin = pin.slice(0, -1);
      else if (n === 'ok') {
        if (pin.length < 4) return exErr('exp-err', 'Your PIN has at least 4 numbers.');
        try {
          const j = await exApi(`/students/${id}/unlock`, { method: 'POST', body: { pin } });
          becomeKid(j);
          exClose(); drawGrid();
          if (then) then();
          return;
        } catch (e) { pin = ''; exErr('exp-err', e.message); $('exp-dots').classList.remove('shake'); void $('exp-dots').offsetWidth; $('exp-dots').classList.add('shake'); }
      } else if (pin.length < 6) pin += n;
      dots();
    };
    exDlg.querySelectorAll('.ex-pad button').forEach((b) => (b.onclick = () => press(b.dataset.n)));
    exDlg.onkeydown = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('back'); else if (e.key === 'Enter') press('ok'); };
    exDlg.querySelector('.tdlg').tabIndex = -1; exDlg.querySelector('.tdlg').focus();
    $('exp-back').onclick = () => pickAccount('', then);
    dots();
  });
}

function newAccount(then) {
  const teacher = !!getTeacherToken();
  exDialog(`<h2>➕ Make a new account</h2>
    <form id="exn-form" class="tdlg-form">
      <label>Your name <span class="muted">(first name or nickname)</span><input id="exn-name" maxlength="30" autocomplete="off"></label>
      <label>Choose a PIN <span class="muted">(4 to 6 numbers you'll remember)</span><input id="exn-pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" type="password" autocomplete="new-password"></label>
      <label>Type the PIN again <input id="exn-pin2" inputmode="numeric" maxlength="6" type="password" autocomplete="new-password"></label>
      ${teacher ? '<p class="muted">👩‍🏫 You\'re logged in as the teacher, so no approval is needed.</p>'
        : '<div class="ex-approve"><b>👩‍🏫 Teacher approval</b><p class="muted">Ask your teacher to type the teacher password here.</p><input id="exn-tpw" type="password" autocomplete="off" placeholder="Teacher password"></div>'}
      <p class="tdlg-err" id="exn-err"></p>
      <div class="row"><button class="primary">Make my account</button><button type="button" id="exn-cancel">Cancel</button></div>
    </form>`, () => {
    $('exn-cancel').onclick = exClose;
    $('exn-form').onsubmit = async (e) => {
      e.preventDefault();
      const pin = $('exn-pin').value;
      if (!/^\d{4,6}$/.test(pin)) return exErr('exn-err', 'The PIN must be 4 to 6 numbers.');
      if (pin !== $('exn-pin2').value) return exErr('exn-err', 'The two PINs don\'t match.');
      try {
        const j = await exApi('/students', { method: 'POST', body: { name: $('exn-name').value, pin, teacherPassword: $('exn-tpw')?.value } });
        if (!teacher) becomeKid(j);
        exDialog(`<h2>🎉 Welcome, ${esc(j.name)}!</h2><p>${teacher ? `The account is ready. ${esc(j.name)} can now use <b>🧒 Kid login</b> on any computer in the class.` : 'Your account is ready and unlocked. Remember your PIN!'}</p>
          <div class="row"><button class="primary" id="exn-ok">Let's go!</button></div>`, () => { $('exn-ok').onclick = () => { exClose(); drawGrid(); if (EX.teacher) loadTeacherBar(); if (then && !teacher) then(); }; });
      } catch (err) { exErr('exn-err', err.message); if ($('exn-tpw')) $('exn-tpw').value = ''; }
    };
  });
}

// Auto-lock after a while without any clicks or typing, in case someone walks away.
let lastTouch = Date.now();
function touch() { lastTouch = Date.now(); }
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, touch, true));
setInterval(() => {
  if (getMe() && Date.now() - lastTouch > AUTO_LOCK_MINUTES * 60000) { lockAccount(); if (!$('view-explorer').hidden) drawGrid(); }
}, 30000);

async function manageAccounts() {
  let list = [];
  try { list = (await exApi('/students')).students; } catch (e) { alert(e.message); return; }
  exDialog(`<div class="tdlg-head"><h2>👥 Kid accounts</h2><button id="exm-close">Done ✓</button></div>
    <p class="muted">Kids unlock their account with their PIN. You can reset a forgotten PIN here.</p>
    <div class="row"><button class="primary" id="exm-new">➕ New account</button></div>
    <table class="ex-acct"><thead><tr><th>Name</th><th>Builds</th><th>Bit Bucks</th><th>Outfits</th><th></th></tr></thead><tbody>
      ${list.map((s) => `<tr data-id="${s.id}" data-name="${esc(s.name)}"><td>${esc(s.name)}</td><td>${s.builds ?? ''}</td>
        <td>${s.bucks ?? '<span class="muted">not yet</span>'}</td><td>${s.outfits ?? 0}</td>
        <td class="act"><button class="small" data-a="pin">🔑 Reset PIN</button><button class="small" data-a="name">✏️ Rename</button><button class="small danger" data-a="del">🗑️</button></td></tr>`).join('')
        || '<tr><td colspan="5" class="muted">No accounts yet.</td></tr>'}
    </tbody></table><p class="tdlg-err" id="exm-err"></p>`, () => {
    $('exm-close').onclick = exClose;
    $('exm-new').onclick = () => newAccount();
    exDlg.querySelectorAll('.ex-acct button[data-a]').forEach((b) => (b.onclick = async () => {
      const tr = b.closest('tr'), id = tr.dataset.id, name = tr.dataset.name;
      try {
        if (b.dataset.a === 'pin') {
          const pin = prompt(`New PIN for ${name} (4 to 6 numbers):`); if (!pin) return;
          await exApi('/students/' + id, { method: 'PATCH', body: { pin } }); alert(`${name}'s new PIN is set. Tell them privately!`);
        } else if (b.dataset.a === 'name') {
          const n = prompt('New name:', name); if (!n?.trim()) return;
          await exApi('/students/' + id, { method: 'PATCH', body: { name: n } });
        } else {
          if (!confirm(`Delete ${name}'s account? Their shared builds stay in the Explorer.`)) return;
          await exApi('/students/' + id, { method: 'DELETE' });
        }
        manageAccounts(); loadBuilds();
      } catch (e) { exErr('exm-err', e.message); }
    }));
  });
}

/* ------------------------------------------------------------ gallery */
function renderGallery() {
  EX.teacher = !!getTeacherToken();
  $('explorer-main').innerHTML = `
    <div class="ex-head">
      <div><h2>🌍 ${esc(CL.className || 'My class')}</h2>
        <div class="muted">${[EX.teacher ? '👩‍🏫 Teacher view: you can see every build' : '', CL.server ? `server ${esc(CL.server)}` : 'server: this computer'].filter(Boolean).join(' · ')}</div></div>
      <div class="row ex-actions">
        <span id="ex-account"></span>
        <button class="primary" id="ex-share">📤 Share my build</button>
        <button id="ex-refresh" title="Refresh">🔄</button>
        ${EX.teacher ? '<button id="ex-code-btn">🔢 Class code</button><button id="ex-logout">Log out</button>'
          : '<button id="ex-teacher">👩‍🏫 Teacher</button>'}
        <button id="ex-leave" class="small">Leave class</button>
      </div>
    </div>
    ${EX.teacher ? '<div class="ex-teacherbar" id="ex-teacherbar"></div>' : ''}
    <div class="ex-filters">
      ${[['all', 'All'], ['featured', '⭐ Featured'], ['blocks', '🧩 Blocks'], ['python', '🐍 Python'], ['mine', '🙋 Mine']]
        .map(([k, l]) => `<button data-f="${k}" class="${EX.filter === k ? 'on' : ''}">${l}</button>`).join('')}
      <select id="ex-by" aria-label="Builder"><option value="">Everyone</option></select>
      <input id="ex-q" type="search" placeholder="Search builds…" value="${esc(EX.q)}">
    </div>
    <div id="ex-grid" class="ex-grid"><p class="muted">Loading…</p></div>`;
  $('ex-share').onclick = () => openShare();
  updateAccountBadge();
  $('ex-refresh').onclick = loadBuilds;
  $('ex-leave').onclick = () => {
    if (!confirm('Leave this class on this computer? (Your shared builds stay in the class.)')) return;
    lockAccount(); setTeacherToken(null); CL = null; exSave(EX_KEY, null); renderJoin();
  };
  if (EX.teacher) {
    $('ex-code-btn').onclick = async () => { try { const i = await exApi('/teacher'); showClassCode(i.name, i.code); } catch (e) { alert(e.message); } };
    $('ex-logout').onclick = () => { setTeacherToken(null); renderGallery(); };
  } else {
    $('ex-teacher').onclick = () => teacherLogin(CL.server, CL.className);
  }
  document.querySelectorAll('.ex-filters [data-f]').forEach((b) => (b.onclick = () => {
    EX.filter = b.dataset.f; document.querySelectorAll('.ex-filters [data-f]').forEach((x) => x.classList.toggle('on', x === b)); drawGrid();
  }));
  $('ex-by').onchange = (e) => { EX.by = e.target.value; drawGrid(); };
  $('ex-q').oninput = (e) => { EX.q = e.target.value; drawGrid(); };
  loadBuilds();
}

async function loadBuilds() {
  if (!CL) return;
  try {
    const j = await exApi('/builds');
    EX.builds = j.builds; EX.teacher = j.teacher;
    const by = $('ex-by');
    if (by) {
      const names = [...new Set(EX.builds.map((b) => b.author))].sort((a, b) => a.localeCompare(b));
      by.innerHTML = '<option value="">Everyone</option>' + names.map((n) => `<option ${n === EX.by ? 'selected' : ''}>${esc(n)}</option>`).join('');
    }
    if (EX.teacher) loadTeacherBar();
    drawGrid();
  } catch (e) {
    const g = $('ex-grid'); if (g) g.innerHTML = `<p class="tdlg-err">${esc(e.message)}</p>`;
    if (/class code isn't right/.test(e.message)) { CL.code = null; exSave(EX_KEY, CL); renderJoin({ server: CL.server }); }
  }
}

async function loadTeacherBar() {
  try {
    const i = await exApi('/teacher');
    const bar = $('ex-teacherbar'); if (!bar) return;
    const kids = Object.entries(i.students).sort((a, b) => b[1] - a[1]);
    bar.innerHTML = `<div><b>Class code:</b> <span class="ex-code-inline">${esc(i.code)}</span></div>
      <div>${i.accounts} kid accounts · ${i.builds} builds · ${i.hidden} hidden</div>
      <div class="ex-kids">${kids.map(([n, c]) => `<button class="small" data-kid="${esc(n)}">${esc(n)} (${c})</button>`).join('')}</div>
      <div class="row"><button class="small" id="ext-newcode">🔁 New class code</button><button class="small" id="ext-rename">✏️ Rename class</button><button class="small" id="ext-newpw">🔑 Change password</button><button class="small primary" id="ext-accts">👥 Kid accounts</button><button class="small primary" id="ext-quizzes">📝 Class quizzes</button><button class="small" id="ext-handover">🧒 Switch to a kid</button></div>`;
    bar.querySelectorAll('[data-kid]').forEach((b) => (b.onclick = () => { EX.by = b.dataset.kid; $('ex-by').value = EX.by; drawGrid(); }));
    $('ext-newcode').onclick = async () => {
      if (!confirm('Make a new class code? Students will need the new code to see and share builds.')) return;
      const j = await exApi('/teacher/settings', { method: 'POST', body: { newCode: true } }); CL.code = j.code; exSave(EX_KEY, CL); showClassCode(j.name, j.code); loadTeacherBar();
    };
    $('ext-rename').onclick = async () => {
      const n = prompt('Class name:', i.name); if (!n?.trim()) return;
      const j = await exApi('/teacher/settings', { method: 'POST', body: { name: n } }); CL.className = j.name; exSave(EX_KEY, CL); renderGallery();
    };
    $('ext-accts').onclick = manageAccounts;
    $('ext-handover').onclick = kidLogin;
    $('ext-newpw').onclick = async () => {
      const p = prompt('New teacher password (at least 6 characters):'); if (!p) return;
      try { await exApi('/teacher/settings', { method: 'POST', body: { password: p } }); alert('Password changed.'); } catch (e) { alert(e.message); }
    };
  } catch {}
}

function visibleBuilds() {
  const q = EX.q.trim().toLowerCase();
  return EX.builds.filter((b) =>
    (EX.filter === 'all' || (EX.filter === 'featured' && b.featured) || (EX.filter === 'mine' && b.studentId && b.studentId === getMe()?.id) || b.kind === EX.filter) &&
    (!EX.by || b.author === EX.by) &&
    (!q || (b.title + ' ' + b.author + ' ' + (b.description || '')).toLowerCase().includes(q)));
}

function drawGrid() {
  const g = $('ex-grid'); if (!g) return;
  const list = visibleBuilds();
  if (!EX.builds.length) {
    g.innerHTML = `<div class="ex-empty">🌱 Nobody has shared a build yet. Be the first! Make something in <b>🧩 Blocks</b> or the <b>🐍 Python</b> editor, then press <b>📤 Share</b>.</div>`;
    return;
  }
  if (!list.length) { g.innerHTML = '<div class="ex-empty">No builds match. Try another filter.</div>'; return; }
  g.innerHTML = list.map((b) => `
    <article class="ex-card${b.hidden ? ' is-hidden' : ''}${b.featured ? ' is-featured' : ''}" data-id="${b.id}" tabindex="0">
      <div class="ex-card-top"><span class="ex-kind">${b.kind === 'blocks' ? '🧩 Blocks' : '🐍 Python'}</span>
        ${b.featured ? '<span class="ex-badge">⭐ Featured</span>' : ''}${b.hidden ? '<span class="ex-badge hid">🙈 Hidden</span>' : ''}${b.studentId && b.studentId === getMe()?.id ? '<span class="ex-badge mine">Mine</span>' : ''}</div>
      <h3>${esc(b.title)}</h3>
      <div class="ex-by">by <b>${esc(b.author)}</b> · ${ago(b.created)}</div>
      ${b.description ? `<p class="ex-desc">${esc(b.description)}</p>` : ''}
      <pre class="ex-preview">${esc((b.preview || '').split('\n').filter((l) => l.trim() && !/^(from microbit import|import )/.test(l)).slice(0, 6).join('\n'))}</pre>
      <div class="ex-card-foot"><span>👏 ${b.claps || 0}</span>${b.kind === 'blocks' ? `<span class="muted">${b.blockCount || 0} blocks</span>` : ''}</div>
    </article>`).join('');
  g.querySelectorAll('.ex-card').forEach((c) => {
    c.onclick = () => openBuild(c.dataset.id);
    c.onkeydown = (e) => { if (e.key === 'Enter') openBuild(c.dataset.id); };
  });
}

/* ------------------------------------------------------------ one build */
async function openBuild(id) {
  let b;
  try { b = await exApi('/builds/' + id); } catch (e) { alert(e.message); return; }
  const me = getMe(); const mine = !!(me && b.studentId === me.id);
  const clapKey = (me ? me.id : 'teacher') + ':' + id;
  exDialog(`<div class="tdlg-head"><h2>${b.kind === 'blocks' ? '🧩' : '🐍'} ${esc(b.title)}</h2><button id="exb-close">✕</button></div>
    <div class="muted">by <b>${esc(b.author)}</b> · ${ago(b.created)}${b.featured ? ' · ⭐ Featured' : ''}${b.hidden ? ' · 🙈 Hidden from classmates' : ''}</div>
    ${b.description ? `<p>${esc(b.description)}</p>` : ''}
    ${b.kind === 'blocks' ? '<div id="exb-blocks" class="ex-blocks"></div><details class="ex-py"><summary>🐍 See it as Python</summary><pre class="hm-code"></pre></details>'
      : '<pre class="hm-code ex-code-full"></pre>'}
    <div class="row ex-build-actions">
      <button class="primary" id="exb-run">▶ Run on my micro:bit</button>
      <button id="exb-remix">🔀 Remix (open a copy)</button>
      <button id="exb-clap" ${CLAPPED.has(clapKey) ? 'disabled' : ''}>👏 ${CLAPPED.has(clapKey) ? 'Clapped' : 'Clap'} <span id="exb-claps">${b.claps || 0}</span></button>
      ${mine || EX.teacher ? '<button id="exb-del" class="danger">🗑️ Delete</button>' : ''}
    </div>
    ${EX.teacher ? `<div class="row ex-mod"><b>Teacher:</b>
      <button id="exb-hide">${b.hidden ? '👀 Show to class' : '🙈 Hide from class'}</button>
      <button id="exb-feat">${b.featured ? '☆ Unfeature' : '⭐ Feature'}</button></div>` : ''}
    <p class="tdlg-err" id="exb-err"></p>`, () => {
    exDlg.querySelector('pre.hm-code').textContent = b.python || '';
    if (b.kind === 'blocks' && b.blocks) {
      EX.preview = Blockly.inject('exb-blocks', { readOnly: true, renderer: 'zelos', theme: Blockly.Themes.Classic, media: 'vendor/blockly/media/',
        move: { scrollbars: true, drag: true, wheel: true }, zoom: { controls: true, startScale: 0.6 } });
      try { Blockly.serialization.workspaces.load(b.blocks, EX.preview); EX.preview.scrollCenter(); } catch { exErr('exb-err', 'These blocks couldn\'t be shown.'); }
    }
    $('exb-close').onclick = exClose;
    $('exb-run').onclick = async () => {
      try { await ensureSerial(); await runCode(b.python); exErr('exb-err', ''); $('exb-run').textContent = '▶ Running! (Stop it in Blocks or Manager)'; }
      catch (e) { exErr('exb-err', NO_MP.test(e.message) ? 'Your micro:bit needs MicroPython first (Manager → Install MicroPython).' : e.message); }
    };
    $('exb-remix').onclick = () => {
      if (b.kind === 'blocks') {
        if (!confirm(`Open a copy of “${b.title}” in Blocks? It replaces what's in your Blocks workspace now.`)) return;
        exClose(); showView('blocks');
        Blockly.serialization.workspaces.load(b.blocks, ws); ws.scrollCenter();
        kidStatus(`🔀 Remixing “${b.title}” by ${b.author}. Make it your own!`, 'ok');
      } else {
        if ($('code').value.trim() && !confirm(`Open a copy of “${b.title}” in the Python editor? It replaces the code there now.`)) return;
        exClose(); showView('manager'); $('code').value = `# Remix of “${b.title}” by ${b.author}\n` + b.python;
        $('card-code').scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    };
    $('exb-clap').onclick = async () => {
      if (!getMe() && !EX.teacher) { exClose(); return pickAccount('to clap'); }
      try { const j = await exApi(`/builds/${id}/clap`, { method: 'POST' }); CLAPPED.add(clapKey); exSave(EX_CLAPS, [...CLAPPED]);
        $('exb-claps').textContent = j.claps; $('exb-clap').disabled = true; $('exb-clap').firstChild.textContent = '👏 Clapped ';
        const card = EX.builds.find((x) => x.id === id); if (card) { card.claps = j.claps; drawGrid(); } } catch (e) { exErr('exb-err', e.message); }
    };
    $('exb-del')?.addEventListener('click', async () => {
      if (!confirm(`Delete “${b.title}”? This can't be undone.`)) return;
      try { await exApi('/builds/' + id, { method: 'DELETE' }); exClose(); loadBuilds(); }
      catch (e) { exErr('exb-err', e.message); }
    });
    const mod = async (change) => { try { await exApi('/builds/' + id, { method: 'PATCH', body: change }); exClose(); loadBuilds(); } catch (e) { exErr('exb-err', e.message); } };
    $('exb-hide')?.addEventListener('click', () => mod({ hidden: !b.hidden }));
    $('exb-feat')?.addEventListener('click', () => mod({ featured: !b.featured }));
  });
}

/* ------------------------------------------------------------ sharing */
function currentWork(kind) {
  if (kind === 'blocks') {
    if (!ws) return null;
    const blocks = ws.getAllBlocks(false);
    if (!blocks.length) return null;
    return { kind, blocks: Blockly.serialization.workspaces.save(ws), python: toPython(ws), blockCount: blocks.length };
  }
  const py = $('code').value;
  return py.trim() ? { kind, python: py } : null;
}

function openShare(kind) {
  if (!CL?.code) {
    showView('explorer');
    return exDialog(`<h2>📤 Share with your class</h2><p>First join your class in the <b>🌍 Explorer</b> tab (you'll need the class code from your teacher).</p>
      <div class="row"><button class="primary" id="exs-ok">OK</button></div>`, () => { $('exs-ok').onclick = exClose; });
  }
  if (!getMe() && !EX.teacher && !getTeacherToken()) return pickAccount('to share your build', () => openShare(kind));
  kind = kind || ((ws && ws.getAllBlocks(false).length) ? 'blocks' : 'python');
  exDialog(`<h2>📤 Share with ${esc(CL.className || 'your class')}</h2>
    <form id="exs-form" class="tdlg-form ex-share-form">
      <div class="qz-seg" role="radiogroup" aria-label="What to share">
        <button type="button" data-k="blocks" class="${kind === 'blocks' ? 'on' : ''}">🧩 My blocks</button>
        <button type="button" data-k="python" class="${kind === 'python' ? 'on' : ''}">🐍 My Python code</button></div>
      <p class="muted" id="exs-what"></p>
      <label>Name your build <input id="exs-title" maxlength="60" placeholder="e.g. Shake dice" required></label>
      <label>What does it do? <span class="muted">(optional)</span><textarea id="exs-desc" maxlength="300" rows="3" placeholder="Shake the micro:bit to roll a number from 1 to 6!"></textarea></label>
      <p class="muted">Shared as <b>${esc(getMe()?.name || 'Teacher')}</b>. Everyone in your class will be able to see it.</p>
      <p class="tdlg-err" id="exs-err"></p>
      <div class="row"><button class="primary">📤 Share it!</button><button type="button" id="exs-cancel">Cancel</button></div>
    </form>`, () => {
    let k = kind;
    const upd = () => {
      const w = currentWork(k);
      $('exs-what').textContent = w ? (k === 'blocks' ? `${w.blockCount} blocks from your Blocks workspace.` : `${w.python.split('\n').length} lines from the Python code editor.`)
        : (k === 'blocks' ? 'Your Blocks workspace is empty.' : 'The Python code editor is empty.');
    };
    document.querySelectorAll('.ex-share-form [data-k]').forEach((b) => (b.onclick = () => {
      k = b.dataset.k; document.querySelectorAll('.ex-share-form [data-k]').forEach((x) => x.classList.toggle('on', x === b)); upd();
    }));
    upd();
    $('exs-cancel').onclick = exClose;
    $('exs-form').onsubmit = async (e) => {
      e.preventDefault();
      const w = currentWork(k);
      if (!w) return exErr('exs-err', k === 'blocks' ? 'Add some blocks first!' : 'Write some code first!');
      try {
        await exApi('/builds', { method: 'POST', body: { ...w, title: $('exs-title').value, description: $('exs-desc').value } });
        exDialog(`<h2>🎉 Shared!</h2><p>“${esc($('exs-title')?.value || 'Your build')}” is now in the class Explorer for everyone to see.</p>
          <div class="row"><button class="primary" id="exs-see">🌍 See it in the Explorer</button><button id="exs-done">Keep coding</button></div>`, () => {
          $('exs-see').onclick = () => { exClose(); showView('explorer'); };
          $('exs-done').onclick = exClose;
        });
        if (!$('view-explorer').hidden) loadBuilds();
      } catch (err) { exErr('exs-err', err.message); }
    };
  });
}

/* ------------------------------------------------------------ wiring */
function exShow() {
  clearInterval(EX.timer);
  if (CL?.code || getTeacherToken()) { renderGallery(); EX.timer = setInterval(() => { if (!$('view-explorer').hidden && (!exDlg || exDlg.hidden)) loadBuilds(); }, 20000); }
  else renderJoin(CL ? { server: CL.server } : {});
}
window.onExplorerShow = exShow;
$('bk-share').onclick = () => openShare('blocks');
$('btn-share-py').onclick = () => openShare('python');
if (!$('view-explorer').hidden) exShow();
// Still unlocked from earlier in this browser session (e.g. after a page reload): load that kid's Bit.
if (getMe()) onAccountChange(getMe());
