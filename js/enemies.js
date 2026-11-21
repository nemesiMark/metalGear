// ===== Nemici: comportamento e disegno =====
'use strict';

// ---------- disegno di un soldato (piedi in x,y) ----------
function drawSoldier(ctx, x, y, o) {
  const s = o.s || 1, fl = o.flash > 0;
  const C = c => fl ? '#ffffff' : c;
  ctx.save(); ctx.translate(x, y); ctx.scale(o.face * s, s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const walk = o.walk ? Math.sin(o.anim) : 0;
  const leg = (hx, ang, col) => { ctx.save(); ctx.translate(hx, -30); ctx.rotate(ang); ctx.fillStyle = C(col); ctx.fillRect(-4.5, 0, 9, 22); ctx.fillStyle = C('#1b1b1b'); ctx.fillRect(-5, 22, 12, 8); ctx.restore(); };
  leg(-3, walk * .55, shade(o.pants, -15)); leg(3, -walk * .55, o.pants);
  // busto
  ctx.fillStyle = C(o.vest); ctx.beginPath(); ctx.moveTo(-11, -32); ctx.lineTo(-12, -58); ctx.lineTo(11, -60); ctx.lineTo(12, -32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C(shade(o.vest, -25)); ctx.fillRect(-12, -36, 24, 5);
  if (o.cross) { ctx.fillStyle = C('#e03131'); ctx.fillRect(-3, -54, 6, 16); ctx.fillRect(-8, -49, 16, 6); }
  if (o.armor) { ctx.fillStyle = C(o.armor); ctx.fillRect(-13, -59, 26, 8); ctx.fillRect(-13, -48, 7, 12); ctx.fillRect(6, -48, 7, 12); }
  // testa
  ctx.fillStyle = C(o.skin || '#e0a878'); ctx.beginPath(); ctx.arc(1, -67, 8.5, 0, TAU); ctx.fill();
  if (o.mask) { ctx.fillStyle = C(o.mask); ctx.fillRect(-7, -70, 17, 12); ctx.fillStyle = fl ? '#fff' : (o.eye || '#ff3333'); ctx.fillRect(3, -68, 6, 2.5); }
  if (o.helmet) { ctx.fillStyle = C(o.helmet); ctx.beginPath(); ctx.arc(1, -69, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(-9, -70, 21, 3); }
  if (o.bandana) {
    ctx.fillStyle = C(o.bandana); ctx.fillRect(-8, -73, 18, 5);
    const fw = Math.sin(o.t * 12) * 3;
    ctx.beginPath(); ctx.moveTo(-8, -72); ctx.lineTo(-22, -70 + fw); ctx.lineTo(-20, -66 + fw); ctx.lineTo(-8, -69); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -71); ctx.lineTo(-18, -62 - fw); ctx.lineTo(-15, -60 - fw); ctx.lineTo(-8, -68); ctx.fill();
  }
  if (o.visor) { ctx.fillStyle = fl ? '#fff' : o.visor; ctx.fillRect(3, -70, 7, 3); }
  // braccio e arma
  ctx.save(); ctx.translate(4, -47 + (o.recoil || 0)); ctx.rotate(o.aim || 0);
  ctx.fillStyle = C(shade(o.vest, -10)); ctx.fillRect(-4, -3, 14, 7);
  ctx.translate(10, 3); if (o.gunDraw) o.gunDraw(ctx); else drawGun(ctx, o.gun || 'pistol');
  ctx.restore();
  if (o.shield) { ctx.fillStyle = C('#5c7080'); ctx.fillRect(14, -78, 9, 72); ctx.fillStyle = C('#9fb4c4'); ctx.fillRect(16, -74, 3, 64); ctx.fillStyle = 'rgba(160,220,255,.35)'; ctx.fillRect(15, -72, 7, 14); }
  ctx.restore();
}
function shade(hex, amt) {
  if (!hex || hex[0] !== '#') return hex; let n = parseInt(hex.slice(1), 16);
  let r = clamp((n >> 16) + amt, 0, 255), g = clamp((n >> 8 & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
const gunRifle = ctx => { ctx.fillStyle = '#2b2b2b'; ctx.fillRect(-4, -3, 30, 6); ctx.fillRect(4, 2, 4, 8); ctx.fillStyle = '#4a3020'; ctx.fillRect(-10, -2, 8, 6); };
const gunMinigun = ctx => { ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-8, -7, 26, 14); ctx.fillStyle = '#222'; for (let i = 0; i < 3; i++) ctx.fillRect(16, -6 + i * 4, 22, 3); };
const gunSniper = ctx => { ctx.fillStyle = '#1f1f1f'; ctx.fillRect(-8, -2, 48, 4); ctx.fillRect(6, -7, 12, 4); ctx.fillStyle = '#4a3020'; ctx.fillRect(-14, -2, 8, 7); };
const gunTube = ctx => { ctx.fillStyle = '#4b5320'; ctx.fillRect(-6, -5, 28, 10); ctx.fillStyle = '#222'; ctx.fillRect(18, -6, 5, 12); };
const gunKnife = ctx => { ctx.fillStyle = '#ccd'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(18, 0); ctx.lineTo(0, 3); ctx.fill(); };
const gunKatana = ctx => { ctx.fillStyle = '#e0e8ff'; ctx.fillRect(0, -1.5, 40, 3); ctx.fillStyle = '#222'; ctx.fillRect(-6, -2, 7, 4); };
const gunNone = ctx => { };

// ---------- utilità IA ----------
function eMove(e, tx, ty, dt, mult = 1) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  const sp = e.spd * G.D.espd * mult * (e.slowT > 0 ? .5 : 1);
  if (d > 6) { e.x += dx / d * Math.min(d, sp * dt); e.y += dy / d * Math.min(d, sp * .75 * dt); e.moving = true; e.anim += dt * sp * .09; }
  else e.moving = false;
  e.y = clamp(e.y, GT + 4, GB);
}
function faceP(e) { e.face = G.player.x < e.x ? -1 : 1; }
function eOnScreen(e, m = 20) { return e.x > G.camX + m && e.x < G.camX + W - m; }
function eCd(e, base) { return base * rand(.8, 1.25) / G.D.efire / (e.elite ? 1.6 : 1); }

const ETYPES = {
  grunt: {
    name: 'Recluta', hp: 34, spd: 78, w: 34, d: 18, h: 72, score: 100,
    init(e) { e.keep = rand(200, 330); e.yoff = rand(-50, 50); e.cd = rand(1, 2.2); },
    update(e, dt) {
      const p = G.player, side = e.x < p.x ? -1 : 1; e.yoff += Math.sin(G.t + e.id) * dt * 20;
      eMove(e, p.x + side * e.keep, clamp(p.y + e.yoff, GT + 4, GB), dt); faceP(e);
      e.cd -= dt;
      if (e.cd <= 0 && eOnScreen(e) && Math.abs(p.y - e.y) < 170) { e.cd = eCd(e, 1.9); enemyShoot(e, { spd: 340, dmg: 9 }); if (e.elite) setTimeout(() => e.hp > 0 && enemyShoot(e, { spd: 340, dmg: 9 }), 150); }
    },
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, vest: '#5b6b33', pants: '#3e4a24', helmet: '#4a5a28', skin: '#d9a066', gunDraw: gunRifle, flash: e.flash, recoil: e.recoil }); }
  },
  scout: {
    name: 'Razziatore', hp: 16, spd: 215, w: 30, d: 16, h: 70, score: 120,
    init(e) { e.state = 'rush'; e.st = 0; },
    update(e, dt) {
      const p = G.player; e.st -= dt;
      if (e.state === 'back') { eMove(e, e.x + (e.x < p.x ? -200 : 200), e.y + Math.sin(G.t * 5) * 40, dt, .8); if (e.st <= 0) e.state = 'rush'; }
      else {
        eMove(e, p.x, p.y + Math.sin(G.t * 6 + e.id) * 60, dt); faceP(e);
        if (Math.abs(p.x - e.x) < 32 && Math.abs(p.y - e.y) < 22 && p.z < 30) { hurtPlayer(11, e.x); e.state = 'back'; e.st = .6; }
      }
    },
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { face: e.face, anim: e.anim * 1.3, walk: e.moving, t: G.t, vest: '#7a2e1f', pants: '#2d2d2d', bandana: '#ff3b30', skin: '#c68a5a', gunDraw: gunKnife, flash: e.flash }); }
  },
  heavy: {
    name: 'Corazzato', hp: 170, spd: 38, w: 50, d: 24, h: 92, score: 350, scale: 1.3,
    init(e) { e.cd = 2; e.burst = 0; },
    update(e, dt) {
      const p = G.player; eMove(e, p.x + (e.x < p.x ? -230 : 230), p.y, dt); faceP(e);
      e.cd -= dt;
      if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.burst--; e.bt = .1; enemyShoot(e, { spd: 380, dmg: 12, r: 6, col: '#ff9f43', spread: rand(-.08, .08) }); } }
      else if (e.cd <= 0 && eOnScreen(e)) { e.cd = eCd(e, 2.6); e.burst = e.elite ? 7 : 4; e.bt = 0; }
    },
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { s: 1.3, face: e.face, anim: e.anim, walk: e.moving, t: G.t, vest: '#4b535c', pants: '#2f343a', armor: '#6c7681', mask: '#22272c', eye: '#ffb000', gunDraw: gunMinigun, flash: e.flash }); }
  },
  sniper: {
    name: 'Cecchino', hp: 26, spd: 120, w: 30, d: 16, h: 70, score: 250,
    init(e) { e.state = 'move'; e.side = e.x > G.player.x ? 1 : -1; e.ty = rand(GT + 20, GB - 10); },
    update(e, dt) {
      const p = G.player; faceP(e);
      if (e.state === 'move') { eMove(e, G.camX + (e.side > 0 ? W - 55 : 55), e.ty, dt, 1.5); if (!e.moving) { e.state = 'aim'; e.st = 1.5 / G.D.efire; Snd.play('aim'); } }
      else if (e.state === 'aim') {
        e.st -= dt; if (e.st > .35) { e.ax = p.x; e.ay = p.y; }
        if (e.st <= 0) { enemyShoot(e, { spd: 980, dmg: 24, r: 4, col: '#ff4040', tx: e.ax, ty: e.ay, trail: true }); e.state = 'cool'; e.st = eCd(e, 1.6); }
        e.x = clamp(e.x, G.camX + 30, G.camX + W - 30);
      } else { e.st -= dt; if (e.st <= 0) { e.state = Math.random() < .3 ? 'move' : 'aim'; e.ty = rand(GT + 20, GB - 10); e.st = 1.5 / G.D.efire; } }
    },
    draw(ctx, e, x, y) {
      if (e.state === 'aim') { const gx = x + e.face * 40, gy = y - 46; const a = e.st < .35 ? 1 : .45; ctx.strokeStyle = `rgba(255,30,30,${a})`; ctx.lineWidth = e.st < .35 ? 2.5 : 1; ctx.beginPath(); ctx.moveTo(gx, gy); const tx = e.ax - G.camX, ty = e.ay - 46; const dx = tx - gx, dy = ty - gy, L = Math.hypot(dx, dy) || 1; ctx.lineTo(gx + dx / L * 1100, gy + dy / L * 1100); ctx.stroke(); ctx.fillStyle = 'rgba(255,40,40,.8)'; ctx.beginPath(); ctx.arc(tx, e.ay - G.camX * 0 - 46 + 0, 4, 0, TAU); ctx.fill(); }
      drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, vest: '#2f3b2a', pants: '#1f271c', mask: '#1a1f18', eye: '#ff2020', gunDraw: gunSniper, flash: e.flash });
    }
  },
  drone: {
    name: 'Drone kamikaze', hp: 12, spd: 150, w: 30, d: 18, h: 30, score: 90, flyer: true,
    init(e) { e.z = 220; },
    update(e, dt) {
      const p = G.player; e.z = lerp(e.z, 50 + Math.sin(G.t * 4 + e.id) * 8, dt * 2);
      eMove(e, p.x, p.y, dt); faceP(e);
      if (Math.abs(p.x - e.x) < 38 && Math.abs(p.y - e.y) < 26) { e.hp = 0; e.noScore = true; explosion(e.x, e.y, 70, 20, 'e'); }
    },
    onDeath(e) { explosion(e.x, e.y, 60, 30, 'p'); },
    draw(ctx, e, x, y) {
      const z = y - e.z, fl = e.flash > 0; ctx.save(); ctx.translate(x, z);
      ctx.fillStyle = fl ? '#fff' : '#3d3d46'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff2b2b'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(e.face * 7, 1, 3.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2; const r = Math.sin(G.t * 50) * 14; ctx.beginPath(); ctx.moveTo(-r, -11); ctx.lineTo(r, -11); ctx.stroke(); ctx.fillStyle = '#555'; ctx.fillRect(-2, -11, 4, 4);
      ctx.fillStyle = '#ffcc00'; ctx.fillRect(-10, 5, 20, 3); ctx.restore();
    }
  },
  grenadier: {
    name: 'Granatiere', hp: 48, spd: 65, w: 34, d: 18, h: 72, score: 200,
    init(e) { e.cd = rand(1.5, 2.5); },
    update(e, dt) {
      const p = G.player; eMove(e, p.x + (e.x < p.x ? -330 : 330), p.y + Math.sin(G.t + e.id) * 60, dt); faceP(e);
      e.cd -= dt; if (e.cd <= 0 && eOnScreen(e)) { e.cd = eCd(e, 2.7); const n = e.elite ? 3 : 1; for (let i = 0; i < n; i++) lobGrenade(e.x + e.face * 20, e.y, p.x + rand(-40, 40) + (i - (n - 1) / 2) * 70, clamp(p.y + rand(-25, 25), GT, GB), 1.1, 24, 72); e.recoil = -6; }
      e.recoil = lerp(e.recoil || 0, 0, dt * 8);
    },
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, vest: '#6b5a2e', pants: '#3e3420', helmet: '#5a4a22', skin: '#b5835a', gunDraw: gunTube, aim: -.35, flash: e.flash, recoil: e.recoil }); }
  },
  shield: {
    name: 'Scudiero', hp: 75, spd: 55, w: 38, d: 18, h: 76, score: 260,
    init(e) { e.turn = 0; e.cd = 1; },
    update(e, dt) {
      const p = G.player, want = p.x < e.x ? -1 : 1;
      if (want !== e.face) { e.turn += dt; if (e.turn > .9 / G.D.espd) { e.face = want; e.turn = 0; } } else e.turn = 0;
      eMove(e, p.x - e.face * 40, p.y, dt);
      e.cd -= dt; if (e.cd <= 0 && Math.abs(p.x - e.x) < 60 && Math.abs(p.y - e.y) < 25) { e.cd = eCd(e, 1.3); hurtPlayer(14, e.x); e.bash = .2; Snd.play('block'); }
      if (e.bash > 0) e.bash -= dt;
    },
    draw(ctx, e, x, y) { drawSoldier(ctx, x + (e.bash > 0 ? e.face * 10 : 0), y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, vest: '#2b3a55', pants: '#1c2638', helmet: '#22304a', visor: '#7fd0ff', gunDraw: gunNone, shield: true, flash: e.flash }); }
  },
  turret: {
    name: 'Torretta', hp: 95, spd: 0, w: 46, d: 22, h: 55, score: 220,
    init(e) { e.z = 400; e.cd = 1.5; e.ang = Math.PI; },
    update(e, dt) {
      const p = G.player; if (e.z > 0) { e.z = Math.max(0, e.z - 600 * dt); if (e.z === 0) { G.shake = 6; Snd.play('stomp'); } return; }
      const ta = Math.atan2((p.y - 40) - (e.y - 40), p.x - e.x); e.ang = ta; e.face = p.x < e.x ? -1 : 1;
      e.cd -= dt; if (e.cd <= 0) { e.cd = eCd(e, 2.3); const n = e.elite ? 5 : 3; for (let i = 0; i < n; i++) enemyShoot(e, { spd: 300, dmg: 10, r: 5, col: '#ff6b6b', spread: (i - (n - 1) / 2) * .22, ox: Math.cos(ta) * 30, z: 40 }); }
    },
    draw(ctx, e, x, y) {
      const fl = e.flash > 0, yy = y - e.z; ctx.save(); ctx.translate(x, yy);
      ctx.fillStyle = fl ? '#fff' : '#3b3f46'; ctx.fillRect(-24, -20, 48, 20); ctx.fillStyle = fl ? '#fff' : '#ffcc00'; for (let i = 0; i < 4; i++) ctx.fillRect(-22 + i * 12, -6, 6, 6);
      ctx.fillStyle = fl ? '#fff' : '#555b66'; ctx.beginPath(); ctx.arc(0, -30, 18, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(0, -32); ctx.rotate(e.ang); ctx.fillStyle = '#222'; ctx.fillRect(0, -4, 34, 8); ctx.restore();
      ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(0, -32, 4, 0, TAU); ctx.fill(); ctx.restore();
    }
  },
  ninja: {
    name: 'Spettro', hp: 38, spd: 160, w: 30, d: 16, h: 72, score: 300,
    init(e) { e.state = 'idle'; e.st = rand(.5, 1.2); e.alpha = 1; },
    update(e, dt) {
      const p = G.player; e.st -= dt; faceP(e);
      if (e.state === 'idle') {
        eMove(e, p.x + (e.x < p.x ? -150 : 150), p.y, dt, .5);
        if (G.D.lead && Math.random() < dt * .5) enemyShoot(e, { spd: 420, dmg: 8, r: 4, col: '#d0bfff', kind: 'star' });
        if (e.st <= 0) { e.state = 'vanish'; e.st = .35; }
      } else if (e.state === 'vanish') { e.alpha = e.st / .35; e.inv = true; if (e.st <= 0) { const side = Math.random() < .5 ? -1 : 1; e.x = clamp(p.x + side * 75, G.camX + 30, G.camX + W - 30); e.y = clamp(p.y + rand(-10, 10), GT + 4, GB); e.state = 'appear'; e.st = .3 / G.D.espd; faceP(e); } }
      else if (e.state === 'appear') { e.alpha = 1 - e.st / .3; if (e.st <= 0) { e.inv = false; e.alpha = 1; e.state = 'slash'; e.st = .25; if (Math.abs(p.x - e.x) < 95 && Math.abs(p.y - e.y) < 30) hurtPlayer(16, e.x); G.fx.push({ kind: 'slash', x: e.x + e.face * 30, y: e.y, face: e.face, life: .2 }); Snd.play('spark'); } }
      else if (e.state === 'slash') { if (e.st <= 0) { e.state = 'idle'; e.st = eCd(e, 2.2); } }
    },
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, alpha: e.alpha, vest: '#1b1530', pants: '#120e22', mask: '#0d0a18', eye: '#c77dff', bandana: '#7b2cbf', gunDraw: gunKatana, aim: e.state === 'slash' ? -1.2 : .6, flash: e.flash }); }
  },
  medic: {
    name: 'Medico', hp: 32, spd: 95, w: 30, d: 16, h: 72, score: 280,
    init(e) { e.tgt = null; },
    update(e, dt) {
      const p = G.player; let low = null, lv = 1;
      for (const o of G.enemies) if (o !== e && o.hp > 0 && o.type !== 'gen' && Math.hypot(o.x - e.x, o.y - e.y) < 200) { const r = o.hp / o.maxhp; if (r < lv) { lv = r; low = o; } }
      e.tgt = low;
      if (low) { low.hp = Math.min(low.maxhp, low.hp + 20 * G.D.efire * dt); eMove(e, low.x - (p.x - low.x > 0 ? 80 : -80), low.y, dt); }
      else eMove(e, p.x + (e.x < p.x ? -400 : 400), p.y + Math.sin(G.t) * 80, dt);
      e.face = low ? (low.x < e.x ? -1 : 1) : (p.x < e.x ? -1 : 1);
    },
    draw(ctx, e, x, y) {
      if (e.tgt) { const t = e.tgt; ctx.strokeStyle = `rgba(80,255,140,${.4 + .3 * Math.sin(G.t * 20)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + e.face * 20, y - 45); ctx.lineTo(t.x - G.camX, t.y - 45 - (t.z || 0)); ctx.stroke(); }
      drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, vest: '#e8e8e8', pants: '#9aa0a6', helmet: '#f1f3f5', cross: true, skin: '#e0a878', gun: 'pistol', flash: e.flash });
    }
  },
  dog: {
    name: 'Mastino', hp: 26, spd: 140, w: 40, d: 16, h: 40, score: 150,
    init(e) { e.state = 'stalk'; e.st = 1; },
    update(e, dt) {
      const p = G.player; e.st -= dt;
      if (e.state === 'stalk') { eMove(e, p.x + (e.x < p.x ? -160 : 160), p.y, dt); faceP(e); if (e.st <= 0 && Math.abs(p.y - e.y) < 40) { e.state = 'crouch'; e.st = .35 / G.D.espd; } }
      else if (e.state === 'crouch') { if (e.st <= 0) { e.state = 'lunge'; e.st = .45; e.ldx = e.face; e.ldy = clamp((p.y - e.y) / 200, -.5, .5); Snd.play('jump'); } }
      else if (e.state === 'lunge') { e.x += e.ldx * 560 * G.D.espd * dt; e.y = clamp(e.y + e.ldy * 300 * dt, GT, GB); e.anim += dt * 30; if (!e.bit && Math.abs(p.x - e.x) < 36 && Math.abs(p.y - e.y) < 22 && p.z < 30) { e.bit = true; hurtPlayer(13, e.x); } if (e.st <= 0) { e.state = 'stalk'; e.st = eCd(e, 1.4); e.bit = false; } }
    },
    draw(ctx, e, x, y) {
      const fl = e.flash > 0, run = Math.sin(e.anim * 1.5); ctx.save(); ctx.translate(x, y); ctx.scale(e.face, 1);
      const body = fl ? '#fff' : '#3a3f47', dark = fl ? '#fff' : '#23272d';
      ctx.fillStyle = dark; [[-14, run], [-8, -run], [10, -run], [16, run]].forEach(([lx, r]) => { ctx.save(); ctx.translate(lx, -18); ctx.rotate(r * .6); ctx.fillRect(-2.5, 0, 5, 18); ctx.restore(); });
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -24, 22, 9, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(16, -30); ctx.lineTo(32, -32); ctx.lineTo(34, -24); ctx.lineTo(18, -20); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, -31); ctx.lineTo(22, -40); ctx.lineTo(25, -31); ctx.fill();
      ctx.fillStyle = '#ff2020'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 6; ctx.fillRect(26, -30, 4, 2); ctx.shadowBlur = 0;
      ctx.fillStyle = '#6c757d'; ctx.fillRect(-10, -33, 18, 4); ctx.strokeStyle = body; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, -26); ctx.lineTo(-30, -34 + run * 3); ctx.stroke();
      ctx.restore();
    }
  },
  // generatore dello scudo del mega boss
  gen: {
    name: 'Generatore', hp: 300, spd: 0, w: 40, d: 30, h: 40, score: 1000, flyer: true,
    init(e) { e.z = 80; },
    update(e, dt) { const b = G.boss; if (!b || b.hp <= 0) { e.hp = 0; return; } e.ang += dt * 1.1 * G.D.bspd; e.x = b.x - 60 + Math.cos(e.ang) * 230; e.y = clamp(b.y + Math.sin(e.ang) * 90, GT + 10, GB); e.z = 70 + Math.sin(G.t * 3 + e.ang) * 20; e.cd -= dt; if (e.cd <= 0) { e.cd = eCd(e, 1.6); enemyShoot(e, { spd: 280, dmg: 10, r: 6, col: '#ff3d7f', z: e.z }); } },
    draw(ctx, e, x, y) { const z = y - e.z, fl = e.flash > 0; glow(ctx, x, z, 50, 'rgba(255,40,120,.6)'); ctx.fillStyle = fl ? '#fff' : '#2a0f2a'; ctx.beginPath(); ctx.arc(x, z, 20, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ff3d7f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, z, 20, G.t * 4, G.t * 4 + 4); ctx.stroke(); ctx.fillStyle = '#ffd1e3'; ctx.beginPath(); ctx.arc(x, z, 7, 0, TAU); ctx.fill(); }
  }
};
