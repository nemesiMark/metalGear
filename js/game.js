// ===== METAL GEAR — motore di gioco, schermate, HUD =====
'use strict';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let SCALE = 1, RS = 1, RS_CAP = 2;
function resize() {
  SCALE = Math.min(innerWidth / W, innerHeight / H);
  // risoluzione interna limitata (max 1920x1080): sugli schermi grandi il gioco resta fluido
  RS = Math.min(SCALE * Math.min(2, window.devicePixelRatio || 1), RS_CAP);
  cv.style.width = W * SCALE + 'px'; cv.style.height = H * SCALE + 'px';
  cv.width = Math.round(W * RS); cv.height = Math.round(H * RS);
}
addEventListener('resize', resize); resize();
cv.addEventListener('contextlost', e => e.preventDefault());
cv.addEventListener('contextrestored', () => resize());
Input.init(cv);

const G = {
  state: 'title', sel: 0, rects: [], diff: store.get('diff', 1), t: 0, camX: 0, paused: false,
  enemies: [], bullets: [], ebullets: [], parts: [], fx: [], texts: [], pickups: [], crates: [], hazards: [], lobs: [],
  boss: null, score: 0, shake: 0, nid: 1, lives: 3, combo: 0, comboT: 0, banner: null, stats: {}, level: 0
};
G.D = DIFFS[G.diff];
const FONT = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';

// ---------------- avvio partita / livello ----------------
function newPlayer(owned) {
  return { x: 140, y: 430, z: 0, vz: 0, vx: 0, vy: 0, face: 1, hp: 100, maxhp: 100, inv: 2, fireCd: 0, alt: 0, owned: [...owned], weapon: owned[owned.length - 1], power: {}, grenades: 3, shield: 0, shieldT: 0, speedT: 0, dmgT: 0, slowT: 0, anim: 0, dead: false, respawnT: 0, beamOn: false, shootT: 0 };
}
function startRun(lv) {
  G.level = lv; G.score = 0; G.lives = G.D.lives; G.owned = weaponsBefore(lv); G.power = {}; G.grenades = 3; G.totalTime = 0;
  startLevel();
}
function startLevel() {
  const L = LEVELS[G.level];
  G.L = L; G.levelLen = L.len; G.lvlMul = 1 + .12 * G.level; G.lvlDmg = 1 + .06 * G.level;
  G.enemies = []; G.bullets = []; G.ebullets = []; G.parts = []; G.fx = []; G.texts = []; G.pickups = []; G.hazards = []; G.lobs = []; G.decals = [];
  G.boss = null; G.bossStage = 0; G.camX = 0; G.zi = 0; G.lock = null; G.goT = 0; G.combo = 0; G.banner = null; G.shake = 0;
  G.stats = { kills: 0, shots: 0, hits: 0, time: 0, dmgTaken: 0 };
  G.bg = BG[L.theme].init(mulberry32(G.level * 1013 + 7));
  const rng = mulberry32(G.level * 77 + 3);
  G.crates = L.crates.map(([x, d]) => ({ isCrate: true, x, y: GT + 40 + rng() * (GB - GT - 60), drop: d, hp: d.startsWith('w:') ? 20 : 26, w: 44, d: 22, h: 44, flash: 0 }));
  G.player = newPlayer(G.owned); G.player.power = { ...G.power }; G.player.grenades = G.grenades;
  G.levelStart = { score: G.score, owned: [...G.owned], power: { ...G.power }, grenades: G.grenades };
  G.state = 'intro'; G.introT = 3.2; Snd.music(L.music);
}
function retryLevel() {
  G.score = G.levelStart.score; G.owned = [...G.levelStart.owned]; G.power = { ...G.levelStart.power }; G.grenades = Math.max(3, G.levelStart.grenades); G.lives = G.D.lives; startLevel();
}
function setDiff(i) { G.diff = i; G.D = DIFFS[i]; store.set('diff', i); }

// ---------------- generatori di oggetti ----------------
function spawnEnemy(type, x, y) {
  const T = ETYPES[type]; if (!T) return null;
  const e = { id: G.nid++, type, x, y: clamp(y, GT + 4, GB), z: 0, face: -1, anim: 0, flash: 0, moving: false, cd: 1, w: T.w, d: T.d, h: T.h, spd: T.spd * rand(.9, 1.1), hp: T.hp * G.D.ehp * G.lvlMul, recoil: 0, ang: 0 };
  e.maxhp = e.hp; if (T.init) T.init(e);
  G.enemies.push(e);
  if (type !== 'gen' && Math.random() < G.D.elite) makeElite(e);
  return e;
}
function makeElite(e) { if (e.elite || e.type === 'gen') return; e.elite = true; e.hp *= 1.8; e.maxhp = e.hp; e.spd *= 1.1; }
function eBullet(x, y, z, vx, vy, o = {}) {
  G.ebullets.push({ x, y, z, vx, vy, vz: o.vz || 0, dmg: o.dmg || 8, r: o.r || 4, col: o.col || '#ff5050', life: o.life || 3.5, kind: o.kind || 'bullet', boom: o.boom, homing: o.homing, turn: o.turn || 2, spd: o.spd || Math.hypot(vx, vy), shootable: o.shootable, hp: o.hp || 1, acid: o.acid, trail: o.trail, t: 0 });
}
function enemyShoot(e, o) {
  const p = G.player, sx = e.x + e.face * 34, sy = e.y, sz = o.z || 44;
  let tx = o.tx != null ? o.tx : p.x, ty = o.ty != null ? o.ty : p.y;
  const spd = o.spd * G.D.bspd;
  if (G.D.lead && o.tx == null) { const tt = Math.hypot(tx - sx, ty - sy) / spd; tx += p.vx * tt * .7; ty += p.vy * tt * .7; }
  const a = Math.atan2(ty - sy, tx - sx) + (o.spread || 0);
  eBullet(sx, sy, sz, Math.cos(a) * spd, Math.sin(a) * spd, { dmg: o.dmg, r: o.r || 4, col: o.col || '#ff5050', kind: o.kind, trail: o.trail });
  if (o.kind !== 'star') G.parts.push({ x: sx, y: sy, z: sz, vx: 0, vy: 0, vz: 0, life: .05, max: .05, r: (o.r || 4) * 2 + 9, col: '#ffc070', kind: 'flash', face: Math.cos(a) < 0 ? -1 : 1, rot: Math.sin(a) * .6 });
  e.recoil = -3; Snd.play('eshot');
}
function lobGrenade(x0, y0, tx, ty, T, dmg, r, owner = 'e') { G.lobs.push({ x0, y0, tx, ty, t: 0, T, dmg, r, owner }); }
function addHazard(h) { h.age = 0; h.hitCd = 0; G.hazards.push(h); }
function banner(txt, col = '#fff', sub = '') { G.banner = { txt, col, sub, t: 2.4 }; }
function puff(x, y, z, col) { G.parts.push({ x: x + rand(-6, 6), y, z, vx: rand(-15, 15), vy: 0, vz: rand(30, 60), life: 1, max: 1, r: rand(6, 12), col, kind: 'smoke' }); }
function sparks(x, y, z, col, n = 6, sp = 220) { for (let i = 0; i < n; i++) G.parts.push({ x, y, z, vx: rand(-sp, sp), vy: rand(-sp, sp) * .3, vz: rand(-sp, sp), life: rand(.15, .35), max: .35, r: rand(1.5, 3), col, kind: 'spark' }); }
function floatText(x, y, txt, col = '#fff', size = 16) { G.texts.push({ x, y, txt, col, life: 1, size }); }
function explosion(x, y, r, dmg, owner) {
  Snd.play(r > 80 ? 'bigexplode' : 'explode'); G.shake = Math.max(G.shake, r / 8);
  G.fx.push({ kind: 'ring', x, y, r: 10, max: r * 1.1, life: .35 });
  // solo grafica: palla di fuoco, fiamme, fumo denso, scintille, detriti, bruciatura a terra
  G.fx.push({ kind: 'boom', x, y, r, life: .45 });
  for (let i = 0; i < r / 3; i++) { const a = rand(0, TAU), s = rand(40, r * 3); G.parts.push({ x, y, z: rand(5, 30), vx: Math.cos(a) * s, vy: Math.sin(a) * s * .4, vz: rand(40, 260), life: rand(.3, .7), max: .7, r: rand(5, 14), col: pick(['#fff3b0', '#ffb347', '#ff6b1a', '#ff3b1a']), kind: 'fire' }); }
  for (let i = 0; i < r / 8; i++) G.parts.push({ x: x + rand(-r / 3, r / 3), y, z: rand(10, 40), vx: rand(-30, 30), vy: 0, vz: rand(35, 80), life: rand(.9, 1.6), max: 1.6, r: rand(r * .1, r * .2), col: '#2e2826', kind: 'smoke' });
  sparks(x, y, 20, '#ffd27a', Math.round(r / 10), 320);
  for (let i = 0; i < r / 25; i++) G.parts.push({ x, y, z: 10, vx: rand(-220, 220), vy: rand(-50, 50), vz: rand(200, 420), life: rand(.6, 1), max: 1, r: rand(3, 6), col: '#2b2420', kind: 'debris' });
  if (G.decals) { G.decals.push({ x, y, r: r * .6, life: 9 }); if (G.decals.length > 24) G.decals.shift(); }
  if (owner === 'p') {
    for (const t of liveTargets()) { const d = Math.hypot(t.x - x, (t.y - t.y * 0 - y) * 1.6); if (d < r + (t.w || 40) / 2) hitTarget(t, dmg * (1 - .5 * clamp(d / (r * 1.5), 0, 1)), { kind: 'explosion', x: t.x, y: t.y, vx: Math.sign(t.x - x), beam: true }); }
  } else if (owner === 'e') {
    const p = G.player; if (!p.dead && Math.hypot(p.x - x, (p.y - y) * 1.6) < r + 12 && p.z < 70) hurtPlayer(dmg, x);
  }
}
function hurtIfNear(x, y, r, dmg) { const p = G.player; if (Math.hypot(p.x - x, (p.y - y) * 1.6) < r && p.z < 40) hurtPlayer(dmg, x); }

// ---------------- bersagli e danni ----------------
function liveTargets() {
  if (G._tf === G.frame) return G._tg;
  const a = [];
  for (const e of G.enemies) if (e.hp > 0 && !e.inv && !(e.z > 150 && !ETYPES[e.type].flyer)) a.push(e);
  const b = G.boss; if (b && !b.dying && !b.entering) a.push(b);
  for (const c of G.crates) if (c.hp > 0 && c.x > G.camX - 50 && c.x < G.camX + W + 50) a.push(c);
  G._tf = G.frame; G._tg = a; return a;
}
function hitTarget(t, dmg, b) {
  if (t.hp <= 0) return false;
  if (t.isCrate) { t.hp -= dmg; t.flash = .1; if (!b.beam) Snd.play('ehit'); if (t.hp <= 0) breakCrate(t); return true; }
  if (t.isBoss) {
    if (t.shield || t.inv) { if (!b.beam || Math.random() < .1) { sparks(b.x, t.y, 80, '#7df9ff', 3); Snd.play('block'); } return true; }
    t.hp -= dmg; if (!b.beam || Math.random() < .12) t.flash = .05; t.lastHit = G.t; G.stats.hits++;
    if (!b.beam) { sparks(b.x - (b.vx || 0) * 10, t.y, rand(40, 120), '#ffd27a', 3); Snd.play('hit'); }
    if (t.hp <= 0) bossDie(t); return true;
  }
  if (t.inv) return false;
  if (t.type === 'shield' && (b.vx || 0) * t.face < 0) {
    if (b.kind === 'bullet' || b.kind === 'plasma') { sparks(t.x + t.face * 20, t.y, 45, '#cfe8ff', 4); Snd.play('block'); return true; }
    if (b.kind === 'flame' || b.kind === 'beam') dmg *= .35;
  }
  t.hp -= dmg; if (!b.beam || Math.random() < .15) t.flash = .08; G.stats.hits++;
  if (!b.beam) { if (t.type !== 'turret' && t.type !== 'gen') t.x += Math.sign(b.vx || 0) * 3; sparks(t.x, t.y, 40, t.type === 'drone' || t.type === 'turret' || t.type === 'gen' ? '#ffd27a' : '#ff8888', 3, 160); Snd.play('ehit'); }
  if (t.hp <= 0) killEnemy(t);
  return true;
}
function killEnemy(e) {
  if (e.dead) return; e.dead = true; e.hp = 0;
  const T = ETYPES[e.type];
  if (!e.noScore) {
    G.combo++; G.comboT = 2.8; const mult = 1 + Math.min(4, Math.floor(G.combo / 5));
    const pts = Math.round(T.score * (e.elite ? 2 : 1) * mult * (1 + G.diff * .5));
    G.score += pts; floatText(e.x, e.y - 90, '+' + pts, e.elite ? '#ff6b6b' : '#ffe066');
    G.stats.kills++;
  }
  if (T.onDeath) T.onDeath(e);
  if (e.type === 'drone' || e.type === 'turret' || e.type === 'gen') explosion(e.x, e.y, e.type === 'gen' ? 90 : 50, 0, 'x');
  else G.fx.push({ kind: 'corpse', e: { ...e, flash: 0, tgt: null, state: 'dead', moving: false }, vx: e.x < G.player.x ? -120 : 120, vz: 220, life: .7 });
  if (e.type === 'gen') { banner('GENERATORE DISTRUTTO', '#7df9ff'); return; }
  const r = Math.random(), luck = G.diff === 0 ? 1.6 : 1;
  if (r < .07 * luck) dropPickup(e.x, e.y, 'med'); else if (r < .11 * luck) dropPickup(e.x, e.y, 'gren'); else if (r < .125 * luck) dropPickup(e.x, e.y, pick(['shield', 'speed', 'dmg']));
}
function breakCrate(c) {
  c.hp = 0; Snd.play('explode');
  for (let i = 0; i < 14; i++) G.parts.push({ x: c.x, y: c.y, z: 20, vx: rand(-200, 200), vy: rand(-60, 60), vz: rand(100, 350), life: rand(.5, 1), max: 1, r: rand(3, 7), col: c.drop.startsWith('w:') ? '#9aa4b0' : '#a0703c', kind: 'debris' });
  let d = c.drop; if (d === 'rand') d = pick(['med', 'gren', 'shield', 'speed', 'dmg']);
  dropPickup(c.x, c.y, d, true);
}
function dropPickup(x, y, kind, perm) { G.pickups.push({ x, y, kind, t: 0, life: perm ? 1e9 : 12 }); }
const PICK_INFO = { med: ['+', '#51cf66', 'KIT MEDICO'], gren: ['G', '#adb5bd', '+3 GRANATE'], shield: ['S', '#4dabf7', 'SCUDO'], speed: ['V', '#ffd43b', 'VELOCITÀ'], dmg: ['x2', '#ff6b6b', 'DANNO DOPPIO'], life: ['1UP', '#f783ac', 'VITA EXTRA'] };
function applyPickup(k) {
  const p = G.player; G.score += 150;
  if (k.startsWith('w:')) {
    const id = k.slice(2), w = WEAPONS[id];
    if (p.owned.includes(id)) { p.power[id] = Math.min(3, (p.power[id] || 1) + 1); banner(w.name + ' POTENZIATO', w.col, '★'.repeat(p.power[id])); }
    else { p.owned.push(id); p.owned.sort((a, b) => WORDER.indexOf(a) - WORDER.indexOf(b)); banner('NUOVA ARMA: ' + w.name, w.col, w.sub ? w.sub.toUpperCase() : 'Q / E PER CAMBIARE ARMA'); }
    p.weapon = id; p.alt = 0; Snd.play('weapon'); return;
  }
  const info = PICK_INFO[k]; floatText(p.x, p.y - 100, info[2], info[1], 18); Snd.play('pickup');
  if (k === 'med') p.hp = Math.min(p.maxhp, p.hp + 45);
  else if (k === 'gren') p.grenades = Math.min(9, p.grenades + 3);
  else if (k === 'shield') { p.shield = 70; p.shieldT = 15; }
  else if (k === 'speed') p.speedT = 10;
  else if (k === 'dmg') p.dmgT = 10;
  else if (k === 'life') G.lives++;
}
function hurtPlayer(dmg, sx) {
  const p = G.player; if (p.dead || p.inv > 0 || G.state !== 'play') return;
  dmg *= G.D.edmg * G.lvlDmg;
  if (p.shield > 0) { const a = Math.min(p.shield, dmg); p.shield -= a; dmg -= a; sparks(p.x, p.y, 50, '#74c0fc', 6); if (dmg <= 0) { p.inv = .25; Snd.play('block'); return; } }
  p.hp -= dmg; p.inv = .75; p.hurtT = .25; G.shake = Math.max(G.shake, 7); Snd.play('hurt'); G.combo = 0; G.stats.dmgTaken += dmg;
  if (sx != null) p.x += Math.sign(p.x - sx || 1) * 16;
  if (p.hp <= 0) playerDie();
}
function playerDie() {
  const p = G.player; p.dead = true; p.hp = 0; p.respawnT = 2.2; G.lives--; Snd.play('die');
  explosion(p.x, p.y, 60, 0, 'x'); G.shake = 14;
}
function respawn() {
  const p = G.player; p.dead = false; p.hp = p.maxhp; p.inv = 3; p.z = 260; p.vz = 0; p.shield = 0; p.grenades = Math.max(p.grenades, 2);
  p.x = clamp(p.x, G.camX + 80, G.camX + W - 80); G.ebullets = G.ebullets.filter(b => Math.abs(b.x - p.x) > 250);
}

