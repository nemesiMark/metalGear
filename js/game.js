// ===== METAL GEAR — motore di gioco, schermate, HUD =====
'use strict';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let SCALE = 1, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); SCALE = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = W * SCALE + 'px'; cv.style.height = H * SCALE + 'px';
  cv.width = Math.round(W * SCALE * DPR); cv.height = Math.round(H * SCALE * DPR);
}
addEventListener('resize', resize); resize();
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
  G.enemies = []; G.bullets = []; G.ebullets = []; G.parts = []; G.fx = []; G.texts = []; G.pickups = []; G.hazards = []; G.lobs = [];
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
  for (let i = 0; i < r / 3; i++) { const a = rand(0, TAU), s = rand(40, r * 3); G.parts.push({ x, y, z: rand(5, 30), vx: Math.cos(a) * s, vy: Math.sin(a) * s * .4, vz: rand(40, 260), life: rand(.3, .7), max: .7, r: rand(5, 14), col: pick(['#fff3b0', '#ffb347', '#ff6b1a', '#ff3b1a']), kind: 'fire' }); }
  for (let i = 0; i < r / 8; i++) puff(x + rand(-r / 3, r / 3), y, rand(10, 40), '#3a3030');
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
    if (e.type !== 'gen') e.x = clamp(e.x, G.camX - 260, G.camX + W + 260);
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
  }
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
function render() {
  ctx.setTransform(SCALE * DPR, 0, 0, SCALE * DPR, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  G.rects = [];
  const st = G.state;
  if (st === 'title' || st === 'diff' || st === 'select' || st === 'controls') { drawMenuBg(); if (st === 'title') drawTitle(); else if (st === 'diff') drawDiff(); else if (st === 'select') drawSelect(); else drawControls(); return; }
  if (st === 'victory') { drawVictory(); return; }
  // mondo
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-G.shake, G.shake) * .6, rand(-G.shake, G.shake) * .6);
  drawWorld();
  ctx.restore();
  drawHUD();
  if (st === 'intro') drawIntro();
  if (st === 'clear') drawClear();
  if (st === 'over') drawOver();
  if (st === 'play' && G.paused) drawPause();
  if (Input.isTouch && st === 'play' && !G.paused) drawTouch();
}
function drawWorld() {
  const cam = G.camX, t = G.t, BGT = BG[G.L.theme];
  BGT.draw(ctx, cam, t, G.bg);
  // pericoli a terra
  for (const h of G.hazards) drawHazardGround(h, cam);
  // ombre
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  const shadow = (x, y, w, z) => { const s = 1 / (1 + (z || 0) / 200); ctx.beginPath(); ctx.ellipse(x - cam, y, w * .5 * s, w * .15 * s, 0, 0, TAU); ctx.fill(); };
  const p = G.player; if (!p.dead) shadow(p.x, p.y, 44, p.z);
  for (const e of G.enemies) shadow(e.x, e.y, e.w * (ETYPES[e.type].scale || 1) * 1.1, e.z);
  if (G.boss) shadow(G.boss.x, G.boss.y, G.boss.w * 1.05, G.boss.z);
  for (const c of G.crates) shadow(c.x, c.y, 50, 0);
  // entità ordinate per profondità
  const list = [];
  for (const c of G.crates) list.push({ y: c.y, f: () => drawCrate(c, cam) });
  for (const k of G.pickups) list.push({ y: k.y, f: () => drawPickup(k, cam) });
  for (const e of G.enemies) list.push({ y: e.y, f: () => drawEnemy(e, cam) });
  for (const f of G.fx) if (f.kind === 'corpse') list.push({ y: f.e.y, f: () => { ctx.globalAlpha = clamp(f.life / .7, 0, 1); drawEnemy(f.e, cam, true); ctx.globalAlpha = 1; } });
  if (G.boss) list.push({ y: G.boss.y + (G.boss.type === 'heli' ? 1000 : 0), f: () => BOSSES[G.boss.type].draw(ctx, G.boss, G.boss.x - cam, G.boss.y) });
  if (!p.dead) list.push({ y: p.y, f: () => drawPlayer(p, cam) });
  list.sort((a, b) => a.y - b.y); for (const it of list) it.f();
  // raggi laser
  if (p.beamOn && !p.dead) drawBeams(p, cam);
  // pericoli in aria (raggi)
  for (const h of G.hazards) drawHazardAir(h, cam);
  // granate
  for (const l of G.lobs) { const k = l.t / l.T, x = lerp(l.x0, l.tx, k), y = lerp(l.y0, l.ty, k), z = 40 + Math.sin(k * Math.PI) * 140 - k * 40; if (l.owner === 'e') { ctx.strokeStyle = `rgba(255,50,50,${.4 + .4 * Math.sin(G.t * 20)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(l.tx - cam, l.ty, l.r * (1 - k * .3), l.r * .35 * (1 - k * .3), 0, 0, TAU); ctx.stroke(); } ctx.fillStyle = '#3d4a2a'; ctx.beginPath(); ctx.arc(x - cam, y - z, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff5050'; ctx.fillRect(x - cam - 1, y - z - 8, 2, 3); }
  // proiettili
  for (const b of G.bullets) drawPBullet(b, cam);
  for (const b of G.ebullets) drawEBullet(b, cam);
  // particelle
  for (const q of G.parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x - cam, y = q.y - q.z;
    if (q.kind === 'smoke') { ctx.fillStyle = q.col; ctx.globalAlpha = a * .5; ctx.beginPath(); ctx.arc(x, y, q.r, 0, TAU); ctx.fill(); }
    else if (q.kind === 'fire') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(x, y, q.r * (.5 + a * .5), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    else if (q.kind === 'flash') { ctx.globalAlpha = 1; glow(ctx, x, y, q.r * 2, 'rgba(255,240,180,.9)'); }
    else { ctx.globalAlpha = a; ctx.fillStyle = q.col; ctx.fillRect(x - q.r / 2, y - q.r / 2, q.r, q.r); }
  }
  ctx.globalAlpha = 1;
  // effetti
  for (const f of G.fx) {
    if (f.kind === 'ring') { ctx.strokeStyle = `rgba(255,220,150,${f.life / .35})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x - cam, f.y, f.r, f.r * .4, 0, 0, TAU); ctx.stroke(); }
    else if (f.kind === 'bolt') { ctx.strokeStyle = f.col; ctx.shadowColor = '#6ff'; ctx.shadowBlur = 14; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < f.pts.length; i++) { const [x, y] = f.pts[i]; if (i === 0) { ctx.moveTo(x - cam, y); continue; } const [px, py] = f.pts[i - 1]; for (let s = 1; s <= 4; s++) { const k = s / 4; ctx.lineTo(lerp(px, x, k) - cam + (s < 4 ? rand(-10, 10) : 0), lerp(py, y, k) + (s < 4 ? rand(-10, 10) : 0)); } } ctx.stroke(); ctx.shadowBlur = 0; }
    else if (f.kind === 'slash') { ctx.strokeStyle = `rgba(220,200,255,${f.life / .2})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x - cam, f.y - 45, 50, f.face > 0 ? -1.2 : Math.PI - .6, f.face > 0 ? .6 : Math.PI + 1.2); ctx.stroke(); }
  }
  // testi
  for (const tx of G.texts) { ctx.globalAlpha = clamp(tx.life * 2, 0, 1); ctx.font = `bold ${tx.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(tx.txt, tx.x - cam + 2, tx.y + 2); ctx.fillStyle = tx.col; ctx.fillText(tx.txt, tx.x - cam, tx.y); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  BGT.front(ctx, cam, t, G.bg);
  // flash del raggio omega
  for (const h of G.hazards) if (h.kind === 'beam' && h.big && h.age > h.warn && h.age < h.warn + .15) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, 0, W, H); }
}
function drawEnemy(e, cam, dead) {
  const T = ETYPES[e.type], x = e.x - cam, y = e.y - (T.flyer || e.type === 'turret' ? 0 : (e.z || 0));
  if (e.para && e.z > 0) { const py = y - 95; ctx.fillStyle = '#d8d0b8'; ctx.beginPath(); ctx.arc(x, py, 34, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#998'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 34, py); ctx.lineTo(x, y - 60); ctx.lineTo(x + 34, py); ctx.stroke(); }
  if (e.elite && !dead) { glow(ctx, x, y - (T.flyer ? e.z : 0) - e.h * .45, e.h * .9, 'rgba(255,30,30,.45)', .7 + .3 * Math.sin(G.t * 6)); }
  T.draw(ctx, e, x, y);
  if (!dead && e.hp < e.maxhp && e.type !== 'gen') { const w = Math.max(30, e.w), yy = y - (T.flyer ? e.z + 25 : e.h + 14); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, yy, w, 4); ctx.fillStyle = e.elite ? '#ff4d4d' : '#ffd43b'; ctx.fillRect(x - w / 2, yy, w * clamp(e.hp / e.maxhp, 0, 1), 4); }
}
function drawPlayer(p, cam) {
  const x = p.x - cam, y = p.y - p.z;
  if (p.inv > 0 && Math.floor(G.t * 20) % 2 === 0 && p.hurtT <= 0) ctx.globalAlpha = .45;
  if (p.dmgT > 0) glow(ctx, x, y - 40, 60, 'rgba(255,80,40,.45)');
  if (p.speedT > 0 && p.moving) { ctx.globalAlpha = .25; drawSoldier(ctx, x - p.face * 14, y, { face: p.face, anim: p.anim - .5, walk: true, t: G.t, vest: '#ffd43b', pants: '#ffd43b', skin: '#ffd43b', gun: p.weapon }); ctx.globalAlpha = p.inv > 0 && Math.floor(G.t * 20) % 2 === 0 ? .45 : 1; }
  drawSoldier(ctx, x, y, { face: p.face, anim: p.anim, walk: p.moving && p.z <= 0, t: G.t, vest: '#3b5b4a', pants: '#2a3d33', bandana: '#e63946', skin: '#f1c27d', gun: p.weapon, flash: p.hurtT > 0 ? 1 : 0, recoil: p.shootT > 0 ? -1.5 : 0, s: 1.05 });
  ctx.globalAlpha = 1;
  if (p.shield > 0) { ctx.strokeStyle = `rgba(116,192,252,${.5 + .3 * Math.sin(G.t * 8)})`; ctx.fillStyle = 'rgba(116,192,252,.12)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y - 40, 34, 48, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  if (p.slowT > 0) { ctx.fillStyle = 'rgba(160,230,255,.35)'; ctx.fillRect(x - 16, y - 30, 32, 30); }
}
function drawBeams(p, cam) {
  const w = WEAPONS[p.weapon], g = gunPos(p), x0 = g.x - cam, wob = Math.sin(G.t * 60) * 2;
  ctx.globalCompositeOperation = 'lighter';
  for (const off of w.beam) {
    const y0 = g.y + off - g.z, x1 = x0 + p.face * 820;
    const yA = g.y - g.z;
    ctx.strokeStyle = w.col; ctx.globalAlpha = .25; ctx.lineWidth = 18 + wob; ctx.beginPath(); ctx.moveTo(x0, yA); ctx.lineTo(x0 + p.face * 40, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.globalAlpha = .8; ctx.lineWidth = 6 + wob * .5; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  glow(ctx, x0, g.y - g.z, 22, 'rgba(255,255,255,.9)');
}
function drawPBullet(b, cam) {
  const x = b.x - cam, y = b.y - b.z;
  if (b.kind === 'flame') { const a = clamp(b.life / .44, 0, 1); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = a > .6 ? 'rgba(255,240,150,.7)' : a > .3 ? 'rgba(255,130,30,.6)' : 'rgba(150,40,20,.4)'; ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; return; }
  if (b.kind === 'rocket') { ctx.save(); ctx.translate(x, y); ctx.scale(b.face, 1); ctx.fillStyle = '#556b2f'; ctx.fillRect(-12, -3.5, 18, 7); ctx.fillStyle = '#ff6b1a'; ctx.beginPath(); ctx.moveTo(6, -3.5); ctx.lineTo(13, 0); ctx.lineTo(6, 3.5); ctx.fill(); ctx.restore(); glow(ctx, x - b.face * 14, y, 14, 'rgba(255,180,60,.9)'); return; }
  if (b.kind === 'plasma') { glow(ctx, x, y, 16, 'rgba(130,150,255,.9)'); ctx.fillStyle = '#e8ebff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); return; }
  ctx.strokeStyle = b.col; ctx.lineWidth = b.r * .9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * .022, y - b.vy * .022); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, b.r * .55, 0, TAU); ctx.fill();
}
function drawEBullet(b, cam) {
  const x = b.x - cam, y = b.y - b.z;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, b.y, b.r, b.r * .35, 0, 0, TAU); ctx.fill();
  if (b.kind === 'missile') { const a = Math.atan2(b.vy, b.vx); ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#ccc'; ctx.fillRect(-10, -3, 16, 6); ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(12, 0); ctx.lineTo(6, 3); ctx.fill(); ctx.restore(); glow(ctx, x - Math.cos(a) * 12, y - Math.sin(a) * 12, 10, 'rgba(255,150,50,.9)'); return; }
  if (b.trail) { ctx.strokeStyle = 'rgba(255,60,60,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * .06, y - b.vy * .06); ctx.stroke(); }
  if (b.kind === 'star') { ctx.save(); ctx.translate(x, y); ctx.rotate(G.t * 20); ctx.fillStyle = b.col; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3, -8); ctx.lineTo(-3, -8); ctx.fill(); } ctx.restore(); return; }
  glow(ctx, x, y, b.r * 2.6, b.col, .8);
  ctx.fillStyle = b.kind === 'shell' ? '#3a3a3a' : '#fff'; ctx.beginPath(); ctx.arc(x, y, b.r * .65, 0, TAU); ctx.fill();
}
function drawCrate(c, cam) {
  const x = c.x - cam, y = c.y, wpn = c.drop.startsWith('w:'), fl = c.flash > 0;
  if (wpn) glow(ctx, x, y - 22, 55, `rgba(255,220,80,${.35 + .2 * Math.sin(G.t * 4)})`);
  ctx.fillStyle = fl ? '#fff' : wpn ? '#5f6b78' : '#8b5a2b'; ctx.fillRect(x - 22, y - 44, 44, 44);
  ctx.strokeStyle = fl ? '#fff' : wpn ? '#ffd43b' : '#5c3a1a'; ctx.lineWidth = 3; ctx.strokeRect(x - 20, y - 42, 40, 40);
  if (!wpn) { ctx.beginPath(); ctx.moveTo(x - 20, y - 42); ctx.lineTo(x + 20, y - 2); ctx.moveTo(x + 20, y - 42); ctx.lineTo(x - 20, y - 2); ctx.stroke(); }
  else { ctx.fillStyle = '#ffd43b'; ctx.font = `bold 20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('W', x, y - 14); ctx.textAlign = 'left'; }
}
function drawPickup(k, cam) {
  const x = k.x - cam, y = k.y - 22 - Math.sin(k.t * 4) * 5;
  if (k.life < 3 && Math.floor(k.t * 10) % 2) return;
  if (k.kind.startsWith('w:')) {
    const w = WEAPONS[k.kind.slice(2)];
    glow(ctx, x, y, 45, w.col === '#ffffff' ? 'rgba(255,255,255,.8)' : w.col + 'cc');
    ctx.save(); ctx.translate(x - 16, y); drawGun(ctx, k.kind.slice(2)); ctx.restore();
    ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(w.name, x + 1, y - 21); ctx.fillStyle = '#fff'; ctx.fillText(w.name, x, y - 22); ctx.textAlign = 'left'; return;
  }
  const [s, col] = PICK_INFO[k.kind];
  glow(ctx, x, y, 34, col + 'aa');
  ctx.fillStyle = '#111'; roundRect(ctx, x - 15, y - 15, 30, 30, 7); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = col; ctx.font = `bold ${s.length > 2 ? 10 : 15}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(s, x, y + 5); ctx.textAlign = 'left';
}
function drawHazardGround(h, cam) {
  if (h.kind === 'mark') { const k = 1 - h.t / h.max; ctx.strokeStyle = `rgba(255,60,40,${.5 + .5 * Math.sin(G.t * 25)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(h.x - cam, h.y, h.r, h.r * .38, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,40,30,.18)'; ctx.beginPath(); ctx.ellipse(h.x - cam, h.y, h.r * k, h.r * .38 * k, 0, 0, TAU); ctx.fill();
    if (h.drop && k > .55) { const fz = (1 - k) * 600; const x = h.x - cam, y = h.y - fz; if (h.meteor) { glow(ctx, x, y, 34, 'rgba(255,120,20,.95)'); ctx.fillStyle = '#3a1a0a'; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill(); } else if (h.ice) { ctx.fillStyle = '#d7f5ff'; ctx.beginPath(); ctx.moveTo(x - 12, y - 40); ctx.lineTo(x + 12, y - 40); ctx.lineTo(x, y); ctx.fill(); } else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(x, y, 6, 11, 0, 0, TAU); ctx.fill(); } } }
  else if (h.kind === 'acid') { const a = Math.min(1, h.life); ctx.fillStyle = `rgba(140,255,60,${.35 * a})`; ctx.beginPath(); ctx.ellipse(h.x - cam, h.y, h.r, h.r * .4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(200,255,120,${.5 * a})`; ctx.beginPath(); ctx.arc(h.x - cam + Math.sin(G.t * 5 + h.x) * 10, h.y - 2, 3, 0, TAU); ctx.fill(); }
  else if (h.kind === 'ring') { ctx.strokeStyle = 'rgba(255,240,200,.9)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(h.x - cam, h.y, h.r, h.r / 2.4, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(255,140,60,.6)'; ctx.lineWidth = 16; ctx.stroke(); }
  else if (h.kind === 'wave') { const x = h.x - cam; const g = ctx.createLinearGradient(x - 30, 0, x + 50, 0); g.addColorStop(0, 'rgba(255,90,0,0)'); g.addColorStop(.4, 'rgba(255,120,0,.9)'); g.addColorStop(1, 'rgba(255,220,80,.2)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 30, GB + 10); for (let yy = GB + 10; yy >= GT - 10; yy -= 12) ctx.lineTo(x + Math.sin(yy * .08 + G.t * 12) * 8, yy - 22 - Math.sin(yy * .05 + G.t * 6) * 6); ctx.lineTo(x + 50, GT - 10); ctx.lineTo(x + 50, GB + 10); ctx.fill(); }
}
function drawHazardAir(h, cam) {
  if (h.kind !== 'beam') return;
  const x0 = Math.max(0, h.x0 - cam), x1 = Math.min(W, h.x1 - cam), y = h.y;
  if (h.age < h.warn) {
    const k = h.age / h.warn; ctx.fillStyle = h.col; ctx.globalAlpha = .1 + .15 * k; ctx.fillRect(x0, y - h.w / 2, x1 - x0, h.w); ctx.globalAlpha = .5 + .5 * Math.sin(G.t * 30); ctx.fillRect(x0, y - 1, x1 - x0, 2); ctx.globalAlpha = .8; ctx.fillRect(x0, y - h.w / 2, x1 - x0, 2); ctx.fillRect(x0, y + h.w / 2 - 2, x1 - x0, 2); ctx.globalAlpha = 1;
  } else {
    const k = (h.age - h.warn) / h.active, th = h.w * (1 - Math.pow(k, 3) * .8) * (.9 + .1 * Math.sin(G.t * 50));
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = h.col; ctx.globalAlpha = .55; ctx.fillRect(x0, y - th / 2 - 30, x1 - x0, th);
    ctx.globalAlpha = .9; ctx.fillStyle = '#fff'; ctx.fillRect(x0, y - th / 4 - 30, x1 - x0, th / 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = h.col; ctx.globalAlpha = .3; ctx.fillRect(x0, y - h.w / 2, x1 - x0, h.w); ctx.globalAlpha = 1;
  }
}

// ---------------- HUD ----------------
function txt(s, x, y, size, col, align = 'left', shadow = true, font = FONT) { ctx.font = `bold ${size}px ${font}`; ctx.textAlign = align; if (shadow) { ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(s, x + 2, y + 2); } ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }
function bar(x, y, w, h, k, col, bg = 'rgba(0,0,0,.6)') { ctx.fillStyle = bg; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#222'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, w * clamp(k, 0, 1), h * .4); }
function drawHUD() {
  const p = G.player; if (!p) return;
  const g = ctx.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 70);
  // vita
  const k = p.hp / p.maxhp; bar(16, 14, 220, 14, k, k > .5 ? '#51cf66' : k > .25 ? '#fcc419' : '#ff4040');
  if (p.shield > 0) { ctx.fillStyle = 'rgba(116,192,252,.85)'; ctx.fillRect(16, 24, 220 * p.shield / 70, 4); }
  txt('VITA', 20, 26, 10, '#fff', 'left', false);
  for (let i = 0; i < Math.min(G.lives, 8); i++) { ctx.fillStyle = '#e63946'; ctx.fillRect(16 + i * 20, 36, 14, 5); ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(23 + i * 20, 44, 6, 0, TAU); ctx.fill(); }
  if (G.lives > 8) txt('x' + G.lives, 180, 50, 12, '#fff');
  txt('GRANATE ' + p.grenades, 16, 66, 11, '#adb5bd');
  // effetti attivi
  let ex = 250; const eff = (label, t, max, col) => { if (t > 0) { bar(ex, 40, 60, 5, t / max, col); txt(label, ex, 36, 9, col, 'left', true); ex += 70; } };
  eff('SCUDO', p.shieldT, 15, '#74c0fc'); eff('VELOCE', p.speedT, 10, '#ffd43b'); eff('DANNO x2', p.dmgT, 10, '#ff6b6b'); eff('GELO', p.slowT, 2.5, '#99e9f2');
  // arma
  const w = WEAPONS[p.weapon], cx = W / 2;
  txt(w.name, cx, 24, 18, w.col === '#ffffff' ? '#fff' : w.col, 'center');
  const pw = p.power[p.weapon] || 1; txt('★'.repeat(pw) + '☆'.repeat(3 - pw), cx, 40, 12, '#ffd43b', 'center', true, 'Arial');
  const n = p.owned.length, sw = 16; for (let i = 0; i < n; i++) { const id = p.owned[i], xx = cx - n * sw / 2 + i * sw; ctx.fillStyle = id === p.weapon ? WEAPONS[id].col : 'rgba(255,255,255,.18)'; ctx.fillRect(xx + 2, 48, sw - 4, 6); }
  // punti
  txt(String(G.score).padStart(7, '0'), W - 16, 28, 22, '#fff', 'right');
  txt('LIV ' + (G.level + 1) + ' · ' + G.D.name, W - 16, 46, 11, G.D.col, 'right');
  if (G.combo >= 5) txt('COMBO ' + G.combo + '  x' + (1 + Math.min(4, Math.floor(G.combo / 5))), W - 16, 64, 13, '#ff922b', 'right');
  // avanzamento livello
  const px = 300, pwd = 360, py = 62; ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(px, py, pwd, 3);
  ctx.fillStyle = '#e63946'; ctx.fillRect(px + pwd * clamp(p.x / G.levelLen, 0, 1) - 3, py - 3, 6, 9);
  ctx.fillStyle = '#ff3b30'; ctx.font = `bold 11px ${FONT}`; ctx.fillText('☠', px + pwd + 4, py + 6);
  // AVANTI
  if (!G.lock && G.goT > 0 && Math.floor(G.t * 3) % 2 === 0) { txt('AVANTI ▶', W - 30, 250, 34, '#ffd43b', 'right'); }
  // boss
  const b = G.boss;
  if (b && !b.entering) {
    const bw = 600, bx = (W - bw) / 2, by = H - 34;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 10, by - 26, bw + 20, 46);
    txt(b.name, bx, by - 8, 15, '#ff6b6b'); if (b.shield) txt('SCUDO ATTIVO — DISTRUGGI I GENERATORI', bx + bw, by - 8, 11, '#7df9ff', 'right');
    else txt(b.sub, bx + bw, by - 8, 11, '#ccc', 'right');
    bar(bx, by, bw, 12, b.hp / b.maxhp, b.shield ? '#7df9ff' : b.type === 'omega' && b.phase >= 3 ? '#ff1a1a' : '#ff4d6d');
    if (b.type === 'omega') { ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw * .66, by - 2, 2, 16); ctx.fillRect(bx + bw * .33, by - 2, 2, 16); }
  }
  // banner
  if (G.banner) {
    const bn = G.banner, a = clamp(bn.t * 2, 0, 1), s = 1 + Math.max(0, bn.t - 2.1) * 2;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 150, W, bn.sub ? 76 : 56);
    ctx.save(); ctx.translate(W / 2, 192); ctx.scale(s, s); txt(bn.txt, 0, 0, 30, bn.col, 'center'); ctx.restore();
    if (bn.sub) txt(bn.sub, W / 2, 216, 14, '#fff', 'center', true, 'Arial');
    ctx.globalAlpha = 1;
  }
  if (G.bossStage === 1 && Math.floor(G.t * 4) % 2 === 0) { ctx.fillStyle = 'rgba(255,0,0,.12)'; ctx.fillRect(0, 0, W, H); }
  if (p.hp / p.maxhp < .25 && !p.dead) { ctx.fillStyle = `rgba(255,0,0,${.08 + .06 * Math.sin(G.t * 8)})`; ctx.fillRect(0, 0, W, H); }
  if (p.dead && G.lives >= 0) txt('VITE RIMASTE: ' + G.lives, W / 2, H / 2, 24, '#fff', 'center');
}
function drawTouch() {
  ctx.globalAlpha = .4;
  for (const b of TOUCH_BTNS) { ctx.fillStyle = Input.touch[b.id] ? '#fff' : '#000'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.globalAlpha = .8; for (const b of TOUCH_BTNS) txt(b.label, b.x, b.y + 4, b.r > 30 ? 12 : 9, '#fff', 'center', false);
  const s = Input.stick; ctx.globalAlpha = .3; ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff';
  const ox = s ? s.ox : 120, oy = s ? s.oy : 440; ctx.beginPath(); ctx.arc(ox, oy, 60, 0, TAU); ctx.fill(); ctx.stroke();
  if (s) { const dx = clamp(s.x - s.ox, -50, 50), dy = clamp(s.y - s.oy, -50, 50); ctx.globalAlpha = .6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox + dx, oy + dy, 26, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
}

// ---------------- schermate ----------------
function drawMenuBg() {
  BG.jungle.draw(ctx, G.titleCam || 0, G.t, G.menuBg || (G.menuBg = BG.jungle.init(mulberry32(5))));
  BG.jungle.front(ctx, G.titleCam || 0, G.t, G.menuBg);
  // soldato che corre
  drawSoldier(ctx, 260, 470, { face: 1, anim: G.t * 13, walk: true, t: G.t, vest: '#3b5b4a', pants: '#2a3d33', bandana: '#e63946', skin: '#f1c27d', gun: 'mitra', s: 1.6 });
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,.75)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function logo(y, s = 1) {
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(s, s);
  ctx.font = `900 92px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText('METAL GEAR', 5, 7);
  const g = ctx.createLinearGradient(0, -80, 0, 10); g.addColorStop(0, '#ffffff'); g.addColorStop(.45, '#9aa4b0'); g.addColorStop(.5, '#4a525c'); g.addColorStop(1, '#c9d1da');
  ctx.fillStyle = g; ctx.fillText('METAL GEAR', 0, 0);
  ctx.lineWidth = 2; ctx.strokeStyle = '#e63946'; ctx.strokeText('METAL GEAR', 0, 0);
  const sh = (G.t * 300) % 1400 - 700; ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(sh, -90); ctx.lineTo(sh + 40, -90); ctx.lineTo(sh - 10, 20); ctx.lineTo(sh - 50, 20); ctx.fill(); ctx.restore();
  ctx.font = `bold 18px ${FONT}`; ctx.fillStyle = '#e63946'; ctx.fillText('— OPERAZIONE OMEGA —', 0, 34);
  ctx.restore(); ctx.textAlign = 'left';
}
function menuItem(label, x, y, w, h, i, sub) {
  const s = G.sel === i;
  ctx.fillStyle = s ? 'rgba(230,57,70,.9)' : 'rgba(0,0,0,.55)'; roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = s ? '#fff' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  txt(label, x + w / 2, y + h / 2 + 7, 20, '#fff', 'center', false);
  G.rects.push({ x, y, w, h, i });
}
function drawTitle() {
  logo(150);
  const items = ['GIOCA', 'SELEZIONA LIVELLO', 'COMANDI', 'AUDIO: ' + (Snd.muted ? 'NO' : 'SÌ')];
  items.forEach((s, i) => menuItem(s, W / 2 - 150, 220 + i * 58, 300, 46, i));
  txt('RECORD ' + String(store.get('best', 0)).padStart(7, '0'), W / 2, 470, 14, '#ffd43b', 'center');
  txt('Frecce/WASD muovi · J spara · K salta · L granata · Q/E arma · INVIO conferma', W / 2, 510, 13, '#ddd', 'center', true, 'Arial');
}
function drawDiff() {
  txt('SCEGLI LA DIFFICOLTÀ', W / 2, 70, 30, '#fff', 'center');
  const cw = 200, gap = 18, x0 = (W - (cw * 4 + gap * 3)) / 2; const wins = store.get('wins', {});
  DIFFS.forEach((d, i) => {
    const s = G.sel === i, x = x0 + i * (cw + gap), y = s ? 120 : 132, h = 290;
    ctx.fillStyle = s ? 'rgba(20,20,20,.92)' : 'rgba(0,0,0,.6)'; roundRect(ctx, x, y, cw, h, 12); ctx.fill();
    ctx.strokeStyle = s ? d.col : 'rgba(255,255,255,.2)'; ctx.lineWidth = s ? 4 : 2; ctx.stroke();
    if (s) { ctx.shadowColor = d.col; ctx.shadowBlur = 25; ctx.stroke(); ctx.shadowBlur = 0; }
    txt('☠'.repeat(i + 1), x + cw / 2, y + 50, 26, d.col, 'center', true, 'Arial');
    txt(d.name, x + cw / 2, y + 95, 19, d.col, 'center');
    d.desc.forEach((l, j) => txt(l, x + cw / 2, y + 140 + j * 26, 13, '#ddd', 'center', false, 'Arial'));
    txt('Vite: ' + d.lives, x + cw / 2, y + 240, 13, '#fff', 'center', false, 'Arial');
    if (wins[i]) txt('✔ COMPLETATO', x + cw / 2, y + 268, 12, '#51cf66', 'center', false);
    G.rects.push({ x, y, w: cw, h, i });
  });
  txt('◀ ▶ scegli · INVIO conferma · ESC indietro', W / 2, 470, 14, '#ccc', 'center', true, 'Arial');
}
function drawSelect() {
  txt('SELEZIONA LIVELLO', W / 2, 60, 30, '#fff', 'center');
  txt('Difficoltà: ' + G.D.name, W / 2, 86, 14, G.D.col, 'center');
  const un = store.get('unlocked', 0);
  LEVELS.forEach((L, i) => {
    const s = G.sel === i, lock = i > un, x = W / 2 - 260, y = 104 + i * 58, w = 520, h = 48;
    ctx.fillStyle = s ? (lock ? 'rgba(80,80,80,.9)' : 'rgba(230,57,70,.9)') : 'rgba(0,0,0,.6)'; roundRect(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = s ? '#fff' : 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.stroke();
    txt((L.final ? 'FINALE' : 'LIV ' + (i + 1)), x + 16, y + 30, 15, lock ? '#777' : '#ffd43b');
    txt(lock ? '🔒 BLOCCATO' : L.name, x + 110, y + 30, 18, lock ? '#888' : '#fff');
    if (!lock) txt('Boss: ' + BOSSES[L.boss].name, x + w - 14, y + 30, 11, '#ccc', 'right', false, 'Arial');
    G.rects.push({ x, y, w, h, i });
  });
  txt('Completa un livello per sbloccare il successivo · ESC indietro', W / 2, 466, 13, '#ccc', 'center', true, 'Arial');
}
function drawControls() {
  txt('COMANDI', W / 2, 70, 32, '#fff', 'center');
  const rows = [['Muoviti (avanti, indietro, su, giù)', 'Frecce o W A S D'], ['Spara (tieni premuto)', 'J  oppure  X'], ['Salta (schiva proiettili e onde d\'urto)', 'K, Z o SPAZIO'], ['Lancia granata', 'L  oppure  C'], ['Cambia arma', 'Q / E  oppure  1-9'], ['Spara senza girarti', 'tieni FUOCO mentre arretri'], ['Pausa', 'P  oppure  ESC'], ['Audio sì/no', 'M'], ['Gamepad', 'supportato'], ['Telefono', 'comandi touch sullo schermo']];
  rows.forEach(([a, b], i) => { const y = 120 + i * 32; ctx.fillStyle = i % 2 ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 330, y - 21, 660, 30); txt(a, W / 2 - 316, y, 15, '#fff', 'left', false, 'Arial'); txt(b, W / 2 + 316, y, 15, '#ffd43b', 'right', false); });
  txt('Raccogli le casse W per nuove armi · la stessa arma due volte la potenzia (fino a ★★★)', W / 2, 460, 13, '#ccc', 'center', true, 'Arial');
  txt('Premi un tasto per tornare', W / 2, 495, 14, '#fff', 'center');
}
function drawIntro() {
  const k = G.introT, a = clamp(k > 2.8 ? (3.2 - k) * 2.5 : k < .5 ? k * 2 : 1, 0, 1);
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, W, H);
  const L = G.L; txt(L.final ? 'MISSIONE FINALE' : 'LIVELLO ' + (G.level + 1), W / 2, 200, 22, '#e63946', 'center');
  txt(L.name, W / 2, 255, 46, '#fff', 'center'); txt(L.intro, W / 2, 300, 16, '#ddd', 'center', true, 'Arial');
  txt('Difficoltà: ' + G.D.name, W / 2, 340, 14, G.D.col, 'center');
  ctx.globalAlpha = 1;
  const bh = 60 * a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
}
function drawClear() {
  const a = clamp(G.clearT * 2, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(0, 0, W, H);
  txt(G.L.final ? 'OMEGA GEAR DISTRUTTO!' : 'MISSIONE COMPIUTA', W / 2, 130, 40, '#51cf66', 'center');
  txt(G.L.name, W / 2, 165, 16, '#fff', 'center');
  const s = G.stats, acc = s.shots ? Math.min(100, Math.round(s.hits / s.shots * 100)) : 0;
  const rows = [['Nemici abbattuti', s.kills], ['Tempo', Math.floor(s.time / 60) + ':' + String(Math.floor(s.time % 60)).padStart(2, '0')], ['Danni subiti', Math.round(s.dmgTaken)], ['Bonus vita', '+' + G.clearBonus], ['PUNTEGGIO', G.score]];
  rows.forEach(([l, v], i) => { const y = 220 + i * 36; txt(l, W / 2 - 200, y, 18, i === 4 ? '#ffd43b' : '#ddd'); txt(String(v), W / 2 + 200, y, 18, i === 4 ? '#ffd43b' : '#fff', 'right'); });
  if (G.clearT > 1.2 && Math.floor(G.t * 2) % 2 === 0) txt(G.L.final ? 'INVIO per il finale' : 'INVIO per il prossimo livello', W / 2, 440, 18, '#fff', 'center');
  ctx.globalAlpha = 1;
}
function drawOver() {
  ctx.fillStyle = 'rgba(40,0,0,.75)'; ctx.fillRect(0, 0, W, H);
  txt('MISSIONE FALLITA', W / 2, 180, 50, '#ff3b30', 'center');
  txt('Punteggio: ' + G.score, W / 2, 225, 18, '#fff', 'center');
  menuItem('RIPROVA IL LIVELLO', W / 2 - 160, 280, 320, 48, 0); menuItem('MENU PRINCIPALE', W / 2 - 160, 342, 320, 48, 1);
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, H);
  txt('PAUSA', W / 2, 170, 46, '#fff', 'center');
  menuItem('CONTINUA', W / 2 - 160, 220, 320, 46, 0); menuItem('RICOMINCIA LIVELLO', W / 2 - 160, 278, 320, 46, 1); menuItem('MENU PRINCIPALE', W / 2 - 160, 336, 320, 46, 2);
}
function drawVictory() {
  BG.core.draw(ctx, G.titleCam || 0, G.t, G.vicBg || (G.vicBg = BG.core.init(mulberry32(9))));
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) if (Math.random() < .08) G.fx.push({ kind: 'firework', x: rand(100, W - 100), y: rand(60, 250), life: 1, col: pick(['#ffd43b', '#e63946', '#74c0fc', '#51cf66', '#f783ac']) });
  for (const f of G.fx) if (f.kind === 'firework') { f.life -= 1 / 60; const r = (1 - f.life) * 80; ctx.fillStyle = f.col; ctx.globalAlpha = f.life; for (let j = 0; j < 16; j++) { const a = j / 16 * TAU; ctx.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r + (1 - f.life) * 20, 3, 3); } }
  G.fx = G.fx.filter(f => f.life > 0); ctx.globalAlpha = 1;
  logo(130, .8);
  txt('VITTORIA!', W / 2, 220, 48, '#ffd43b', 'center');
  txt('Hai distrutto OMEGA GEAR in modalità ' + G.D.name, W / 2, 262, 18, '#fff', 'center', true, 'Arial');
  txt('PUNTEGGIO FINALE  ' + G.score, W / 2, 310, 26, '#fff', 'center');
  txt('RECORD  ' + store.get('best', 0), W / 2, 342, 16, '#ffd43b', 'center');
  if (G.diff < 3) txt('Ora prova ' + DIFFS[G.diff + 1].name + '... se ne hai il coraggio.', W / 2, 390, 15, DIFFS[G.diff + 1].col, 'center', true, 'Arial');
  else txt('Leggenda vivente. Nessuno ci era mai riuscito.', W / 2, 390, 15, '#ff2a2a', 'center', true, 'Arial');
  if (G.vicT > 2) txt('INVIO per tornare al menu', W / 2, 470, 15, '#ccc', 'center');
}

// ---------------- loop ----------------
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now; if (dt > .05) dt = .05;
  try { update(dt); render(); } catch (err) { console.error(err); }
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.G = G;
