// ===== Armi del giocatore =====
'use strict';
// p = giocatore. shootP crea un proiettile partendo dalla canna.
function gunPos(p) { return { x: p.x + p.face * 36, y: p.y, z: p.z + 42 }; }
function powMul(p) { return (1 + 0.3 * ((p.power[p.weapon] || 1) - 1)) * (p.dmgT > 0 ? 2 : 1); }
function shootP(p, o) {
  const g = gunPos(p), m = powMul(p);
  G.bullets.push({
    x: g.x, y: g.y + (o.dy || 0), z: g.z, vx: p.face * o.spd, vy: o.vy || 0, dmg: o.dmg * m, r: o.r || 3, col: o.col || '#ff0', life: o.life || 1.3,
    kind: o.kind || 'bullet', pierce: !!o.pierce, hits: o.pierce ? new Set() : null, explode: o.explode || 0, edmg: (o.edmg || 0) * m,
    homing: o.homing || 0, acc: o.acc || 0, t: 0, face: p.face
  });
  G.stats.shots++;
  // solo grafica: lampo della canna (uno per fotogramma), bossolo espulso, fiammata posteriore dei razzi
  if (o.kind !== 'flame' && G._mf !== G.frame) {
    G._mf = G.frame; const k = o.kind || 'bullet';
    G.parts.push({ x: g.x + p.face * 7, y: g.y, z: g.z, vx: 0, vy: 0, vz: 0, life: .06, max: .06, r: (o.r || 3) * 3 + 9, col: k === 'plasma' ? '#9aa8ff' : k === 'rocket' ? '#ffb060' : '#ffd88a', kind: 'flash', face: p.face, rot: rand(-.25, .25) });
    if (k === 'bullet') G.parts.push({ x: p.x + p.face * 12, y: p.y + 1, z: g.z + 4, vx: -p.face * rand(40, 90), vy: rand(-12, 12), vz: rand(170, 250), life: rand(.9, 1.4), max: 1.4, r: 2, col: '#d9a53a', kind: 'shell', rot: rand(0, 3), vr: rand(15, 25) * -p.face });
    if (k === 'rocket') for (let i = 0; i < 3; i++) G.parts.push({ x: p.x - p.face * 22, y: p.y, z: g.z + 2, vx: -p.face * rand(60, 140), vy: rand(-15, 15), vz: rand(-10, 30), life: rand(.5, .8), max: .8, r: rand(6, 10), col: '#8a8580', kind: 'smoke' });
  }
}
function tesla(p, dmg, jumps, dyOff) {
  const g = gunPos(p), m = powMul(p);
  const tg = liveTargets();
  let best = null, bd = 1e9;
  for (const t of tg) { const dx = (t.x - g.x) * p.face; if (dx < -20 || dx > 520) continue; const dd = dx + Math.abs(t.y - g.y) * 2; if (dd < bd) { bd = dd; best = t; } }
  const pts = [[g.x, g.y - g.z]];
  if (!best) { // scarica a vuoto
    pts.push([g.x + p.face * 220, g.y - g.z + rand(-30, 30)]); G.fx.push({ kind: 'bolt', pts, life: .12, col: '#bff' }); return;
  }
  const hit = new Set(); let cur = best;
  for (let i = 0; i < jumps && cur; i++) {
    hit.add(cur); pts.push([cur.x, cur.y - (cur.z || 0) - (cur.h || 50) * .5]);
    hitTarget(cur, dmg * m, { kind: 'tesla', x: cur.x, y: cur.y, vx: p.face });
    let nx = null, nd = 1e9; for (const t of tg) { if (hit.has(t) || t.hp <= 0) continue; const d = Math.hypot(t.x - cur.x, (t.y - cur.y) * 1.5); if (d < 230 && d < nd) { nd = d; nx = t; } }
    cur = nx;
  }
  G.fx.push({ kind: 'bolt', pts, life: .14, col: '#cff' });
}
const WEAPONS = {
  pistol: { name: 'PISTOLA', col: '#ffe066', rate: 4.5, fire(p) { shootP(p, { spd: 780, dmg: 12, r: 4, col: '#ffe066' }); Snd.play('pistol'); } },
  fucile: { name: 'FUCILE A POMPA', col: '#ffa94d', rate: 1.7, fire(p) { for (let i = 0; i < 7; i++) shootP(p, { spd: rand(620, 780), dmg: 10, r: 3.5, col: '#ffbb77', vy: (i - 3) * 55 + rand(-25, 25), life: .4 }); Snd.play('shotgun'); G.shake = Math.max(G.shake, 4); } },
  mitra: { name: 'MITRA', col: '#ffd43b', rate: 13, fire(p) { shootP(p, { spd: 860, dmg: 7, r: 3, col: '#fff3a0', vy: rand(-45, 45) }); Snd.play('smg'); } },
  fiamme: { name: 'LANCIAFIAMME', col: '#ff6b1a', rate: 30, fire(p) { shootP(p, { spd: rand(380, 500), dmg: 5.5, r: rand(9, 13), col: '#ff8a2a', vy: rand(-80, 80), life: .44, pierce: true, kind: 'flame' }); Snd.play('flame'); } },
  laser: { name: 'LASER', col: '#ff2a6d', beam: [0], dps: 115 },
  razzi: { name: 'LANCIARAZZI', col: '#ff922b', rate: 1.7, fire(p) { shootP(p, { spd: 300, dmg: 30, r: 6, col: '#ffcf7a', explode: 90, edmg: 42, kind: 'rocket', acc: 900, life: 1.6 }); Snd.play('rocket'); } },
  devast: { name: 'DEVASTATORE', sub: 'mitra + razzi', col: '#ffb000', rate: 13, fire(p) { WEAPONS.mitra.fire(p); p.alt -= 1 / 13; if (p.alt <= 0) { p.alt = .55; WEAPONS.razzi.fire(p); } } },
  plasma: { name: 'SCIAME AL PLASMA', col: '#7d8bff', rate: 6, fire(p) { shootP(p, { spd: 460, dmg: 15, r: 6, col: '#a0abff', homing: 7, vy: rand(-220, 220), life: 1.7, kind: 'plasma' }); Snd.play('plasma'); } },
  fulmine: { name: 'FULMINE A CATENA', col: '#9be8ff', rate: 3.3, fire(p) { tesla(p, 30, 5); Snd.play('tesla'); } },
  prisma: { name: 'PRISMA', sub: 'laser triplo', col: '#e64dff', beam: [-48, 0, 48], dps: 100 },
  tempesta: { name: 'TEMPESTA', sub: 'fucile + fulmine', col: '#74c0fc', rate: 2.3, fire(p) { WEAPONS.fucile.fire(p); tesla(p, 24, 4); Snd.play('tesla'); } },
  omega: { name: 'OMEGA', sub: 'laser + razzi + plasma', col: '#ffffff', beam: [0], dps: 125, rate: 6, fire(p) { WEAPONS.plasma.fire(p); p.alt -= 1 / 6; if (p.alt <= 0) { p.alt = .6; WEAPONS.razzi.fire(p); } } }
};
const WORDER = ['pistol', 'fucile', 'mitra', 'fiamme', 'laser', 'razzi', 'devast', 'plasma', 'fulmine', 'prisma', 'tempesta', 'omega'];

