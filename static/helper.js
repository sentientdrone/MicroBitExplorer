/* Coding helper for the Blocks tab: a robot that checks your blocks, explains errors, answers
 * "how do I…?" questions and can add example blocks. It wears accessories won in the quiz.
 * Runs fully offline. Uses globals from app.js, blocks.js, howitworks.js, quiz.js and search.js. */
'use strict';

/* ======================================================= accessories */
const TIERS = {
  junk:      { name: 'Junk',      color: '#8c959f', need: 'Score 0%' },
  common:    { name: 'Common',    color: '#2f81f7', need: 'Score 1–49%' },
  cool:      { name: 'Cool',      color: '#1a7f37', need: 'Score 50–79%' },
  epic:      { name: 'Epic',      color: '#8957e5', need: 'Score 80–99%' },
  legendary: { name: 'Legendary', color: '#d4a000', need: 'Score 100%' },
};
// Which kind of quiz wins which outfits: the built-in Kid quiz wins the originals,
// quizzes a teacher writes (with a quiz code) win the newer ones.
const POOLS = { kid: { name: '🧒 Kid quiz prizes', quiz: 'a Kid quiz' }, teacher: { name: '🏫 Teacher quiz prizes', quiz: 'a teacher\'s quiz' } };
const poolOf = (it) => it.pool || 'kid';
const tierFor = (pct) => (pct <= 0 ? 'junk' : pct < 50 ? 'common' : pct < 80 ? 'cool' : pct < 100 ? 'epic' : 'legendary');

const emo = (ch, x, y, size, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" ${extra}>${ch}</text>`;

// slot: where it goes (one item per slot). draw: SVG for that layer.
const ITEMS = {
  trash:      { name: 'Trash can',        tier: 'junk', slot: 'ride', icon: '🗑️', draw: () => emo('🗑️', 100, 178, 94) },
  banana:     { name: 'Banana peel',      tier: 'junk', slot: 'hand', icon: '🍌', draw: () => emo('🍌', 156, 150, 34) },
  sock:       { name: 'Smelly sock hat',  tier: 'junk', slot: 'head', icon: '🧦', draw: () => emo('🧦', 100, 26, 46, 'transform="rotate(-20 100 26)"') + emo('💨', 136, 12, 20) },
  cap:        { name: 'Baseball cap',     tier: 'common', slot: 'head', icon: '🧢', draw: () => emo('🧢', 100, 30, 56) },
  partyhat:   { name: 'Party hat',        tier: 'common', slot: 'head', icon: '🎉',
    draw: () => `<polygon points="78,44 122,44 100,-6" fill="#ff6b9d" stroke="#c2185b" stroke-width="2"/>
      <path d="M86,30 L114,30 M92,16 L108,16" stroke="#ffd33d" stroke-width="5"/><circle cx="100" cy="-8" r="7" fill="#ffd33d"/>` },
  glasses:    { name: 'Nerdy glasses',    tier: 'common', slot: 'face', icon: '👓', draw: () => emo('👓', 100, 72, 54) },
  bow:        { name: 'Bow tie',          tier: 'common', slot: 'neck', icon: '🎀', draw: () => emo('🎀', 100, 110, 32) },
  balloon:    { name: 'Balloon',          tier: 'common', slot: 'hand', icon: '🎈', draw: () => `<line x1="154" y1="148" x2="166" y2="96" stroke="#555" stroke-width="1.5"/>` + emo('🎈', 168, 80, 40) },
  sunglasses: { name: 'Cool sunglasses',  tier: 'cool', slot: 'face', icon: '🕶️', draw: () => emo('🕶️', 100, 70, 58) },
  headphones: { name: 'Headphones',       tier: 'cool', slot: 'head', icon: '🎧', draw: () => emo('🎧', 100, 52, 92) },
  scarf:      { name: 'Cosy scarf',       tier: 'cool', slot: 'neck', icon: '🧣', draw: () => emo('🧣', 100, 116, 46) },
  skateboard: { name: 'Skateboard',       tier: 'cool', slot: 'ride', icon: '🛹', draw: () => emo('🛹', 100, 210, 70) },
  guitar:     { name: 'Guitar',           tier: 'cool', slot: 'hand', icon: '🎸', draw: () => emo('🎸', 158, 146, 46, 'transform="rotate(20 158 146)"') },
  wizard:     { name: 'Wizard hat',       tier: 'epic', slot: 'head', icon: '🧙',
    draw: () => `<ellipse cx="100" cy="44" rx="50" ry="9" fill="#5b2a9e"/><polygon points="68,44 132,44 112,-22" fill="#6f3cc4" stroke="#3d1a70" stroke-width="2"/>
      ${emo('✦', 92, 22, 14, 'fill="#ffd33d"')}${emo('✦', 108, 0, 11, 'fill="#ffd33d"')}${emo('★', 112, 34, 12, 'fill="#ffd33d"')}` },
  cape:       { name: 'Hero cape',        tier: 'epic', slot: 'back', icon: '🦸',
    draw: () => `<path d="M72,112 L128,112 L156,206 Q100,222 44,206 Z" fill="#d1242f" stroke="#8b1a1a" stroke-width="2"/>` },
  wand:       { name: 'Magic wand',       tier: 'epic', slot: 'hand', icon: '🪄', draw: () => emo('🪄', 160, 140, 40) + emo('✨', 176, 116, 22) },
  goggles:    { name: 'Science goggles',  tier: 'epic', slot: 'face', icon: '🥽', draw: () => emo('🥽', 100, 70, 58) },
  rocket:     { name: 'Rocket boots',     tier: 'epic', slot: 'ride', icon: '🚀',
    draw: () => emo('🔥', 86, 216, 26) + emo('🔥', 114, 216, 26) + emo('🚀', 70, 198, 26, 'transform="rotate(45 70 198)"') + emo('🚀', 130, 198, 26, 'transform="rotate(45 130 198)"') },
  crown:      { name: 'Golden crown',     tier: 'legendary', slot: 'head', icon: '👑', draw: () => emo('👑', 100, 24, 58) },
  glow:       { name: 'Golden glow',      tier: 'legendary', slot: 'aura', icon: '✨',
    draw: () => `<circle cx="100" cy="110" r="100" fill="url(#bot-glow)"/>${emo('✨', 30, 40, 24)}${emo('✨', 172, 60, 20)}${emo('✨', 160, 190, 18)}${emo('✨', 36, 170, 18)}` },
  rainbow:    { name: 'Rainbow',          tier: 'legendary', slot: 'aura', icon: '🌈', draw: () => emo('🌈', 100, 70, 170, 'opacity=".55"') },
  trophy:     { name: 'Champion trophy',  tier: 'legendary', slot: 'hand', icon: '🏆', draw: () => emo('🏆', 160, 138, 42) },

  // ---- won from teacher quizzes
  bucket:     { pool: 'teacher', name: 'Bucket hat (a real bucket)', tier: 'junk', slot: 'head', icon: '🪣', draw: () => emo('🪣', 100, 22, 56, 'transform="rotate(180 100 22)"') },
  sponge:     { pool: 'teacher', name: 'Soggy sponge',     tier: 'junk', slot: 'hand', icon: '🧽', draw: () => emo('🧽', 158, 148, 32) + emo('💧', 166, 172, 14) },
  boot:       { pool: 'teacher', name: 'One old boot',     tier: 'junk', slot: 'feet', icon: '🥾', draw: () => emo('🥾', 118, 200, 42) },
  flower:     { pool: 'teacher', name: 'Sunflower',        tier: 'common', slot: 'head', icon: '🌻', draw: () => emo('🌻', 116, 30, 40) },
  lollipop:   { pool: 'teacher', name: 'Giant lollipop',   tier: 'common', slot: 'hand', icon: '🍭', draw: () => emo('🍭', 160, 138, 40) },
  backpack:   { pool: 'teacher', name: 'School backpack',  tier: 'common', slot: 'back', icon: '🎒', draw: () => emo('🎒', 140, 126, 50) },
  starbadge:  { pool: 'teacher', name: 'Gold star badge',  tier: 'common', slot: 'neck', icon: '⭐', draw: () => emo('⭐', 116, 122, 24) },
  tophat:     { pool: 'teacher', name: 'Top hat',          tier: 'cool', slot: 'head', icon: '🎩', draw: () => emo('🎩', 100, 22, 58) },
  basketball: { pool: 'teacher', name: 'Basketball',       tier: 'cool', slot: 'hand', icon: '🏀', draw: () => emo('🏀', 162, 146, 36) },
  scooter:    { pool: 'teacher', name: 'Scooter',          tier: 'cool', slot: 'ride', icon: '🛴', draw: () => emo('🛴', 100, 204, 74) },
  snorkel:    { pool: 'teacher', name: 'Snorkel mask',     tier: 'cool', slot: 'face', icon: '🤿', draw: () => emo('🤿', 100, 70, 56) },
  medal:      { pool: 'teacher', name: 'Winner\'s medal',  tier: 'cool', slot: 'neck', icon: '🏅', draw: () => emo('🏅', 100, 124, 32) },
  unicorn:    { pool: 'teacher', name: 'Unicorn horn',     tier: 'epic', slot: 'head', icon: '🦄',
    draw: () => `<polygon points="90,44 110,44 100,-10" fill="#ffd6f5" stroke="#d63aa0" stroke-width="2"/><path d="M93,32 L106,26 M95,18 L104,13 M97,4 L102,1" stroke="#d63aa0" stroke-width="2"/>` },
  visor:      { pool: 'teacher', name: 'Laser visor',      tier: 'epic', slot: 'face', icon: '🥽',
    draw: () => '<rect x="58" y="61" width="84" height="16" rx="8" fill="#ff3b30" opacity=".85"/><rect x="58" y="61" width="84" height="16" rx="8" fill="none" stroke="#ff9e98" stroke-width="2"/>' },
  dragon:     { pool: 'teacher', name: 'Pet dragon',       tier: 'epic', slot: 'back', icon: '🐉', draw: () => emo('🐉', 156, 96, 58) },
  ufo:        { pool: 'teacher', name: 'Flying saucer',    tier: 'epic', slot: 'ride', icon: '🛸', draw: () => emo('🛸', 100, 206, 84) },
  lightning:  { pool: 'teacher', name: 'Lightning aura',   tier: 'epic', slot: 'aura', icon: '⚡', draw: () => emo('⚡', 28, 60, 28) + emo('⚡', 172, 66, 24) + emo('⚡', 36, 176, 22) + emo('⚡', 166, 186, 26) },
  tiara:      { pool: 'teacher', name: 'Star tiara',       tier: 'legendary', slot: 'head', icon: '🌟',
    draw: () => `<path d="M68,44 Q100,30 132,44" fill="none" stroke="#d4a000" stroke-width="5"/>${emo('🌟', 100, 20, 38)}${emo('✦', 76, 34, 14, 'fill="#ffd33d"')}${emo('✦', 124, 34, 14, 'fill="#ffd33d"')}` },
  diamond:    { pool: 'teacher', name: 'Giant diamond',    tier: 'legendary', slot: 'hand', icon: '💎', draw: () => emo('💎', 160, 140, 40) },
  wings:      { pool: 'teacher', name: 'Butterfly wings',  tier: 'legendary', slot: 'back', icon: '🦋', draw: () => emo('🦋', 44, 118, 64, 'transform="scale(-1 1) translate(-88 0)"') + emo('🦋', 156, 118, 64) },
  planet:     { pool: 'teacher', name: 'Planet rings',     tier: 'legendary', slot: 'aura', icon: '🪐', draw: () => emo('🪐', 100, 96, 190, 'opacity=".45"') },
};
const SLOT_ORDER_BEHIND = ['aura', 'back'];
const SLOT_ORDER_FRONT = ['neck', 'face', 'head', 'hand', 'ride', 'feet'];  // feet last: a boot shows even in a trash can
const SLOT_NAMES = { head: 'Head', face: 'Face', neck: 'Neck', hand: 'Hand', ride: 'Ride', feet: 'Feet', back: 'Back', aura: 'Aura' };

/* ------------------------------------------------------ saved state */
// Whose Bit is loaded: this computer's own Bit (saved in the browser), or, while a kid's
// account is unlocked in the Explorer, that kid's Bit (saved on their account on the class server).
const HELPER_KEY = 'microbit-helper';
const freshBit = () => ({ name: 'Bit', owned: [], equipped: {}, bucks: 100, ownedLooks: [] });  // everyone starts with 100 Bit Bucks
// Bits saved before looks could be locked: keep whatever look they already use unlocked.
function ensureLooks(b) {
  // The old boot used to share the "ride" spot; it has its own "feet" spot now.
  if (b.equipped?.ride === 'boot') { delete b.equipped.ride; b.equipped.feet = 'boot'; }
  if (!Array.isArray(b.ownedLooks)) {
    b.ownedLooks = Object.entries({ ...DEFAULT_LOOK, ...(b.look || {}) }).filter(([k, v]) => lookTier(k, v) !== 'free').map(([k, v]) => lookId(k, v));
  }
  return b;
}
function loadComputerBit() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(HELPER_KEY) || '{}') || {}; } catch {}
  const b = { ...freshBit(), ...saved, ownedLooks: saved.ownedLooks };  // keep "no list yet" visible to ensureLooks
  if (typeof b.bucks !== 'number') b.bucks = 100;  // older saves: give the starting money
  return ensureLooks(b);
}
let HS = freshBit();  // the saved Bit is loaded once the looks below are defined
let bitOwner = null;          // { id, name } of the kid whose Bit is loaded, or null for this computer's Bit
let bitSync = '';             // '', 'loading', 'saved', 'offline'
function saveHS() {
  if (!bitOwner) { try { localStorage.setItem(HELPER_KEY, JSON.stringify(HS)); } catch {} return; }
  saveKidBit();
}

