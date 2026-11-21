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
  // lampo della canna
  G.parts.push({ x: g.x + p.face * 6, y: g.y, z: g.z, vx: 0, vy: 0, vz: 0, life: .05, max: .05, r: (o.r || 3) * 3 + 4, col: '#fff6c0', kind: 'flash' });
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

// disegno dell'arma in mano (coordinate locali, rivolte a destra)
function drawGun(ctx, id) {
  const c = WEAPONS[id] ? WEAPONS[id].col : '#ccc';
  ctx.fillStyle = '#222';
  switch (id) {
    case 'pistol': ctx.fillRect(0, -3, 16, 6); ctx.fillRect(0, 0, 5, 9); break;
    case 'fucile': ctx.fillStyle = '#5a3a1e'; ctx.fillRect(-8, -2, 12, 7); ctx.fillStyle = '#333'; ctx.fillRect(2, -4, 30, 5); ctx.fillRect(6, 1, 20, 3); break;
    case 'mitra': ctx.fillRect(-2, -4, 28, 7); ctx.fillRect(8, 3, 5, 10); ctx.fillStyle = '#555'; ctx.fillRect(24, -2, 8, 3); break;
    case 'fiamme': ctx.fillStyle = '#7a1'; ctx.fillRect(-6, -6, 10, 14); ctx.fillStyle = '#444'; ctx.fillRect(2, -3, 30, 6); ctx.fillStyle = '#f80'; ctx.fillRect(31, -2, 3, 4); break;
    case 'razzi': ctx.fillStyle = '#4b5320'; ctx.fillRect(-10, -6, 44, 11); ctx.fillStyle = '#222'; ctx.fillRect(30, -7, 6, 13); break;
    default: // armi energetiche
      ctx.fillStyle = '#2a2a3a'; ctx.fillRect(-4, -5, 34, 10); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.fillRect(4, -2, 22, 4); ctx.fillRect(30, -3, 4, 6); ctx.shadowBlur = 0;
  }
}
