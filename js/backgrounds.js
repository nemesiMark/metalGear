// ===== Paesaggi procedurali a parallasse =====
'use strict';
const HOR = GT - 14; // linea dell'orizzonte

function layerEach(items, cam, f, T, cb, margin = 300) {
  const off = ((cam * f) % T + T) % T;
  for (const it of items) {
    let sx = it.x - off;
    for (let k = -1; k <= 1; k++) { const x = sx + k * T; if (x > -margin && x < W + margin) cb(it, x); }
  }
}
function ridge(rng, T, step, base, amp) { // profilo montuoso ripetibile
  const pts = []; const n = Math.ceil(T / step);
  const h = []; for (let i = 0; i < n; i++) h.push(rng());
  for (let i = 0; i <= n; i++) { const a = h[i % n], b = h[(i + 1) % n]; pts.push({ x: i * step, y: base - amp * (0.35 + 0.65 * a) }); if (rng() < 0.5) pts.push({ x: i * step + step / 2, y: base - amp * (0.3 + 0.7 * ((a + b) / 2 + (rng() - .5) * .4)) }); }
  return pts;
}
function drawRidge(ctx, pts, cam, f, T, base, fill) {
  const off = ((cam * f) % T + T) % T;
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(-off - T, base + 400);
  for (let k = -1; k <= 1; k++) for (const p of pts) ctx.lineTo(p.x + k * T - off, p.y);
  ctx.lineTo(2 * T - off, base + 400); ctx.closePath(); ctx.fill();
}
function haze(ctx, y0, y1, col, a) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a)); ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0); }
function groundLight(ctx, col, a, h = 110) { const g = ctx.createLinearGradient(0, HOR, 0, HOR + h); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(0, HOR, W, h); }
function skyGrad(ctx, stops) { const g = ctx.createLinearGradient(0, 0, 0, HOR + 20); stops.forEach(([p, c]) => g.addColorStop(p, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HOR + 30); }
function groundGrad(ctx, c1, c2) { const g = ctx.createLinearGradient(0, HOR, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, HOR, W, H - HOR); }

function palm(ctx, x, base, s, col, sway) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
  const tx = x + 30 * s + sway * 4, ty = base - 170 * s;
  ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + 5 * s, base - 90 * s, tx, ty); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55 + sway * 0.05; const L = 70 * s;
    const ex = tx + Math.cos(a) * L * 1.2, ey = ty + Math.sin(a) * L * 0.5 + 25 * s;
    ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .7 - 10 * s, ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .7 - 2 * s, ex, ey);
    ctx.quadraticCurveTo(tx + Math.cos(a) * L * .5, ty + Math.sin(a) * L * .5 + 8 * s, tx, ty); ctx.fill();
  }
}
function pine(ctx, x, base, s, col, snow) {
  ctx.fillStyle = col; ctx.fillRect(x - 3 * s, base - 20 * s, 6 * s, 20 * s);
  for (let i = 0; i < 4; i++) {
    const y = base - 20 * s - i * 26 * s, w = (46 - i * 9) * s;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - 46 * s); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
    if (snow) { ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(x - w * .55, y - 20 * s); ctx.lineTo(x, y - 46 * s); ctx.lineTo(x + w * .55, y - 20 * s); ctx.quadraticCurveTo(x, y - 14 * s, x - w * .55, y - 20 * s); ctx.fill(); }
  }
}