/* ------------------------------------------- kid's Bit on their account */
let bitSaveTimer = null;
function saveKidBit(retry = false) {
  clearTimeout(bitSaveTimer);
  if (!bitOwner || typeof exApi !== 'function') return;
  const owner = bitOwner.id, snapshot = JSON.parse(JSON.stringify(HS));
  // exApi builds its headers (with the kid's token) straight away, so a save started just
  // before locking still reaches the right account.
  exApi('/me/profile', { method: 'POST', body: { profile: snapshot } })
    .then(() => { if (bitOwner?.id === owner) { bitSync = 'saved'; showBitSync(); } })
    .catch(() => {
      if (bitOwner?.id !== owner) return;
      bitSync = 'offline'; showBitSync();
      if (!retry) bitSaveTimer = setTimeout(() => saveKidBit(true), 10000);  // try once more
    });
}

// Called by the Explorer whenever a kid unlocks or locks their account.
async function onAccountChange(me) {
  if (me && me.id === bitOwner?.id) return;
  if (!me) {
    if (!bitOwner) return;
    bitOwner = null; bitSync = ''; HS = loadComputerBit(); refreshBitViews();
    return;
  }
  bitOwner = { id: me.id, name: me.name }; bitSync = 'loading';
  HS = freshBit(); refreshBitViews();
  try {
    const j = await exApi('/me/profile');
    if (bitOwner?.id !== me.id) return;
    if (j.profile) { HS = ensureLooks({ ...freshBit(), ...j.profile, ownedLooks: j.profile.ownedLooks }); bitSync = 'saved'; }
    else { HS = freshBit(); saveKidBit(); }  // first time: a brand-new Bit with 100 Bit Bucks
  } catch { if (bitOwner?.id === me.id) bitSync = 'offline'; }
  refreshBitViews();
}

function bitSyncText() {
  if (!bitOwner) return '💻 Saved on this computer';
  return { loading: `⏳ Loading ${esc(bitOwner.name)}'s Bit…`, saved: `☁️ Saved to ${esc(bitOwner.name)}'s account`,
    offline: `⚠️ Couldn't reach the class server: ${esc(bitOwner.name)}'s changes may not be saved` }[bitSync] || `☁️ ${esc(bitOwner.name)}'s Bit`;
}
function showBitSync() { document.querySelectorAll('.bit-sync').forEach((el) => { el.innerHTML = bitSyncText(); el.classList.toggle('warn', bitSync === 'offline'); }); }
function refreshBitViews() {
  if (typeof hPanel !== 'undefined' && !hPanel.hidden) renderHelperTop();
  if (typeof wardrobe !== 'undefined' && wardrobe && !wardrobe.hidden) renderWardrobe();
  showBitSync();
}

/* ---------------------------------------------------------- Bit Bucks */
const PRICES = { junk: 10, common: 40, cool: 80, epic: 150, legendary: 300 };
const sellPrice = (it) => Math.floor(PRICES[it.tier] / 2);
const BB = (n) => `<span class="bb">🪙 ${n}</span>`;
// Quiz pay: Kid quizzes 5 per right answer, teacher quizzes 10; a perfect score adds a bonus.
function earnBucks(correct, total, kind = 'kid') {
  const per = kind === 'teacher' ? 10 : 5;
  const bonus = total && correct === total ? (kind === 'teacher' ? 30 : 20) : 0;
  const earned = correct * per + bonus;
  HS.bucks += earned; saveHS();
  if (typeof renderHelperTop === 'function' && !hPanel.hidden) renderHelperTop();
  return { earned, bonus };
}

