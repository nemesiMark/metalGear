// ===== Nemici: comportamento e disegno =====
'use strict';

// =====================================================================
//  SOLDATO (giocatore e nemici umani) — piedi in (x, y), rivolto a destra
//  Stile: contorno a inchiostro, ombre a due toni, gambe e braccia articolate
// =====================================================================
// gamba a due segmenti: th = coscia (0 = giù, + = in avanti), kn = piega del ginocchio
function sLeg(ctx, hx, hy, th, kn, col, boot, pad) {
  const L1 = 14, L2 = 13.5;
  const kx = hx + Math.sin(th) * L1, ky = hy + Math.cos(th) * L1;
  const sa = th - kn, ax = kx + Math.sin(sa) * L2, ay = ky + Math.cos(sa) * L2;
  ctx.lineCap = 'round'; ctx.strokeStyle = INK;
  ctx.lineWidth = 10.6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.lineWidth = 9.4; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ax, ay); ctx.stroke();
  // scarpone
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(clamp(sa * .3 - kn * .12, -.55, .45));
  poly(ctx, [-4.4, -4.6, 3.6, -5, 8.4, -1.8, 9.2, 2.6, -4.8, 2.6]); ink(ctx, boot, 1.7);
  ctx.fillStyle = tone(boot, -.45); ctx.fillRect(-4.6, 1.2, 13.6, 1.5);
  ctx.restore();
  ctx.strokeStyle = col; ctx.lineWidth = 8.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.lineWidth = 7.2; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ax, ay - .5); ctx.stroke();
  // piega del pantalone (ombra dietro la coscia)
  ctx.strokeStyle = tone(col, -.22); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hx - Math.cos(th) * 2.6, hy + Math.sin(th) * 2.6); ctx.lineTo(kx - Math.cos(th) * 2.6, ky + Math.sin(th) * 2.6); ctx.stroke();
  if (pad) { ctx.save(); ctx.translate(kx, ky); ctx.rotate(-th); rr(ctx, -1, -3, 5.6, 6, 2); ink(ctx, pad, 1.3); ctx.restore(); }
}
// braccio a due segmenti dalla spalla (sx, sy) alla mano (hx, hy)
function sArm(ctx, sx, sy, hx, hy, up, fore, hand, sleeve) {
  const [ex, ey] = ik2(sx, sy, hx, hy, 10.5, 10.5, 1);
  ctx.lineCap = 'round'; ctx.strokeStyle = INK;
  ctx.lineWidth = 8.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.lineWidth = 7.6; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = up; ctx.lineWidth = 6.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = fore; ctx.lineWidth = 5.6; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  if (sleeve) { ctx.strokeStyle = sleeve; ctx.lineWidth = 7.4; ctx.beginPath(); ctx.moveTo(ex + (sx - ex) * .35, ey + (sy - ey) * .35); ctx.lineTo(ex + (sx - ex) * .12, ey + (sy - ey) * .12); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(hx, hy, 3, 0, TAU); ink(ctx, hand, 1.4);
}

// ---------- armi dei nemici (origine = impugnatura, canna verso destra) ----------
// fore = dove va la mano di supporto (null = arma a una mano)
const EGUNS = {
  rifle: {
    fore: [15, 1.5], draw(ctx, C) {
      poly(ctx, [-13, -2.5, -4, -3, -3, 2.5, -12, 4.5]); ink(ctx, C('#5a4230'), 1.4);           // calcio
      rr(ctx, -4, -4.6, 15, 6.4, 1.4); ink(ctx, C('#2c3036'), 1.4);                              // castello
      poly(ctx, [3, 1.5, 7.5, 1.5, 8.5, 9, 4.6, 9.6]); ink(ctx, C('#24272c'), 1.3);              // caricatore curvo
      rr(ctx, 10.5, -3.8, 12, 4.8, 1.2); ink(ctx, C('#3d3328'), 1.4);                            // guardamano
      rr(ctx, 22, -2.6, 8, 2.4, .8); ink(ctx, C('#2c3036'), 1.2);                                // canna
      ctx.fillStyle = C('#5a636e'); ctx.fillRect(-3, -4, 13, 1.2);                               // riflesso
      rr(ctx, 1, -7.4, 6, 2.8, 1); ink(ctx, C('#2c3036'), 1.1);                                  // maniglia
    }
  },
  minigun: {
    fore: [12, 6], draw(ctx, C, o) {
      rr(ctx, -9, -8, 22, 15, 3); ink(ctx, C('#3c4148'), 1.6);
      ctx.fillStyle = C('#59616b'); ctx.fillRect(-7, -6.5, 18, 2.4);
      rr(ctx, -6, 6, 10, 6, 2); ink(ctx, C('#b8963e'), 1.2);                                     // cassetta munizioni
      const sp = o.spin || 0;
      for (let i = 0; i < 3; i++) { const yy = -5 + i * 4 + Math.sin(sp + i * 2.1) * 1.2; rr(ctx, 13, yy - 1.4, 24, 2.8, 1); ink(ctx, C(i === 1 ? '#30343a' : '#24272c'), 1.1); }
      rr(ctx, 34, -6.5, 4, 12.5, 1.2); ink(ctx, C('#2c3036'), 1.3);
    }
  },
  sniper: {
    fore: [19, 1.5], draw(ctx, C) {
      poly(ctx, [-15, -2.4, -4, -2.6, -3, 3, -9, 3.2, -11, 6, -15, 5.4]); ink(ctx, C('#4a3a2a'), 1.4);
      rr(ctx, -4, -3.6, 17, 5.4, 1.2); ink(ctx, C('#23262b'), 1.4);
      rr(ctx, 13, -2.2, 30, 2.6, .8); ink(ctx, C('#1d2024'), 1.2);
      rr(ctx, 1, -9.6, 14, 4.4, 2); ink(ctx, C('#15171a'), 1.3);                                  // mirino
      ctx.fillStyle = C('#ff4040'); ctx.fillRect(13.4, -8.6, 1.4, 2.4);
      rr(ctx, 4, 1.6, 4, 5, 1); ink(ctx, C('#23262b'), 1.1);
    }
  },
  tube: {
    fore: [13, 4], draw(ctx, C) {
      rr(ctx, -8, -5.5, 30, 10, 2.5); ink(ctx, C('#4f5a26'), 1.6);
      ctx.fillStyle = C('#3c4520'); ctx.fillRect(-2, -5, 3, 9); ctx.fillRect(12, -5, 3, 9);
      rr(ctx, 21, -6.6, 5, 12.2, 1.4); ink(ctx, C('#23262b'), 1.4);
      rr(ctx, -2, 3.5, 4, 6, 1); ink(ctx, C('#23262b'), 1.1);
      rr(ctx, 3, -9, 5, 3.6, 1); ink(ctx, C('#23262b'), 1.1);
    }
  },
  knife: {
    fore: null, draw(ctx, C) {
      rr(ctx, -2.5, -2.2, 6, 4.4, 1.2); ink(ctx, C('#2a2420'), 1.2);
      poly(ctx, [3.5, -2.4, 14, -1.2, 17, .4, 3.5, 2.2]); ink(ctx, C('#cfd6e0'), 1.2);
      ctx.strokeStyle = C('#ffffff'); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(5, -1.2); ctx.lineTo(14, -.4); ctx.stroke();
    }
  },
  katana: {
    fore: [-5, 0], draw(ctx, C) {
      rr(ctx, -9, -1.8, 10, 3.6, 1.2); ink(ctx, C('#2a1f3a'), 1.2);                                 // impugnatura
      rr(ctx, 1, -3.2, 2.2, 6.4, .8); ink(ctx, C('#c9a24a'), 1.1);                                  // guardia
      ctx.beginPath(); ctx.moveTo(3, -1.6); ctx.lineTo(38, -1.2); ctx.quadraticCurveTo(43, -.4, 44, 1.2); ctx.lineTo(3, 1.6); ctx.closePath(); ink(ctx, C('#dfe6f5'), 1.2);
      ctx.strokeStyle = C('#ffffff'); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(5, -.6); ctx.lineTo(40, -.4); ctx.stroke();
    }
  },
  baton: {
    fore: null, draw(ctx, C) { rr(ctx, -3, -2, 22, 4, 1.6); ink(ctx, C('#1d2128'), 1.2); ctx.fillStyle = C('#4b5563'); ctx.fillRect(-1, -1.4, 18, 1); }
  },
  none: { fore: null, draw() { } }
};

// ---------- il soldato ----------
// o: s, face, anim, walk, air, run, t, alpha, flash, recoil, aim, seed
//    skin, hair, vest, pants, sleeve, boots, gloves, knee
//    helmet, bandana, mask, eye, visor, hood, armor, cross, shield, pack, bando, scarf
//    kit (EGUNS.x) oppure gun (id arma del giocatore)
function drawSoldier(ctx, x, y, o) {
  const s = o.s || 1, fl = o.flash > 0, t = o.t || 0, seed = o.seed || 0;
  const C = fl ? c => tone(c, .6) : c => c;
  ctx.save(); ctx.translate(x, y); ctx.scale((o.face || 1) * s, s);
  if (o.alpha != null) ctx.globalAlpha *= clamp(o.alpha, 0, 1);
  const mv = !!o.walk && !o.air, ph = o.anim || 0, run = o.run || 1;
  const bob = mv ? -Math.abs(Math.sin(ph)) * 2.4 * Math.min(1.3, run) : o.air ? -1.5 : Math.sin(t * 2.4 + seed) * .55;
  const lean = (mv ? .08 * run : o.air ? -.05 : 0) + (o.lean || 0);
  const hipY = -30 + bob;
  const pants = o.pants || '#3e4a24', vest = o.vest || '#5b6b33', skin = o.skin || '#d9a066';
  const boots = o.boots || '#25221d', glove = o.gloves || skin;
  // --- gambe (lontana più scura) ---
  let tN, kN, tF, kF;
  if (o.air) { tN = .8; kN = 1.4; tF = .2; kF = 1.05; }
  else if (mv) { const A = .5 + .14 * (run - 1), K = 1.1; tN = A * Math.sin(ph); kN = .14 + K * Math.max(0, Math.cos(ph)); tF = A * Math.sin(ph + Math.PI); kF = .14 + K * Math.max(0, Math.cos(ph + Math.PI)); }
  else { tN = .12; kN = .1; tF = -.14; kF = .08; }
  sLeg(ctx, -1.6, hipY, tF, kF, C(tone(pants, -.3)), C(tone(boots, -.25)), o.knee ? C(tone(o.knee, -.3)) : null);
  sLeg(ctx, 1.6, hipY, tN, kN, C(pants), C(boots), o.knee ? C(o.knee) : null);
  // --- dal bacino in su (si inclina in corsa) ---
  ctx.save(); ctx.translate(0, hipY); ctx.rotate(lean);
  const kit = o.kit || (o.gun ? pgunKit(o.gun) : null);
  const rec = o.recoil || 0, aim = o.aim || 0;
  const gx = 11 + rec, gy = -12.5 + (mv ? Math.sin(ph * 2) * .6 : 0);
  const shF = [-1.8, -23], shN = [2.2, -23.6];
  const up = C(o.sleeve || tone(vest, -.08)), upF = C(tone(o.sleeve || vest, -.32));
  const fore = C(o.bare ? skin : (o.sleeve || tone(vest, -.08))), foreF = C(tone(o.bare ? skin : (o.sleeve || vest), -.32));
  // braccio lontano (dietro al busto)
  if (kit && kit.fore) {
    const ca = Math.cos(aim), sn = Math.sin(aim);
    sArm(ctx, shF[0], shF[1], gx + kit.fore[0] * ca - kit.fore[1] * sn, gy + kit.fore[0] * sn + kit.fore[1] * ca, upF, foreF, C(tone(glove, -.25)));
  } else if (!o.shield) {
    const sw = mv ? -Math.sin(ph) * .9 : .15;
    sArm(ctx, shF[0], shF[1], shF[0] + Math.sin(sw) * 15, shF[1] + Math.cos(sw) * 15 + 2, upF, foreF, C(tone(glove, -.25)));
  }
  // zaino
  if (o.pack) { rr(ctx, -15.5, -25, 7.5, 18, 2.5); ink(ctx, C(o.pack), 1.8); ctx.fillStyle = C(tone(o.pack, -.25)); ctx.fillRect(-15, -14, 6.5, 2); }
  // bacino
  rr(ctx, -9, -4, 18.5, 9, 3); ink(ctx, C(pants), 2);
  // busto
  const T = [-9.6, 0, -10.6, -19, -7.2, -26.6, 7.4, -27.2, 10.9, -20.4, 10.3, 0];
  poly(ctx, T); ctx.fillStyle = C(vest); ctx.fill();
  fillP(ctx, C(tone(vest, -.3)), [-9.6, 0, -10.6, -19, -7.2, -26.6, -3.6, -26.7, -5.5, -18, -5, 0]);
  fillP(ctx, C(tone(vest, .2)), [6.4, -25.8, 9.9, -20.3, 9.4, -11.5, 7, -12.4]);
  if (o.armor) { // piastre (corazzato)
    fillP(ctx, C(o.armor), [-7.5, -25.6, 9, -26, 10.6, -19.5, 9.8, -9, -6.8, -9]);
    ctx.fillStyle = C(tone(o.armor, .3)); ctx.fillRect(-5, -24.2, 13, 1.6);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-7.5, -25.6); ctx.lineTo(9, -26); ctx.lineTo(10.6, -19.5); ctx.lineTo(9.8, -9); ctx.lineTo(-6.8, -9); ctx.closePath(); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = C('#1a1d22'); ctx.beginPath(); ctx.arc(-3 + i * 5.5, -11.5, .9, 0, TAU); ctx.fill(); }
  } else {
    rr(ctx, 1.6, -17.5, 6.6, 6, 1.3); ink(ctx, C(tone(vest, -.14)), 1.2);                         // tasca sul petto
    if (!o.cross) { rr(ctx, -6, -18, 5.5, 6.5, 1.3); ink(ctx, C(tone(vest, -.2)), 1.2); }
  }
  if (o.cross) { // medico
    rr(ctx, 0, -21, 9, 9, 1.6); ink(ctx, C('#ffffff'), 1.2);
    ctx.fillStyle = C('#e03131'); ctx.fillRect(3.4, -19.6, 2.2, 6.2); ctx.fillRect(1.4, -17.6, 6.2, 2.2);
  }
  if (o.bando) { // bandoliera con granate
    ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(8, -2); ctx.stroke();
    ctx.strokeStyle = C('#4a3c22'); ctx.lineWidth = 2.8; ctx.stroke();
    for (let i = 0; i < 3; i++) { const k = .22 + i * .27; circ(ctx, -7 + 15 * k, -26 + 24 * k, 2.4, C('#5a6b2a'), 1.1); }
  }
  poly(ctx, T); ink(ctx, null, 2);
  // cintura
  rr(ctx, -10.2, -4, 21, 4.6, 1.5); ink(ctx, C('#26231d'), 1.4);
  rr(ctx, 4.2, -3.6, 4.2, 3.8, .8); ink(ctx, C('#b8963e'), 1);
  rr(ctx, -8, -2.6, 5, 6.2, 1.2); ink(ctx, C(tone(pants, -.12)), 1.2);
  if (o.scarf) { // sciarpa al collo
    const fw = Math.sin(t * 11 + seed) * 2;
    poly(ctx, [-4, -27, -16, -24 + fw, -15, -20.5 + fw, -3.5, -24]); ink(ctx, C(tone(o.scarf, -.15)), 1.3);
  }
  // --- testa ---
  const hx = 3.2, hy = -36.2;
  rr(ctx, 0, -31.5, 6, 6, 2); ink(ctx, C(tone(skin, -.2)), 1.5);                                   // collo
  if (o.bandana && !o.hood) { // code della bandana (dietro la testa)
    const fw = Math.sin(t * 12 + seed) * 2.4, b = o.bandana;
    poly(ctx, [hx - 6.5, hy - 5.2, hx - 18.5, hy - 6.8 + fw, hx - 17.5, hy - 3.2 + fw, hx - 6.8, hy - 2.6]); ink(ctx, C(b), 1.4);
    poly(ctx, [hx - 6.5, hy - 4, hx - 15.5, hy + 3.4 - fw, hx - 13, hy + 5 - fw, hx - 6, hy - 1.6]); ink(ctx, C(tone(b, -.22)), 1.4);
  }
  const masked = o.mask && o.full;
  ctx.beginPath(); ctx.ellipse(hx, hy, 8, 8.5, 0, 0, TAU); ctx.fillStyle = C(masked ? tone(o.mask, -.2) : tone(skin, -.22)); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 1.1, hy - 1, 7.1, 7.4, 0, 0, TAU); ctx.fillStyle = C(masked ? o.mask : skin); ctx.fill();
  if (!masked) {
    // naso e mascella
    poly(ctx, [hx + 7.4, hy - 1.4, hx + 9.9, hy + 1.6, hx + 7.6, hy + 2.4]); ctx.fillStyle = C(skin); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx + 7.6, hy - 1.2); ctx.lineTo(hx + 9.9, hy + 1.6); ctx.lineTo(hx + 7.8, hy + 2.3); ctx.stroke();
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(hx + 3.7, hy - 3, 3.6, 3.2); ctx.fillStyle = INK; ctx.fillRect(hx + 5.4, hy - 2.9, 1.9, 3);   // occhio
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx + 2.8, hy - 4.6); ctx.lineTo(hx + 7.4, hy - 4); ctx.stroke(); // sopracciglio
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + 5, hy + 4.8); ctx.lineTo(hx + 7.4, hy + 4.4); ctx.stroke(); // bocca
    ctx.beginPath(); ctx.ellipse(hx - 3.4, hy + .8, 1.5, 2.2, 0, 0, TAU); ink(ctx, C(tone(skin, -.14)), .9); // orecchio
  }
  ctx.beginPath(); ctx.ellipse(hx, hy, 8, 8.5, 0, 0, TAU); ink(ctx, null, 2);
  if (o.hair && !o.helmet) { // capelli
    poly(ctx, [hx - 8.2, hy + 1.5, hx - 8.6, hy - 3.6, hx - 5.2, hy - 7.6, hx + .5, hy - 9, hx + 6, hy - 7.8, hx + 8.6, hy - 4.6, hx + 4.5, hy - 5.6, hx, hy - 4.6, hx - 3.6, hy - 1.6, hx - 5.2, hy + 3]); ink(ctx, C(o.hair), 1.5);
  }
  if (o.mask && !o.full) { // maschera antigas (corazzato)
    poly(ctx, [hx + .5, hy - 4.6, hx + 8.6, hy - 4.2, hx + 10.4, hy + 3.4, hx + 5.8, hy + 8, hx + .4, hy + 6.2]); ink(ctx, C(o.mask), 1.6);
    circ(ctx, hx + 9.4, hy + 4.4, 3.2, C(tone(o.mask, .2)), 1.3);
    circ(ctx, hx + 5.4, hy - 1.6, 2.5, fl ? '#fff' : (o.eye || '#ffb000'), 1.2);
    FX.glowAt(ctx, hx + 5.4, hy - 1.6, 9, o.eye || '#ffb000', .9);
  }
  if (masked) { // passamontagna / cappuccio: solo la fessura degli occhi
    rr(ctx, hx + 2, hy - 3.6, 7.6, 3.2, 1.4); ctx.fillStyle = C(o.slit || '#0a0a0e'); ctx.fill();
    ctx.fillStyle = fl ? '#fff' : (o.eye || '#ff3333'); ctx.fillRect(hx + 4.6, hy - 2.8, 3.6, 1.6);
    FX.glowAt(ctx, hx + 6.4, hy - 2, 8, o.eye || '#ff3333', .9);
  }
  if (o.hood) { // cappuccio (cecchino)
    ctx.beginPath(); ctx.moveTo(hx - 9.4, hy + 6); ctx.quadraticCurveTo(hx - 11, hy - 9, hx + 1, hy - 10.4); ctx.quadraticCurveTo(hx + 9.5, hy - 10.6, hx + 10, hy - 4.4); ctx.lineTo(hx + 6, hy - 5.6); ctx.quadraticCurveTo(hx - 2, hy - 6.6, hx - 3.6, hy + 2); ctx.lineTo(hx - 4, hy + 7); ctx.closePath(); ink(ctx, C(o.hood), 1.6);
  }
  if (o.helmet) {
    const hr = o.visor ? 10.2 : 9.6;
    ctx.beginPath(); ctx.arc(hx, hy - .8, hr, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(hx + hr + 1.4, hy - 1); ctx.lineTo(hx + hr + 1.2, hy + .9); ctx.lineTo(hx - hr - .2, hy + .7); ctx.closePath(); ink(ctx, C(o.helmet), 2);
    ctx.strokeStyle = C(tone(o.helmet, .38)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(hx, hy - .8, hr - 2.6, Math.PI * 1.22, Math.PI * 1.5); ctx.stroke();
    ctx.fillStyle = C(tone(o.helmet, -.25)); ctx.fillRect(hx - hr, hy - 1.6, hr * 2 + 1, 1.6);
    if (o.helmCross) { ctx.fillStyle = C('#e03131'); ctx.fillRect(hx - 2.4, hy - 8.4, 2.4, 6); ctx.fillRect(hx - 4.2, hy - 6.6, 6, 2.4); }
    if (o.visor) { poly(ctx, [hx + 4.6, hy - .6, hx + 12.6, hy - .2, hx + 12, hy + 7.4, hx + 5.4, hy + 7.6]); ctx.fillStyle = fl ? 'rgba(255,255,255,.7)' : rgba(o.visor, .5); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(hx + 7, hy + .6); ctx.lineTo(hx + 8.4, hy + 6.4); ctx.stroke(); }
    else { ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(hx - 1.6, hy + .4); ctx.lineTo(hx + 2.6, hy + 7.6); ctx.stroke(); } // sottogola
  }
  if (o.bandana && !o.hood) {
    poly(ctx, [hx - 8, hy - 6.4, hx + 8.4, hy - 6.8, hx + 8.8, hy - 3.2, hx - 8.3, hy - 2.6]); ink(ctx, C(o.bandana), 1.5);
    circ(ctx, hx - 7.8, hy - 4.5, 2.2, C(tone(o.bandana, -.12)), 1.2);
  }
  // --- arma e braccio vicino ---
  if (kit) {
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(aim); kit.draw(ctx, C, o); ctx.restore();
    if (o.armor) { rr(ctx, -4, -27, 11, 8, 3); ink(ctx, C(o.armor), 1.6); }                     // spallaccio
    sArm(ctx, shN[0], shN[1], gx, gy, up, fore, C(glove), o.bare ? C(o.sleeve || vest) : null);
  } else if (!o.shield) {
    const sw = mv ? Math.sin(ph) * .9 : -.1;
    sArm(ctx, shN[0], shN[1], shN[0] + Math.sin(sw) * 15, shN[1] + Math.cos(sw) * 15 + 2, up, fore, C(glove));
  }
  if (o.shield) { // scudo antisommossa tenuto davanti
    sArm(ctx, shN[0], shN[1], 13, -14, up, fore, C(glove));
    rr(ctx, 12.5, -50, 10.5, 72, 3); ink(ctx, C('#46596b'), 2.2);
    ctx.fillStyle = C('#6f8597'); ctx.fillRect(15, -47, 2.2, 66);
    ctx.fillStyle = C('#2b3846'); ctx.fillRect(14.4, -6, 7, 3); ctx.fillRect(14.4, 6, 7, 3);
    rr(ctx, 14.2, -45, 7.2, 15, 1.5); ctx.fillStyle = fl ? 'rgba(255,255,255,.8)' : 'rgba(150,215,255,.45)'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(16, -43); ctx.lineTo(17.4, -33); ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

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
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, seed: e.id, vest: '#5f6e34', pants: '#454f27', helmet: '#56642c', skin: '#d9a066', knee: '#363f1e', pack: '#4a5426', kit: EGUNS.rifle, flash: e.flash, recoil: e.recoil }); }
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
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { face: e.face, anim: e.anim * 1.3, walk: e.moving, run: 1.7, t: G.t, seed: e.id, vest: '#8a3424', pants: '#2d2d31', sleeve: '#6e2a1c', bare: true, bandana: '#ff3b30', hair: '#22160f', skin: '#c68a5a', boots: '#1d1a18', kit: EGUNS.knife, flash: e.flash }); }
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
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { s: 1.3, face: e.face, anim: e.anim, walk: e.moving, t: G.t, seed: e.id, vest: '#4b535c', pants: '#30353b', armor: '#7a8592', mask: '#272c32', eye: '#ffb000', helmet: '#3f464f', knee: '#5b6570', boots: '#1c1e22', gloves: '#2a2d33', kit: EGUNS.minigun, spin: e.burst > 0 ? G.t * 45 : G.t * 3, flash: e.flash }); }
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
      if (e.state === 'aim') {
        const gx = x + e.face * 40, gy = y - 46, lock = e.st < .35;
        const tx = e.ax - G.camX, ty = e.ay - 46, dx = tx - gx, dy = ty - gy, L = Math.hypot(dx, dy) || 1;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.strokeStyle = lock ? 'rgba(255,60,50,.35)' : 'rgba(255,40,40,.12)'; ctx.lineWidth = lock ? 6 : 3;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + dx / L * 1100, gy + dy / L * 1100); ctx.stroke();
        ctx.strokeStyle = lock ? 'rgba(255,90,80,1)' : 'rgba(255,50,50,.55)'; ctx.lineWidth = lock ? 1.8 : 1; ctx.stroke();
        ctx.restore();
        const rs = lock ? 9 : 14 + Math.sin(G.t * 10) * 2;
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(G.t * 3); ctx.strokeStyle = lock ? '#ff4b3e' : 'rgba(255,70,60,.7)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, rs, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(rs - 4, 0); ctx.lineTo(rs + 5, 0); ctx.stroke(); }
        ctx.restore();
        FX.glow(tx, ty, lock ? 22 : 14, '#ff3030', lock ? 1 : .6);
      }
      drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, seed: e.id, vest: '#34432f', pants: '#232b20', hood: '#2b3826', mask: '#1b2118', full: true, eye: '#ff2a2a', knee: '#1b2118', boots: '#1a1c18', gloves: '#1a1c18', kit: EGUNS.sniper, flash: e.flash });
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
      const z = y - e.z, fl = e.flash > 0, C = c => fl ? tone(c, .6) : c;
      ctx.save(); ctx.translate(x, z); ctx.scale(e.face, 1); ctx.rotate(.12);
      seg(ctx, -16, -5, 16, -5, 3, C('#30353c'), 2);
      for (const rx of [-16, 16]) {
        rr(ctx, rx - 1.6, -11, 3.2, 6, 1); ink(ctx, C('#30353c'), 1.2);
        ctx.fillStyle = 'rgba(210,220,230,.22)'; ctx.beginPath(); ctx.ellipse(rx, -11.5, 12, 2.6, 0, 0, TAU); ctx.fill();
        const a = G.t * 60 + rx; ctx.strokeStyle = 'rgba(25,28,34,.75)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(rx - Math.cos(a) * 11, -11.5); ctx.lineTo(rx + Math.cos(a) * 11, -11.5); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, 0, 15.5, 9.5, 0, 0, TAU); ink(ctx, C('#3d434d'), 2);
      ctx.fillStyle = C('#5c6470'); ctx.beginPath(); ctx.ellipse(-2, -4, 10, 3.4, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 15.5, 9.5, 0, 0, TAU); ctx.clip();
      for (let i = -3; i < 4; i++) { ctx.fillStyle = i % 2 ? C('#ffcc00') : C('#16181c'); ctx.beginPath(); ctx.moveTo(i * 6 - 3, 9.5); ctx.lineTo(i * 6 + 3, 9.5); ctx.lineTo(i * 6 + 7, 4.5); ctx.lineTo(i * 6 + 1, 4.5); ctx.fill(); }
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(0, 0, 15.5, 9.5, 0, 0, TAU); ink(ctx, null, 2);
      circ(ctx, 9, 0, 4.6, C('#15171b'), 1.4);
      const blink = .7 + .3 * Math.sin(G.t * 14 + e.id);
      ctx.fillStyle = fl ? '#fff' : '#ff2b2b'; ctx.beginPath(); ctx.arc(9.6, 0, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd0d0'; ctx.beginPath(); ctx.arc(10.3, -.8, .9, 0, TAU); ctx.fill();
      FX.glowAt(ctx, 9.6, 0, 16, '#ff2a2a', blink);
      ctx.restore();
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
    draw(ctx, e, x, y) { drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, seed: e.id, vest: '#7a6a3a', pants: '#4a3f24', helmet: '#5f5026', skin: '#b5835a', knee: '#3a3220', bando: true, kit: EGUNS.tube, aim: -.35, flash: e.flash, recoil: e.recoil }); }
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
    draw(ctx, e, x, y) { drawSoldier(ctx, x + (e.bash > 0 ? e.face * 10 : 0), y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, seed: e.id, vest: '#2b3a55', pants: '#1c2638', armor: '#3a4d72', helmet: '#22304a', visor: '#7fd0ff', knee: '#22304a', boots: '#141a26', gloves: '#141a26', shield: true, flash: e.flash }); }
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
      const fl = e.flash > 0, C = c => fl ? tone(c, .6) : c, yy = y - e.z;
      ctx.save(); ctx.translate(x, yy);
      if (e.z > 0) { // discesa con i razzi accesi
        ctx.globalCompositeOperation = 'lighter'; const f = fireSprite(), fl2 = 1 + Math.random() * .4;
        for (const fx of [-14, 14]) ctx.drawImage(f, fx - 8, -4, 16, 34 * fl2);
        ctx.globalCompositeOperation = 'source-over'; FX.glow(x, yy + 10, 50, '#ff9a3a', .9);
      }
      seg(ctx, -7, -12, -23, 0, 4, C('#2b3036'), 2); seg(ctx, 7, -12, 23, 0, 4, C('#2b3036'), 2); seg(ctx, 0, -12, 0, 0, 4, C('#23272c'), 2);
      rr(ctx, -21, -25, 42, 14, 3); ctx.fillStyle = C('#3b4048'); ctx.fill();
      ctx.save(); rr(ctx, -21, -25, 42, 14, 3); ctx.clip();
      for (let i = -4; i < 6; i++) { ctx.fillStyle = i % 2 ? C('#ffc21a') : C('#17191d'); ctx.beginPath(); ctx.moveTo(i * 8, -15); ctx.lineTo(i * 8 + 8, -15); ctx.lineTo(i * 8 + 4, -11); ctx.lineTo(i * 8 - 4, -11); ctx.fill(); }
      ctx.restore(); rr(ctx, -21, -25, 42, 14, 3); ink(ctx, null, 2);
      ctx.fillStyle = C('#5b626d'); ctx.fillRect(-18, -23.5, 36, 2);
      ctx.save(); ctx.translate(0, -32); ctx.rotate(e.ang);
      rr(ctx, 2, -5, 27, 10, 2.5); ink(ctx, C('#2b2f35'), 1.8);
      ctx.fillStyle = C('#4a515b'); ctx.fillRect(4, -3.6, 22, 2);
      rr(ctx, 27, -6.5, 6, 13, 1.6); ink(ctx, C('#1d2024'), 1.6);
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, -32, 15, 0, TAU); ink(ctx, C('#4e5560'), 2);
      ctx.fillStyle = C('#6c7480'); ctx.beginPath(); ctx.arc(-4, -36, 7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -32, 15, 0, TAU); ink(ctx, null, 2);
      circ(ctx, 0, -32, 5, C('#15171b'), 1.4);
      ctx.fillStyle = fl ? '#fff' : '#ff3030'; ctx.beginPath(); ctx.arc(0, -32, 3, 0, TAU); ctx.fill();
      FX.glowAt(ctx, 0, -32, 16, '#ff2a2a', .8 + .2 * Math.sin(G.t * 9));
      ctx.restore();
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
    draw(ctx, e, x, y) {
      if (e.alpha < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - e.alpha) * .9; glow(ctx, x, y - 38, 46, '#a25cff'); ctx.restore(); }
      drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, run: 1.4, t: G.t, seed: e.id, alpha: e.alpha, vest: '#1f1838', pants: '#17122b', mask: '#1a1530', full: true, slit: '#06050a', eye: '#d58cff', scarf: '#8a35d6', boots: '#0e0c18', gloves: '#0e0c18', kit: EGUNS.katana, aim: e.state === 'slash' ? -1.2 : .6, flash: e.flash });
    }
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
      if (e.tgt) {
        const t = e.tgt, x1 = x + e.face * 20, y1 = y - 45, x2 = t.x - G.camX, y2 = t.y - 45 - (t.z || 0);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let k = 0; k < 2; k++) {
          ctx.strokeStyle = k ? 'rgba(220,255,230,.9)' : 'rgba(60,255,130,.35)'; ctx.lineWidth = k ? 1.6 : 6;
          ctx.beginPath(); ctx.moveTo(x1, y1);
          for (let i = 1; i <= 10; i++) { const q = i / 10; ctx.lineTo(lerp(x1, x2, q), lerp(y1, y2, q) + Math.sin(q * 12 - G.t * 14) * 4 * Math.sin(q * Math.PI)); }
          ctx.stroke();
        }
        ctx.restore();
        FX.glow(x2, y2, 26, '#3dff8a', .8); FX.glow(x1, y1, 14, '#3dff8a', .7);
        ctx.fillStyle = 'rgba(120,255,160,.9)'; for (let i = 0; i < 3; i++) { const k = (G.t * .9 + i / 3) % 1, px = x2 + Math.sin(i * 2.4 + G.t) * 12, py = y2 - 8 - k * 30; ctx.globalAlpha = 1 - k; ctx.fillRect(px - 3.5, py - 1, 7, 2); ctx.fillRect(px - 1, py - 3.5, 2, 7); } ctx.globalAlpha = 1;
      }
      drawSoldier(ctx, x, y, { face: e.face, anim: e.anim, walk: e.moving, t: G.t, seed: e.id, vest: '#e9edf0', pants: '#98a2ab', helmet: '#f4f6f8', helmCross: true, cross: true, skin: '#e0a878', pack: '#cfd6dc', knee: '#7d8790', gun: 'pistol', flash: e.flash });
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
      const fl = e.flash > 0, C = c => fl ? tone(c, .6) : c, st = e.state;
      const lunge = st === 'lunge', crouch = st === 'crouch', ph = e.anim * 1.5, mv = e.moving || lunge;
      ctx.save(); ctx.translate(x, y); ctx.scale(e.face, 1);
      const by = (crouch ? 6 : 0) + (mv ? -Math.abs(Math.sin(ph)) * 2.5 : Math.sin(G.t * 3 + e.id) * .4), str = lunge ? 1.12 : 1;
      const body = '#3b4049', dark = '#23272d', metal = '#727c88';
      // zampe (le lontane più scure)
      const leg = (hx, hy, ang, bend, col, back) => {
        const k = back ? -1 : 1, L1 = 11, L2 = 11;
        const kx = hx + Math.sin(ang) * L1, ky = hy + Math.cos(ang) * L1, a2 = ang + bend * k, fx = kx + Math.sin(a2) * L2, fy = ky + Math.cos(a2) * L2;
        ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 7.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 5.2; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(fx + 2, fy, 3.6, 2.2, 0, 0, TAU); ink(ctx, col, 1.3);
      };
      const g = lunge ? [.9, -.9] : crouch ? [.5, -.4] : mv ? [Math.sin(ph) * .7, Math.sin(ph + 2.2) * .7] : [.1, -.1];
      const bnd = lunge ? .2 : crouch ? .9 : .5;
      leg(13 * str, -21 + by, g[0] + .35, bnd, C(dark), false); leg(-13 * str, -22 + by, g[1] - .35, bnd, C(dark), true);
      // coda meccanica
      const tw = Math.sin(G.t * 6 + e.id) * 3;
      seg(ctx, -17 * str, -27 + by, -25 * str, -32 + by + tw, 3.4, C(metal), 2); seg(ctx, -25 * str, -32 + by + tw, -30 * str, -38 + by + tw * 1.4, 2.6, C(metal), 2);
      // corpo
      ctx.beginPath(); ctx.moveTo(-19 * str, -27 + by);
      ctx.bezierCurveTo(-12 * str, -34 + by, 6 * str, -35 + by, 14 * str, -30 + by);
      ctx.bezierCurveTo(19 * str, -27 + by, 18 * str, -18 + by, 12 * str, -15 + by);
      ctx.bezierCurveTo(5 * str, -14 + by, -3 * str, -19 + by, -9 * str, -18.5 + by);
      ctx.bezierCurveTo(-16 * str, -18 + by, -22 * str, -21 + by, -19 * str, -27 + by); ctx.closePath();
      ctx.fillStyle = C(body); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = C(tone(body, -.3)); ctx.fillRect(-25 * str, -22 + by, 50 * str, 10); ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      // corazza sulla schiena
      ctx.beginPath(); ctx.moveTo(-13 * str, -31 + by); ctx.quadraticCurveTo(0, -37.5 + by, 11 * str, -32 + by); ctx.lineTo(10 * str, -28.5 + by); ctx.quadraticCurveTo(0, -33 + by, -12 * str, -28 + by); ctx.closePath(); ink(ctx, C(metal), 1.5);
      ctx.fillStyle = C('#a9b3bf'); ctx.fillRect(-6 * str, -34.6 + by, 9, 1.3);
      // zampe vicine
      leg(10 * str, -20 + by, g[1] + .35, bnd, C(body), false); leg(-15 * str, -21 + by, g[0] - .35, bnd, C(body), true);
      // collo e testa
      seg(ctx, 11 * str, -27 + by, 19 * str, -33 + by, 8, C(body), 2);
      const hx = 21 * str, hy = -34 + by, jaw = lunge ? 4 : crouch ? 2 : 0;
      poly(ctx, [hx + 2, hy + 3, hx + 11, hy + 4 + jaw, hx + 10, hy + 6.5 + jaw, hx + 1, hy + 6]); ink(ctx, C(dark), 1.5);
      if (jaw) { ctx.fillStyle = '#f2f2f2'; for (let i = 0; i < 3; i++) ctx.fillRect(hx + 4 + i * 2.4, hy + 3.4, 1, 1.6); }
      poly(ctx, [hx - 5, hy - 2, hx - 1, hy - 6, hx + 4, hy - 5.5, hx + 12.5, hy - 2.2, hx + 13, hy + 1.8, hx + 3, hy + 3.4, hx - 4, hy + 4]); ink(ctx, C(body), 1.8);
      poly(ctx, [hx - 3, hy - 4, hx - 1, hy - 13, hx + 2.6, hy - 5]); ink(ctx, C(dark), 1.4);
      ctx.fillStyle = C(metal); ctx.fillRect(hx - 3, hy - 1, 6, 2);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(hx + 12.6, hy - .4, 1.3, 0, TAU); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#ff2424'; ctx.fillRect(hx + 4.5, hy - 3, 3.6, 1.8);
      FX.glowAt(ctx, hx + 6.3, hy - 2.1, 10, '#ff2020', .9);
      ctx.restore();
    }
  },
  // generatore dello scudo del mega boss
  gen: {
    name: 'Generatore', hp: 300, spd: 0, w: 40, d: 30, h: 40, score: 1000, flyer: true,
    init(e) { e.z = 80; },
    update(e, dt) { const b = G.boss; if (!b || b.hp <= 0) { e.hp = 0; return; } e.ang += dt * 1.1 * G.D.bspd; e.x = b.x - 60 + Math.cos(e.ang) * 230; e.y = clamp(b.y + Math.sin(e.ang) * 90, GT + 10, GB); e.z = 70 + Math.sin(G.t * 3 + e.ang) * 20; e.cd -= dt; if (e.cd <= 0) { e.cd = eCd(e, 1.6); enemyShoot(e, { spd: 280, dmg: 10, r: 6, col: '#ff3d7f', z: e.z }); } },
    draw(ctx, e, x, y) {
      const z = y - e.z, fl = e.flash > 0, a = G.t * 2.2 + e.ang;
      FX.glow(x, z, 70, '#ff2a78', .7 + .2 * Math.sin(G.t * 6));
      const ring = (front, tilt, r, col) => { ctx.save(); ctx.translate(x, z); ctx.rotate(tilt); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, r, r * .32, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke(); ctx.restore(); };
      ring(false, Math.sin(a) * .5, 30, '#ff4f9a'); ring(false, -Math.sin(a) * .5 + 1.2, 27, '#ffb0d0');
      const gr = ctx.createRadialGradient(x - 6, z - 6, 2, x, z, 20); gr.addColorStop(0, fl ? '#fff' : '#5a2050'); gr.addColorStop(1, fl ? '#fdd' : '#1d0820');
      ctx.beginPath(); ctx.arc(x, z, 19, 0, TAU); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#ff3d7f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, z, 14, G.t * 4, G.t * 4 + 3.6); ctx.stroke();
      ctx.fillStyle = '#ffe1ef'; ctx.beginPath(); ctx.arc(x, z, 6.5 + Math.sin(G.t * 10) * .8, 0, TAU); ctx.fill();
      FX.glow(x, z, 26, '#ff7ab8', 1);
      ring(true, Math.sin(a) * .5, 30, '#ff4f9a'); ring(true, -Math.sin(a) * .5 + 1.2, 27, '#ffb0d0');
    }
  }
};