const BG = {
  // ---------------- GIUNGLA AL TRAMONTO ----------------
  jungle: {
    init(rng) {
      const d = {};
      d.far = ridge(rng, 1800, 90, HOR - 20, 150); d.mid = ridge(rng, 1400, 70, HOR, 80);
      d.palmsMid = []; for (let x = 0; x < 1400; x += 60 + rng() * 90) d.palmsMid.push({ x, s: .55 + rng() * .3 });
      d.palmsNear = []; for (let x = 0; x < 2000; x += 160 + rng() * 220) d.palmsNear.push({ x, s: 1 + rng() * .5 });
      d.birds = []; for (let i = 0; i < 6; i++) d.birds.push({ x: rng() * W, y: 60 + rng() * 120, s: .6 + rng() * .5 });
      d.flies = []; for (let i = 0; i < 40; i++) d.flies.push({ x: rng() * 3000, y: GT + rng() * (H - GT), p: rng() * 6 });
      d.ferns = []; for (let x = 0; x < 2400; x += 220 + rng() * 300) d.ferns.push({ x, s: .8 + rng() * .6 });
      d.dec = []; for (let x = 0; x < 3000; x += 40 + rng() * 80) d.dec.push({ x, y: GT + 10 + rng() * (H - GT - 10), k: rng() });
      return d;
    },
    draw(ctx, cam, t, d) {
      skyGrad(ctx, [[0, '#1d0b33'], [.35, '#5b1a52'], [.7, '#d2405a'], [1, '#ffb04a']]);
      const sx = 640 - cam * .02, sy = 175;
      glow(ctx, sx, sy, 260, 'rgba(255,170,80,0.55)'); FX.glow(sx, sy, 150, '#ffb060', .45);
      const sg = ctx.createLinearGradient(0, sy - 80, 0, sy + 80); sg.addColorStop(0, '#fff3a0'); sg.addColorStop(1, '#ff5f6d');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 80, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d2405a'; for (let i = 0; i < 6; i++) ctx.fillRect(sx - 90, sy + 18 + i * 11, 180, 2 + i * 1.2);
      ctx.strokeStyle = 'rgba(30,10,30,.7)'; ctx.lineWidth = 2;
      for (const b of d.birds) { const bx = ((b.x - t * 25 * b.s) % (W + 100) + W + 100) % (W + 100) - 50, by = b.y + Math.sin(t * 2 + b.x) * 6, w = Math.sin(t * 8 + b.x) * 5; ctx.beginPath(); ctx.moveTo(bx - 8 * b.s, by - w); ctx.lineTo(bx, by); ctx.lineTo(bx + 8 * b.s, by - w); ctx.stroke(); }
      drawRidge(ctx, d.far, cam, .08, 1800, HOR, '#6d2550'); haze(ctx, HOR - 150, HOR, '#ff6a5a', .22);
      drawRidge(ctx, d.mid, cam, .2, 1400, HOR, '#431639'); haze(ctx, HOR - 70, HOR, '#ff5a6a', .14);
      layerEach(d.palmsMid, cam, .3, 1400, (p, x) => palm(ctx, x, HOR + 8, p.s, '#2b0d2c', Math.sin(t + p.x)));
      groundGrad(ctx, '#3b2a1c', '#1a120b'); groundLight(ctx, '#ff8a50', .16);
      ctx.fillStyle = '#2e4a1f'; ctx.fillRect(0, HOR, W, 14); ctx.fillStyle = '#3c6327'; ctx.fillRect(0, HOR, W, 5);
      layerEach(d.dec, cam, 1, 3000, (p, x) => { if (p.k < .5) { const h0 = 8 + p.k * 16; ctx.lineCap = 'round'; ctx.strokeStyle = '#2c4519'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, p.y); ctx.quadraticCurveTo(x - 2, p.y - h0 * .6, x - 6, p.y - h0); ctx.moveTo(x + 2, p.y); ctx.quadraticCurveTo(x + 3, p.y - h0 * .7, x + 2, p.y - h0 * 1.2); ctx.moveTo(x + 4, p.y); ctx.quadraticCurveTo(x + 6, p.y - h0 * .5, x + 10, p.y - h0 * .8); ctx.stroke(); ctx.strokeStyle = 'rgba(150,200,90,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, p.y - 2); ctx.quadraticCurveTo(x + 3, p.y - h0 * .7, x + 2, p.y - h0 * 1.15); ctx.stroke(); } else { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, p.y, 10 + p.k * 10, 4, 0, 0, TAU); ctx.fill(); } }, 50);
      layerEach(d.palmsNear, cam, .55, 2000, (p, x) => palm(ctx, x, HOR + 4, p.s * .9, '#170718', Math.sin(t * .8 + p.x)));
    },
    front(ctx, cam, t, d) {
      for (const f of d.flies) { const x = ((f.x - cam) % 3000 + 3000) % 3000; if (x > W) continue; const a = .4 + .6 * Math.abs(Math.sin(t * 2 + f.p)); const fx2 = x + Math.sin(t + f.p) * 10, fy2 = f.y + Math.cos(t * 1.3 + f.p) * 8; glow(ctx, fx2, fy2, 6, 'rgba(220,255,120,.9)', a); FX.glow(fx2, fy2, 16, '#d8ff7a', a * .7); }
      ctx.globalAlpha = .75; layerEach(d.ferns, cam, 1.25, 2400, (p, x) => { const s0 = p.s; p = { s: s0 * .6 }; ctx.fillStyle = '#0b0410'; for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 40 * p.s, H + 12 + Math.sin(a) * 50 * p.s, 34 * p.s, 9 * p.s, a, 0, TAU); ctx.fill(); } }); ctx.globalAlpha = 1;
    }
  },
  // ---------------- DESERTO ----------------
  desert: {
    init(rng) {
      const d = {};
      d.mesa = []; for (let x = 0; x < 2000; x += 250 + rng() * 300) d.mesa.push({ x, w: 120 + rng() * 200, h: 60 + rng() * 90 });
      d.pyr = []; for (let x = 0; x < 2400; x += 500 + rng() * 600) d.pyr.push({ x, s: .7 + rng() * .7 });
      d.dunes = ridge(rng, 1600, 160, HOR + 5, 50);
      d.cacti = []; for (let x = 0; x < 1800; x += 180 + rng() * 300) d.cacti.push({ x, s: .7 + rng() * .6, k: rng() });
      d.sand = []; for (let i = 0; i < 70; i++) d.sand.push({ x: rng() * W, y: rng() * H, s: 1 + rng() * 2, v: 200 + rng() * 300 });
      d.dec = []; for (let x = 0; x < 3000; x += 60 + rng() * 120) d.dec.push({ x, y: GT + 10 + rng() * (H - GT - 10), k: rng() });
      d.bones = []; for (let x = 0; x < 3000; x += 700 + rng() * 600) d.bones.push({ x, y: GT + 30 + rng() * 150 });
      return d;
    },
    draw(ctx, cam, t, d) {
      skyGrad(ctx, [[0, '#0f4c8f'], [.55, '#4a9bd6'], [.85, '#f4d79a'], [1, '#f9b868']]);
      const sx = 780 - cam * .015; glow(ctx, sx, 90, 200, 'rgba(255,255,220,.8)'); FX.glow(sx, 90, 120, '#fff6d8', .45); ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(sx, 90, 38, 0, TAU); ctx.fill();
      layerEach(d.mesa, cam, .06, 2000, (m, x) => { ctx.fillStyle = '#c98a5c'; ctx.beginPath(); ctx.moveTo(x, HOR); ctx.lineTo(x + 20, HOR - m.h); ctx.lineTo(x + m.w - 20, HOR - m.h); ctx.lineTo(x + m.w, HOR); ctx.fill(); ctx.fillStyle = '#b37548'; ctx.fillRect(x + 20, HOR - m.h, m.w - 40, 8); });
      haze(ctx, HOR - 110, HOR, '#f6d6a0', .3);
      layerEach(d.pyr, cam, .13, 2400, (p, x) => { const s = p.s; ctx.fillStyle = '#d9a066'; ctx.beginPath(); ctx.moveTo(x - 110 * s, HOR); ctx.lineTo(x, HOR - 120 * s); ctx.lineTo(x + 110 * s, HOR); ctx.fill(); ctx.fillStyle = '#a8703f'; ctx.beginPath(); ctx.moveTo(x, HOR - 120 * s); ctx.lineTo(x + 110 * s, HOR); ctx.lineTo(x + 25 * s, HOR); ctx.fill(); });
      haze(ctx, HOR - 60, HOR, '#f8dcaa', .3);
      drawRidge(ctx, d.dunes, cam, .3, 1600, HOR, '#e2ab68');
      layerEach(d.cacti, cam, .5, 1800, (c, x) => { const s = c.s, b = HOR + 6; ctx.fillStyle = '#4f6b2a'; ctx.fillRect(x - 7 * s, b - 80 * s, 14 * s, 80 * s); ctx.fillRect(x - 26 * s, b - 55 * s, 8 * s, 24 * s); ctx.fillRect(x - 26 * s, b - 35 * s, 22 * s, 8 * s); ctx.fillRect(x + 18 * s, b - 65 * s, 8 * s, 28 * s); ctx.fillRect(x + 4 * s, b - 42 * s, 22 * s, 8 * s); ctx.beginPath(); ctx.arc(x, b - 80 * s, 7 * s, 0, TAU); ctx.fill(); });
      groundGrad(ctx, '#e7b877', '#b9823f'); groundLight(ctx, '#fff0cc', .3, 90);
      layerEach(d.dec, cam, 1, 3000, (p, x) => { ctx.strokeStyle = 'rgba(150,95,40,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 30, p.y); ctx.quadraticCurveTo(x, p.y - 5, x + 30, p.y); ctx.stroke(); if (p.k > .85) { ctx.fillStyle = '#9b7149'; ctx.beginPath(); ctx.ellipse(x, p.y, 9, 5, 0, 0, TAU); ctx.fill(); } }, 50);
      layerEach(d.bones, cam, 1, 3000, (p, x) => { ctx.fillStyle = '#f2e6cf'; ctx.beginPath(); ctx.arc(x, p.y - 8, 9, 0, TAU); ctx.fill(); ctx.fillRect(x - 5, p.y - 4, 10, 6); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 5, p.y - 11, 3, 3); ctx.fillRect(x + 2, p.y - 11, 3, 3); for (let i = 0; i < 4; i++) { ctx.fillStyle = '#e9dcc0'; ctx.fillRect(x + 14 + i * 7, p.y - 10, 3, 12); } }, 60);
    },
    front(ctx, cam, t, d) { ctx.fillStyle = 'rgba(240,200,140,.55)'; for (const p of d.sand) { const x = ((p.x - t * p.v - cam * .3) % W + W) % W; ctx.fillRect(x, p.y, p.s * 3, p.s * .6); } ctx.fillStyle = 'rgba(255,200,120,.06)'; ctx.fillRect(0, 0, W, H); }
  },
  // ---------------- CITTÀ IN ROVINA (notte, pioggia) ----------------
  city: {
    init(rng) {
      const d = {};
      const mk = (T, minW, maxW, minH, maxH, gap) => { const a = []; for (let x = 0; x < T; x += minW + rng() * (maxW - minW) + gap) { const w = minW + rng() * (maxW - minW), h = minH + rng() * (maxH - minH); const win = []; for (let wy = 12; wy < h - 10; wy += 14) for (let wx = 8; wx < w - 8; wx += 12) if (rng() < .3) win.push([wx, wy, rng()]); a.push({ x, w, h, win, broken: rng() < .5, cut: rng() * 30, neon: rng() < .35 ? pick(['#ff2a6d', '#05d9e8', '#f9f871', '#b967ff']) : null }); } return a; };
      d.far = mk(2000, 50, 110, 90, 230, 6); d.mid = mk(1800, 70, 140, 70, 170, 30);
      d.lamps = []; for (let x = 0; x < 1600; x += 400) d.lamps.push({ x });
      d.rain = []; for (let i = 0; i < 160; i++) d.rain.push({ x: rng() * W, y: rng() * H, v: 700 + rng() * 400, l: 10 + rng() * 14 });
      d.cars = []; for (let x = 0; x < 3000; x += 600 + rng() * 700) d.cars.push({ x, y: GT + 20 + rng() * 140, c: pick(['#3a2f3f', '#2b3a44', '#44302b']) });
      d.flash = 0; d.nextFlash = 3; return d;
    },
    draw(ctx, cam, t, d) {
      skyGrad(ctx, [[0, '#03040b'], [.6, '#0e1530'], [1, '#2a2350']]);
      glow(ctx, 200 - cam * .01, 90, 120, 'rgba(180,200,255,.35)'); ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.arc(200 - cam * .01, 90, 30, 0, TAU); ctx.fill(); ctx.fillStyle = '#0e1530'; ctx.beginPath(); ctx.arc(212 - cam * .01, 84, 27, 0, TAU); ctx.fill(); FX.glow(200 - cam * .01, 90, 80, '#cdd8ff', .3);
      const bld = (arr, f, T, col, winA) => layerEach(arr, cam, f, T, (b, x) => {
        const top = HOR - b.h; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, HOR); ctx.lineTo(x, top + (b.broken ? b.cut : 0)); if (b.broken) { ctx.lineTo(x + b.w * .3, top + b.cut * .4); ctx.lineTo(x + b.w * .5, top + b.cut); ctx.lineTo(x + b.w * .7, top); } else ctx.lineTo(x + b.w, top); ctx.lineTo(x + b.w, top); ctx.lineTo(x + b.w, HOR); ctx.fill();
        for (const [wx, wy, r] of b.win) if (wy > (b.broken ? b.cut : 0)) { ctx.fillStyle = `rgba(255,${200 + r * 50 | 0},120,${winA * (0.4 + 0.6 * (Math.sin(t * .5 + r * 30) > -.9))})`; ctx.fillRect(x + wx, top + wy, 5, 7); }
        if (b.neon) { const a = .6 + .4 * Math.sin(t * 6 + b.x); ctx.fillStyle = b.neon; ctx.globalAlpha = a; ctx.fillRect(x + b.w * .2, top + 30, b.w * .6, 6); ctx.globalAlpha = 1; FX.glow(x + b.w * .5, top + 33, b.w * .42, b.neon, a * .75); }
      });
      bld(d.far, .1, 2000, '#121a33', .35); bld(d.mid, .3, 1800, '#080c1a', .55);
      groundGrad(ctx, '#1f2330', '#0b0d13');
      ctx.fillStyle = '#2b3042'; ctx.fillRect(0, HOR, W, 10);
      const off = (cam % 160 + 160) % 160; ctx.fillStyle = 'rgba(240,210,90,.5)'; for (let x = -off; x < W; x += 160) ctx.fillRect(x, 432, 70, 5);
      layerEach(d.cars, cam, 1, 3000, (c, x) => { ctx.fillStyle = c.c; ctx.fillRect(x - 50, c.y - 26, 100, 20); ctx.fillRect(x - 30, c.y - 42, 55, 18); ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(x - 30, c.y - 6, 9, 0, TAU); ctx.arc(x + 30, c.y - 6, 9, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,120,40,.5)'; ctx.fillRect(x + 26, c.y - 40, 4, 4); }, 100);
      layerEach(d.lamps, cam, .6, 1600, (l, x) => { ctx.fillStyle = '#05060a'; ctx.fillRect(x - 3, HOR - 140, 6, 146); ctx.fillRect(x - 3, HOR - 140, 40, 5); const flick = Math.sin(t * 13 + l.x) > -.85 ? 1 : .2; glow(ctx, x + 36, HOR - 132, 70, 'rgba(255,220,150,.5)', flick); ctx.globalAlpha = .08 * flick; ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.moveTo(x + 30, HOR - 132); ctx.lineTo(x - 40, H); ctx.lineTo(x + 120, H); ctx.fill(); ctx.globalAlpha = 1; FX.glow(x + 36, HOR - 131, 24, '#ffe2a0', flick * .9); FX.light(x + 36, HOR - 120, 90, '#ffe6b0', flick * .55); FX.light(x + 40, H - 80, 200, '#ffe6b0', flick * .6); });
      // riflessi sull'asfalto bagnato
      ctx.globalAlpha = .12; ctx.fillStyle = '#7fa8ff'; for (let i = 0; i < 6; i++) { const x = ((i * 233 - cam) % 1200 + 1200) % 1200 - 100; ctx.fillRect(x, 360 + (i * 37) % 140, 90, 3); } ctx.globalAlpha = 1;
    },
    front(ctx, cam, t, d) {
      ctx.strokeStyle = 'rgba(170,190,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const r of d.rain) { const y = (r.y + t * r.v) % H, x = ((r.x - y * .25 - cam * .1) % W + W) % W; ctx.moveTo(x, y); ctx.lineTo(x - r.l * .25, y + r.l); } ctx.stroke();
      d.nextFlash -= 1 / 60; if (d.nextFlash < 0) { d.flash = 1; d.nextFlash = 5 + Math.random() * 8; if (typeof Snd !== 'undefined') Snd.noise(1.5, .25, 300, 'lowpass', .2); }
      if (d.flash > 0) { FX.fill('#c8d2ff', d.flash * .9); ctx.fillStyle = `rgba(200,210,255,${d.flash * .35})`; ctx.fillRect(0, 0, W, H); d.flash -= .04; }
    }
  },
  // ---------------- BASE ARTICA ----------------
  arctic: {
    init(rng) {
      const d = {};
      d.stars = []; for (let i = 0; i < 90; i++) d.stars.push({ x: rng() * W, y: rng() * 220, a: rng() });
      d.far = ridge(rng, 1800, 120, HOR - 10, 190); d.mid = ridge(rng, 1500, 80, HOR, 100);
      d.pines = []; for (let x = 0; x < 1600; x += 50 + rng() * 120) d.pines.push({ x, s: .6 + rng() * .5 });
      d.snow = []; for (let i = 0; i < 120; i++) d.snow.push({ x: rng() * W, y: rng() * H, s: 1 + rng() * 2.5, v: 30 + rng() * 60, p: rng() * 6 });
      d.dec = []; for (let x = 0; x < 3000; x += 80 + rng() * 150) d.dec.push({ x, y: GT + 15 + rng() * (H - GT - 20), w: 30 + rng() * 60 });
      d.tow = []; for (let x = 0; x < 2600; x += 900 + rng() * 600) d.tow.push({ x });
      return d;
    },
    draw(ctx, cam, t, d) {
      skyGrad(ctx, [[0, '#010614'], [.6, '#0c2244'], [1, '#2d5b86']]);
      for (const s of d.stars) { ctx.fillStyle = `rgba(255,255,255,${.3 + .7 * Math.abs(Math.sin(t + s.a * 9))})`; ctx.fillRect(s.x, s.y, 2, 2); }
      ctx.globalCompositeOperation = 'lighter';
      [['rgba(60,255,160,', 80, 0], ['rgba(80,180,255,', 120, 2], ['rgba(190,90,255,', 60, 4]].forEach(([c, y0, ph]) => {
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, y0); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y0 + i * 10 + Math.sin(x * .008 + t * .4 + ph + i) * 30 + Math.sin(x * .02 - t * .7) * 10); ctx.lineTo(W, y0 + 90); ctx.lineTo(0, y0 + 90); ctx.closePath(); const g = ctx.createLinearGradient(0, y0 - 40, 0, y0 + 90); g.addColorStop(0, c + '0.18)'); g.addColorStop(1, c + '0)'); ctx.fillStyle = g; ctx.fill(); }
      });
      ctx.globalCompositeOperation = 'source-over';
      drawRidge(ctx, d.far, cam, .07, 1800, HOR, '#8fb4d6'); haze(ctx, HOR - 130, HOR, '#bcd8f0', .25);
      // cime innevate
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, HOR - 110); ctx.clip(); drawRidge(ctx, d.far, cam, .07, 1800, HOR, '#f2f8ff'); ctx.restore();
      drawRidge(ctx, d.mid, cam, .18, 1500, HOR, '#4f7aa3');
      layerEach(d.tow, cam, .35, 2600, (p, x) => { ctx.fillStyle = '#1d3550'; ctx.fillRect(x - 14, HOR - 150, 28, 155); ctx.fillRect(x - 34, HOR - 170, 68, 26); ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff3344' : '#551118'; ctx.beginPath(); ctx.arc(x, HOR - 176, 5, 0, TAU); ctx.fill(); if (Math.sin(t * 4) > 0) FX.glow(x, HOR - 176, 22, '#ff3344', .9); FX.glow(x, HOR - 159, 34, '#a0e6ff', .35); ctx.fillStyle = 'rgba(160,230,255,.6)'; ctx.fillRect(x - 28, HOR - 164, 56, 10); });
      layerEach(d.pines, cam, .45, 1600, (p, x) => pine(ctx, x, HOR + 6, p.s, '#163049', '#e8f3ff'));
      groundGrad(ctx, '#eef6fd', '#a9c3d9');
      layerEach(d.dec, cam, 1, 3000, (p, x) => { ctx.fillStyle = 'rgba(150,200,235,.45)'; ctx.beginPath(); ctx.ellipse(x, p.y, p.w, p.w * .18, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x - p.w * .4, p.y - 2, p.w * .3, 2); }, 100);
    },
    front(ctx, cam, t, d) { ctx.fillStyle = '#fff'; for (const s of d.snow) { const y = (s.y + t * s.v) % H, x = ((s.x + Math.sin(t + s.p) * 20 - cam * .2 * s.s) % W + W) % W; ctx.globalAlpha = .5 + s.s * .2; ctx.beginPath(); ctx.arc(x, y, s.s, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
  },
  // ---------------- FORTEZZA VULCANICA ----------------
  volcano: {
    init(rng) {
      const d = {};
      d.spires = []; for (let x = 0; x < 1600; x += 90 + rng() * 160) d.spires.push({ x, w: 30 + rng() * 50, h: 80 + rng() * 140 });
      d.rocks = ridge(rng, 1400, 70, HOR + 5, 60);
      d.embers = []; for (let i = 0; i < 80; i++) d.embers.push({ x: rng() * W, y: rng() * H, v: 30 + rng() * 80, p: rng() * 6, s: 1 + rng() * 2 });
      d.cracks = []; for (let x = 0; x < 3000; x += 120 + rng() * 200) { const y = GT + 20 + rng() * (H - GT - 30); const pts = [[0, 0]]; let cx = 0, cy = 0; for (let i = 0; i < 5; i++) { cx += 15 + rng() * 25; cy += (rng() - .5) * 14; pts.push([cx, cy]); } d.cracks.push({ x, y, pts }); }
      d.smoke = []; for (let i = 0; i < 8; i++) d.smoke.push({ p: rng(), s: 40 + rng() * 40 });
      return d;
    },
    draw(ctx, cam, t, d) {
      skyGrad(ctx, [[0, '#120203'], [.5, '#4a0b07'], [.85, '#b52a0c'], [1, '#ff6a1c']]);
      const vx = 520 - cam * .04;
      for (const s of d.smoke) { const k = (s.p + t * .05) % 1; ctx.fillStyle = `rgba(40,20,20,${.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(vx + Math.sin(k * 5 + s.p * 9) * 60 + k * 120, 120 - k * 140, s.s * (0.6 + k), 0, TAU); ctx.fill(); }
      glow(ctx, vx, 120, 160, 'rgba(255,120,30,.6)', .7 + .3 * Math.sin(t * 3)); FX.glow(vx, 128, 110, '#ff7a20', .55 + .2 * Math.sin(t * 3));
      ctx.fillStyle = '#2a0906'; ctx.beginPath(); ctx.moveTo(vx - 380, HOR); ctx.lineTo(vx - 60, 125); ctx.lineTo(vx + 60, 125); ctx.lineTo(vx + 380, HOR); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(vx - 10, 128); ctx.lineTo(vx - 30, 190); ctx.lineTo(vx - 15, 230); ctx.lineTo(vx - 50, 300); ctx.moveTo(vx + 20, 128); ctx.lineTo(vx + 40, 200); ctx.lineTo(vx + 80, 280);
      ctx.strokeStyle = 'rgba(255,80,0,.35)'; ctx.lineWidth = 11; ctx.stroke(); ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = 'rgba(255,220,150,.8)'; ctx.lineWidth = 1.4; ctx.stroke();
      for (const [gx, gy] of [[vx - 30, 190], [vx - 50, 300], [vx + 40, 200], [vx + 80, 280]]) FX.glow(gx, gy, 40, '#ff5a00', .45);
      layerEach(d.spires, cam, .25, 1600, (s, x) => { ctx.fillStyle = '#1e0805'; ctx.beginPath(); ctx.moveTo(x - s.w / 2, HOR); ctx.lineTo(x - s.w * .15, HOR - s.h); ctx.lineTo(x + s.w * .1, HOR - s.h - 10); ctx.lineTo(x + s.w / 2, HOR); ctx.fill(); });
      drawRidge(ctx, d.rocks, cam, .45, 1400, HOR, '#130504');
      groundGrad(ctx, '#2e1b16', '#110806');
      ctx.lineCap = 'round';
      layerEach(d.cracks, cam, 1, 3000, (c, x) => { const a = .6 + .4 * Math.sin(t * 2 + c.x); ctx.beginPath(); c.pts.forEach(([px, py], i) => i ? ctx.lineTo(x + px, c.y + py) : ctx.moveTo(x + px, c.y + py)); ctx.lineJoin = 'round'; ctx.strokeStyle = `rgba(255,70,0,${.3 * a})`; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = `rgba(255,${90 + 60 * a | 0},20,${a})`; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = `rgba(255,230,160,${.7 * a})`; ctx.lineWidth = 1; ctx.stroke(); FX.light(x + 55, c.y, 120, '#ff8a3a', a); FX.glow(x + 55, c.y, 42, '#ff5a10', a * .35); }, 150);
    },
    front(ctx, cam, t, d) { for (const e of d.embers) { const y = ((e.y - t * e.v) % H + H) % H, x = ((e.x + Math.sin(t * 2 + e.p) * 15 - cam * .3) % W + W) % W; ctx.fillStyle = `rgba(255,${120 + 100 * Math.sin(t * 5 + e.p) | 0},40,.85)`; ctx.fillRect(x, y, e.s, e.s); if (e.s > 2) FX.glow(x, y, e.s * 5, '#ff8a2a', .6); } ctx.fillStyle = `rgba(255,60,0,${.05 + .03 * Math.sin(t * 2)})`; ctx.fillRect(0, 0, W, H); }
  },
  // ---------------- NUCLEO OMEGA ----------------
  core: {
    init(rng) {
      const d = {}; d.pipes = []; for (let x = 0; x < 1600; x += 140 + rng() * 120) d.pipes.push({ x, w: 20 + rng() * 30 });
      d.spark = []; for (let i = 0; i < 60; i++) d.spark.push({ x: rng() * W, y: rng() * H, v: 20 + rng() * 50, p: rng() * 6 });
      d.panels = []; for (let x = 0; x < 2000; x += 180) d.panels.push({ x, k: rng() });
      return d;
    },
    draw(ctx, cam, t, d) {
      skyGrad(ctx, [[0, '#04010c'], [1, '#1a0630']]);
      const cx = 480 - cam * .03, pulse = .6 + .4 * Math.sin(t * 2.5);
      glow(ctx, cx, 150, 240, 'rgba(255,40,90,.5)', pulse);
      ctx.strokeStyle = `rgba(255,60,110,${.5 + .5 * pulse})`; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, 150, 60 + i * 30, 20 + i * 10, t * (i % 2 ? 1 : -1) * .6, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = '#ffd1e0'; ctx.beginPath(); ctx.arc(cx, 150, 26 + pulse * 6, 0, TAU); ctx.fill(); FX.glow(cx, 150, 120, '#ff3d7f', .5 * pulse); FX.glow(cx, 150, 40, '#ffffff', .6);
      layerEach(d.pipes, cam, .15, 1600, (p, x) => { const g = ctx.createLinearGradient(x, 0, x + p.w, 0); g.addColorStop(0, '#120a20'); g.addColorStop(.5, '#2b1e44'); g.addColorStop(1, '#0c0716'); ctx.fillStyle = g; ctx.fillRect(x, 0, p.w, HOR); ctx.fillStyle = '#3a2a5c'; for (let y = 30; y < HOR; y += 70) ctx.fillRect(x - 3, y, p.w + 6, 8); });
      layerEach(d.panels, cam, .4, 2000, (p, x) => { ctx.fillStyle = '#0d0a1c'; ctx.fillRect(x, HOR - 160, 160, 160); ctx.strokeStyle = 'rgba(0,240,255,.25)'; ctx.lineWidth = 2; ctx.strokeRect(x + 10, HOR - 150, 140, 140); ctx.fillStyle = `rgba(0,240,255,${.2 + .3 * Math.abs(Math.sin(t * 2 + p.k * 9))})`; for (let i = 0; i < 5; i++) ctx.fillRect(x + 20, HOR - 140 + i * 22, 30 + ((p.k * 997 * (i + 1)) % 90), 6); FX.glow(x + 70, HOR - 90, 70, '#00f0ff', .12); });
      groundGrad(ctx, '#1a1530', '#07050f');
      ctx.strokeStyle = 'rgba(0,240,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 7; i++) { const y = HOR + Math.pow(i / 6, 1.6) * (H - HOR); ctx.moveTo(0, y); ctx.lineTo(W, y); }
      const off = (cam % 80 + 80) % 80; for (let x = -off - 400; x < W + 400; x += 80) { ctx.moveTo(x + (x - W / 2) * 0.0, HOR); ctx.lineTo(x + (x - W / 2) * 0.9, H); }
      ctx.stroke();
      ctx.fillStyle = '#ffcc00'; for (let x = -((cam) % 60 + 60) % 60; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, HOR); ctx.lineTo(x + 30, HOR); ctx.lineTo(x + 20, HOR + 8); ctx.lineTo(x - 10, HOR + 8); ctx.fill(); }
    },
    front(ctx, cam, t, d) { for (const s of d.spark) { const y = ((s.y - t * s.v) % H + H) % H; const sa = .3 + .5 * Math.abs(Math.sin(t * 3 + s.p)); ctx.fillStyle = `rgba(0,240,255,${sa})`; ctx.fillRect(s.x, y, 2, 2); if (s.v > 50) FX.glow(s.x + 1, y + 1, 9, '#00f0ff', sa); } }
  }
};