/* ------------------------------------------------------------ looks */
const LOOKS = {
  body: [['Blue', '#4f8ff7', '#2557b8'], ['Red', '#f25c54', '#a8322c'], ['Green', '#3cc46d', '#1f7a41'], ['Purple', '#9b6cf2', '#5b34a8'],
    ['Orange', '#ff9f43', '#b8650f'], ['Pink', '#ff7eb6', '#b83c78'], ['Yellow', '#f7d038', '#a88a10'], ['Teal', '#2ec4b6', '#167a71'],
    ['Silver', '#b8c2cc', '#6b7785'], ['Black', '#454b54', '#16191d'], ['Gold', '#e8b923', '#8a6a0a'], ['White', '#f2f4f7', '#9aa3ad']],
  glow: [['Green', '#7ee787'], ['Cyan', '#5ee7ff'], ['Pink', '#ff8fd1'], ['Yellow', '#ffe066'], ['Red', '#ff6b6b'], ['White', '#ffffff'], ['Purple', '#c9a7ff'], ['Orange', '#ffb15e']],
  eyes: [['round', 'Round'], ['square', 'Pixel'], ['happy', 'Happy'], ['hearts', 'Hearts'], ['stars', 'Stars'], ['sleepy', 'Sleepy'], ['big', 'Big'], ['wink', 'Wink']],
  mouth: [['smile', 'Smile'], ['grin', 'Grin'], ['o', 'Surprised'], ['flat', 'Calm'], ['tongue', 'Silly'], ['robot', 'Robot']],
  antenna: [['ball', 'Ball'], ['heart', 'Heart'], ['star', 'Star'], ['bolt', 'Bolt'], ['double', 'Double'], ['none', 'None']],
};
const DEFAULT_LOOK = { body: 'Blue', glow: 'Green', eyes: 'round', mouth: 'smile', antenna: 'ball' };
// The starter look is free; everything else is unlocked from quizzes or bought in the shop.
const LOOK_TIERS = {
  body: { Blue: 'free', Red: 'common', Green: 'common', Yellow: 'common', Purple: 'cool', Orange: 'cool', Pink: 'cool', Teal: 'cool',
    Silver: 'epic', Black: 'epic', Gold: 'legendary', White: 'legendary' },
  glow: { Green: 'free', Cyan: 'common', Yellow: 'common', Pink: 'cool', Red: 'cool', Orange: 'cool', White: 'epic', Purple: 'epic' },
  eyes: { round: 'free', square: 'common', happy: 'common', sleepy: 'cool', wink: 'cool', big: 'epic', stars: 'epic', hearts: 'legendary' },
  mouth: { smile: 'free', flat: 'common', o: 'common', grin: 'cool', tongue: 'epic', robot: 'legendary' },
  antenna: { ball: 'free', none: 'common', double: 'cool', star: 'epic', heart: 'epic', bolt: 'legendary' },
};
const LOOK_PART = { body: 'body colour', glow: 'glow colour', eyes: 'eyes', mouth: 'mouth', antenna: 'antenna' };
const lookId = (k, v) => `${k}:${v}`;
const lookTier = (k, v) => LOOK_TIERS[k]?.[v] || 'common';
const hasLook = (k, v) => lookTier(k, v) === 'free' || (HS.ownedLooks || []).includes(lookId(k, v));
const lookName = (k, v) => `${(LOOKS[k].find((o) => o[0] === v) || [v, v])[k === 'body' || k === 'glow' ? 0 : 1]} ${LOOK_PART[k]}`;
const allLooks = () => Object.entries(LOOK_TIERS).flatMap(([k, opts]) => Object.keys(opts).map((v) => [k, v]));
function lookPreviewHTML(k, v) {
  if (k === 'body' || k === 'glow') {
    const c = LOOKS[k].find(([n]) => n === v)?.[1] || '#ccc';
    return `<span class="lk-sw static" style="background:${c}"></span>`;
  }
  return botSVG({}, 'lk-mini', { ...look(), [k]: v });
}
HS = loadComputerBit();  // now that LOOK_TIERS exists, load this computer's saved Bit

function buyLook(k, v) {
  const price = PRICES[lookTier(k, v)];
  if (hasLook(k, v)) return true;
  if (HS.bucks < price) {
    alert(`The ${lookName(k, v)} costs ${price} Bit Bucks and you have ${HS.bucks}. Win it in a quiz, or earn more Bit Bucks!`);
    return false;
  }
  if (!confirm(`Buy the ${lookName(k, v)} for ${price} Bit Bucks?`)) return false;
  HS.bucks -= price; HS.ownedLooks = [...(HS.ownedLooks || []), lookId(k, v)];
  return true;
}
const look = (l = HS.look) => ({ ...DEFAULT_LOOK, ...(l || {}) });

function eyesSVG(style) {
  const at = [85, 115];
  switch (style) {
    case 'square': return at.map((x) => `<rect x="${x - 6}" y="64" width="12" height="12" rx="1" class="bot-eye"/>`).join('');
    case 'happy': return at.map((x) => `<path d="M${x - 7},73 Q${x},62 ${x + 7},73" class="bot-eye-line"/>`).join('');
    case 'hearts': return at.map((x) => `<text x="${x}" y="71" font-size="17" text-anchor="middle" dominant-baseline="central" class="bot-eye-t">♥</text>`).join('');
    case 'stars': return at.map((x) => `<text x="${x}" y="71" font-size="17" text-anchor="middle" dominant-baseline="central" class="bot-eye-t">★</text>`).join('');
    case 'sleepy': return at.map((x) => `<path d="M${x - 7},70 Q${x},76 ${x + 7},70" class="bot-eye-line"/>`).join('');
    case 'big': return at.map((x) => `<circle cx="${x}" cy="70" r="9" class="bot-eye"/><circle cx="${x + 3}" cy="67" r="3" fill="#fff"/>`).join('');
    case 'wink': return `<circle cx="85" cy="70" r="6.5" class="bot-eye"/><path d="M108,70 L122,70" class="bot-eye-line"/>`;
    default: return at.map((x) => `<circle cx="${x}" cy="70" r="6.5" class="bot-eye"/>`).join('');
  }
}
function mouthSVG(style) {
  switch (style) {
    case 'grin': return '<path d="M86,80 Q100,94 114,80 Z" class="bot-mouth-fill"/>';
    case 'o': return '<circle cx="100" cy="84" r="4.5" class="bot-mouth"/>';
    case 'flat': return '<path d="M90,84 L110,84" class="bot-mouth"/>';
    case 'tongue': return '<path d="M89,81 Q100,90 111,81" class="bot-mouth"/><path d="M98,86 Q102,94 106,86" fill="#ff6b8b"/>';
    case 'robot': return '<rect x="88" y="80" width="24" height="8" rx="2" class="bot-mouth"/><path d="M94,80 V88 M100,80 V88 M106,80 V88" class="bot-mouth" stroke-width="1.5"/>';
    default: return '<path d="M89,81 Q100,90 111,81" class="bot-mouth"/>';
  }
}
function antennaSVG(style) {
  switch (style) {
    case 'none': return '';
    case 'heart': return '<line x1="100" y1="22" x2="100" y2="40" class="bot-line"/><text x="100" y="14" font-size="20" text-anchor="middle" dominant-baseline="central" class="bot-ant-t">♥</text>';
    case 'star': return '<line x1="100" y1="22" x2="100" y2="40" class="bot-line"/><text x="100" y="14" font-size="20" text-anchor="middle" dominant-baseline="central" class="bot-ant-t">★</text>';
    case 'bolt': return '<line x1="100" y1="24" x2="100" y2="40" class="bot-line"/><text x="100" y="14" font-size="20" text-anchor="middle" dominant-baseline="central">⚡</text>';
    case 'double': return '<path d="M86,40 L80,20 M114,40 L120,20" class="bot-line"/><circle cx="80" cy="17" r="5.5" class="bot-ant"/><circle cx="120" cy="17" r="5.5" class="bot-ant"/>';
    default: return '<line x1="100" y1="20" x2="100" y2="40" class="bot-line"/><circle cx="100" cy="16" r="7" class="bot-ant"/>';
  }
}