// ---------------- boss ----------------
function startBoss() {
  G.bossStage = 1; G.bossWarnT = 2.8; G.lock = { camX: G.levelLen - W, boss: true };
  Snd.play('alarm'); Snd.music(G.L.final ? 'omega' : 'boss');
  banner(G.L.final ? '!! MEGA BOSS !!' : 'ATTENZIONE', '#ff3b30', BOSSES[G.L.boss].name);
}
function spawnBoss() {
  const T = BOSSES[G.L.boss];
  const b = { type: G.L.boss, isBoss: true, name: T.name, sub: T.sub, hp: T.hp * G.D.bhp, w: T.w, d: T.d, h: T.h, z: 0, flash: 0, face: -1, lastHit: 0 };
  b.maxhp = b.hp; G.camX = G.levelLen - W; T.init(b);
  b.ex = b.x; b.x += 420; b.entering = true; G.boss = b; G.bossStage = 2;
}
function bossDie(b) {
  if (b.dying) return; b.dying = 3.2; b.hp = 0; G.hazards = []; G.ebullets = []; G.lobs = G.lobs.filter(l => l.owner === 'p');
  for (const e of G.enemies) if (e.hp > 0) killEnemy(e);
  const pts = 5000 * (G.level + 1) * (1 + G.diff * .5); G.score += pts; floatText(b.x, b.y - 200, '+' + pts, '#ffe066', 28);
  Snd.play('bigexplode'); G.shake = 25; Snd.stopMusic();
}
function updateBoss(dt) {
  const b = G.boss; if (!b) return; const T = BOSSES[b.type]; const p = G.player;
  if (b.flash > 0) b.flash -= dt;
  if (b.dying) {
    b.dying -= dt; b.flash = .05;
    if (Math.random() < dt * 14) explosion(b.x + rand(-b.w / 2, b.w / 2), b.y + rand(-10, 10), rand(40, 90), 0, 'x');
    if (b.dying <= 0) { explosion(b.x, b.y, 160, 0, 'x'); G.boss = null; levelClear(); }
    return;
  }
  if (b.entering) { b.x = lerp(b.x, b.ex, dt * 2); if (Math.abs(b.x - b.ex) < 4) { b.x = b.ex; b.entering = false; } if (T.update && b.type === 'hydra') b.rise = Math.min(1, (b.rise || 0) + dt * .5); return; }
  T.update(b, dt, G.D.bt);
  b.x = clamp(b.x, G.camX + 60, G.camX + W + 100);
  if (T.touchDmg && !p.dead && Math.abs(p.x - b.x) < b.w / 2 - 15 && Math.abs(p.y - b.y) < b.d && p.z < 60 + (b.z || 0) && !(T === BOSSES.heli)) { hurtPlayer(T.touchDmg, b.x); p.x = Math.min(p.x, b.x - b.w / 2 - 10); }
}
function levelClear() {
  G.state = 'clear'; G.clearT = 0; G.sel = 0; Snd.play('clear'); Snd.music('title');
  G.owned = [...G.player.owned]; G.power = { ...G.player.power }; G.grenades = G.player.grenades;
  const bonus = Math.round((G.player.hp / G.player.maxhp) * 3000 * (1 + G.diff * .5)); G.clearBonus = bonus; G.score += bonus;
  G.totalTime = (G.totalTime || 0) + G.stats.time;
  const un = store.get('unlocked', 0); if (G.level + 1 > un) store.set('unlocked', Math.min(LEVELS.length - 1, G.level + 1));
  if (G.score > store.get('best', 0)) store.set('best', G.score);
}

// ---------------- ciclo di gioco ----------------
function updatePlay(dt) {
  const p = G.player; G.stats.time += dt;
  liveTargets();
  // --- giocatore ---
  if (p.dead) { p.respawnT -= dt; if (p.respawnT <= 0) { if (G.lives < 0) { G.state = 'over'; G.sel = 0; Snd.music('title'); if (G.score > store.get('best', 0)) store.set('best', G.score); return; } respawn(); } }
  else {
    let mx = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0), my = (Input.down('down') ? 1 : 0) - (Input.down('up') ? 1 : 0);
    if (mx && my) { mx *= .7071; my *= .7071; }
    const sp = (p.speedT > 0 ? 1.45 : 1) * (p.slowT > 0 ? .55 : 1);
    const ox = p.x, oy = p.y;
    p.x += mx * 245 * sp * dt; p.y += my * 175 * sp * dt;
    const firing = Input.down('fire');
    if (mx && !firing) p.face = mx > 0 ? 1 : -1;
    p.moving = !!(mx || my); if (p.moving) p.anim += dt * 13 * sp;
    p.y = clamp(p.y, GT + 4, GB); p.x = clamp(p.x, G.camX + 24, Math.min(G.camX + W - 24, G.levelLen - 24));
    p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
    if (Input.hit('jump') && p.z <= 0 && p.vz <= 0) { p.vz = 540; Snd.play('jump'); }
    if (p.z > 0 || p.vz > 0) { p.vz -= 1500 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; } }
    // cambio arma
    const cyc = d => { const i = p.owned.indexOf(p.weapon); p.weapon = p.owned[(i + d + p.owned.length) % p.owned.length]; p.alt = 0; Snd.play('select'); floatText(p.x, p.y - 95, WEAPONS[p.weapon].name, WEAPONS[p.weapon].col, 14); };
    if (Input.hit('next')) cyc(1); if (Input.hit('prev')) cyc(-1);
    for (let i = 0; i < 9; i++) if (Input.key('Digit' + (i + 1)) && p.owned[i] && p.weapon !== p.owned[i]) { p.weapon = p.owned[i]; p.alt = 0; Snd.play('select'); }
    // fuoco
    const w = WEAPONS[p.weapon]; p.fireCd -= dt; p.beamOn = false;
    if (firing) { if (w.beam) { p.beamOn = true; updateBeam(p, dt); } if (w.fire && p.fireCd <= 0) { p.fireCd = 1 / w.rate; w.fire(p); } p.shootT = .15; }
    if (p.shootT > 0) p.shootT -= dt;
    if (Input.hit('gren') && p.grenades > 0) { p.grenades--; lobGrenade(p.x + p.face * 20, p.y, p.x + p.face * 280, p.y, .75, 90, 100, 'p'); Snd.play('jump'); }
    for (const k of ['inv', 'shieldT', 'speedT', 'dmgT', 'slowT', 'hurtT']) if (p[k] > 0) p[k] -= dt;
    if (p.shieldT <= 0) p.shield = 0;
  }
  // --- zone e ondate ---
  if (!G.lock && G.zi < G.L.zones.length && p.x > G.L.zones[G.zi].x) { G.lock = { z: G.L.zones[G.zi], wave: 0, camX: G.camX, t: 0, thresh: 0 }; spawnWave(); }
  if (G.lock && !G.lock.boss) {
    const lk = G.lock; lk.t += dt;
    const alive = G.enemies.filter(e => e.hp > 0).length;
    if (lk.wave < lk.z.waves.length) { if (alive <= lk.thresh || lk.t > 15) spawnWave(); }
    else if (alive === 0) { G.lock = null; G.zi++; G.goT = 3; Snd.play('pickup'); }
  }
  if (!G.lock && G.zi >= G.L.zones.length && G.bossStage === 0 && p.x > G.levelLen - W * .75) startBoss();
  if (G.bossStage === 1) { G.bossWarnT -= dt; if (G.bossWarnT <= 0) spawnBoss(); }
  if (G.goT > 0) G.goT -= dt;
  // --- telecamera ---
  if (G.lock) G.camX = lerp(G.camX, G.lock.camX, Math.min(1, dt * 4));
  else G.camX = Math.max(G.camX, p.x - 380);
  G.camX = clamp(G.camX, 0, G.levelLen - W);
  // --- nemici ---
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    const T = ETYPES[e.type];
    if (e.para && e.z > 0) { e.z -= 90 * dt; e.x += Math.sin(G.t * 2 + e.id) * 20 * dt; if (e.z <= 0) { e.z = 0; e.para = false; } continue; }
    T.update(e, dt);
    if (e.type !== 'gen') {
      // una volta entrato in scena, il nemico non può più uscire: altrimenti la zona resta bloccata
      if (!e.entered && e.x > G.camX + 30 && e.x < G.camX + W - 30) e.entered = true;
      if (e.entered) e.x = clamp(e.x, G.camX + 30, G.camX + W - 30);
      else { e.x = clamp(e.x, G.camX - 260, G.camX + W + 260); e.offT = (e.offT || 0) + dt; if (e.offT > 4) e.x = lerp(e.x, G.camX + W / 2, dt * 2); }
    }
  }
  for (let i = 0; i < G.enemies.length; i++) { const a = G.enemies[i]; if (ETYPES[a.type].flyer || a.type === 'turret') continue; for (let j = i + 1; j < G.enemies.length; j++) { const b = G.enemies[j]; if (ETYPES[b.type].flyer || b.type === 'turret') continue; const dx = b.x - a.x, dy = b.y - a.y; if (Math.abs(dx) < 30 && Math.abs(dy) < 16) { const s = (dx >= 0 ? 1 : -1) * (30 - Math.abs(dx)) * .25; a.x -= s; b.x += s; const t = (dy >= 0 ? 1 : -1) * 1; a.y = clamp(a.y - t, GT + 4, GB); b.y = clamp(b.y + t, GT + 4, GB); } } }
  G.enemies = G.enemies.filter(e => e.hp > 0);
  updateBoss(dt);
  // --- proiettili del giocatore ---
  const tg = liveTargets();
  for (const b of G.bullets) {
    b.t += dt; b.life -= dt;
    if (b.acc) { b.vx += b.face * b.acc * dt; if (Math.random() < .7) puff(b.x - b.face * 10, b.y, b.z, '#777'); }
    if (b.homing) {
      let best = null, bd = 600; for (const t of tg) { const d = Math.hypot(t.x - b.x, t.y - b.y); if (d < bd && t.hp > 0) { bd = d; best = t; } }
      if (best) { const sp = 520, dx = best.x - b.x, dy = best.y - b.y, L = Math.hypot(dx, dy) || 1; b.vx = lerp(b.vx, dx / L * sp, Math.min(1, dt * b.homing)); b.vy = lerp(b.vy, dy / L * sp, Math.min(1, dt * b.homing)); }
    }
    if (b.kind === 'flame') { b.r += dt * 26; b.vx *= (1 - dt * 1.5); }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < GT - 30 || b.y > GB + 30 || b.x < G.camX - 60 || b.x > G.camX + W + 60) b.life = 0;
    if (b.life > 0) for (const t of tg) {
      if (t.hp <= 0 || (b.hits && b.hits.has(t))) continue;
      if (Math.abs(b.x - t.x) < (t.w || 40) / 2 + b.r && Math.abs(b.y - t.y) < (t.d || 20) + b.r * .6) {
        const used = hitTarget(t, b.dmg, b);
        if (used) { if (b.pierce) b.hits.add(t); else { b.life = 0; break; } }
      }
    }
    if (b.life > 0 && !b.pierce) for (const eb of G.ebullets) if (eb.shootable && eb.hp > 0 && Math.abs(eb.x - b.x) < 16 + b.r && Math.abs(eb.y - b.y) < 16) { eb.hp -= b.dmg; if (eb.hp <= 0) { eb.life = 0; eb.boom = null; explosion(eb.x, eb.y, 40, 20, 'p'); G.score += 50; } b.life = 0; break; }
    if (b.life <= 0 && b.explode) explosion(b.x, b.y, b.explode, b.edmg, 'p');
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
  // --- proiettili nemici ---
  for (const b of G.ebullets) {
    b.t += dt; b.life -= dt;
    if (b.homing && !p.dead) { const a = Math.atan2(p.y - b.y, p.x - b.x); let cur = Math.atan2(b.vy, b.vx); let da = ((a - cur + Math.PI * 3) % TAU) - Math.PI; cur += clamp(da, -b.turn * dt, b.turn * dt); b.vx = Math.cos(cur) * b.spd; b.vy = Math.sin(cur) * b.spd; if (Math.random() < .6) puff(b.x, b.y, b.z, '#666'); }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.max(30, b.z + b.vz * dt);
    if (b.y < GT - 40 || b.y > GB + 40 || b.x < G.camX - 120 || b.x > G.camX + W + 160) { b.life = 0; b.boom = null; b.acid = false; }
    if (b.life > 0 && !p.dead && Math.abs(b.x - p.x) < 13 + b.r && Math.abs(b.y - p.y) < 15 + b.r * .5 && b.z > p.z - 5 && b.z < p.z + 82) {
      if (p.inv <= 0) { hurtPlayer(b.dmg, b.x); b.life = 0; }
    }
    if (b.life <= 0) { if (b.boom) explosion(b.x, b.y, b.boom.r, b.boom.dmg, 'e'); if (b.acid) addHazard({ kind: 'acid', x: b.x, y: b.y, r: 42, life: 3.2, tick: 0 }); }
  }
  G.ebullets = G.ebullets.filter(b => b.life > 0);
  // --- granate lanciate ---
  for (const l of G.lobs) { l.t += dt; if (l.t >= l.T) { l.done = true; explosion(l.tx, l.ty, l.r, l.dmg, l.owner); } }
  G.lobs = G.lobs.filter(l => !l.done);
  // --- pericoli ---
  for (const h of G.hazards) {
    h.age += dt; if (h.hitCd > 0) h.hitCd -= dt;
    if (h.kind === 'beam') {
      if (h.age > h.warn && h.age < h.warn + h.active) { if (!h.fired) { h.fired = true; Snd.play('beam'); G.shake = Math.max(G.shake, h.big ? 20 : 8); } if (!p.dead && h.hitCd <= 0 && Math.abs(p.y - h.y) < h.w / 2 && p.x > h.x0 && p.x < h.x1) { hurtPlayer(h.dmg, null); h.hitCd = .45; if (h.slow) p.slowT = h.slow; } }
      if (h.age > h.warn + h.active) h.dead = true;
    } else if (h.kind === 'ring') {
      h.r += h.spd * dt; if (h.r > h.max) h.dead = true;
      const dd = Math.hypot(p.x - h.x, (p.y - h.y) * 2.4); if (!h.hit && !p.dead && Math.abs(dd - h.r) < 20 && p.z < 16) { h.hit = true; hurtPlayer(h.dmg, h.x); }
    } else if (h.kind === 'wave') {
      h.x += h.dir * h.spd * dt; if (h.x < G.camX - 60 || h.x > G.camX + W + 60) h.dead = true;
      if (!h.hit && !p.dead && Math.abs(p.x - h.x) < 22 && p.z < 18) { h.hit = true; hurtPlayer(h.dmg, h.x + h.dir * 50); }
    } else if (h.kind === 'mark') {
      h.t -= dt; if (h.t <= 0) { h.dead = true; if (h.boom) explosion(h.x, h.y, h.boom.r, h.boom.dmg, 'e'); }
    } else if (h.kind === 'acid') {
      h.life -= dt; if (h.life <= 0) h.dead = true; h.tick -= dt;
      if (h.tick <= 0 && !p.dead && Math.hypot(p.x - h.x, (p.y - h.y) * 2) < h.r && p.z < 6) { h.tick = .5; hurtPlayer(7, null); }
    }
  }
  G.hazards = G.hazards.filter(h => !h.dead);
  // --- casse e oggetti ---
  for (const c of G.crates) if (c.flash > 0) c.flash -= dt;
  G.crates = G.crates.filter(c => c.hp > 0);
  for (const k of G.pickups) {
    k.t += dt; k.life -= dt;
    if (!p.dead && Math.abs(k.x - p.x) < 36 && Math.abs(k.y - p.y) < 28) { k.life = 0; applyPickup(k.kind); }
  }
  G.pickups = G.pickups.filter(k => k.life > 0);
  // --- combo ---
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
}
function spawnWave() {
  const lk = G.lock, L = G.L; let types = parseWave(lk.z.waves[lk.wave]);
  const n0 = types.length;
  if (G.D.count < 1) { const rm = Math.floor(n0 * (1 - G.D.count)); for (let i = 0; i < rm && types.length > 1; i++) types.splice(randi(0, types.length - 1), 1); }
  else if (G.D.count > 1) { const add = Math.round((G.D.count - 1) * n0 + Math.random() * .5); for (let i = 0; i < add; i++) types.push(pick(Math.random() < .5 ? L.extras : types)); }
  types.forEach((t, i) => {
    let left = Math.random() < G.D.flank;
    let x = left ? G.camX - 40 - i * 25 : G.camX + W + 40 + i * 30, y = rand(GT + 15, GB - 5);
    if (t === 'turret') { x = G.camX + rand(W * .55, W - 70); }
    if (t === 'ninja') { x = G.camX + rand(100, W - 100); }
    const e = spawnEnemy(t, x, y);
    if (e && t === 'ninja') { e.state = 'appear'; e.st = .5; e.alpha = 0; e.inv = true; }
    if (e && t === 'drone') e.x = G.camX + rand(200, W - 50);
  });
  lk.thresh = Math.max(0, Math.floor(types.length * .3)); lk.wave++; lk.t = 0;
}
function updateCommon(dt) {
  for (const q of G.parts) {
    q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    if (q.kind === 'debris' || q.kind === 'spark') { q.vz -= 900 * dt; if (q.z < 0) { q.z = 0; q.vz *= -.4; q.vx *= .6; } }
    if (q.kind === 'fire') { q.vx *= .92; q.vy *= .92; q.vz *= .92; }
    if (q.kind === 'smoke') { q.r += dt * 14; q.vx *= .98; }
    if (q.kind === 'shell') { q.vz -= 900 * dt; q.rot += q.vr * dt; if (q.z < 0) { q.z = 0; q.vz *= -.42; q.vx *= .55; q.vy *= .55; q.vr *= .5; } }
  }
  if (G.decals && G.decals.length) { for (const d of G.decals) d.life -= dt; if (G.decals[0].life <= 0) G.decals = G.decals.filter(d => d.life > 0); }
  G.parts = G.parts.filter(q => q.life > 0);
  if (G.parts.length > 900) G.parts.splice(0, G.parts.length - 900);
  for (const f of G.fx) { f.life -= dt; if (f.kind === 'ring') f.r = lerp(f.r, f.max, dt * 14); if (f.kind === 'corpse') { f.e.x += f.vx * dt; f.vz -= 900 * dt; f.e.z = Math.max(0, (f.e.z || 0) + f.vz * dt); f.vx *= .96; } }
  G.fx = G.fx.filter(f => f.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y -= 40 * dt; }
  G.texts = G.texts.filter(t => t.life > 0);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  G.shake = Math.max(0, G.shake - dt * 30);
}