function updateBeam(p, dt) {
  const w = WEAPONS[p.weapon]; const g = gunPos(p), m = powMul(p), len = 820;
  p.beamLen = [];
  for (const off of w.beam) {
    let reach = len;
    for (const t of liveTargets()) {
      const dx = (t.x - g.x) * p.face;
      if (dx < -(t.w || 40) / 2 || dx > len) continue;
      if (Math.abs(t.y - (g.y + off)) > (t.d || 20) + 10) continue;
      hitTarget(t, w.dps * m * dt, { kind: 'beam', x: t.x, y: t.y, vx: p.face, beam: true });
    }
    p.beamLen.push(reach);
  }
  if (Math.random() < .5) G.parts.push({ x: g.x + p.face * rand(0, 600), y: g.y + pick(w.beam), z: g.z, vx: 0, vy: 0, vz: rand(-30, 30), life: .2, max: .2, r: 2, col: w.col, kind: 'spark' });
  Snd.play('laser');
}

// disegno dell'arma in mano (coordinate locali: origine = impugnatura, canna verso destra)
// C = funzione colore (per il lampo bianco quando si è colpiti)
const PGUN_FORE = { pistol: [2, 3.5], fucile: [16, 1], mitra: [17, 1.5], fiamme: [15, -1], laser: [15, 2], razzi: [11, 4], devast: [17, 1.5], plasma: [16, 3], fulmine: [12, 3], prisma: [14, 3], tempesta: [16, 1], omega: [16, 3] };
const _pkits = {};
function pgunKit(id) { return _pkits[id] || (_pkits[id] = { fore: PGUN_FORE[id] || null, draw: (ctx, C) => drawGun(ctx, id, C) }); }
function drawGun(ctx, id, C = c => c) {
  const col = WEAPONS[id] ? WEAPONS[id].col : '#cccccc';
  const emit = (x, y, r, c, a = 1) => FX.glowAt(ctx, x, y, r, c, a);
  switch (id) {
    case 'pistol':
      poly(ctx, [-1.5, -1, 4.5, -1, 3.6, 8, -2.6, 7.6]); ink(ctx, C('#2a2d33'), 1.3);
      rr(ctx, -2.5, -5.4, 16, 5, 1.2); ink(ctx, C('#3a3f47'), 1.4);
      ctx.fillStyle = C('#6b7480'); ctx.fillRect(-1.5, -4.6, 14, 1.2);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(5.6, 1, 2.4, 0, Math.PI); ctx.stroke();
      break;
    case 'fucile':
      poly(ctx, [-15, -2.6, -4, -3.2, -4, 3, -9, 3, -15, 5.6]); ink(ctx, C('#7a4a26'), 1.4);
      rr(ctx, -4.5, -4.6, 13, 6.8, 1.4); ink(ctx, C('#2e3238'), 1.4);
      rr(ctx, 8, -4.4, 24, 3.2, 1); ink(ctx, C('#3a3f47'), 1.3);
      rr(ctx, 8, -.9, 19, 2.6, 1); ink(ctx, C('#2a2d33'), 1.1);
      rr(ctx, 11.5, -1.8, 10, 4.6, 1.6); ink(ctx, C('#8a5a2e'), 1.3);
      ctx.fillStyle = C('#a87a46'); ctx.fillRect(12.5, -1.2, 8, 1.2);
      break;
    case 'mitra':
      rr(ctx, -10, -3.4, 7, 3.4, 1); ink(ctx, C('#24272c'), 1.2);
      rr(ctx, -3.5, -5.4, 19, 7.6, 1.6); ink(ctx, C('#2e3238'), 1.4);
      rr(ctx, 15, -4.4, 10, 5, 1.2); ink(ctx, C('#3a3f47'), 1.3);
      ctx.fillStyle = C('#15171a'); for (let i = 0; i < 3; i++) ctx.fillRect(16.5 + i * 2.8, -2.8, 1.4, 1.6);
      rr(ctx, 4.5, 2, 4.2, 9.5, 1); ink(ctx, C('#23262b'), 1.2);
      ctx.fillStyle = C('#666f7a'); ctx.fillRect(-2.5, -4.6, 17, 1.2);
      break;
    case 'fiamme':
      rr(ctx, -9, -.5, 14, 9.5, 4.6); ink(ctx, C('#7c8a2c'), 1.5);
      ctx.fillStyle = C('#e8c547'); ctx.fillRect(-8, 3, 12, 1.8);
      rr(ctx, 3, -4.6, 27, 4.6, 1.4); ink(ctx, C('#4a4f56'), 1.4);
      ctx.fillStyle = C('#77808b'); ctx.fillRect(4, -3.8, 24, 1.1);
      rr(ctx, 28, -5.8, 5, 7, 1.2); ink(ctx, C('#2a2d33'), 1.3);
      { const f = .7 + .3 * Math.sin(G.t * 30); ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(34.5, -2.3, 1.6 * f, 0, TAU); ctx.fill(); emit(34.5, -2.3, 9, '#ff8a2a', f); }
      break;
    case 'laser':
      poly(ctx, [-12, -2, -4, -4, -4, 3, -12, 4.6]); ink(ctx, C('#1f222b'), 1.3);
      poly(ctx, [-4.5, -5.6, 20, -5, 27, -2.6, 27, 1.2, 14, 2.6, -4.5, 2.6]); ink(ctx, C('#2a2d3a'), 1.5);
      ctx.fillStyle = C('#4a4f63'); ctx.fillRect(-3, -4.6, 21, 1.2);
      rr(ctx, 3, -2.6, 17, 2.6, 1.2); ctx.fillStyle = col; ctx.fill(); emit(12, -1.3, 14, col, .9);
      rr(ctx, 26, -3.4, 4, 5, 1); ink(ctx, C('#15171d'), 1.2); emit(30, -1, 7, col, .9);
      rr(ctx, 2, 2, 4, 6, 1); ink(ctx, C('#1f222b'), 1.1);
      break;
    case 'razzi':
      rr(ctx, -15, -8, 48, 11, 4); ink(ctx, C('#556b2f'), 1.7);
      ctx.fillStyle = C('#6f8a3d'); ctx.fillRect(-13, -6.8, 44, 2);
      ctx.fillStyle = C('#3d4f20'); ctx.fillRect(-6, -8, 3, 11); ctx.fillRect(14, -8, 3, 11);
      rr(ctx, 31, -9.4, 6, 14, 1.6); ink(ctx, C('#2a2d33'), 1.5);
      rr(ctx, -18, -7, 4, 9, 1); ink(ctx, C('#2a2d33'), 1.3);
      rr(ctx, -1, 2.5, 4, 6.5, 1); ink(ctx, C('#23262b'), 1.2);
      rr(ctx, 4, -12.5, 7, 4.6, 1); ink(ctx, C('#23262b'), 1.2);
      break;
    case 'devast':
      drawGun(ctx, 'mitra', C);
      rr(ctx, -4, -13, 22, 7, 2.5); ink(ctx, C('#556b2f'), 1.5);
      ctx.fillStyle = C('#6f8a3d'); ctx.fillRect(-2, -12, 18, 1.4);
      for (let i = 0; i < 2; i++) { circ(ctx, 19.5, -11.2 + i * 3.4, 1.8, C('#ff6b1a'), 1); }
      break;
    case 'plasma':
      rr(ctx, -5, -6.5, 23, 11, 4.5); ink(ctx, C('#2f3550'), 1.6);
      ctx.fillStyle = C('#4a5378'); ctx.fillRect(-3, -5.4, 19, 1.6);
      seg(ctx, 17, -3.6, 30, -3.6, 2, C('#596380'), 1.4); seg(ctx, 17, 1.6, 30, 1.6, 2, C('#596380'), 1.4);
      { const pl = .75 + .25 * Math.sin(G.t * 16); circ(ctx, 8, -1, 4.4, C('#c9cfff'), 1.3); emit(8, -1, 14, col, pl); emit(31, -1, 8, col, pl); }
      rr(ctx, 1, 3.5, 4.4, 6.5, 1); ink(ctx, C('#23283b'), 1.1);
      break;
    case 'fulmine':
      rr(ctx, -6, -5, 16, 9, 2.6); ink(ctx, C('#2a3440'), 1.5);
      rr(ctx, 9, -2.6, 17, 3.6, 1); ink(ctx, C('#3c4a58'), 1.2);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(12 + i * 5, -.8, 1.8, 5, 0, 0, TAU); ink(ctx, C('#c98a4a'), 1.1); }
      circ(ctx, 28, -.8, 3.2, C('#e7fbff'), 1.2);
      { const a = .6 + .4 * Math.random(); emit(28, -.8, 12, col, a); ctx.strokeStyle = 'rgba(200,250,255,.9)'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(12, -5.5); for (let i = 1; i < 6; i++) ctx.lineTo(12 + i * 3.2, -5.5 + (Math.random() - .5) * 4); ctx.stroke(); }
      rr(ctx, -1, 3, 4.4, 6.5, 1); ink(ctx, C('#1f262e'), 1.1);
      break;
    case 'prisma':
      rr(ctx, -6, -8, 18, 14, 3); ink(ctx, C('#3a2a48'), 1.6);
      for (let i = 0; i < 3; i++) { rr(ctx, 11, -7.4 + i * 4.6, 14 - Math.abs(i - 1) * 3, 3.2, 1); ink(ctx, C('#55406a'), 1.1); emit(25 - Math.abs(i - 1) * 3, -5.8 + i * 4.6, 7, col, .9); }
      { poly(ctx, [0, -6, 6, -1, 0, 4, -3, -1]); ctx.fillStyle = col; ctx.fill(); emit(1.5, -1, 11, col, .8); }
      rr(ctx, 0, 5, 4.4, 5.5, 1); ink(ctx, C('#2a1f36'), 1.1);
      break;
    case 'tempesta':
      poly(ctx, [-15, -2.6, -4, -3.2, -4, 3, -9, 3, -15, 5.6]); ink(ctx, C('#2c3f5c'), 1.4);
      rr(ctx, -4.5, -4.6, 13, 6.8, 1.4); ink(ctx, C('#34506e'), 1.4);
      rr(ctx, 8, -4.4, 24, 3.2, 1); ink(ctx, C('#4a6a8a'), 1.3);
      rr(ctx, 8, -.9, 19, 2.6, 1); ink(ctx, C('#2a3d52'), 1.1);
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(17 + i * 6, -2.8, 1.6, 4.4, 0, 0, TAU); ink(ctx, C('#c98a4a'), 1); }
      emit(32, -2.8, 9, col, .7 + .3 * Math.random());
      break;
    case 'omega':
      rr(ctx, -8, -8, 34, 13, 5); ink(ctx, C('#e4e6f0'), 1.7);
      ctx.fillStyle = C('#ffffff'); ctx.fillRect(-5, -6.6, 28, 1.6);
      ctx.fillStyle = C('#ffcf4a'); ctx.fillRect(-6, 1.2, 30, 1.8); ctx.fillRect(4, -8, 2, 13);
      rr(ctx, 24, -6, 10, 9, 2.5); ink(ctx, C('#c9cbd6'), 1.5);
      { const pl = .8 + .2 * Math.sin(G.t * 12); circ(ctx, 12, -1.6, 3.6, '#ffffff', 1.2); emit(12, -1.6, 15, '#b9d4ff', pl); emit(35, -1.5, 9, '#ffffff', pl); }
      rr(ctx, -1, 4, 4.6, 6.5, 1); ink(ctx, C('#9a9cab'), 1.1);
      break;
    default:
      rr(ctx, -4, -5, 34, 10, 2); ink(ctx, C('#2a2a3a'), 1.5);
  }
}