function botSVG(equipped = HS.equipped, cls = '', lk = look()) {
  const layer = (slots) => slots.map((s) => (equipped[s] && ITEMS[equipped[s]] ? ITEMS[equipped[s]].draw() : '')).join('');
  const [, body, dark] = LOOKS.body.find(([n]) => n === lk.body) || LOOKS.body[0];
  const [, glow] = LOOKS.glow.find(([n]) => n === lk.glow) || LOOKS.glow[0];
  let chest = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) chest += `<rect x="${86 + c * 10}" y="${122 + r * 10}" width="7" height="7" rx="1.5" class="bot-led" style="animation-delay:${(r * 3 + c) * 0.15}s"/>`;
  return `<svg viewBox="0 -28 200 256" class="bot ${cls}" style="--bot-body:${body};--bot-dark:${dark};--bot-glow:${glow}" aria-label="${esc(HS.name)} the helper robot">
    <defs><radialGradient id="bot-glow"><stop offset="0" stop-color="#ffd33d" stop-opacity=".55"/><stop offset="1" stop-color="#ffd33d" stop-opacity="0"/></radialGradient></defs>
    ${layer(SLOT_ORDER_BEHIND)}
    <g class="bot-body">
      ${antennaSVG(lk.antenna)}
      <path d="M70,120 Q50,130 48,150" class="bot-limb"/><path d="M130,120 Q150,130 152,148" class="bot-limb"/>
      <circle cx="48" cy="152" r="7" class="bot-hand"/><circle cx="152" cy="150" r="7" class="bot-hand"/>
      <rect x="80" y="164" width="13" height="28" rx="5" class="bot-leg"/><rect x="107" y="164" width="13" height="28" rx="5" class="bot-leg"/>
      <ellipse cx="86" cy="194" rx="12" ry="6" class="bot-leg"/><ellipse cx="114" cy="194" rx="12" ry="6" class="bot-leg"/>
      <rect x="68" y="106" width="64" height="62" rx="14" class="bot-torso"/>${chest}
      <rect x="54" y="40" width="92" height="64" rx="20" class="bot-head"/>
      <rect x="66" y="52" width="68" height="40" rx="12" class="bot-face"/>
      <g class="bot-eyes">${eyesSVG(lk.eyes)}</g>
      ${mouthSVG(lk.mouth)}
    </g>
    ${layer(SLOT_ORDER_FRONT)}
  </svg>`;
}

/* ======================================================= helper panel */
const hPanel = $('helper');
function renderHelperTop() {
  $('helper-bot').innerHTML = botSVG();
  $('helper-name').textContent = HS.name;
  const n = HS.owned.length, total = Object.keys(ITEMS).length;
  $('helper-count').innerHTML = `${n}/${total} outfits · ${BB(HS.bucks)} Bit Bucks<br><span class="bit-sync">${bitSyncText()}</span>`;
}

function say(html, opts = {}) {
  const log = $('helper-log');
  const m = document.createElement('div'); m.className = 'hm bot-msg'; m.innerHTML = html;
  if (opts.actions) {
    const row = document.createElement('div'); row.className = 'hm-actions';
    for (const [label, fn, primary] of opts.actions) {
      const b = document.createElement('button'); b.className = 'small' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; row.appendChild(b);
    }
    m.appendChild(row);
  }
  log.appendChild(m); log.scrollTop = log.scrollHeight;
  const bot = document.querySelector('#helper-bot .bot'); if (bot) { bot.classList.remove('talk'); void bot.offsetWidth; bot.classList.add('talk'); }
}
function you(text) {
  const m = document.createElement('div'); m.className = 'hm you-msg'; m.textContent = text;
  $('helper-log').appendChild(m);
}

const CHIPS = {
  blocks: ['How do I use buttons?', 'Make a dice', 'Play music', 'Count things', 'My code doesn\'t work'],
  python: ['Check my code', 'What is indentation?', 'How do I make a dice?', '= vs ==', 'What does import mean?'],
};
let lastMode = null;
function openHelper() {
  const mode = helperMode();
  if (hPanel.parentNode !== document.body) document.body.appendChild(hPanel);  // works on any tab
  hPanel.style.top = Math.max(0, document.querySelector('header').getBoundingClientRect().bottom) + 'px';
  hPanel.hidden = false;
  hPanel.classList.toggle('py', mode === 'python');
  $('bk-helper').classList.toggle('on', mode === 'blocks');
  renderHelperTop();
  $('helper-chips').innerHTML = CHIPS[mode].map((t) => `<button type="button">${esc(t)}</button>`).join('');
  $('helper-chips').querySelectorAll('button').forEach((b) => (b.onclick = () => ask(b.textContent)));
  $('helper-input').placeholder = mode === 'python' ? 'Ask about Python… e.g. what is a loop?' : 'Ask me… e.g. how do I make a dice?';
  if (mode !== lastMode) {
    lastMode = mode;
    say(mode === 'python'
      ? `Hi! I'm <b>${esc(HS.name)}</b> 🤖🐍. I can <b>check your Python</b> for mistakes, explain error messages from the console, and answer Python questions.`
      : `Hi! I'm <b>${esc(HS.name)}</b> 🤖. Stuck on your code? I can <b>check your blocks</b> for mistakes, explain errors, or show you how to do things.`,
    { actions: [['🔍 Check my code', () => ask('check my code'), true]] });
  }
  setTimeout(() => $('helper-input').focus(), 50);
  if (ws) Blockly.svgResize(ws);
}
function closeHelper() { hPanel.hidden = true; $('bk-helper').classList.remove('on'); }
// Bit follows you between the Blocks and Manager tabs, and steps aside on the others.
const _showViewForHelper = showView;
showView = function (name) {
  _showViewForHelper(name);
  if (hPanel.hidden) return;
  if (name === 'blocks' || name === 'manager') openHelper(); else closeHelper();
};
window.addEventListener('resize', () => { if (!hPanel.hidden) hPanel.style.top = Math.max(0, document.querySelector('header').getBoundingClientRect().bottom) + 'px'; });

/* ================================================= checking the code */
const allBlocks = () => ws.getAllBlocks(false);
const has = (type) => allBlocks().some((b) => b.type === type);
const HAT_TYPES = new Set(['mb_on_start', 'mb_forever', 'mb_on_button', 'mb_on_gesture', 'mb_on_pin_touched', 'mb_every', 'mb_on_radio']);
const blockLabel = (b) => (BLOCK_TEXT[b.type] || b.type.replace(/^(mb_|controls_|math_|logic_|text_)/, '').replace(/_/g, ' ')).trim();

function pointAt(block, msg) {
  if (!block || block.disposed) return;
  ws.centerOnBlock(block.id);
  block.select?.();
  block.setWarningText?.(msg);
  setTimeout(() => { if (!block.disposed) block.setWarningText?.(null); }, 9000);
}

function explainError() {
  const errs = [...$('kid-out').querySelectorAll('.err')].map((e) => e.textContent).join('\n');
  if (!errs.trim()) return null;
  const last = errs.trim().split('\n').filter((l) => /Error|Interrupt/.test(l)).pop() || '';
  const line = (errs.match(/line (\d+)/g) || []).pop();
  const E = [
    [/KeyboardInterrupt/, null],  // just the Stop button
    [/index out of range|ValueError.*(pixel|coordinate)/i, '💡 An LED position was outside the screen. <b>x</b> and <b>y</b> must be between <b>0 and 4</b> (there are only 5 LEDs across and down).'],
    [/NameError: name '?(\w+)'?/, (m) => `🤔 I don't know anything called <b>${esc(m[1])}</b>. Did you use a variable before giving it a value, or rename it? Try a <b>set … to</b> block in 🚀 on start.`],
    [/MemoryError/, '🧠 Your program is too big for the micro:bit\'s tiny memory (16 KB)! Try removing some blocks, or use loops instead of copying the same blocks lots of times.'],
    [/ZeroDivisionError/, '➗ Something tried to <b>divide by zero</b>, which is impossible! Check your ÷ blocks.'],
    [/TypeError.*(str|concat|unsupported operand)/i, '🔤 You mixed <b>words</b> and <b>numbers</b> in a maths block. Use <b>create text with</b> (🔤 Text) to join them instead.'],
    [/TypeError/, '🧩 Two blocks that don\'t fit together were used: for example, a word where a number was needed.'],
    [/OSError.*28|ENOSPC/, '💾 The micro:bit\'s storage is full. Delete some files in 🧰 Manager → Files.'],
    [/SyntaxError/, '😵 The micro:bit couldn\'t understand the program. This is probably my fault, not yours! Try removing the last block you added.'],
  ];
  for (const [re, text] of E) {
    const m = last.match(re);
    if (m) return text === null ? null : (typeof text === 'function' ? text(m) : text) + `<div class="hm-err">The micro:bit said: <code>${esc(last.trim())}</code>${line ? ` (${line} of the Python)` : ''}</div>`;
  }
  return `🐞 The micro:bit reported a problem: <code>${esc(last.trim())}</code>. Check the blocks you added most recently.`;
}