// ---------------- menu ----------------
function confirmHit() { return Input.hit('ok') || Input.hit('jump') || Input.hit('fire'); }
function menuInput(n, horiz) {
  if (Input.hit(horiz ? 'left' : 'up')) { G.sel = (G.sel - 1 + n) % n; Snd.play('select'); }
  if (Input.hit(horiz ? 'right' : 'down')) { G.sel = (G.sel + 1) % n; Snd.play('select'); }
  for (const c of Input.clicks) for (const r of G.rects) if (c.x > r.x && c.x < r.x + r.w && c.y > r.y && c.y < r.y + r.h) { G.sel = r.i; Snd.play('confirm'); return r.i; }
  if (confirmHit()) { Snd.play('confirm'); return G.sel; }
  return -1;
}
function update(dt) {
  G.frame = (G.frame || 0) + 1; G.t += dt;
  Input.pollPad();
  if (Input.hit('mute')) Snd.toggle();
  const st = G.state;
  if (st === 'title') {
    G.titleCam = (G.titleCam || 0) + dt * 60; Snd.music('title');
    const r = menuInput(4);
    if (r === 0) { G.next = 'play'; G.state = 'diff'; G.sel = G.diff; }
    else if (r === 1) { G.next = 'select'; G.state = 'diff'; G.sel = G.diff; }
    else if (r === 2) { G.state = 'controls'; }
    else if (r === 3) { Snd.toggle(); }
  } else if (st === 'diff') {
    G.titleCam += dt * 60;
    if (Input.hit('back')) { G.state = 'title'; G.sel = 0; return; }
    const r = menuInput(4, true);
    if (r >= 0) { setDiff(r); if (G.next === 'play') startRun(0); else { G.state = 'select'; G.sel = 0; } }
  } else if (st === 'select') {
    G.titleCam += dt * 60;
    if (Input.hit('back')) { G.state = 'diff'; G.sel = G.diff; return; }
    const un = store.get('unlocked', 0); const r = menuInput(LEVELS.length);
    if (r >= 0) { if (r <= un) startRun(r); else { Snd.play('block'); } }
  } else if (st === 'controls') {
    G.titleCam += dt * 60;
    if (Input.hit('back') || confirmHit() || Input.clicks.length) { G.state = 'title'; G.sel = 2; }
  } else if (st === 'intro') {
    G.introT -= dt; updateCommon(dt);
    if (G.introT <= 0 || (G.introT < 2.4 && (confirmHit() || Input.clicks.length))) { G.state = 'play'; G.introT = 0; }
  } else if (st === 'play') {
    if (G.paused) {
      if (Input.hit('pause')) { G.paused = false; return; }
      const r = menuInput(3);
      if (r === 0) G.paused = false; else if (r === 1) { G.paused = false; retryLevel(); } else if (r === 2) { G.paused = false; G.state = 'title'; G.sel = 0; Snd.music('title'); }
      return;
    }
    if (Input.hit('pause')) { G.paused = true; G.sel = 0; Input.touch = {}; return; }
    updatePlay(dt); updateCommon(dt);
  } else if (st === 'clear') {
    G.clearT += dt; updateCommon(dt);
    if (G.clearT > 1.2 && (confirmHit() || Input.clicks.length)) {
      if (G.L.final) { G.state = 'victory'; G.vicT = 0; Snd.music('victory'); if (G.score > store.get('best', 0)) store.set('best', G.score); if (G.diff >= 0) { const w = store.get('wins', {}); w[G.diff] = 1; store.set('wins', w); } }
      else { G.level++; startLevel(); }
    }
  } else if (st === 'over') {
    updateCommon(dt);
    const r = menuInput(2);
    if (r === 0) retryLevel(); else if (r === 1) { G.state = 'title'; G.sel = 0; }
  } else if (st === 'victory') {
    G.vicT += dt; G.titleCam = (G.titleCam || 0) + dt * 40;
    if (G.vicT > 2 && (confirmHit() || Input.clicks.length)) { G.state = 'title'; G.sel = 0; }
  }
}

// ======================= RENDER =======================
// Da qui in giù solo grafica: niente cambia il gioco (danni, tempi, collisioni).
// aspetto di ogni ambiente: luce ambiente (livelli bui), forza dei bagliori, tinta finale, vignettatura, polvere
const LOOK = {
  jungle: { amb: null, bloom: .85, grade: { col: '#ff6a3d', a: .12 }, vig: .55, dust: '#5e4a33' },
  desert: { amb: null, bloom: .55, grade: { col: '#ffc070', a: .1 }, vig: .45, dust: '#d9b27a' },
  city: { amb: { top: 'rgb(150,160,205)', bot: 'rgb(168,174,214)' }, bloom: 1, grade: { col: '#3a5cff', a: .12 }, vig: .7, dust: '#5a5f70' },
  arctic: { amb: { top: 'rgb(205,220,245)', bot: 'rgb(225,234,250)' }, bloom: .55, grade: { col: '#6aa8ff', a: .1 }, vig: .5, dust: '#e6f0fa' },
  volcano: { amb: { top: 'rgb(215,160,140)', bot: 'rgb(210,162,146)' }, bloom: 1, grade: { col: '#ff4a10', a: .12 }, vig: .65, dust: '#4a2a20' },
  core: { amb: { top: 'rgb(150,130,190)', bot: 'rgb(170,150,205)' }, bloom: 1.1, grade: { col: '#ff2a80', a: .08 }, vig: .7, dust: '#3a3060' }
};
const PLAYER_LOOK = { vest: '#4a6b3a', pants: '#3b4a32', sleeve: '#3d5530', bare: true, skin: '#f1c27d', hair: '#3a2416', bandana: '#e63946', knee: '#2b3324', boots: '#2a2018', gloves: '#2b2b2b' };
const GOLD = '#ffd43b';