function checkCode() {
  const tips = [];
  const blocks = allBlocks();
  const err = explainError();
  if (err) tips.push({ html: err });
  if (!blocks.length) {
    tips.push({ html: '🧺 Your workspace is empty! Open <b>🟦 Basic</b> and drag out a <b>🚀 on start</b> block, then put a <b>show icon</b> block inside it.',
      actions: [['Add a starter for me', () => addRecipe(RECIPES.find((r) => r.id === 'hello')), true]] });
    return tips;
  }
  const tops = ws.getTopBlocks(true);
  const loose = tops.filter((b) => !HAT_TYPES.has(b.type) && !b.type.startsWith('procedures_def'));
  if (loose.length) {
    tips.push({ html: `🧲 <b>${loose.length}</b> block${loose.length > 1 ? 's are' : ' is'} floating on ${loose.length > 1 ? 'their' : 'its'} own (they look faded). Blocks only run when they're <b>snapped inside</b> an event block like 🚀 on start, 🔁 forever or 🔘 when button pressed.`,
      actions: [['Show me', () => pointAt(loose[0], 'Snap me inside an event block!'), true]] });
  }
  for (const h of tops.filter((b) => HAT_TYPES.has(b.type))) {
    if (!h.getInputTargetBlock('DO')) {
      tips.push({ html: `📭 Your <b>${esc(blockLabel(h))}</b> block is empty, so nothing will happen. Put some blocks inside it!`,
        actions: [['Show me', () => pointAt(h, 'Put some blocks inside me!'), true]] });
    }
  }
  for (const f of tops.filter((b) => b.type === 'mb_forever')) {
    const inside = f.getDescendants(false);
    if (inside.some((b) => b.type === 'mb_print') && !inside.some((b) => b.type === 'mb_pause')) {
      tips.push({ html: '⏩ Your <b>forever</b> loop prints super fast and will flood the “micro:bit says” box. Add a <b>⏸️ pause</b> block (like 500 ms) inside it.',
        actions: [['Show me', () => pointAt(f, 'Add a pause block inside me'), true]] });
    }
  }
  for (const b of blocks.filter((x) => ['mb_plot', 'mb_unplot', 'mb_point'].includes(x.type))) {
    for (const k of ['X', 'Y']) {
      const c = b.getInputTargetBlock(k);
      if (c && c.type === 'math_number' && (+c.getFieldValue('NUM') < 0 || +c.getFieldValue('NUM') > 4)) {
        tips.push({ html: `📍 An LED block uses <b>${k.toLowerCase()} = ${c.getFieldValue('NUM')}</b>, but x and y only go from <b>0 to 4</b>.`,
          actions: [['Show me', () => pointAt(b, 'x and y must be 0 to 4'), true]] });
      }
    }
  }
  if (['mb_melody', 'mb_tone', 'mb_tempo'].some(has)) {
    tips.push({ html: '🎧 You\'re using music. The micro:bit v1 has <b>no speaker</b>, so clip headphones or a speaker to <b>pin 0</b> and <b>GND</b> to hear it.' });
  }
  if (has('mb_heading') && !has('mb_calibrate')) {
    tips.push({ html: '🧭 Your code uses the compass. The first time it runs, the micro:bit will ask you to <b>tilt it until the screen fills with dots</b>. That\'s calibration, and it\'s normal!' });
  }
  if (['mb_radio_send', 'mb_on_radio', 'mb_radio_msg'].some(has) && !has('mb_radio_group')) {
    tips.push({ html: '📡 You\'re using the radio. Add <b>radio set group</b> in 🚀 on start, and use the <b>same number</b> on every micro:bit so they can hear each other.' });
  }
  if (has('mb_radio_msg') && !has('mb_on_radio')) {
    tips.push({ html: '📨 <b>received message</b> only gets filled in when a message arrives. Use it inside a <b>📡 when radio receives a message</b> block.' });
  }
  const sets = new Set(blocks.filter((b) => ['variables_set', 'math_change', 'controls_for'].includes(b.type)).map((b) => b.getFieldValue('VAR')));
  for (const g of blocks.filter((b) => b.type === 'variables_get')) {
    if (!sets.has(g.getFieldValue('VAR'))) {
      const name = g.getField('VAR').getText();
      tips.push({ html: `📦 The variable <b>${esc(name)}</b> is used but never <b>set</b>. It will just stay <b>0</b>. Use a <b>set ${esc(name)} to</b> block first.`,
        actions: [['Show me', () => pointAt(g, 'This variable is never set'), true]] });
      break;
    }
  }
  if (!tips.length) {
    tips.push({ html: `✅ Your code looks great! ${port ? 'Press <b>▶ Run</b> to try it on the micro:bit.' : 'Press <b>▶ Run</b>. It will ask you to connect the micro:bit first.'} If something still doesn't work, tell me what you expected to happen.` });
  }
  return tips;
}

/* ===================================================== how-to recipes */
const sh = (type, fields) => ({ shadow: { type, fields } });
const NUM = (n) => sh('math_number', { NUM: n });
const TXT = (t) => sh('text', { TEXT: t });
const stackOf = (arr) => arr.reduceRight((next, b) => (next ? { ...b, next: { block: next } } : b), null);
const RECIPES = [
  { id: 'hello', title: 'Say hello', keys: 'hello start begin first starter show icon picture heart smile',
    say: 'Here\'s a simple start: when the program begins, the micro:bit shows a heart and scrolls “Hi!”.',
    blocks: [{ type: 'mb_on_start', inputs: { DO: { block: stackOf([{ type: 'mb_show_icon', fields: { ICON: 'HEART' } }, { type: 'mb_scroll', inputs: { TEXT: TXT('Hi!') } }]) } } }] },
  { id: 'buttons', title: 'Use buttons A and B', keys: 'button buttons press pressed a b click',
    say: 'Use the <b>🔘 when button pressed</b> event from 🟪 Input. Anything inside it runs when you press that button.',
    blocks: [
      { type: 'mb_on_button', fields: { BTN: 'a' }, inputs: { DO: { block: { type: 'mb_show_icon', fields: { ICON: 'HAPPY' } } } } },
      { type: 'mb_on_button', fields: { BTN: 'b' }, inputs: { DO: { block: { type: 'mb_show_icon', fields: { ICON: 'SAD' } } } } }] },
  { id: 'dice', title: 'Make a dice', keys: 'dice die random roll number game shake chance',
    say: 'A dice! Shake the micro:bit and it shows a <b>random number from 1 to 6</b>, using <b>pick random</b> from 🔢 Math.',
    blocks: [{ type: 'mb_on_gesture', fields: { G: 'shake' }, inputs: { DO: { block: { type: 'mb_show', inputs: { TEXT: { block: { type: 'math_random_int', inputs: { FROM: NUM(1), TO: NUM(6) } } } } } } } }] },
  { id: 'temp', title: 'Show the temperature', keys: 'temperature temp hot cold warm thermometer fahrenheit celsius degrees',
    say: 'Press A to scroll the temperature. The <b>🌡️ temperature</b> block can give °C or °F. I picked °F here.',
    blocks: [{ type: 'mb_on_button', fields: { BTN: 'a' }, inputs: { DO: { block: { type: 'mb_scroll', inputs: { TEXT: { block: { type: 'mb_temperature', fields: { UNIT: 'F' } } } } } } } }] },
  { id: 'music', title: 'Play music', keys: 'music song sound tune melody play noise beep tone speaker',
    say: 'Use <b>🎶 play melody</b> from 🎵 Music. Remember: plug headphones or a speaker into <b>pin 0</b> and <b>GND</b> to hear it!',
    blocks: [{ type: 'mb_on_button', fields: { BTN: 'a' }, inputs: { DO: { block: { type: 'mb_melody', fields: { M: 'BIRTHDAY', WAIT: 'False' } } } } }] },
  { id: 'counter', title: 'Count things (variables)', keys: 'count counter score variable remember number add plus points keep track',
    say: 'A <b>variable</b> is a box that remembers a number. A adds 1 and shows it, and B sets it back to 0.',
    blocks: [
      { type: 'mb_on_start', inputs: { DO: { block: { type: 'variables_set', fields: { VAR: { name: 'count' } }, inputs: { VALUE: { block: { type: 'math_number', fields: { NUM: 0 } } } } } } } },
      { type: 'mb_on_button', fields: { BTN: 'a' }, inputs: { DO: { block: stackOf([
        { type: 'math_change', fields: { VAR: { name: 'count' } }, inputs: { DELTA: { block: { type: 'math_number', fields: { NUM: 1 } } } } },
        { type: 'mb_show', inputs: { TEXT: { block: { type: 'variables_get', fields: { VAR: { name: 'count' } } } } } }]) } } },
      { type: 'mb_on_button', fields: { BTN: 'b' }, inputs: { DO: { block: { type: 'variables_set', fields: { VAR: { name: 'count' } }, inputs: { VALUE: { block: { type: 'math_number', fields: { NUM: 0 } } } } } } } }] },
  { id: 'radio', title: 'Send radio messages', keys: 'radio send message friend another two talk chat wireless receive',
    say: 'Put this on <b>two micro:bits</b>. Press A on one and the other shows a duck and your message! Both must use the same <b>group</b>.',
    blocks: [
      { type: 'mb_on_start', inputs: { DO: { block: { type: 'mb_radio_group', inputs: { G: NUM(1) } } } } },
      { type: 'mb_on_button', fields: { BTN: 'a' }, inputs: { DO: { block: { type: 'mb_radio_send', inputs: { MSG: TXT('hi') } } } } },
      { type: 'mb_on_radio', inputs: { DO: { block: stackOf([{ type: 'mb_show_icon', fields: { ICON: 'DUCK' } },
        { type: 'mb_scroll', inputs: { TEXT: { block: { type: 'mb_radio_msg' } } } }]) } } }] },
  { id: 'animate', title: 'Make an animation', keys: 'animation animate move moving beat heartbeat flash blink loop repeat forever',
    say: 'An animation is pictures shown one after another with <b>pauses</b> between them, inside a <b>🔁 forever</b> loop.',
    blocks: [{ type: 'mb_forever', inputs: { DO: { block: stackOf([
      { type: 'mb_show_icon', fields: { ICON: 'HEART' } }, { type: 'mb_pause', inputs: { MS: NUM(400) } },
      { type: 'mb_show_icon', fields: { ICON: 'HEART_SMALL' } }, { type: 'mb_pause', inputs: { MS: NUM(400) } }]) } } }] },
  { id: 'tilt', title: 'React to tilting', keys: 'tilt tilting lean left right accelerometer arrow direction level angle',
    say: 'The <b>acceleration x</b> block goes negative when tilted left and positive when tilted right. This shows an arrow that way.',
    blocks: [{ type: 'mb_forever', inputs: { DO: { block: { type: 'controls_if', extraState: { elseIfCount: 1, hasElse: true }, inputs: {
      IF0: { block: { type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: { block: { type: 'mb_accel', fields: { AXIS: 'x' } } }, B: { block: { type: 'math_number', fields: { NUM: -300 } } } } } },
      DO0: { block: { type: 'mb_show_icon', fields: { ICON: 'ARROW_W' } } },
      IF1: { block: { type: 'logic_compare', fields: { OP: 'GT' }, inputs: { A: { block: { type: 'mb_accel', fields: { AXIS: 'x' } } }, B: { block: { type: 'math_number', fields: { NUM: 300 } } } } } },
      DO1: { block: { type: 'mb_show_icon', fields: { ICON: 'ARROW_E' } } },
      ELSE: { block: { type: 'mb_show_icon', fields: { ICON: 'SQUARE' } } } } } } } }] },
  { id: 'light', title: 'Night light', keys: 'light dark night lamp bright sensor sense darkness',
    say: 'When it gets <b>dark</b> (light level below 20) the screen lights up. Otherwise it turns off.',
    blocks: [{ type: 'mb_forever', inputs: { DO: { block: stackOf([{ type: 'controls_if', extraState: { hasElse: true }, inputs: {
      IF0: { block: { type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: { block: { type: 'mb_light' } }, B: { block: { type: 'math_number', fields: { NUM: 20 } } } } } },
      DO0: { block: { type: 'mb_show_icon', fields: { ICON: 'SQUARE' } } },
      ELSE: { block: { type: 'mb_clear' } } } }, { type: 'mb_pause', inputs: { MS: NUM(200) } }]) } } }] },
  { id: 'touch', title: 'Use touch pins', keys: 'touch pin pins finger tap gnd',
    say: 'Hold <b>GND</b> with one hand and touch <b>pin 0</b> with the other. Your body completes the circuit!',
    blocks: [{ type: 'mb_on_pin_touched', fields: { PIN: '0' }, inputs: { DO: { block: { type: 'mb_show_icon', fields: { ICON: 'SURPRISED' } } } } }] },
  { id: 'compass', title: 'Make a compass', keys: 'compass north south east west direction heading magnet',
    say: 'The <b>🧭 compass heading</b> is 0 for north, 90 east, 180 south and 270 west. This scrolls it every second.',
    blocks: [{ type: 'mb_every', fields: { MS: 1000 }, inputs: { DO: { block: { type: 'mb_scroll', inputs: { TEXT: { block: { type: 'mb_heading' } } } } } } }] },
  { id: 'repeat', title: 'Repeat things', keys: 'repeat times loop again many several copy',
    say: 'Instead of copying blocks, use <b>🔁 repeat</b> from Loops. This scrolls “hi” 3 times.',
    blocks: [{ type: 'mb_on_start', inputs: { DO: { block: { type: 'controls_repeat_ext', inputs: { TIMES: NUM(3), DO: { block: { type: 'mb_scroll', inputs: { TEXT: TXT('hi') } } } } } } } }] },
  { id: 'ifelse', title: 'Make decisions (if / else)', keys: 'if else decision choose check condition when otherwise compare',
    say: 'An <b>if … else</b> block (🔀 Logic) checks something and picks what to do. Here: if A is pressed show yes, else show no.',
    blocks: [{ type: 'mb_forever', inputs: { DO: { block: { type: 'controls_if', extraState: { hasElse: true }, inputs: {
      IF0: { block: { type: 'mb_button_pressed', fields: { BTN: 'a' } } },
      DO0: { block: { type: 'mb_show_icon', fields: { ICON: 'YES' } } }, ELSE: { block: { type: 'mb_show_icon', fields: { ICON: 'NO' } } } } } } } }] },
  { id: 'draw', title: 'Draw your own picture', keys: 'draw picture own custom leds pattern design image pixel',
    say: 'Use <b>show LEDs</b> (🟦 Basic) and tick the boxes to make your own picture. Or use <b>💡 light x y</b> for single dots.',
    blocks: [{ type: 'mb_on_start', inputs: { DO: { block: { type: 'mb_show_leds', fields: { L00: true, L04: true, L22: true, L40: true, L44: true } } } } }] },
  { id: 'save', title: 'Keep my program on the micro:bit', keys: 'save keep battery unplug forever store run without computer main',
    say: 'Press <b>💾 Save to micro:bit</b> in the toolbar. Your program then runs every time the micro:bit turns on, even on batteries!' },
];

function matchRecipe(q) {
  const words = q.toLowerCase().split(/[^a-z0-9+]+/).filter((w) => w.length > 2);
  let best = null, bestScore = 0;
  for (const r of RECIPES) {
    const keys = (r.keys + ' ' + r.title.toLowerCase()).split(/\s+/);
    let s = 0;
    for (const w of words) if (keys.some((k) => k === w || (w.length > 3 && k.length > 3 && (k.startsWith(w) || w.startsWith(k))))) s++;
    if (s > bestScore) { best = r; bestScore = s; }
  }
  return best;
}

function addRecipe(r) {
  if (!r?.blocks) return;
  const box = ws.getBlocksBoundingBox();
  const empty = !ws.getTopBlocks(false).length;
  let x = empty ? 30 : box.right + 60, y = empty ? 30 : Math.max(20, box.top);
  let first = null;
  Blockly.Events.setGroup(true);
  try {
    for (const json of r.blocks) {
      const b = Blockly.serialization.blocks.append(json, ws);
      b.moveTo(new Blockly.utils.Coordinate(x, y));
      y += b.getHeightWidth().height + 30;
      first = first || b;
    }
  } finally { Blockly.Events.setGroup(false); }
  if (first) { ws.centerOnBlock(first.id); first.select?.(); }
  say(`➕ I added the <b>${esc(r.title)}</b> blocks to your workspace. Press <b>▶ Run</b> to try them! You can change anything you like.`);
}