// qualità automatica: se il dispositivo fatica, spegne la grana e poi abbassa la risoluzione interna
const PERF = { n: 0, acc: 0, last: 0, step: 0 };
function perfWatch() {
  const now = performance.now(), dt = now - (PERF.last || now); PERF.last = now;
  if (dt <= 0 || dt > 250 || document.hidden) return;
  PERF.acc += dt; PERF.n++;
  if (PERF.n < 150) return;
  const avg = PERF.acc / PERF.n; PERF.acc = 0; PERF.n = 0;
  if (avg > 23 && PERF.step < 2) { PERF.step++; if (PERF.step === 1) FX.hi = false; else { RS_CAP = 1.25; resize(); } }
}
// scossa morbida (somma di onde): niente scatti casuali a ogni fotogramma
function shakeOffset() {
  const s = G.shake; if (s <= 0 || G.paused) return { x: 0, y: 0, r: 0 };
  const A = .5 * s * Math.min(1, (s + 3) / 12), t = G.t;
  return { x: A * (Math.sin(t * 47) * .6 + Math.sin(t * 83 + 1.3) * .4), y: A * (Math.sin(t * 59 + .7) * .6 + Math.sin(t * 97 + 2.1) * .4), r: A * .0022 * Math.sin(t * 31 + .4) };
}
function render() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  G.rects = []; perfWatch();
  const st = G.state;
  if (st === 'title' || st === 'diff' || st === 'select' || st === 'controls') { drawMenuBg(); if (st === 'title') drawTitle(); else if (st === 'diff') drawDiff(); else if (st === 'select') drawSelect(); else drawControls(); return; }
  if (st === 'victory') { drawVictory(); return; }
  // mondo: luci, bagliori, scossa
  const look = LOOK[G.L.theme] || LOOK.jungle, sh = shakeOffset();
  FX.begin(look.amb, look.bloom, sh.x, sh.y, sh.r);
  ctx.save(); if (sh.x || sh.y || sh.r) { ctx.translate(W / 2 + sh.x, H / 2 + sh.y); ctx.rotate(sh.r); ctx.translate(-W / 2, -H / 2); }
  drawWorld();
  ctx.restore();
  FX.compose(ctx);
  for (const h of G.hazards) if (h.kind === 'beam' && h.big && h.age > h.warn && h.age < h.warn + .15) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 0, W, H); }
  FX.post(ctx, look.vig, look.grade);
  drawHUD();
  if (st === 'intro') drawIntro();
  if (st === 'clear') drawClear();
  if (st === 'over') drawOver();
  if (st === 'play' && G.paused) drawPause();
  if (Input.isTouch && st === 'play' && !G.paused) drawTouch();
  if (G.lastErr) { ctx.font = '11px monospace'; ctx.fillStyle = '#ff6b6b'; ctx.textAlign = 'left'; ctx.fillText('Errore: ' + G.lastErr.split('\n').slice(0, 2).join(' | ').slice(0, 150), 8, H - 6); }
}
function drawWorld() {
  const cam = G.camX, t = G.t, BGT = BG[G.L.theme], p = G.player;
  BGT.draw(ctx, cam, t, G.bg);
  // bruciature lasciate dalle esplosioni
  if (G.decals) for (const d of G.decals) {
    const x = d.x - cam; if (x < -d.r * 2 || x > W + d.r * 2) continue;
    ctx.globalAlpha = clamp(d.life / 3, 0, 1) * .5; ctx.drawImage(shadowSprite(), x - d.r * 1.3, d.y - d.r * .42, d.r * 2.6, d.r * .84);
  }
  ctx.globalAlpha = 1;
  for (const h of G.hazards) drawHazardGround(h, cam);
  // ombre morbide
  const shadow = (x, y, w, z) => { const s = 1 / (1 + (z || 0) / 160), ww = w * s * 1.15; ctx.globalAlpha = .55 + .45 * s; ctx.drawImage(shadowSprite(), x - cam - ww / 2, y - ww * .16, ww, ww * .32); };
  if (!p.dead) shadow(p.x, p.y, 46, p.z);
  for (const e of G.enemies) shadow(e.x, e.y, e.w * (ETYPES[e.type].scale || 1) * 1.1, e.z);
  if (G.boss) shadow(G.boss.x, G.boss.y, G.boss.w * 1.05, G.boss.z);
  for (const c of G.crates) shadow(c.x, c.y + 2, 58, 0);
  for (const k of G.pickups) shadow(k.x, k.y, 30, 24);
  ctx.globalAlpha = 1;
  // luce del protagonista nei livelli bui (resta sempre leggibile)
  if (!p.dead) FX.light(p.x - cam, p.y - p.z - 40, 150, '#ffffff', .4);
  // entità ordinate per profondità
  const list = [];
  for (const c of G.crates) list.push({ y: c.y, f: () => drawCrate(c, cam) });
  for (const k of G.pickups) list.push({ y: k.y, f: () => drawPickup(k, cam) });
  for (const e of G.enemies) list.push({ y: e.y, f: () => drawEnemy(e, cam) });
  for (const f of G.fx) if (f.kind === 'corpse') list.push({ y: f.e.y, f: () => drawCorpse(f, cam) });
  if (G.boss) list.push({ y: G.boss.y + (G.boss.type === 'heli' ? 1000 : 0), f: () => drawBoss(G.boss, cam) });
  if (!p.dead) list.push({ y: p.y, f: () => drawPlayer(p, cam) });
  list.sort((a, b) => a.y - b.y); for (const it of list) it.f();
  if (p.beamOn && !p.dead) drawBeams(p, cam);
  for (const h of G.hazards) drawHazardAir(h, cam);
  for (const l of G.lobs) drawLob(l, cam);
  for (const b of G.bullets) drawPBullet(b, cam);
  for (const b of G.ebullets) drawEBullet(b, cam);
  drawParts(cam);
  drawFxList(cam);
  drawTexts(cam);
  BGT.front(ctx, cam, t, G.bg);
}
function drawBoss(b, cam) {
  const T = BOSSES[b.type], x = b.x - cam;
  if (b.dying) { // in fiamme: tremolio e lampi alternati
    const f0 = b.flash; b.flash = Math.floor(G.t * 16) % 2 ? .05 : 0;
    ctx.save(); ctx.translate(rand(-2.5, 2.5), rand(-1.5, 1.5)); T.draw(ctx, b, x, b.y); ctx.restore(); b.flash = f0;
    FX.glow(x, b.y - (b.z || 0) - b.h * .5, b.w * .7, '#ff7a2a', .35 + .25 * Math.sin(G.t * 30)); return;
  }
  T.draw(ctx, b, x, b.y);
}
function drawEnemy(e, cam, dead) {
  const T = ETYPES[e.type], x = e.x - cam, y = e.y - (T.flyer || e.type === 'turret' ? 0 : (e.z || 0));
  if (e.para && e.z > 0) drawChute(x, y);
  if (e.elite && !dead) { // aura rossa dei nemici d'élite
    const pa = .7 + .3 * Math.sin(G.t * 6), cy = y - (T.flyer ? e.z : 0) - e.h * .45;
    ctx.globalAlpha = .45 * pa; ctx.drawImage(glowSprite('#ff2a2a'), x - e.h * .62, cy - e.h * .75, e.h * 1.24, e.h * 1.5); ctx.globalAlpha = 1;
    if (!T.flyer) { ctx.strokeStyle = rgba('#ff3b30', .6 * pa); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, e.y + 1, e.w * .62, e.w * .2, 0, 0, TAU); ctx.stroke(); }
    FX.glow(x, cy, e.h * .7, '#ff2020', .3 * pa);
  }
  T.draw(ctx, e, x, y);
  if (!dead && e.hp < e.maxhp && e.type !== 'gen') hpBar(x, y - (T.flyer ? e.z + 25 : e.h + 14), Math.max(30, e.w), e.hp / e.maxhp, e.elite);
}
function hpBar(cx, y, w, k, elite) {
  const x = Math.round(cx - w / 2); y = Math.round(y); k = clamp(k, 0, 1);
  ctx.fillStyle = 'rgba(8,10,14,.85)'; rr(ctx, x - 2, y - 2, w + 4, 8, 3); ctx.fill();
  ctx.fillStyle = '#3a1616'; ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = elite ? '#ff4d4d' : k > .5 ? '#ffd43b' : '#ff922b'; ctx.fillRect(x, y, w * k, 4);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x, y, w * k, 1.3);
  if (elite) { poly(ctx, [x - 8, y + 2, x - 4, y - 3, x, y + 2, x - 4, y + 7]); ink(ctx, '#ff4d4d', 1.4); }
}
function drawChute(x, y) { // paracadute dei rinforzi
  const py = y - 100, sw = Math.sin(G.t * 2 + x * .01) * .07;
  ctx.save(); ctx.translate(x, y - 58); ctx.rotate(sw); ctx.translate(-x, -(y - 58));
  ctx.strokeStyle = 'rgba(25,25,25,.75)'; ctx.lineWidth = 1; ctx.beginPath();
  for (const k of [-36, -18, 0, 18, 36]) { ctx.moveTo(x + k, py + (Math.abs(k) > 30 ? 0 : 5)); ctx.lineTo(x + k * .12, y - 58); } ctx.stroke();
  const dome = () => { ctx.beginPath(); ctx.moveTo(x - 40, py + 1); ctx.bezierCurveTo(x - 40, py - 40, x + 40, py - 40, x + 40, py + 1); for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x + 30 - i * 20, py - 7, x + 20 - i * 20, py + 2); ctx.closePath(); };
  dome(); ctx.fillStyle = '#d8cfb4'; ctx.fill();
  ctx.save(); dome(); ctx.clip(); ctx.fillStyle = '#a99c78'; for (let i = -2; i < 2; i++) ctx.fillRect(x + i * 20 + 4, py - 40, 10, 48);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - 12, py - 22, 16, 5, -.3, 0, TAU); ctx.fill(); ctx.restore();
  dome(); ink(ctx, null, 2);
  ctx.restore();
}
function drawCorpse(f, cam) { // il nemico abbattuto vola all'indietro ruotando
  const k = 1 - clamp(f.life / .7, 0, 1), e = f.e, x = e.x - cam, py = e.y - (e.z || 0) - 10;
  ctx.save(); ctx.globalAlpha = clamp(f.life / .7, 0, 1);
  ctx.translate(x, py); ctx.rotate(ease.out(Math.min(1, k * 1.8)) * 1.3 * Math.sign(f.vx || 1)); ctx.translate(-x, -py);
  drawEnemy(e, cam, true);
  ctx.restore();
}
function drawPlayer(p, cam) {
  const x = p.x - cam, y = p.y - p.z;
  // atterraggio: piccolo schiacciamento e polvere
  if (p.z > 0) G._pzMax = Math.max(G._pzMax || 0, p.z);
  else if ((G._pzMax || 0) > 30) { G._pzMax = 0; G._landT = G.t; const col = (LOOK[G.L.theme] || LOOK.jungle).dust; for (let i = 0; i < 6; i++) G.parts.push({ x: p.x + rand(-16, 16), y: p.y + rand(-3, 3), z: 2, vx: rand(-70, 70), vy: rand(-8, 8), vz: rand(8, 30), life: rand(.35, .6), max: .6, r: rand(4, 7), col, kind: 'smoke' }); }
  const lk = (G.t - (G._landT == null ? -9 : G._landT)) / .16, sq = lk >= 0 && lk < 1 ? Math.sin(lk * Math.PI) * .1 : 0;
  const stv = p.z > 0 ? clamp(p.vz / 540, -1, 1) * .05 : 0;
  const blink = p.inv > 0 && p.hurtT <= 0 && Math.floor(G.t * 20) % 2 === 0;
  if (p.dmgT > 0) { const a = .55 + .2 * Math.sin(G.t * 9); ctx.globalAlpha = .55 * a; ctx.drawImage(glowSprite('#ff5a28'), x - 46, y - 92, 92, 100); ctx.globalAlpha = 1; FX.glow(x, y - 40, 62, '#ff5a28', .45 * a); }
  const o = Object.assign({ face: p.face, anim: p.anim, walk: p.moving && p.z <= 0, air: p.z > 0, t: G.t, gun: p.weapon, flash: p.hurtT > 0 ? 1 : 0, recoil: p.shootT > 0 ? -1.5 : 0, s: 1.05 }, PLAYER_LOOK);
  if (p.speedT > 0 && p.moving) for (let i = 2; i >= 1; i--) { // scie della velocità
    ctx.globalAlpha = .2 * (3 - i) * (blink ? .45 : 1);
    drawSoldier(ctx, x - p.face * 13 * i, y, Object.assign({}, o, { anim: p.anim - .45 * i, vest: '#ffd43b', pants: '#ffb000', sleeve: '#ffd43b', skin: '#ffe066', hair: '#ffcf3a', bandana: '#fff3a0', boots: '#ffb000', gloves: '#ffd43b', knee: '#ffb000', flash: 0 }));
  }
  ctx.globalAlpha = blink ? .45 : 1;
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq - stv * .5, 1 - sq + stv); ctx.translate(-x, -y);
  drawSoldier(ctx, x, y, o);
  ctx.restore(); ctx.globalAlpha = 1;
  if (p.shield > 0) { // bolla dello scudo
    const a = .55 + .3 * Math.sin(G.t * 8);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba('#74c0fc', .1); ctx.beginPath(); ctx.ellipse(x, y - 40, 34, 48, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#a5d8ff', a); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = rgba('#74c0fc', .45 * a); ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const k = (G.t * .9 + i / 3) % 1; ctx.beginPath(); ctx.ellipse(x, y - 40, 34 * Math.sin(k * Math.PI), 48, 0, 0, TAU); ctx.stroke(); }
    ctx.restore(); FX.glow(x, y - 40, 52, '#74c0fc', .3 * a);
  }
  if (p.slowT > 0) { // gelo: cristalli ai piedi
    ctx.save(); ctx.globalAlpha = .85;
    for (let i = 0; i < 5; i++) { const cx = x - 16 + i * 8, h = 10 + (i * 7 % 5) * 3; poly(ctx, [cx - 4, y, cx - 1, y - h, cx + 4, y]); ink(ctx, '#c8f2ff', 1.2); }
    ctx.globalAlpha = .25; ctx.fillStyle = '#9be8ff'; ctx.beginPath(); ctx.ellipse(x, y - 30, 20, 34, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function drawBeams(p, cam) {
  const w = WEAPONS[p.weapon], g = gunPos(p), x0 = g.x - cam, ya = g.y - g.z, wob = Math.sin(G.t * 60) * 1.5, col = w.col === '#ffffff' ? '#e6ecff' : w.col;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const off of w.beam) {
    const y0 = g.y + off - g.z, x1 = x0 + p.face * 820;
    ctx.beginPath(); ctx.moveTo(x0, ya); ctx.lineTo(x0 + p.face * 40, y0); ctx.lineTo(x1, y0);
    ctx.strokeStyle = rgba(col, .16); ctx.lineWidth = 24 + wob * 2; ctx.stroke();
    ctx.strokeStyle = rgba(col, .5); ctx.lineWidth = 10 + wob; ctx.stroke();
    ctx.strokeStyle = rgba(col, .95); ctx.lineWidth = 4.5; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 7; i++) { const k = (G.t * 2.6 + i / 7) % 1, px = x0 + p.face * (50 + k * 760); ctx.globalAlpha = 1 - k; ctx.fillRect(px - 7, y0 - 1.5, 14, 3); }
    ctx.globalAlpha = 1;
    FX.band(Math.min(x0, x1), Math.max(x0, x1), y0, 14, col, .75);
  }
  ctx.restore();
  FX.glow(x0, ya, 34, col, 1); FX.glow(x0, ya, 14, '#ffffff', 1);
}
function drawPBullet(b, cam) {
  const x = b.x - cam, y = b.y - b.z;
  if (b.kind === 'flame') {
    const a = clamp(b.life / .44, 0, 1), r = b.r * 1.3;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a * 1.2);
    ctx.drawImage(a > .45 ? fireSprite() : glowSprite('#d2461a'), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (a < .3) { ctx.globalAlpha = (.3 - a) * 1.6; ctx.drawImage(smokeSprite('#3a3030', 1), x - r, y - r * 1.3, r * 2, r * 2); ctx.globalAlpha = 1; }
    FX.glow(x, y, r * 1.7, '#ff8a2a', a * .5); return;
  }
  if (b.kind === 'rocket') {
    ctx.save(); ctx.translate(x, y); ctx.scale(b.face, 1);
    const fl = .8 + .2 * Math.sin(G.t * 60 + b.x);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(fireSprite(), -14 - 22 * fl, -7, 22 * fl, 14); ctx.globalCompositeOperation = 'source-over';
    poly(ctx, [-11, -3.4, -17, -8, -7, -3.4]); ink(ctx, '#3d4a22', 1.2); poly(ctx, [-11, 3.4, -17, 8, -7, 3.4]); ink(ctx, '#3d4a22', 1.2);
    rr(ctx, -13, -3.8, 20, 7.6, 2); ink(ctx, '#5b6b34', 1.6);
    poly(ctx, [7, -3.8, 14, 0, 7, 3.8]); ink(ctx, '#e8553a', 1.5);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-11, -2.6, 16, 1.4);
    ctx.restore(); FX.glow(x - b.face * 20, y, 28, '#ffa040', .9); return;
  }
  if (b.kind === 'plasma') {
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#7d8bff', .45); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * 24, y - uy * 24); ctx.stroke();
    ctx.drawImage(glowSprite('#8a96ff'), x - 14, y - 14, 28, 28); ctx.restore();
    ctx.fillStyle = '#f4f5ff'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill();
    FX.glow(x, y, 24, '#7d8bff', .9); return;
  }
  // proiettile tracciante
  const sp = Math.hypot(b.vx, b.vy) || 1, L = Math.min(36, sp * .034), ux = b.vx / sp, uy = b.vy / sp, r = b.r;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(b.col, .4); ctx.lineWidth = r * 1.9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * L, y - uy * L); ctx.stroke();
  ctx.strokeStyle = b.col; ctx.lineWidth = r * .9; ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(x, y, r * .62, 0, TAU); ctx.fill();
  FX.glow(x, y, r * 4, b.col, .5);
}
function drawEBullet(b, cam) {
  const x = b.x - cam, y = b.y - b.z, r = b.r;
  ctx.globalAlpha = .35; ctx.drawImage(shadowSprite(), x - r * 1.4, b.y - r * .45, r * 2.8, r * .9); ctx.globalAlpha = 1;
  if (b.trail) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ff4040', .55); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * .07, y - b.vy * .07); ctx.stroke(); ctx.restore(); }
  switch (b.kind) {
    case 'missile': {
      const a = Math.atan2(b.vy, b.vx), fl = .8 + .2 * Math.sin(G.t * 50 + b.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(fireSprite(), -12 - 20 * fl, -6, 20 * fl, 12); ctx.globalCompositeOperation = 'source-over';
      poly(ctx, [-10, -2.6, -15, -7.5, -6, -2.6]); ink(ctx, '#8a2222', 1.2); poly(ctx, [-10, 2.6, -15, 7.5, -6, 2.6]); ink(ctx, '#8a2222', 1.2);
      rr(ctx, -12, -3.4, 18, 6.8, 3); ink(ctx, '#dfe3e8', 1.6); poly(ctx, [5, -3.4, 13, 0, 5, 3.4]); ink(ctx, '#e03131', 1.5);
      ctx.fillStyle = '#e03131'; ctx.fillRect(-4, -3.4, 2.4, 6.8);
      ctx.restore(); FX.glow(x - Math.cos(a) * 16, y - Math.sin(a) * 16, 24, '#ff9040', .9);
      if (Math.sin(G.t * 22) > 0) FX.glow(x, y, 10, '#ff3030', 1);
      return;
    }
    case 'star': {
      ctx.save(); ctx.translate(x, y); ctx.rotate(G.t * 20); ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.lineTo(Math.cos(a) * 9.5, Math.sin(a) * 9.5); ctx.lineTo(Math.cos(a + Math.PI / 4) * 3, Math.sin(a + Math.PI / 4) * 3); }
      ctx.closePath(); ink(ctx, '#cfd5e0', 1.4); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, TAU); ctx.fill(); ctx.restore();
      FX.glow(x, y, 14, b.col, .5); return;
    }
    case 'shell': {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ff9a40', .5); ctx.lineWidth = r * 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx / sp * 30, y - b.vy / sp * 30); ctx.stroke(); ctx.restore();
      circ(ctx, x, y, r * .85, '#3b3b3e', 2.2); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(x - r * .25, y - r * .3, r * .3, 0, TAU); ctx.fill();
      FX.glow(x, y, r * 3, '#ff9a40', .8); return;
    }
    case 'glob': {
      const wob = Math.sin(G.t * 14 + b.x * .1) * .14;
      ctx.save(); ctx.translate(x, y); ctx.scale(1 + wob, 1 - wob); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ink(ctx, '#78d636', 2);
      ctx.fillStyle = '#d8ffa0'; ctx.beginPath(); ctx.arc(-r * .3, -r * .35, r * .35, 0, TAU); ctx.fill(); ctx.restore();
      FX.glow(x, y, r * 3, '#8dff4a', .6); return;
    }
    case 'shard': {
      const a = Math.atan2(b.vy - (b.z > 30 ? b.vz : 0), b.vx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); poly(ctx, [11, 0, 0, -4.5, -11, 0, 0, 4.5]); ink(ctx, '#d6f6ff', 1.4); ctx.fillStyle = '#ffffff'; ctx.fillRect(-7, -1, 14, 1.3); ctx.restore();
      FX.glow(x, y, 18, '#9be8ff', .75); return;
    }
    case 'fireball': {
      const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 3; i >= 1; i--) { const s = r * (2.6 - i * .4); ctx.globalAlpha = .5 / i; ctx.drawImage(glowSprite('#ff5a00'), x - ux * i * 9 - s, y - uy * i * 9 - s, s * 2, s * 2); }
      ctx.globalAlpha = 1; ctx.drawImage(fireSprite(), x - r * 2, y - r * 2, r * 4, r * 4); ctx.restore();
      FX.glow(x, y, r * 4, '#ff7b00', .9); return;
    }
    default: { // sfera nemica: anello scuro + colore + nucleo bianco (si legge su ogni sfondo)
      FX.glow(x, y, r * 3.4, b.col, .75);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, r + 1.7, 0, TAU); ctx.fill();
      ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - r * .18, y - r * .18, r * .48, 0, TAU); ctx.fill();
    }
  }
}
function drawLob(l, cam) { // granate in volo
  const k = l.t / l.T, x = lerp(l.x0, l.tx, k) - cam, y = lerp(l.y0, l.ty, k), z = 40 + Math.sin(k * Math.PI) * 140 - k * 40;
  if (l.owner === 'e') {
    const pa = .5 + .5 * Math.sin(G.t * 20), r0 = l.r * (1 - k * .3);
    ctx.fillStyle = rgba('#ff2020', .1 + .12 * k); ctx.beginPath(); ctx.ellipse(l.tx - cam, l.ty, r0, r0 * .35, 0, 0, TAU); ctx.fill();
    ctx.setLineDash([9, 6]); ctx.lineDashOffset = -G.t * 40; ctx.strokeStyle = rgba('#ff3030', .45 + .45 * pa); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.globalAlpha = .4; ctx.drawImage(shadowSprite(), x - 9, y - 3, 18, 6); ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(x, y - z); ctx.rotate(k * 10 * (l.tx >= l.x0 ? 1 : -1));
  ctx.beginPath(); ctx.ellipse(0, 1, 6, 6.8, 0, 0, TAU); ink(ctx, '#4f5d2e', 1.8);
  ctx.fillStyle = '#76884a'; ctx.beginPath(); ctx.ellipse(-1.8, -1.2, 2.2, 2.8, 0, 0, TAU); ctx.fill();
  rr(ctx, -2.6, -8.5, 5.2, 4, 1); ink(ctx, '#a0a6ad', 1.2);
  ctx.restore();
  FX.glow(x, y - z - 8, 9, '#ffcf5a', .7 + .3 * Math.sin(G.t * 40));
}
function drawCrate(c, cam) {
  const x = c.x - cam, y = c.y, wpn = c.drop.startsWith('w:'), C = col => c.flash > 0 ? tone(col, .6) : col;
  if (wpn) { // cassa d'armi: metallo, strisce gialle, bagliore
    const pa = .6 + .3 * Math.sin(G.t * 4);
    ctx.globalAlpha = .35 * pa; ctx.drawImage(glowSprite(GOLD), x - 52, y - 74, 104, 104); ctx.globalAlpha = 1; FX.glow(x, y - 22, 48, GOLD, .4 * pa);
    rr(ctx, x - 23, y - 44, 46, 44, 4); ink(ctx, C('#56616e'), 2.6);
    ctx.save(); rr(ctx, x - 23, y - 44, 46, 44, 4); ctx.clip();
    ctx.fillStyle = C('#6c7886'); ctx.fillRect(x - 23, y - 44, 46, 13);
    ctx.fillStyle = C(GOLD); ctx.fillRect(x - 23, y - 31, 46, 7); ctx.fillStyle = C('#1c1f24'); for (let i = -30; i < 30; i += 9) { ctx.beginPath(); ctx.moveTo(x + i, y - 24); ctx.lineTo(x + i + 5, y - 31); ctx.lineTo(x + i + 9, y - 31); ctx.lineTo(x + i + 4, y - 24); ctx.fill(); }
    ctx.fillStyle = C('#454e59'); ctx.fillRect(x - 23, y - 6, 46, 6); ctx.restore();
    rr(ctx, x - 23, y - 44, 46, 44, 4); ink(ctx, null, 2.6);
    ctx.font = `18px ${FONT_D}`; ctx.textAlign = 'center'; ctx.fillStyle = C('#e9edf2'); ctx.fillText('W', x, y - 7); ctx.textAlign = 'left';
    rr(ctx, x - 5, y - 46, 10, 5, 1.5); ink(ctx, C('#c9ced6'), 1.4);
    return;
  }
  // cassa di legno
  rr(ctx, x - 22, y - 44, 44, 44, 3); ink(ctx, C('#8a5a2b'), 2.6);
  ctx.fillStyle = C('#a8743f'); for (let i = 0; i < 3; i++) ctx.fillRect(x - 18, y - 40 + i * 13.3, 36, 10.5);
  ctx.strokeStyle = C('#5c3a1a'); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 17, y - 39); ctx.lineTo(x + 17, y - 5); ctx.stroke();
  ctx.strokeStyle = C('#c48d52'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 17, y - 41); ctx.lineTo(x + 17, y - 7); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - 18, y - 40, 36, 36);
  ctx.fillStyle = C('#3b2a18'); for (const [nx, ny] of [[-19, -41], [17, -41], [-19, -5], [17, -5]]) ctx.fillRect(x + nx, y + ny, 2.5, 2.5);
}
// icone (pericoli, oggetti, HUD, comandi) disegnate al centro (0,0), grandezza ~16
function icon(id, col) {
  switch (id) {
    case 'med': poly(ctx, [-3, -8, 3, -8, 3, -3, 8, -3, 8, 3, 3, 3, 3, 8, -3, 8, -3, 3, -8, 3, -8, -3, -3, -3]); ink(ctx, col || '#51cf66', 1.6); break;
    case 'gren': ctx.beginPath(); ctx.ellipse(0, 2, 5.5, 6.5, 0, 0, TAU); ink(ctx, '#5a6b36', 1.6); ctx.fillStyle = '#8a9c5c'; ctx.beginPath(); ctx.ellipse(-1.8, 0, 2, 2.6, 0, 0, TAU); ctx.fill(); rr(ctx, -2.6, -7.5, 5.2, 4, 1); ink(ctx, '#b0b6bd', 1.2); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(2.4, -6.5); ctx.lineTo(6.5, -2.5); ctx.stroke(); break;
    case 'shield': ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, -5.5); ctx.quadraticCurveTo(7, 4, 0, 8.5); ctx.quadraticCurveTo(-7, 4, -7, -5.5); ctx.closePath(); ink(ctx, col || '#4dabf7', 1.6); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(0, -5.5); ctx.lineTo(4.5, -4); ctx.quadraticCurveTo(4, 1, 0, 4); ctx.closePath(); ctx.fill(); break;
    case 'speed': poly(ctx, [2, -9, -6, 1, -1, 1, -3, 9, 6, -2, 1, -2]); ink(ctx, col || GOLD, 1.5); break;
    case 'dmg': ctx.font = `13px ${FONT_D}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeText('x2', 0, 5); ctx.fillStyle = col || '#ff6b6b'; ctx.fillText('x2', 0, 5); ctx.textAlign = 'left'; break;
    case 'life': ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-11, 0, -7, -10, 0, -4); ctx.bezierCurveTo(7, -10, 11, 0, 0, 8); ink(ctx, col || '#f783ac', 1.6); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(-3.5, -3, 1.8, 0, TAU); ctx.fill(); break;
    case 'slow': ctx.strokeStyle = col || '#99e9f2'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.lineTo(-Math.cos(a) * 8, -Math.sin(a) * 8); } ctx.stroke(); break;
    case 'skull': ctx.beginPath(); ctx.arc(0, -2, 8, Math.PI * .8, Math.PI * .2); ctx.lineTo(4.5, 7); ctx.lineTo(-4.5, 7); ctx.closePath(); ink(ctx, col || '#ff3b30', 1.6); ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-3.2, -1.5, 2.3, 2.7, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(3.2, -1.5, 2.3, 2.7, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-1.3, 4.5); ctx.lineTo(1.3, 4.5); ctx.fill(); break;
    case 'lock': rr(ctx, -6.5, -1.5, 13, 10, 2); ink(ctx, col || '#9aa1ab', 1.5); ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(0, -2, 4.5, Math.PI, 0); ctx.stroke(); ctx.strokeStyle = col || '#9aa1ab'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = INK; ctx.fillRect(-1, 2, 2, 3.5); break;
    case 'head': circ(ctx, 0, 0, 6, '#f1c27d', 1.5); ctx.fillStyle = '#3a2416'; ctx.beginPath(); ctx.arc(0, -1, 6, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); ctx.fillStyle = '#e63946'; ctx.fillRect(-6, -3.2, 12, 2.6); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke(); break;
    case 'check': ctx.strokeStyle = col || '#51cf66'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-2, 5); ctx.lineTo(7, -6); ctx.stroke(); break;
  }
}
function starShape(x, y, r, fill) {
  ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath();
  if (fill) ink(ctx, fill, 1.3); else { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function drawPickup(k, cam) {
  if (k.life < 3 && Math.floor(k.t * 10) % 2) return;
  const x = k.x - cam, y = k.y - 24 - Math.sin(k.t * 4) * 5, pop = k.t < .3 ? ease.back(k.t / .3) : 1;
  if (k.kind.startsWith('w:')) { // arma: colonna di luce, raggi che ruotano, nome
    const id = k.kind.slice(2), w = WEAPONS[id], col = w.col === '#ffffff' ? '#e6ecff' : w.col;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, k.y - 170, 0, k.y); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, .28)); ctx.fillStyle = g; ctx.fillRect(x - 15, k.y - 170, 30, 170);
    ctx.fillStyle = rgba('#ffffff', .18); ctx.fillRect(x - 2, k.y - 170, 4, 170);
    ctx.translate(x, y); ctx.rotate(G.t * .8); ctx.fillStyle = rgba(col, .16);
    for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(44, -7); ctx.lineTo(44, 7); ctx.fill(); }
    ctx.restore();
    FX.glow(x, y, 46, col, .7);
    ctx.save(); ctx.translate(x, y); ctx.scale(1.35 * pop, 1.35 * pop); ctx.translate(-13, 0); drawGun(ctx, id); ctx.restore();
    ctx.font = `600 17px ${FONT_U}`; ctx.textAlign = 'center'; const tw = ctx.measureText(w.name).width + 14;
    ctx.fillStyle = 'rgba(8,10,16,.82)'; rr(ctx, x - tw / 2, y - 44, tw, 18, 9); ctx.fill(); ctx.strokeStyle = rgba(col, .8); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = col; ctx.fillText(w.name, x, y - 30); ctx.textAlign = 'left';
    return;
  }
  const col = PICK_INFO[k.kind][1];
  FX.glow(x, y, 30, col, .55);
  ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop);
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); } ctx.closePath(); ink(ctx, '#141922', 2.5);
  ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(Math.cos(a) * 13.5, Math.sin(a) * 13.5); } ctx.closePath(); ctx.stroke();
  icon(k.kind, col);
  ctx.restore();
}
function drawHazardGround(h, cam) {
  if (h.kind === 'mark') { // bersaglio a terra (bombe, meteore, ghiaccio)
    const k = 1 - h.t / h.max, x = h.x - cam, pa = .5 + .5 * Math.sin(G.t * 25);
    ctx.fillStyle = rgba('#ff2a1a', .12 + .14 * k); ctx.beginPath(); ctx.ellipse(x, h.y, h.r * k, h.r * .38 * k, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#ff4030', .5 + .45 * pa); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, h.y, h.r, h.r * .38, 0, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(x, h.y); ctx.scale(1, .38); ctx.rotate(G.t * 2.2); ctx.strokeStyle = rgba('#ff7a60', .85); ctx.lineWidth = 3.5;
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(h.r * .5, 0); ctx.lineTo(h.r * .82, 0); ctx.stroke(); }
    ctx.restore();
    if (h.drop && k > .55) {
      const fz = (1 - k) * 600, y = h.y - fz;
      if (h.meteor) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, y - 110, 0, y); g.addColorStop(0, 'rgba(255,90,0,0)'); g.addColorStop(1, 'rgba(255,170,60,.8)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 4, y - 110); ctx.lineTo(x + 4, y - 110); ctx.lineTo(x + 14, y); ctx.lineTo(x - 14, y); ctx.fill();
        ctx.drawImage(fireSprite(), x - 28, y - 28, 56, 56); ctx.restore();
        circ(ctx, x, y, 12, '#3a1a0a', 2.2); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(x + 3, y + 3, 4, 0, TAU); ctx.fill();
        FX.glow(x, y, 46, '#ff7a1a', 1);
      } else if (h.ice) {
        poly(ctx, [x - 13, y - 44, x + 13, y - 44, x + 3, y - 6, x, y + 2, x - 3, y - 6]); ink(ctx, '#d7f5ff', 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 40, 3, 26); FX.glow(x, y - 20, 24, '#9be8ff', .6);
      } else {
        ctx.save(); ctx.translate(x, y - 6); poly(ctx, [-6, -16, 6, -16, 3, -9, -3, -9]); ink(ctx, '#3c4148', 1.4);
        ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 11, 0, 0, TAU); ink(ctx, '#2d3238', 1.8); ctx.fillStyle = '#e03131'; ctx.fillRect(-6, -2, 12, 2.5); ctx.restore();
      }
    }
  } else if (h.kind === 'acid') { // pozza acida che ribolle
    const a = Math.min(1, h.life), x = h.x - cam;
    ctx.fillStyle = rgba('#5fcf2a', .38 * a); ctx.beginPath(); ctx.ellipse(x, h.y, h.r, h.r * .4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#b8ff6a', .4 * a); ctx.beginPath(); ctx.ellipse(x - h.r * .15, h.y - 2, h.r * .55, h.r * .18, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 3; i++) { const k = (G.t * 1.3 + i / 3 + h.x * .01) % 1, bx = x + Math.sin(i * 2.4 + h.x) * h.r * .55; ctx.strokeStyle = rgba('#e2ffb0', (1 - k) * .8 * a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(bx, h.y - 2 - k * 4, 1.5 + k * 3, 0, TAU); ctx.stroke(); }
    FX.glow(x, h.y, h.r * 1.2, '#7dff4d', .22 * a);
  } else if (h.kind === 'ring') { // onda d'urto
    const x = h.x - cam, fade = clamp(1 - h.r / h.max, 0, 1) * .6 + .4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#ff8c3c', .45 * fade); ctx.lineWidth = 18; ctx.beginPath(); ctx.ellipse(x, h.y, h.r, h.r / 2.4, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba('#fff0c8', .95 * fade); ctx.lineWidth = 5; ctx.stroke();
    ctx.restore();
  } else if (h.kind === 'wave') { // muro di lava
    const x = h.x - cam;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let yy = GT - 6; yy <= GB + 10; yy += 13) {
      const f = .75 + .25 * Math.sin(G.t * 20 + yy * .3), s = 44 + 14 * Math.sin(yy * .11 + G.t * 9), ox = Math.sin(yy * .08 + G.t * 12) * 7;
      ctx.globalAlpha = f; ctx.drawImage(fireSprite(), x + ox - s * .55, yy - s * 1.05, s * 1.1, s * 1.3);
    }
    ctx.globalAlpha = .55; const g = ctx.createLinearGradient(x - 40, 0, x + 50, 0); g.addColorStop(0, 'rgba(255,60,0,0)'); g.addColorStop(.6, 'rgba(255,110,0,.8)'); g.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 40, GT - 50, 90, GB - GT + 60); ctx.restore();
    for (let i = 0; i < 4; i++) FX.glow(x, GT + (GB - GT) * (i + .5) / 4 - 20, 60, '#ff6a00', .8);
  }
}
function drawHazardAir(h, cam) { // raggi dei boss
  if (h.kind !== 'beam') return;
  const x0 = Math.max(0, h.x0 - cam), x1 = Math.min(W, h.x1 - cam), y = h.y, col = h.col;
  if (x1 <= x0) return;
  if (h.age < h.warn) { // avviso: zona a strisce che lampeggia
    const k = h.age / h.warn, pa = .5 + .5 * Math.sin(G.t * 30);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y - h.w / 2, x1 - x0, h.w); ctx.clip();
    ctx.fillStyle = rgba(col, .1 + .16 * k); ctx.fillRect(x0, y - h.w / 2, x1 - x0, h.w);
    ctx.strokeStyle = rgba(col, .14 + .2 * k); ctx.lineWidth = 9; const off = (G.t * 70) % 30; ctx.beginPath();
    for (let sx = x0 - h.w - off; sx < x1 + 30; sx += 30) { ctx.moveTo(sx, y + h.w / 2); ctx.lineTo(sx + h.w * .7, y - h.w / 2); } ctx.stroke();
    ctx.restore();
    ctx.fillStyle = rgba(col, .45 + .5 * pa); ctx.fillRect(x0, y - 1, x1 - x0, 2);
    ctx.fillStyle = rgba(col, .9); ctx.fillRect(x0, y - h.w / 2, x1 - x0, 2); ctx.fillRect(x0, y + h.w / 2 - 2, x1 - x0, 2);
    FX.glow(x1, y - 30, 16 + 44 * k, col, .5 + .5 * k);
  } else { // raggio attivo
    const k = (h.age - h.warn) / h.active, th = h.w * (1 - Math.pow(k, 3) * .8) * (.9 + .1 * Math.sin(G.t * 50)), yb = y - 30;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(col, .45); ctx.fillRect(x0, yb - th / 2, x1 - x0, th);
    ctx.fillStyle = rgba(col, .35); ctx.fillRect(x0, yb - th * .7, x1 - x0, th * 1.4);
    ctx.fillStyle = rgba('#ffffff', .9); ctx.fillRect(x0, yb - th / 4, x1 - x0, th / 2);
    if (h.fire) for (let i = 0; i < 9; i++) { const fx = rand(x0, x1), s = rand(.6, 1.2) * th; ctx.globalAlpha = .7; ctx.drawImage(fireSprite(), fx - s / 2, yb - s / 2 + rand(-th * .3, th * .3), s, s); }
    ctx.restore();
    ctx.fillStyle = rgba(col, .3); ctx.fillRect(x0, y - h.w / 2, x1 - x0, h.w);
    FX.band(x0, x1, yb, th * (h.big ? 1.4 : 1), col, 1);
  }
}
function drawParts(cam) {
  const ps = G.parts, n = ps.length;
  for (let i = 0; i < n; i++) {
    const q = ps[i], a = clamp(q.life / q.max, 0, 1), x = q.x - cam, y = q.y - q.z;
    if (x < -80 || x > W + 80) continue;
    switch (q.kind) {
      case 'smoke': {
        if (q.v == null) q.v = (i * 7 + (q.x | 0)) & 3;
        const s = q.r * 2.7; ctx.globalAlpha = a * .8 * Math.min(1, (1 - a) * 10 + .25); ctx.drawImage(smokeSprite(q.col, q.v), x - s / 2, y - s / 2, s, s); break;
      }
      case 'fire': {
        const r = q.r * (.55 + a * .65); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
        ctx.drawImage(glowSprite(q.col), x - r * 1.7, y - r * 1.7, r * 3.4, r * 3.4);
        if (a > .5) { ctx.globalAlpha = (a - .5) * 2; ctx.drawImage(fireSprite(), x - r, y - r, r * 2, r * 2); }
        ctx.globalCompositeOperation = 'source-over'; if (i % 3 === 0) FX.glow(x, y, r * 3.2, q.col, a * .6); break;
      }
      case 'spark': {
        const sx = q.vx * .024, sy = (q.vy - q.vz) * .024;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = q.col; ctx.lineWidth = q.r * .9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sx, y - sy); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
        if (i % 4 === 0) FX.glow(x, y, 10, q.col, a); break;
      }
      case 'debris': {
        const r = q.r; ctx.globalAlpha = Math.min(1, a * 2.5); ctx.save(); ctx.translate(x, y); ctx.rotate(q.life * q.vx * .05 + i);
        ctx.fillStyle = q.col; ctx.fillRect(-r / 2, -r / 3, r, r * .66); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(-r / 2, -r / 3, r, r * .66); ctx.restore(); break;
      }
      case 'flash': {
        const r = q.r * .9; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.translate(x, y); ctx.scale(q.face || 1, 1); ctx.rotate(q.rot || 0); ctx.drawImage(flashSprite(q.col), -r, -r, r * 2, r * 2); ctx.restore();
        FX.glow(x, y, r * 2.8, q.col, .9 * a); break;
      }
      case 'shell': {
        ctx.globalAlpha = Math.min(1, a * 3); ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot || 0);
        ctx.fillStyle = '#e9b949'; ctx.fillRect(-2.6, -1.1, 5.2, 2.2); ctx.fillStyle = '#8a5a12'; ctx.fillRect(-2.6, -1.1, 1.5, 2.2); ctx.restore(); break;
      }
      case 'ember': {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(x, y, q.r, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over'; if (i % 2 === 0) FX.glow(x, y, q.r * 5, q.col, a * .8); break;
      }
      default: ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.fillRect(x - q.r / 2, y - q.r / 2, q.r, q.r);
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawFxList(cam) {
  for (const f of G.fx) {
    if (f.kind === 'ring') { // anello d'urto dell'esplosione
      const k = clamp(f.life / .35, 0, 1), x = f.x - cam;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#ffcf8a', .8 * k); ctx.lineWidth = 2 + 7 * k; ctx.beginPath(); ctx.ellipse(x, f.y, f.r, f.r * .4, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba('#ffffff', .6 * k); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    } else if (f.kind === 'boom') { // palla di fuoco e lampo
      const k = 1 - clamp(f.life / .45, 0, 1), x = f.x - cam, y = f.y - f.r * .35, s = f.r * (.7 + ease.out(k) * .9);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (k < .25) { ctx.globalAlpha = 1 - k * 4; ctx.drawImage(glowSprite('#ffffff'), x - s * .9, y - s * .9, s * 1.8, s * 1.8); }
      ctx.globalAlpha = Math.pow(1 - k, 1.6); ctx.drawImage(fireSprite(), x - s, y - s, s * 2, s * 2);
      ctx.restore();
      FX.glow(x, y, f.r * 2.4, '#ffa050', Math.pow(1 - k, 1.3));
    } else if (f.kind === 'bolt') drawBolt(f, cam);
    else if (f.kind === 'slash') { // fendente del ninja
      const k = clamp(f.life / .2, 0, 1), x = f.x - cam, y = f.y - 45, a0 = f.face > 0 ? -1.2 : Math.PI - .6, a1 = f.face > 0 ? .6 : Math.PI + 1.2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba('#b48cff', .55 * k); ctx.beginPath(); ctx.arc(x, y, 54, a0, a1); ctx.arc(x - f.face * 10, y, 40, a1, a0, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba('#ffffff', .95 * k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 52, a0, a1); ctx.stroke(); ctx.restore();
      FX.glow(x + f.face * 30, y, 50, '#a25cff', .7 * k);
    }
  }
}
function drawBolt(f, cam) { // fulmine a zigzag a tre strati
  const pts = [];
  for (let i = 0; i < f.pts.length; i++) {
    const [x, y] = f.pts[i]; if (i === 0) { pts.push(x - cam, y); continue; }
    const [px, py] = f.pts[i - 1]; for (let s = 1; s <= 5; s++) { const k = s / 5, j = s < 5 ? 12 : 0; pts.push(lerp(px, x, k) - cam + rand(-j, j), lerp(py, y, k) + rand(-j, j)); }
  }
  const path = () => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  path(); ctx.strokeStyle = rgba('#58c8ff', .35); ctx.lineWidth = 10; ctx.stroke();
  ctx.strokeStyle = rgba(f.col, .9); ctx.lineWidth = 3.5; ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
  for (const [x, y] of f.pts) FX.glow(x - cam, y, 34, '#7fdcff', .9);
}
function drawTexts(cam) { // punti e messaggi che saltano fuori
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const tx of G.texts) {
    const age = 1 - tx.life, sc = age < .16 ? ease.back(age / .16) : 1;
    ctx.save(); ctx.translate(tx.x - G.camX, tx.y); ctx.scale(sc, sc); ctx.globalAlpha = clamp(tx.life * 2.5, 0, 1);
    ctx.font = `600 ${Math.round(tx.size * 1.4)}px ${FONT_U}`; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeText(tx.txt, 0, 0); ctx.fillStyle = tx.col; ctx.fillText(tx.txt, 0, 0);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

// ---------------- HUD ----------------
// scritta con contorno scuro (si legge su ogni sfondo)
function txt(s, x, y, size, col, align = 'left', shadow = true, font = FONT_U, weight = 600) {
  ctx.font = `${font === FONT_D ? '' : weight + ' '}${size}px ${font}`; ctx.textAlign = align; ctx.lineJoin = 'round';
  if (shadow) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, size * .16); ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.textAlign = 'left';
}
// barra con lastra scura, scia del danno (ghost), riflesso e tacche
function segBar(x, y, w, h, k, g, col, segs = 0) {
  k = clamp(k, 0, 1); g = clamp(g, 0, 1);
  ctx.fillStyle = 'rgba(6,8,12,.88)'; rr(ctx, x - 3, y - 3, w + 6, h + 6, 4); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#1b1f27'; ctx.fillRect(x, y, w, h);
  if (g > k) { ctx.fillStyle = 'rgba(255,236,214,.8)'; ctx.fillRect(x + w * k, y, w * (g - k), h); }
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, tone(col, .3)); gr.addColorStop(.55, col); gr.addColorStop(1, tone(col, -.35));
  ctx.fillStyle = gr; ctx.fillRect(x, y, w * k, h);
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y + 1, w * k, Math.max(1, h * .2));
  if (segs) { ctx.fillStyle = 'rgba(6,8,12,.85)'; for (let i = 1; i < segs; i++) ctx.fillRect(Math.round(x + w * i / segs) - .75, y, 1.5, h); }
}
function hudState() {
  const h = G.hud || (G.hud = { t: G.t, hp: 1, hpG: 1, hpHold: 0, boss: 1, bossG: 1, bossHold: 0, combo: 0, comboT: -9 });
  h.dt = clamp(G.t - h.t, 0, .1); h.t = G.t; return h;
}
function ghost(h, key, k) { // la scia bianca resta un attimo e poi scende verso il valore vero
  const gk = key + 'G', hk = key + 'Hold';
  if (k < h[key] - 1e-4) h[hk] = .45;
  h[key] = k;
  if (k >= h[gk]) h[gk] = k; else if (h[hk] > 0) h[hk] -= h.dt; else h[gk] = Math.max(k, h[gk] - h.dt * .8);
  return h[gk];
}
function hazardStripes(y, hh) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, hh); ctx.clip(); ctx.fillStyle = 'rgba(255,200,0,.85)'; ctx.fillRect(0, y, W, hh);
  ctx.fillStyle = 'rgba(12,12,14,.9)'; const off = (G.t * 50) % 32; ctx.beginPath();
  for (let x = -32 - off; x < W + 32; x += 32) { ctx.moveTo(x, y + hh); ctx.lineTo(x + 16, y + hh); ctx.lineTo(x + 16 + hh, y); ctx.lineTo(x + hh, y); }
  ctx.fill(); ctx.restore();
}
function drawHUD() {
  const p = G.player; if (!p) return;
  const h = hudState(), touch = Input.isTouch;
  // sfumatura scura in alto per staccare l'HUD dal paesaggio
  const tg = ctx.createLinearGradient(0, 0, 0, 96); tg.addColorStop(0, 'rgba(4,5,9,.6)'); tg.addColorStop(1, 'rgba(4,5,9,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 96);
  // --- ritratto, vita, vite, granate ---
  const px = 14, py = 10, ps = 48;
  ctx.save(); rr(ctx, px, py, ps, ps, 9); ctx.clip();
  const pg = ctx.createLinearGradient(0, py, 0, py + ps); pg.addColorStop(0, '#2c3a56'); pg.addColorStop(1, '#0c1019'); ctx.fillStyle = pg; ctx.fillRect(px, py, ps, ps);
  drawSoldier(ctx, px + ps / 2 - 6, py + 138, Object.assign({ face: 1, t: G.t, s: 1.8, flash: p.hurtT > 0 ? 1 : 0 }, PLAYER_LOOK));
  ctx.restore();
  rr(ctx, px, py, ps, ps, 9); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke(); ctx.strokeStyle = p.hurtT > 0 ? '#ff6b6b' : '#e63946'; ctx.lineWidth = 1.6; ctx.stroke();
  const k = p.hp / p.maxhp, hg = ghost(h, 'hp', clamp(k, 0, 1));
  const hcol = k > .5 ? '#51cf66' : k > .25 ? '#fcc419' : '#ff4040';
  segBar(74, 15, 200, 14, k, hg, hcol, 10);
  if (p.shield > 0) { ctx.fillStyle = '#74c0fc'; ctx.fillRect(74, 25, 200 * clamp(p.shield / 70, 0, 1), 4); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(74, 25, 200 * clamp(p.shield / 70, 0, 1), 1); }
  if (k < .25 && !p.dead) { ctx.globalAlpha = .35 + .35 * Math.sin(G.t * 10); ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 2; rr(ctx, 71, 12, 206, 20, 5); ctx.stroke(); ctx.globalAlpha = 1; }
  // vite
  const nl = Math.min(G.lives, 6);
  for (let i = 0; i < nl; i++) { ctx.save(); ctx.translate(82 + i * 17, 44); icon('head'); ctx.restore(); }
  let gx = 82 + nl * 17 + (nl ? 4 : 0);
  if (G.lives > 6) { txt('x' + G.lives, gx - 4, 50, 18, '#fff', 'left'); gx += 22; }
  // granate
  ctx.save(); ctx.translate(gx + 8, 45); icon('gren'); ctx.restore();
  txt('×' + p.grenades, gx + 18, 51, 20, p.grenades ? '#e9ecef' : '#868e96', 'left');
  // effetti attivi (icona + tempo che resta)
  let ex = 74; const eff = (id, t, max, col) => {
    if (t <= 0) return;
    ctx.fillStyle = 'rgba(6,8,12,.82)'; rr(ctx, ex, 60, 58, 20, 6); ctx.fill(); ctx.strokeStyle = rgba(col, .7); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); ctx.translate(ex + 11, 70); ctx.scale(.72, .72); icon(id, col); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(ex + 22, 68, 30, 4); ctx.fillStyle = col; ctx.fillRect(ex + 22, 68, 30 * clamp(t / max, 0, 1), 4);
    ex += 64;
  };
  eff('shield', p.shieldT, 15, '#74c0fc'); eff('speed', p.speedT, 10, GOLD); eff('dmg', p.dmgT, 10, '#ff6b6b'); eff('slow', p.slowT, 2.5, '#99e9f2');
  // --- arma ---
  const w = WEAPONS[p.weapon], wcol = w.col === '#ffffff' ? '#f1f3f5' : w.col, cx = W / 2;
  poly(ctx, [cx - 130, 6, cx + 130, 6, cx + 116, 54, cx - 116, 54]); ctx.fillStyle = 'rgba(8,10,16,.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = wcol; ctx.fillRect(cx - 124, 6, 248, 2.5);
  ctx.save(); ctx.translate(cx - 98, 31); ctx.scale(1.3, 1.3); drawGun(ctx, p.weapon); ctx.restore();
  ctx.font = `600 24px ${FONT_U}`; const nw = ctx.measureText(w.name).width, fs = nw > 156 ? Math.floor(24 * 156 / nw) : 24;
  txt(w.name, cx - 44, 32, fs, wcol, 'left');
  const pw = p.power[p.weapon] || 1; for (let i = 0; i < 3; i++) starShape(cx - 37 + i * 15, 44, 5.5, i < pw ? GOLD : null);
  if (w.sub) { ctx.font = `500 14px ${FONT_U}`; ctx.fillStyle = 'rgba(220,226,235,.6)'; ctx.textAlign = 'left'; ctx.fillText(w.sub.toUpperCase(), cx + 2, 48); }
  const n = p.owned.length, sw = 14;
  for (let i = 0; i < n; i++) {
    const id = p.owned[i], xx = cx - n * sw / 2 + i * sw, cur = id === p.weapon, c2 = WEAPONS[id].col;
    ctx.fillStyle = cur ? c2 : rgba(c2 === '#ffffff' ? '#cccccc' : c2, .3); rr(ctx, xx + 2, cur ? 57 : 58, sw - 4, cur ? 7 : 5, 2); ctx.fill();
    if (cur) { ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
  }
  // --- avanzamento nel livello: zone, giocatore, boss ---
  const tx0 = cx - 140, twd = 280, ty = 76, lk = clamp(p.x / G.levelLen, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, tx0 - 3, ty - 3, twd + 6, 6, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(tx0, ty - 1, twd, 2); ctx.fillStyle = '#e63946'; ctx.fillRect(tx0, ty - 1, twd * lk, 2);
  for (let i = 0; i < G.L.zones.length; i++) { const zx = tx0 + twd * G.L.zones[i].x / G.levelLen; ctx.fillStyle = i < G.zi ? '#51cf66' : G.lock && !G.lock.boss && i === G.zi ? GOLD : 'rgba(255,255,255,.55)'; ctx.fillRect(zx - 1, ty - 4, 2.5, 8); }
  poly(ctx, [tx0 + twd * lk - 5, ty - 10, tx0 + twd * lk + 5, ty - 10, tx0 + twd * lk, ty - 3]); ink(ctx, '#ff4d5a', 1.2);
  ctx.save(); ctx.translate(tx0 + twd + 12, ty); ctx.scale(.75, .75); icon('skull', G.bossStage ? '#ff3b30' : '#adb5bd'); ctx.restore();
  // --- punteggio, livello, combo ---
  const rx = W - 16 - (touch ? 56 : 0);
  const sc = String(G.score).padStart(7, '0'), nz = Math.min(sc.length - 1, sc.search(/[1-9]/) < 0 ? sc.length - 1 : sc.search(/[1-9]/));
  ctx.font = `600 38px ${FONT_U}`; ctx.textAlign = 'right'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.strokeText(sc, rx, 38);
  const sig = sc.slice(nz), wsig = ctx.measureText(sig).width; ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillText(sc.slice(0, nz), rx - wsig, 38); ctx.fillStyle = '#ffffff'; ctx.fillText(sig, rx, 38);
  txt('LIV ' + (G.level + 1) + ' · ' + G.D.name, rx, 57, 17, G.D.col, 'right');
  if (G.combo >= 5) {
    if (G.combo !== h.combo) { h.combo = G.combo; h.comboT = G.t; }
    const mult = 1 + Math.min(4, Math.floor(G.combo / 5)), pop = 1 + .3 * Math.max(0, 1 - (G.t - h.comboT) / .2);
    ctx.save(); ctx.translate(rx, 82); ctx.scale(pop, pop);
    ctx.fillStyle = '#ff922b'; rr(ctx, -38, -17, 38, 21, 5); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    txt('x' + mult, -19, 0, 20, '#1a0f05', 'center', false);
    txt('COMBO ' + G.combo, -44, 0, 22, '#ffb35c', 'right');
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(rx - 120, 89, 120, 3); ctx.fillStyle = '#ff922b'; ctx.fillRect(rx - 120 * clamp(G.comboT / 2.8, 0, 1), 89, 120 * clamp(G.comboT / 2.8, 0, 1), 3);
  } else h.combo = G.combo;
  // --- AVANTI ---
  if (!G.lock && G.goT > 0) {
    const a = Math.min(1, G.goT * 2) * (.8 + .2 * Math.sin(G.t * 8)), ax = W - 34;
    ctx.globalAlpha = a; txt('AVANTI', ax - 58, 262, 42, GOLD, 'right');
    for (let i = 0; i < 3; i++) { const ph = (G.t * 2.4 - i * .22) % 1; ctx.globalAlpha = a * (.3 + .7 * (1 - ph)); const xx = ax - 46 + i * 15; poly(ctx, [xx, 232, xx + 12, 248, xx, 264, xx - 5, 264, xx + 7, 248, xx - 5, 232]); ink(ctx, GOLD, 1.6); }
    ctx.globalAlpha = 1;
  }
  // --- boss ---
  const b = G.boss;
  if (b && !b.entering) {
    const bw = 560, bx = (W - bw) / 2, by = touch ? 124 : H - 28, bk = clamp(b.hp / b.maxhp, 0, 1), bg = ghost(h, 'boss', bk);
    poly(ctx, [bx - 20, by - 32, bx + bw + 20, by - 32, bx + bw + 8, by + 18, bx - 8, by + 18]); ctx.fillStyle = 'rgba(8,10,16,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,90,100,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.save(); ctx.translate(bx + 7, by - 15); ctx.scale(.9, .9); icon('skull', '#ff4d5a'); ctx.restore();
    txt(b.name, bx + 22, by - 8, 19, '#ff6b6b', 'left', true, FONT_D);
    txt(b.shield ? 'SCUDO ATTIVO — DISTRUGGI I GENERATORI' : b.sub, bx + bw, by - 9, 17, b.shield ? '#7df9ff' : '#c9ced6', 'right', true, FONT_U, 500);
    const bcol = b.shield ? '#5ae6ff' : b.type === 'omega' && b.phase >= 3 ? '#ff1a1a' : '#ff4d6d';
    segBar(bx, by, bw, 11, bk, bg, bcol, 0);
    if (b.shield) { ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw * bk, 11); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.25)'; const off = (G.t * 40) % 16; for (let x = bx - 16 + off; x < bx + bw; x += 16) { ctx.beginPath(); ctx.moveTo(x, by + 11); ctx.lineTo(x + 6, by + 11); ctx.lineTo(x + 12, by); ctx.lineTo(x + 6, by); ctx.fill(); } ctx.restore(); }
    if (b.type === 'omega') for (const m of [.33, .66]) { ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + bw * m - 1, by - 3, 2, 17); poly(ctx, [bx + bw * m - 4, by - 7, bx + bw * m + 4, by - 7, bx + bw * m, by - 2]); ctx.fill(); }
  }
  // --- annunci ---
  if (G.banner) {
    const bn = G.banner, age = 2.4 - bn.t, inK = ease.out(clamp(age / .28, 0, 1)), outK = bn.t < .35 ? ease.inOut(1 - bn.t / .35) : 0;
    const y0 = 148, hh = bn.sub ? 82 : 60;
    ctx.save(); ctx.translate((1 - inK) * -W * .7 + outK * W * .7, 0); ctx.globalAlpha = Math.min(inK, 1 - outK);
    poly(ctx, [70, y0, W - 50, y0, W - 70, y0 + hh, 50, y0 + hh]); ctx.fillStyle = 'rgba(8,10,16,.84)'; ctx.fill();
    ctx.fillStyle = bn.col; ctx.fillRect(66, y0, W - 120, 3); ctx.fillRect(54, y0 + hh - 3, W - 120, 3);
    const sc0 = 1 + Math.max(0, .3 - age) * 1.3; ctx.save(); ctx.translate(W / 2, y0 + 44); ctx.scale(sc0, sc0); txt(bn.txt, 0, 0, 36, bn.col, 'center', true, FONT_D); ctx.restore();
    if (bn.sub) txt(bn.sub, W / 2, y0 + 70, 22, '#f1f3f5', 'center', true, FONT_U, 500);
    ctx.restore();
  }
  // --- allarme boss, vita bassa, colpi subiti ---
  if (G.bossStage === 1) {
    const a = .5 + .5 * Math.sin(G.t * 9); ctx.globalAlpha = .75 + .25 * a; hazardStripes(0, 14); hazardStripes(H - 14, 14);
    ctx.globalAlpha = .22 + .18 * a; ctx.drawImage(redVignette(), 0, 0, W, H); ctx.globalAlpha = 1;
  }
  const low = k < .25 && !p.dead, hurt = p.hurtT > 0;
  if (low || hurt) { ctx.globalAlpha = clamp((hurt ? .6 * p.hurtT / .25 : 0) + (low ? .2 + .14 * Math.sin(G.t * 8) : 0), 0, .85); ctx.drawImage(redVignette(), 0, 0, W, H); ctx.globalAlpha = 1; }
  if (p.dead && G.lives >= 0) {
    ctx.fillStyle = 'rgba(6,8,12,.7)'; ctx.fillRect(0, H / 2 - 30, W, 48);
    txt('VITE RIMASTE: ' + G.lives, W / 2, H / 2 + 6, 34, '#ffffff', 'center');
  }
}
function drawTouch() { // pulsanti per il telefono, con icone
  for (const b of TOUCH_BTNS) {
    const on = Input.touch[b.id];
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.globalAlpha = on ? .8 : .5; ctx.fillStyle = on ? 'rgba(255,255,255,.4)' : 'rgba(8,12,20,.6)'; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = b.id === 'fire' ? '#ff6b6b' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.globalAlpha = on ? 1 : .9; const s = b.r / 30;
    if (b.id === 'fire') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4 * s, 13 * s, 0, TAU); ctx.moveTo(-20 * s, -4 * s); ctx.lineTo(-7 * s, -4 * s); ctx.moveTo(20 * s, -4 * s); ctx.lineTo(7 * s, -4 * s); ctx.moveTo(0, -24 * s); ctx.lineTo(0, -11 * s); ctx.moveTo(0, 16 * s); ctx.lineTo(0, 3 * s); ctx.stroke(); }
    else if (b.id === 'jump') { ctx.fillStyle = '#ffffff'; poly(ctx, [0, -14 * s, 12 * s, 0, 5 * s, 0, 5 * s, 9 * s, -5 * s, 9 * s, -5 * s, 0, -12 * s, 0]); ctx.fill(); }
    else if (b.id === 'gren') { ctx.scale(s * 1.4, s * 1.4); ctx.translate(0, -3); icon('gren'); }
    else if (b.id === 'next') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, 10 * s, -.3, Math.PI * .9); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 10 * s, Math.PI - .3, Math.PI * 1.9); ctx.stroke(); }
    else if (b.id === 'pause') { ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -8, 4, 16); ctx.fillRect(2, -8, 4, 16); }
    ctx.restore();
    if (b.r > 30) txt(b.label, b.x, b.y + b.r - 9, 15, '#ffffff', 'center', true, FONT_U, 500);
  }
  const s = Input.stick, ox = s ? s.ox : 120, oy = s ? s.oy : 440;
  ctx.globalAlpha = .45; ctx.fillStyle = 'rgba(8,12,20,.6)'; ctx.beginPath(); ctx.arc(ox, oy, 60, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(ox, oy, 40, 0, TAU); ctx.stroke();
  if (s) { const dx = clamp(s.x - s.ox, -50, 50), dy = clamp(s.y - s.oy, -50, 50); ctx.globalAlpha = .75; circ(ctx, ox + dx, oy + dy, 26, 'rgba(255,255,255,.85)', 2); }
  ctx.globalAlpha = 1;
}

// ---------------- schermate ----------------
function drawMenuBg() {
  const d = G.menuBg || (G.menuBg = BG.jungle.init(mulberry32(5))), cam = G.titleCam || 0;
  FX.begin(null, .9);
  BG.jungle.draw(ctx, cam, G.t, d);
  BG.jungle.front(ctx, cam, G.t, d);
  FX.compose(ctx);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(5,6,12,.3)'); g.addColorStop(.55, 'rgba(5,6,12,.55)'); g.addColorStop(1, 'rgba(5,6,12,.82)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // il protagonista resta in piena luce davanti allo sfondo scurito
  if (G.state === 'title') {
    const sx = 196, sy = 486;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35; ctx.drawImage(glowSprite('#ff7a4a'), sx - 120, sy - 220, 240, 240); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .6; ctx.drawImage(shadowSprite(), sx - 52, sy - 9, 104, 26); ctx.globalAlpha = 1;
    drawSoldier(ctx, sx, sy, Object.assign({ face: 1, anim: G.t * 13, walk: true, t: G.t, gun: 'mitra', s: 2 }, PLAYER_LOOK));
  }
  FX.post(ctx, .7, LOOK.jungle.grade);
}
// logo: preparato una volta (contorno + metallo), poi a ogni fotogramma solo il riflesso che scorre
const LOGO = { a: null, b: null, ready: null };
function fontsReady() { try { return !document.fonts || document.fonts.check(`40px "Black Ops One"`); } catch (e) { return true; } }
function logo(y, s = 1) {
  const fr = fontsReady(), LW = 900, LH = 170, k = 2;
  if (!LOGO.a || LOGO.ready !== fr) {
    LOGO.ready = fr; LOGO.a = mkCanvas(LW * k, LH * k); LOGO.b = mkCanvas(LW * k, LH * k);
    const x = LOGO.a.getContext('2d'); x.scale(k, k); x.textAlign = 'center'; x.lineJoin = 'round'; x.font = `100px ${FONT_D}`;
    const T = 'METAL GEAR', cx = LW / 2, by = 112;
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillText(T, cx + 6, by + 8);
    x.strokeStyle = INK; x.lineWidth = 12; x.strokeText(T, cx, by);
    x.strokeStyle = '#e63946'; x.lineWidth = 4.5; x.strokeText(T, cx, by);
    const g = x.createLinearGradient(0, by - 82, 0, by + 6); g.addColorStop(0, '#ffffff'); g.addColorStop(.42, '#bcc5cf'); g.addColorStop(.5, '#59626d'); g.addColorStop(.6, '#8f9aa6'); g.addColorStop(1, '#eef2f6');
    x.fillStyle = g; x.fillText(T, cx, by);
  }
  const bx = LOGO.b.getContext('2d'); bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'source-over'; bx.clearRect(0, 0, LW * k, LH * k); bx.drawImage(LOGO.a, 0, 0);
  bx.globalCompositeOperation = 'source-atop'; bx.scale(k, k); const sh = (G.t * 320) % 1700 - 400;
  bx.fillStyle = 'rgba(255,255,255,.55)'; bx.beginPath(); bx.moveTo(sh, 0); bx.lineTo(sh + 46, 0); bx.lineTo(sh - 14, LH); bx.lineTo(sh - 60, LH); bx.fill();
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(s, s);
  ctx.drawImage(LOGO.b, -LW / 2, -112, LW, LH);
  // sottotitolo spaziato: le due lineette si allineano alla larghezza vera del testo
  const SUB = 'OPERAZIONE OMEGA'; ctx.font = `600 24px ${FONT_U}`; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  const sp = 'letterSpacing' in CanvasRenderingContext2D.prototype ? 6 : 0; if (sp) ctx.letterSpacing = '6px';
  const tw = ctx.measureText(SUB).width - sp, tx = sp / 2;
  ctx.strokeStyle = 'rgba(5,6,10,.85)'; ctx.lineWidth = 5; ctx.strokeText(SUB, tx, 40);
  ctx.fillStyle = '#ff4d5a'; ctx.fillText(SUB, tx, 40);
  if (sp) ctx.letterSpacing = '0px';
  const lx = tw / 2 + 18;
  for (const sgn of [-1, 1]) { const g = ctx.createLinearGradient(sgn * lx, 0, sgn * (lx + 80), 0); g.addColorStop(0, '#ff4d5a'); g.addColorStop(1, 'rgba(255,77,90,0)'); ctx.fillStyle = g; ctx.fillRect(sgn > 0 ? lx : -lx - 80, 31, 80, 2); }
  ctx.restore(); ctx.textAlign = 'left';
}
function menuItem(label, x, y, w, h, i) { // pulsante inclinato; quello scelto è rosso con freccia
  const s = G.sel === i, sk = 12, ox = s ? 6 : 0;
  ctx.save(); ctx.translate(ox, 0);
  poly(ctx, [x + sk, y, x + w, y, x + w - sk, y + h, x, y + h]);
  if (s) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ff4d5a'); g.addColorStop(1, '#b51d2b'); ctx.fillStyle = g; } else ctx.fillStyle = 'rgba(10,12,20,.74)';
  ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = s ? '#ffffff' : 'rgba(255,255,255,.22)'; ctx.stroke();
  if (s) { const a = (Math.sin(G.t * 7) + 1) * 3; ctx.fillStyle = '#ffffff'; poly(ctx, [x - 24 - a, y + h / 2 - 9, x - 12 - a, y + h / 2, x - 24 - a, y + h / 2 + 9]); ctx.fill(); }
  ctx.font = `600 ${Math.round(h * .62)}px ${FONT_U}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = s ? '#ffffff' : '#dfe3ea';
  ctx.fillText(label, x + w / 2, y + h / 2 + 3); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.restore();
  G.rects.push({ x, y, w, h, i });
}
function hint(s, y) { // riga di aiuto in basso
  ctx.font = `500 18px ${FONT_U}`; const tw = ctx.measureText(s).width + 36;
  ctx.fillStyle = 'rgba(6,8,12,.6)'; rr(ctx, W / 2 - tw / 2, y - 18, tw, 26, 13); ctx.fill();
  ctx.fillStyle = '#d5dae2'; ctx.textAlign = 'center'; ctx.fillText(s, W / 2, y + 1); ctx.textAlign = 'left';
}
function drawTitle() {
  logo(128);
  const items = ['GIOCA', 'SELEZIONA LIVELLO', 'COMANDI', 'AUDIO: ' + (Snd.muted ? 'NO' : 'SÌ')];
  items.forEach((s, i) => menuItem(s, W / 2 - 150, 212 + i * 56, 300, 44, i));
  const rec = 'RECORD ' + String(store.get('best', 0)).padStart(7, '0');
  ctx.save(); ctx.translate(W / 2 - 66, 455); starShape(0, -6, 8, GOLD); ctx.restore();
  txt(rec, W / 2 - 52, 463, 24, GOLD, 'left');
  hint('Frecce/WASD muovi · J spara · K salta · L granata · Q/E arma · INVIO conferma', 506);
}
function drawDiff() {
  txt('SCEGLI LA DIFFICOLTÀ', W / 2, 70, 34, '#ffffff', 'center', true, FONT_D);
  const cw = 200, gap = 18, x0 = (W - (cw * 4 + gap * 3)) / 2, wins = store.get('wins', {});
  DIFFS.forEach((d, i) => {
    const s = G.sel === i, x = x0 + i * (cw + gap), y = s ? 106 : 120, h = 300;
    if (s) { ctx.globalAlpha = .5; ctx.drawImage(glowSprite(d.col), x - 60, y - 50, cw + 120, h + 100); ctx.globalAlpha = 1; }
    rr(ctx, x, y, cw, h, 12); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, s ? 'rgba(30,34,46,.95)' : 'rgba(14,16,24,.82)'); g.addColorStop(1, s ? 'rgba(12,14,20,.95)' : 'rgba(6,8,12,.82)'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = s ? d.col : 'rgba(255,255,255,.18)'; ctx.lineWidth = s ? 3 : 1.5; ctx.stroke();
    ctx.fillStyle = d.col; ctx.fillRect(x + 14, y + 12, cw - 28, 3);
    for (let j = 0; j <= i; j++) { ctx.save(); ctx.translate(x + cw / 2 + (j - i / 2) * 26, y + 48); ctx.scale(1.25, 1.25); icon('skull', d.col); ctx.restore(); }
    txt(d.name, x + cw / 2, y + 100, 22, d.col, 'center', true, FONT_D);
    d.desc.forEach((l, j) => txt(l, x + cw / 2, y + 140 + j * 26, 20, '#d8dde5', 'center', false, FONT_U, 500));
    for (let j = 0; j < Math.min(d.lives, 6); j++) { ctx.save(); ctx.translate(x + cw / 2 + (j - (Math.min(d.lives, 6) - 1) / 2) * 17, y + 238); icon('head'); ctx.restore(); }
    txt('VITE: ' + d.lives, x + cw / 2, y + 264, 18, '#ffffff', 'center', false);
    if (wins[i]) { ctx.save(); ctx.translate(x + cw / 2 - 52, y + 284); icon('check'); ctx.restore(); txt('COMPLETATO', x + cw / 2 - 40, y + 290, 18, '#51cf66', 'left', false); }
    G.rects.push({ x, y, w: cw, h, i });
  });
  hint('◀ ▶ scegli · INVIO conferma · ESC indietro', 466);
}
function biomeThumb(theme, x, y, w, h, lock) { // miniatura dell'ambiente del livello
  const P = { jungle: ['#5b1a52', '#ffb04a', '#2b0d2c', '#3b2a1c'], desert: ['#4a9bd6', '#f4d79a', '#c98a5c', '#e7b877'], city: ['#03040b', '#2a2350', '#080c1a', '#1f2330'], arctic: ['#0c2244', '#2d5b86', '#4f7aa3', '#eef6fd'], volcano: ['#4a0b07', '#ff6a1c', '#1e0805', '#2e1b16'], core: ['#04010c', '#1a0630', '#2b1e44', '#1a1530'] }[theme] || ['#222', '#444', '#111', '#333'];
  ctx.save(); rr(ctx, x, y, w, h, 6); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h * .65); g.addColorStop(0, P[0]); g.addColorStop(1, P[1]); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = P[2]; ctx.beginPath(); ctx.moveTo(x, y + h * .66); for (let i = 0; i <= 8; i++) ctx.lineTo(x + w * i / 8, y + h * (.38 + ((i * 37 + theme.length * 11) % 23) / 80)); ctx.lineTo(x + w, y + h * .66); ctx.fill();
  ctx.fillStyle = P[3]; ctx.fillRect(x, y + h * .66, w, h * .34);
  if (lock) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y, w, h); }
  ctx.restore(); rr(ctx, x, y, w, h, 6); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
}
function drawSelect() {
  txt('SELEZIONA LIVELLO', W / 2, 58, 34, '#ffffff', 'center', true, FONT_D);
  txt('Difficoltà: ' + G.D.name, W / 2, 84, 20, G.D.col, 'center');
  const un = store.get('unlocked', 0);
  LEVELS.forEach((L, i) => {
    const s = G.sel === i, lock = i > un, x = W / 2 - 280 + (s ? 6 : 0), y = 98 + i * 58, w = 560, h = 50;
    rr(ctx, x, y, w, h, 9); ctx.fillStyle = s ? (lock ? 'rgba(70,74,82,.92)' : 'rgba(200,40,54,.9)') : 'rgba(8,10,16,.74)'; ctx.fill();
    ctx.strokeStyle = s ? '#ffffff' : 'rgba(255,255,255,.18)'; ctx.lineWidth = s ? 2 : 1.2; ctx.stroke();
    biomeThumb(L.theme, x + 6, y + 6, 76, 38, lock);
    txt(L.final ? 'FINALE' : 'LIV ' + (i + 1), x + 96, y + 33, 22, lock ? '#7d838c' : GOLD, 'left');
    if (lock) { ctx.save(); ctx.translate(x + 182, y + 25); icon('lock'); ctx.restore(); txt('BLOCCATO', x + 198, y + 34, 24, '#9aa1ab', 'left'); }
    else { txt(L.name, x + 170, y + 34, 25, '#ffffff', 'left'); txt('Boss: ' + BOSSES[L.boss].name, x + w - 14, y + 33, 17, s ? '#ffe3e6' : '#b8bec8', 'right', false, FONT_U, 500); }
    G.rects.push({ x: x - (s ? 6 : 0), y, w, h, i });
  });
  hint('Completa un livello per sbloccare il successivo · ESC indietro', 466 + 30);
}
function keycap(label, x, y) { // tasto disegnato; restituisce la larghezza
  ctx.font = `600 18px ${FONT_U}`; const arrows = { UP: 0, DN: Math.PI, LT: -Math.PI / 2, RT: Math.PI / 2 };
  const isA = label in arrows, w = isA ? 26 : Math.max(26, ctx.measureText(label).width + 16);
  rr(ctx, x, y - 19, w, 25, 5); ctx.fillStyle = '#e9ecf1'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#b9c0ca'; ctx.fillRect(x + 2, y + 1, w - 4, 3);
  if (isA) { ctx.save(); ctx.translate(x + w / 2, y - 7); ctx.rotate(arrows[label]); ctx.fillStyle = '#1b1f27'; poly(ctx, [0, -7, 6, 3, -6, 3]); ctx.fill(); ctx.restore(); }
  else { ctx.fillStyle = '#1b1f27'; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y - 1); ctx.textAlign = 'left'; }
  return w;
}
function drawControls() {
  txt('COMANDI', W / 2, 64, 36, '#ffffff', 'center', true, FONT_D);
  const rows = [['Muoviti (avanti, indietro, su, giù)', ['UP', 'DN', 'LT', 'RT', '/', 'W', 'A', 'S', 'D']], ['Spara (tieni premuto)', ['J', '/', 'X']], ['Salta (schiva proiettili e onde d\'urto)', ['K', 'Z', 'SPAZIO']], ['Lancia granata', ['L', '/', 'C']], ['Cambia arma', ['Q', 'E', '/', '1 – 9']], ['Spara senza girarti', '#tieni FUOCO mentre arretri'], ['Pausa', ['P', '/', 'ESC']], ['Audio sì/no', ['M']], ['Gamepad', '#supportato'], ['Telefono', '#comandi touch sullo schermo']];
  rows.forEach(([a, b], i) => {
    const y = 112 + i * 33; ctx.fillStyle = i % 2 ? 'rgba(8,10,16,.5)' : 'rgba(8,10,16,.72)'; rr(ctx, W / 2 - 340, y - 23, 680, 31, 6); ctx.fill();
    txt(a, W / 2 - 324, y, 20, '#eef1f5', 'left', false, FONT_U, 500);
    if (typeof b === 'string') txt(b.slice(1), W / 2 + 324, y, 20, GOLD, 'right', false);
    else {
      const keyW = k => { if (['UP', 'DN', 'LT', 'RT'].includes(k)) return 26; ctx.font = `600 18px ${FONT_U}`; return Math.max(26, ctx.measureText(k).width + 16); };
      let tw = 0; for (const k of b) tw += (k === '/' ? 18 : keyW(k)) + 5;
      let x = W / 2 + 329 - tw; for (const k of b) { if (k === '/') { txt('o', x + 11, y - 2, 21, '#c3c9d2', 'center', false, FONT_U, 500); x += 23; continue; } x += keycap(k, x, y - 2) + 5; }
    }
  });
  hint('Raccogli le casse W per nuove armi · la stessa arma due volte la potenzia (fino a ★★★)', 458);
  txt('Premi un tasto per tornare', W / 2, 503, 22, '#ffffff', 'center');
}
function drawIntro() { // presentazione del livello: bande da cinema e nome che si scrive
  const k = G.introT, a = clamp(k > 2.8 ? (3.2 - k) * 2.5 : k < .5 ? k * 2 : 1, 0, 1), age = 3.2 - k, L = G.L;
  ctx.globalAlpha = a * .72; ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = a;
  const bh = 70 * ease.out(a); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
  const lab = L.final ? 'MISSIONE FINALE' : 'LIVELLO ' + (G.level + 1);
  ctx.font = `600 26px ${FONT_U}`; const lw = ctx.measureText(lab).width;
  ctx.fillStyle = '#e63946'; ctx.fillRect(W / 2 - lw / 2 - 90, 193, 70, 2); ctx.fillRect(W / 2 + lw / 2 + 20, 193, 70, 2);
  txt(lab, W / 2, 202, 26, '#e63946', 'center');
  const n = Math.max(0, Math.floor((age - .25) * 28)), name = L.name.slice(0, n);
  txt(name + (n < L.name.length && Math.floor(G.t * 8) % 2 ? '_' : ''), W / 2, 262, 52, '#ffffff', 'center', true, FONT_D);
  ctx.globalAlpha = a * clamp((age - .7) * 3, 0, 1);
  txt(L.intro, W / 2, 306, 22, '#d8dde5', 'center', true, FONT_U, 500);
  txt('DIFFICOLTÀ: ' + G.D.name, W / 2, 342, 20, G.D.col, 'center');
  ctx.globalAlpha = 1;
}
function drawClear() { // resoconto della missione: righe che entrano e numeri che contano
  const a = clamp(G.clearT * 2, 0, 1), T = G.clearT; ctx.globalAlpha = a; ctx.fillStyle = 'rgba(4,6,10,.78)'; ctx.fillRect(0, 0, W, H);
  const st = clamp(T / .35, 0, 1), ss = 1 + (1 - ease.out(st)) * 1.2;
  ctx.save(); ctx.translate(W / 2, 128); ctx.scale(ss, ss); ctx.rotate(-.02); ctx.globalAlpha = a * st;
  txt(G.L.final ? 'OMEGA GEAR DISTRUTTO!' : 'MISSIONE COMPIUTA', 0, 0, 44, '#51cf66', 'center', true, FONT_D); ctx.restore();
  ctx.globalAlpha = a; txt(G.L.name, W / 2, 166, 22, '#ffffff', 'center');
  const s = G.stats, cnt = (v, i) => { const k = clamp((T - .45 - i * .15) / .5, 0, 1); return Math.round(v * ease.out(k)); };
  const tm = Math.floor(s.time / 60) + ':' + String(Math.floor(s.time % 60)).padStart(2, '0');
  const rows = [['Nemici abbattuti', cnt(s.kills, 0)], ['Tempo', tm], ['Danni subiti', cnt(Math.round(s.dmgTaken), 2)], ['Bonus vita', '+' + cnt(G.clearBonus, 3)], ['PUNTEGGIO', cnt(G.score, 4)]];
  ctx.fillStyle = 'rgba(14,18,26,.85)'; rr(ctx, W / 2 - 240, 192, 480, 196, 12); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1.2; ctx.stroke();
  rows.forEach(([l, v], i) => {
    const k = clamp((T - .4 - i * .15) / .25, 0, 1); if (k <= 0) return; const y = 228 + i * 36, last = i === 4;
    ctx.save(); ctx.globalAlpha = a * k; ctx.translate((1 - ease.out(k)) * 40, 0);
    if (last) { ctx.fillStyle = 'rgba(255,212,59,.12)'; ctx.fillRect(W / 2 - 226, y - 25, 452, 34); }
    txt(l, W / 2 - 210, y, last ? 26 : 22, last ? GOLD : '#d8dde5', 'left', false, FONT_U, last ? 600 : 500);
    txt(String(v), W / 2 + 210, y, last ? 28 : 22, last ? GOLD : '#ffffff', 'right', false);
    ctx.restore();
  });
  if (G.clearT > 1.2) { ctx.globalAlpha = a * (.6 + .4 * Math.sin(G.t * 5)); txt(G.L.final ? 'INVIO per il finale' : 'INVIO per il prossimo livello', W / 2, 440, 24, '#ffffff', 'center'); }
  ctx.globalAlpha = 1;
}
function drawOver() {
  ctx.fillStyle = 'rgba(30,0,4,.78)'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = .6; ctx.drawImage(redVignette(), 0, 0, W, H); ctx.globalAlpha = 1;
  const j = Math.sin(G.t * 40) > .93 ? rand(-4, 4) : 0;
  ctx.globalAlpha = .5; txt('MISSIONE FALLITA', W / 2 + 3 + j, 180, 58, '#00e5ff', 'center', false, FONT_D); ctx.globalAlpha = 1;
  txt('MISSIONE FALLITA', W / 2 + j * .3, 178, 58, '#ff3b30', 'center', true, FONT_D);
  txt('Punteggio: ' + G.score, W / 2, 224, 24, '#ffffff', 'center');
  menuItem('RIPROVA IL LIVELLO', W / 2 - 160, 276, 320, 48, 0); menuItem('MENU PRINCIPALE', W / 2 - 160, 338, 320, 48, 1);
}
function drawPause() {
  ctx.fillStyle = 'rgba(4,6,10,.7)'; ctx.fillRect(0, 0, W, H);
  txt('PAUSA', W / 2, 172, 54, '#ffffff', 'center', true, FONT_D);
  menuItem('CONTINUA', W / 2 - 160, 216, 320, 46, 0); menuItem('RICOMINCIA LIVELLO', W / 2 - 160, 274, 320, 46, 1); menuItem('MENU PRINCIPALE', W / 2 - 160, 332, 320, 46, 2);
}
function drawVictory() {
  const d = G.vicBg || (G.vicBg = BG.core.init(mulberry32(9)));
  FX.begin(null, 1.1);
  BG.core.draw(ctx, G.titleCam || 0, G.t, d);
  const vg = ctx.createRadialGradient(W / 2, H * .42, 60, W / 2, H * .42, W * .62); vg.addColorStop(0, 'rgba(4,3,10,.18)'); vg.addColorStop(1, 'rgba(4,3,10,.62)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (Math.random() < .075) G.fx.push({ kind: 'firework', x: Math.random() < .5 ? rand(90, 320) : rand(640, 870), y: rand(70, 290), life: 1, n: randi(22, 32), rot: Math.random() * 6, col: pick(['#ffd43b', '#ff4d5a', '#74c0fc', '#51cf66', '#f783ac', '#c084fc']) });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const f of G.fx) if (f.kind === 'firework') {
    f.life -= 1 / 60; const k = 1 - f.life, r = ease.out(k) * 110, a = clamp(f.life * 1.4, 0, 1), fall = k * k * 46;
    if (k < .12) { const fk = 1 - k / .12; ctx.globalAlpha = fk; ctx.drawImage(flashSprite(f.col), f.x - 46 * fk - 12, f.y - 46 * fk - 12, (46 * fk + 12) * 2, (46 * fk + 12) * 2); }
    const spr = glowSprite(f.col);
    for (let j = 0; j < f.n; j++) {
      const an = f.rot + j / f.n * TAU, c = Math.cos(an), s = Math.sin(an), x = f.x + c * r, y = f.y + s * r + fall, x2 = f.x + c * r * .55, y2 = f.y + s * r * .55 + fall * .7;
      // scia colorata che si assottiglia, testa bianca con alone
      ctx.globalAlpha = a * .55; ctx.strokeStyle = f.col; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(f.x + c * r * .82, f.y + s * r * .82 + fall * .9); ctx.lineTo(x, y); ctx.stroke();
      const tw = k > .55 ? (Math.sin(G.t * 40 + j * 2.3) > 0 ? 1 : .35) : 1;
      ctx.globalAlpha = a * tw; ctx.drawImage(spr, x - 9, y - 9, 18, 18);
    }
    FX.glow(f.x, f.y + fall * .5, 70 + r, f.col, a * (k < .3 ? .9 : .35));
  }
  ctx.restore();
  G.fx = G.fx.filter(f => f.life > 0);
  FX.compose(ctx);
  FX.post(ctx, .6, null);
  logo(132, .8);
  const pop = 1 + Math.max(0, .4 - G.vicT) * 1.5;
  ctx.save(); ctx.translate(W / 2, 222); ctx.scale(pop, pop); txt('VITTORIA!', 0, 0, 58, GOLD, 'center', true, FONT_D); ctx.restore();
  txt('Hai distrutto OMEGA GEAR in modalità ' + G.D.name, W / 2, 264, 24, '#ffffff', 'center', true, FONT_U, 500);
  txt('PUNTEGGIO FINALE  ' + G.score, W / 2, 314, 34, '#ffffff', 'center');
  txt('RECORD  ' + store.get('best', 0), W / 2, 346, 22, GOLD, 'center');
  if (G.diff < 3) txt('Ora prova ' + DIFFS[G.diff + 1].name + '... se ne hai il coraggio.', W / 2, 392, 22, DIFFS[G.diff + 1].col, 'center', true, FONT_U, 500);
  else txt('Leggenda vivente. Nessuno ci era mai riuscito.', W / 2, 392, 22, '#ff2a2a', 'center', true, FONT_U, 500);
  if (G.vicT > 2) { ctx.globalAlpha = .6 + .4 * Math.sin(G.t * 5); txt('INVIO per tornare al menu', W / 2, 470, 22, '#d8dde5', 'center'); ctx.globalAlpha = 1; }
}

// ---------------- loop ----------------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now; if (dt > .05) dt = .05;
  try { update(dt); } catch (err) { console.error(err); G.lastErr = String(err && err.stack || err); }
  try { render(); } catch (err) { console.error(err); G.lastErr = String(err && err.stack || err); try { ctx.restore(); } catch (e) { } }
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.G = G;