/* =========================================================== asking */
const STUCK = /(not|n't|isnt|doesnt|dont|wont|cant) (work|working|run|go|show|do)|broken|error|wrong|bug|stuck|check|help me|problem|fix|nothing happens/i;

const helperMode = () => ($('view-manager').hidden ? 'blocks' : 'python');
function ask(q) {
  q = q.trim(); if (!q) return;
  you(q);
  if (helperMode() === 'python') { setTimeout(() => askPython(q), 250); return; }
  setTimeout(() => {
    if (STUCK.test(q) || /^check/i.test(q)) {
      const tips = checkCode();
      say(tips.length > 1 ? `I looked at your blocks and found <b>${tips.length}</b> things:` : 'I looked at your blocks:');
      tips.forEach((t) => say(t.html, { actions: t.actions }));
      return;
    }
    if (/^(hi|hello|hey)\b/i.test(q)) return say(`Hello! 👋 Ask me “how do I make a dice?” or press <b>Check my code</b> if something isn't working.`);
    if (/(who are you|your name)/i.test(q)) return say(`I'm <b>${esc(HS.name)}</b>, your coding helper! Win accessories in the 🏆 Quiz to dress me up.`);
    if (/\b(accessor\w*|hats?|dress(es)?|dress up|wardrobe|outfits?|costumes?|crown|trash can)\b/i.test(q)) return say('Win accessories by finishing the 🏆 <b>Quiz</b>. The better your score, the better the prize! Then press <b>👗 Dress up</b>.',
      { actions: [['👗 Dress up', () => openWardrobe(), true], ['🏆 Take the quiz', () => showView('quiz')]] });
    const r = matchRecipe(q);
    const found = search(q).filter((e) => e.kind !== 'Quiz answer').slice(0, 2);
    if (r) {
      say(`<b>${esc(r.title)}</b>: ${r.say}`, { actions: r.blocks ? [['➕ Add these blocks for me', () => addRecipe(r), true]] : [] });
    }
    if (found.length) {
      say(r ? 'Want to learn how it works inside? 👇' : 'Here\'s where you can learn about that:',
        { actions: found.map((e) => [`${e.icon} ${e.title}`, () => { closeHelper(); e.go(); }]) });
    }
    if (!r && !found.length) {
      say('Hmm, I\'m not sure about that one. 🤔 Try one of these:', { actions: ['How do I use buttons?', 'Make a dice', 'Play music', 'Count things', 'My code doesn\'t work']
        .map((t) => [t, () => ask(t)]) });
    }
  }, 250);
}

/* ========================================================== wardrobe */
let wardrobe = null;
function openWardrobe(tab = 'outfits') {
  if (!wardrobe) {
    wardrobe = document.createElement('div'); wardrobe.className = 'tour-overlay'; wardrobe.hidden = true;
    wardrobe.innerHTML = `<div class="wr" role="dialog" aria-modal="true" aria-labelledby="wr-title">
      <div class="wr-left"><div id="wr-bot"></div><h2 id="wr-title"></h2><button class="small" id="wr-rename">✏️ Rename</button>
        <p class="muted" id="wr-count"></p><button class="primary" id="wr-quiz">🏆 Win more in the quiz</button></div>
      <div class="wr-right"><div class="wr-head"><div class="qz-seg wr-tabs"><button data-t="outfits" class="on">👗 Outfits</button><button data-t="looks">🎨 Looks</button><button data-t="shop">🛒 Shop</button></div><button id="wr-close">Done ✓</button></div>
        <div id="wr-outfits"><p class="muted">Click an accessory to put it on or take it off. One per spot (head, face, hand…).</p><div id="wr-items"></div></div>
        <div id="wr-looks" hidden></div><div id="wr-shop" hidden></div></div></div>`;
    document.body.appendChild(wardrobe);
    $('wr-close').onclick = () => { wardrobe.hidden = true; };
    wardrobe.querySelectorAll('.wr-tabs button').forEach((b) => (b.onclick = () => {
      wardrobe.querySelectorAll('.wr-tabs button').forEach((x) => x.classList.toggle('on', x === b));
      $('wr-outfits').hidden = b.dataset.t !== 'outfits'; $('wr-looks').hidden = b.dataset.t !== 'looks'; $('wr-shop').hidden = b.dataset.t !== 'shop';
    }));
    wardrobe.addEventListener('click', (e) => { if (e.target === wardrobe) wardrobe.hidden = true; });
    $('wr-rename').onclick = () => {
      const n = prompt('What should your helper be called?', HS.name);
      if (n && n.trim()) { HS.name = n.trim().slice(0, 20); saveHS(); renderWardrobe(); renderHelperTop(); }
    };
    $('wr-quiz').onclick = () => { wardrobe.hidden = true; closeHelper(); showView('quiz'); };
    document.addEventListener('keydown', (e) => { if (!wardrobe.hidden && e.key === 'Escape') wardrobe.hidden = true; });
  }
  renderWardrobe();
  wardrobe.hidden = false;
  wardrobe.querySelector(`.wr-tabs [data-t="${tab}"]`)?.click();
}

function renderWardrobe() {
  $('wr-bot').innerHTML = botSVG();
  $('wr-title').textContent = HS.name;
  $('wr-count').innerHTML = `${HS.owned.length} of ${Object.keys(ITEMS).length} outfits collected<br>${BB(HS.bucks)} Bit Bucks<br><span class="bit-sync">${bitSyncText()}</span>`;
  let html = '';
  for (const [pid, p] of Object.entries(POOLS)) {
    const inPool = Object.entries(ITEMS).filter(([, it]) => poolOf(it) === pid);
    html += `<h3 class="wr-pool">${p.name} <span class="muted">${inPool.filter(([id]) => HS.owned.includes(id)).length}/${inPool.length}</span></h3>`;
    for (const [tid, t] of Object.entries(TIERS)) {
      const items = inPool.filter(([, it]) => it.tier === tid);
      const need = `${t.need} on ${p.quiz}`;
      html += `<div class="wr-tier"><div class="wr-tier-h" style="--tc:${t.color}"><b>${t.name}</b><span>${need}</span></div><div class="wr-grid">`;
      for (const [id, it] of items) {
        const own = HS.owned.includes(id), on = HS.equipped[it.slot] === id;
        html += `<button class="wr-item${own ? '' : ' locked'}${on ? ' on' : ''}" data-id="${id}" style="--tc:${t.color}" ${own ? '' : 'disabled'}
          title="${own ? (on ? 'Take off' : 'Put on') : '🔒 ' + need}"><span class="wr-ico">${own ? it.icon : '🔒'}</span>
          <span class="wr-name">${own ? it.name : '???'}</span><span class="wr-slot">${SLOT_NAMES[it.slot]}${on ? ' · wearing' : ''}</span></button>`;
      }
      html += '</div></div>';
    }
  }
  $('wr-items').innerHTML = html;
  renderLooks();
  renderShop();
  $('wr-items').querySelectorAll('.wr-item:not(.locked)').forEach((b) => (b.onclick = () => {
    const it = ITEMS[b.dataset.id];
    if (HS.equipped[it.slot] === b.dataset.id) delete HS.equipped[it.slot]; else HS.equipped[it.slot] = b.dataset.id;
    saveHS(); renderWardrobe(); if (!hPanel.hidden) renderHelperTop();
  }));
}

function renderLooks() {
  const lk = look();
  const lockTag = (k, v) => (hasLook(k, v) ? '' : `<span class="lk-lock">🔒 ${PRICES[lookTier(k, v)]}</span>`);
  const swatches = (key, title) => `<div class="lk-row"><h4>${title}</h4><div class="lk-opts">${LOOKS[key].map(([n, c]) =>
    `<button class="lk-sw${lk[key] === n ? ' on' : ''}${hasLook(key, n) ? '' : ' locked'}" data-k="${key}" data-v="${esc(n)}"
      title="${esc(n)}${hasLook(key, n) ? '' : ` (🔒 ${PRICES[lookTier(key, n)]} Bit Bucks)`}" style="background:${c}">${hasLook(key, n) ? '' : '🔒'}</button>`).join('')}</div></div>`;
  const faces = (key, title) => `<div class="lk-row"><h4>${title}</h4><div class="lk-opts">${LOOKS[key].map(([v, l]) =>
    `<button class="lk-face${lk[key] === v ? ' on' : ''}${hasLook(key, v) ? '' : ' locked'}" data-k="${key}" data-v="${v}">
      ${botSVG({}, 'lk-mini', { ...lk, [key]: v })}<span>${l}</span>${lockTag(key, v)}</button>`).join('')}</div></div>`;
  const owned = allLooks().filter(([k, v]) => hasLook(k, v)).length;
  $('wr-looks').innerHTML = `<p class="muted">Change how ${esc(HS.name)} looks. You've unlocked <b>${owned} of ${allLooks().length}</b> looks.
      🔒 looks come from quiz prizes, or buy them with Bit Bucks.</p>
    ${swatches('body', '🎨 Body colour')}${swatches('glow', '✨ Eyes &amp; mouth glow')}
    ${faces('eyes', '👀 Eyes')}${faces('mouth', '👄 Mouth')}${faces('antenna', '📡 Antenna')}
    <div class="row"><button id="lk-random">🎲 Surprise me</button><button id="lk-reset">↺ Original look</button></div>`;
  const apply = (k, v) => { HS.look = { ...look(), [k]: v }; saveHS(); renderWardrobe(); if (!hPanel.hidden) renderHelperTop(); };
  $('wr-looks').querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
    const k = b.dataset.k, v = b.dataset.v;
    if (!hasLook(k, v) && !buyLook(k, v)) return;
    apply(k, v);
  }));
  const pickOwned = (k) => { const opts = LOOKS[k].map((o) => o[0]).filter((v) => hasLook(k, v)); return opts[Math.floor(Math.random() * opts.length)]; };
  $('lk-random').onclick = () => { HS.look = Object.fromEntries(Object.keys(LOOK_TIERS).map((k) => [k, pickOwned(k)])); saveHS(); renderWardrobe(); if (!hPanel.hidden) renderHelperTop(); };
  $('lk-reset').onclick = () => { HS.look = { ...DEFAULT_LOOK }; saveHS(); renderWardrobe(); if (!hPanel.hidden) renderHelperTop(); };
}

let shopMsg = '';
function renderShop() {
  const all = Object.entries(ITEMS);
  const forSale = all.filter(([id]) => !HS.owned.includes(id));
  const mine = all.filter(([id]) => HS.owned.includes(id));
  const order = Object.keys(TIERS);
  const byTier = (a, b) => order.indexOf(a[1].tier) - order.indexOf(b[1].tier);
  const lockedLooks = allLooks().filter(([k, v]) => !hasLook(k, v)).sort((a, b) => order.indexOf(lookTier(...a)) - order.indexOf(lookTier(...b)));
  const card = ([id, it], mode) => {
    const t = TIERS[it.tier], price = mode === 'buy' ? PRICES[it.tier] : sellPrice(it);
    const can = mode === 'sell' || HS.bucks >= price;
    return `<div class="shop-item" style="--tc:${t.color}"><span class="wr-ico">${it.icon}</span><span class="wr-name">${esc(it.name)}</span>
      <span class="wr-slot">${t.name} · ${SLOT_NAMES[it.slot]}</span>
      <button class="small ${mode === 'buy' ? 'primary' : ''}" data-${mode}="${id}" ${can ? '' : 'disabled'}>${mode === 'buy' ? 'Buy' : 'Sell'} ${BB(price)}</button></div>`;
  };
  $('wr-shop').innerHTML = `<div class="shop-bal">You have ${BB(HS.bucks)} <b>Bit Bucks</b>
      <span class="muted">Earn more: 5 per right answer on a Kid quiz, 10 on a teacher quiz, plus a bonus for a perfect score.</span></div>
    ${shopMsg ? `<p class="shop-msg">${shopMsg}</p>` : ''}
    <h3 class="wr-pool">🛍️ Buy</h3>${forSale.length ? `<div class="shop-grid">${forSale.sort(byTier).map((x) => card(x, 'buy')).join('')}</div>` : '<p class="muted">You own every outfit! 🎉</p>'}
    <h3 class="wr-pool">🎨 Looks</h3>${lockedLooks.length ? `<div class="shop-grid">${lockedLooks.map(([k, v]) => {
      const t = TIERS[lookTier(k, v)], price = PRICES[lookTier(k, v)];
      return `<div class="shop-item" style="--tc:${t.color}">${lookPreviewHTML(k, v)}<span class="wr-name">${esc(lookName(k, v))}</span>
        <span class="wr-slot">${t.name} · look</span><button class="small primary" data-buylook="${k}:${esc(v)}" ${HS.bucks >= price ? '' : 'disabled'}>Buy ${BB(price)}</button></div>`;
    }).join('')}</div>` : '<p class="muted">You\'ve unlocked every look! 🎉</p>'}
    <h3 class="wr-pool">💰 Sell <span class="muted">(for half price)</span></h3>${mine.length ? `<div class="shop-grid">${mine.sort(byTier).map((x) => card(x, 'sell')).join('')}</div>` : '<p class="muted">Nothing to sell yet.</p>'}`;
  $('wr-shop').querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.buy, it = ITEMS[id], price = PRICES[it.tier];
    if (HS.bucks < price || HS.owned.includes(id)) return;
    HS.bucks -= price; HS.owned.push(id); saveHS();
    shopMsg = `🛍️ You bought the <b>${esc(it.name)}</b> ${it.icon}! Find it in 👗 Outfits.`;
    renderWardrobe(); if (!hPanel.hidden) renderHelperTop();
  }));
  $('wr-shop').querySelectorAll('[data-buylook]').forEach((b) => (b.onclick = () => {
    const [k, v] = b.dataset.buylook.split(':'), price = PRICES[lookTier(k, v)];
    if (HS.bucks < price || hasLook(k, v)) return;
    HS.bucks -= price; HS.ownedLooks = [...(HS.ownedLooks || []), lookId(k, v)]; saveHS();
    shopMsg = `🎨 You unlocked the <b>${esc(lookName(k, v))}</b>! Try it in 🎨 Looks.`;
    renderWardrobe(); if (!hPanel.hidden) renderHelperTop();
  }));
  $('wr-shop').querySelectorAll('[data-sell]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.sell, it = ITEMS[id];
    if (!confirm(`Sell the ${it.name} for ${sellPrice(it)} Bit Bucks? You can buy it back later for ${PRICES[it.tier]}.`)) return;
    HS.owned = HS.owned.filter((x) => x !== id);
    if (HS.equipped[it.slot] === id) delete HS.equipped[it.slot];
    HS.bucks += sellPrice(it); saveHS();
    shopMsg = `💰 Sold the <b>${esc(it.name)}</b> for ${BB(sellPrice(it))}.`;
    renderWardrobe(); if (!hPanel.hidden) renderHelperTop();
  }));
}

/* ================================================ quiz reward hook */
// Called by the quiz results screen. Gives one accessory from the tier the score earned.
// A bonus look of the same tier (or a lower one if you own them all). 0% scores don't get one.
function awardLook(tier) {
  const order = ['common', 'cool', 'epic', 'legendary'];
  if (!order.includes(tier)) return null;
  for (let i = order.indexOf(tier); i >= 0; i--) {
    const opts = allLooks().filter(([k, v]) => lookTier(k, v) === order[i] && !hasLook(k, v));
    if (opts.length) {
      const [k, v] = opts[Math.floor(Math.random() * opts.length)];
      HS.ownedLooks = [...(HS.ownedLooks || []), lookId(k, v)];
      return { k, v, name: lookName(k, v), tier: order[i] };
    }
  }
  return null;
}

function awardAccessory(pct, prizePool = 'kid') {
  const order = ['junk', 'common', 'cool', 'epic', 'legendary'];
  const tier = tierFor(pct);
  const avail = (t) => Object.entries(ITEMS).filter(([id, it]) => poolOf(it) === prizePool && it.tier === t && !HS.owned.includes(id));
  let pool = avail(tier);
  if (!pool.length && tier !== 'junk') {  // already own that whole tier: fall back to a lower (non-junk) tier
    for (let i = order.indexOf(tier) - 1; i >= 1 && !pool.length; i--) pool = avail(order[i]);
  }
  if (!pool.length) { const newLook = awardLook(tier); saveHS(); return { tier, pool: prizePool, item: null, look: newLook }; }
  // A 0% score always gives the trash can first
  const [id, item] = pool.find(([pid]) => pid === 'trash') || pool[Math.floor(Math.random() * pool.length)];
  HS.owned.push(id);
  const newLook = awardLook(tier);
  saveHS();
  return { tier, pool: prizePool, id, item, look: newLook };
}

function rewardHTML(r, pct) {
  const t = TIERS[r.tier];
  const lookLine = r.look ? `<p class="qz-look">🎨 <b>Bonus look unlocked:</b> ${esc(r.look.name)}! <button class="small" id="qz-uselook">Use it</button></p>` : '';
  if (!r.item) return `<div class="qz-reward"><b>🎁 You already own every ${t.name} outfit!</b><p class="muted">Score higher to win something even better.</p>${lookLine}</div>`;
  const preview = { ...HS.equipped, [r.item.slot]: r.id };
  const previewLook = r.look ? { ...look(), [r.look.k]: r.look.v } : look();
  return `<div class="qz-reward" style="--tc:${t.color}">
    <div class="qz-reward-bot">${botSVG(preview, 'small', previewLook)}</div>
    <div><div class="qz-reward-tier">${t.name} prize · ${r.pool === 'teacher' ? 'teacher quiz' : 'Kid quiz'}</div><h3>🎁 ${HS.name} won: ${r.item.icon} ${r.item.name}!</h3>
      <p>${{
        junk: r.id === 'trash' ? 'Zero points… so it\'s the trash can for you! 😄 Try again to win something nicer.' : 'Zero points… more junk! 😄 Get some answers right for a better prize.',
        common: 'Not bad! Score 50% or more next time for a Cool prize.',
        cool: 'Nice work! Score 80% or more for an Epic prize.',
        epic: 'Amazing! Get a perfect score for a Legendary prize.',
        legendary: 'PERFECT! A Legendary prize for a micro:bit expert! 👑',
      }[r.tier]}</p>${lookLine}
      <div class="row"><button class="primary" id="qz-wear">👕 Put it on ${esc(HS.name)}</button><button id="qz-wardrobe">👗 See all accessories</button></div></div></div>`;
}
function bindReward(r) {
  $('qz-wear')?.addEventListener('click', () => { HS.equipped[r.item.slot] = r.id; saveHS(); showView('blocks'); openHelper();
    say(`Thanks for the <b>${esc(r.item.name)}</b>! ${r.item.icon} How do I look?`); });
  $('qz-wardrobe')?.addEventListener('click', () => openWardrobe());
  $('qz-uselook')?.addEventListener('click', (e) => {
    HS.look = { ...look(), [r.look.k]: r.look.v }; saveHS();
    e.target.replaceWith(Object.assign(document.createElement('b'), { textContent: '✓ Using it!' }));
  });
}

/* ============================================================ wiring */
$('bk-helper').onclick = () => (hPanel.hidden ? openHelper() : closeHelper());
$('helper-close').onclick = closeHelper;
$('helper-dress').onclick = () => openWardrobe();
$('helper-check').onclick = () => ask('check my code');
$('helper-form').onsubmit = (e) => { e.preventDefault(); const v = $('helper-input').value; $('helper-input').value = ''; ask(v); };
$('helper-bot').onclick = () => openWardrobe();

$('btn-ask-bit').onclick = () => (hPanel.hidden ? openHelper() : closeHelper());

$('btn-bit').onclick = () => openWardrobe();
