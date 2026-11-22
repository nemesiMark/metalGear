// ===== Grafica comune: colori, sprite precalcolati, luci, bagliori e post-produzione =====
'use strict';
const INK = '#0b0d13';                                   // colore dei contorni ("inchiostro")
const FONT_D = '"Black Ops One", Impact, "Arial Black", sans-serif';      // titoli
const FONT_U = 'Teko, "Arial Narrow", "Helvetica Neue", Arial, sans-serif'; // interfaccia

// ---------------- colori (con cache: niente calcoli ripetuti a ogni fotogramma) ----------------
const _cParse = new Map(), _cTone = new Map(), _cMix = new Map(), _cRgba = new Map();
function parseCol(c) {
  let v = _cParse.get(c); if (v) return v;
  if (c[0] === '#') {
    let h = c.slice(1); if (h.length <= 4) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    v = [n >> 16 & 255, n >> 8 & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
  } else { const m = c.match(/[\d.]+/g) || [0, 0, 0]; v = [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1]; }
  if (_cParse.size > 3000) _cParse.clear(); _cParse.set(c, v); return v;
}
// k > 0 schiarisce verso il bianco, k < 0 scurisce verso il nero
function tone(c, k) {
  const key = c + k; let v = _cTone.get(key); if (v) return v;
  const [r, g, b] = parseCol(c), f = x => Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k));
  v = `rgb(${f(r)},${f(g)},${f(b)})`; if (_cTone.size > 5000) _cTone.clear(); _cTone.set(key, v); return v;
}
function mixCol(a, b, k) {
  const key = a + b + k; let v = _cMix.get(key); if (v) return v;
  const A = parseCol(a), B = parseCol(b), f = i => Math.round(A[i] + (B[i] - A[i]) * k);
  v = `rgb(${f(0)},${f(1)},${f(2)})`; if (_cMix.size > 3000) _cMix.clear(); _cMix.set(key, v); return v;
}
function rgba(c, a) {
  a = Math.round(clamp(a, 0, 1) * 100) / 100; const key = c + a; let v = _cRgba.get(key); if (v) return v;
  const [r, g, b] = parseCol(c); v = `rgba(${r},${g},${b},${a})`; if (_cRgba.size > 5000) _cRgba.clear(); _cRgba.set(key, v); return v;
}
// compatibilità con il vecchio shade(hex, ±punti)
function shade(hex, amt) { return tone(hex, clamp(amt / 160, -1, 1)); }

// ---------------- sprite precalcolati ----------------
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const SPR = { glow: new Map(), smoke: new Map(), flash: new Map() };
function glowSprite(col) { // alone morbido del colore indicato
  const [r, g, b] = parseCol(col), key = r + ',' + g + ',' + b; let s = SPR.glow.get(key); if (s) return s;
  s = mkCanvas(128, 128); const x = s.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  const c = a => `rgba(${r},${g},${b},${a})`;
  gr.addColorStop(0, c(1)); gr.addColorStop(.18, c(.75)); gr.addColorStop(.42, c(.32)); gr.addColorStop(.7, c(.1)); gr.addColorStop(1, c(0));
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); SPR.glow.set(key, s); return s;
}
function glow(ctx, x, y, r, col, a = 1) {
  const pa = parseCol(col)[3] * a; if (pa <= .004 || r <= 0) return;
  const ga = ctx.globalAlpha; ctx.globalAlpha = ga * Math.min(1, pa); ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = ga;
}
function smokeSprite(col, v) { // nuvola di fumo soffice (4 varianti)
  const key = col + v; let s = SPR.smoke.get(key); if (s) return s;
  s = mkCanvas(128, 128); const x = s.getContext('2d'), rng = mulberry32(17 + v * 31), [r, g, b] = parseCol(col);
  for (let i = 0; i < 9; i++) {
    const a = rng() * TAU, d = rng() * 26, cx = 64 + Math.cos(a) * d, cy = 64 + Math.sin(a) * d * .8, rr = 20 + rng() * 20;
    const gr = x.createRadialGradient(cx, cy - rr * .2, 0, cx, cy, rr);
    const lt = Math.round(18 * (1 - rng() * .5));
    gr.addColorStop(0, `rgba(${Math.min(255, r + lt)},${Math.min(255, g + lt)},${Math.min(255, b + lt)},.55)`); gr.addColorStop(.6, `rgba(${r},${g},${b},.32)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill();
  }
  SPR.smoke.set(key, s); return s;
}
let _fireSpr = null;
function fireSprite() { // palla di fuoco (si disegna in modalità additiva)
  if (_fireSpr) return _fireSpr;
  const s = mkCanvas(128, 128), x = s.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(.2, 'rgba(255,230,140,.95)'); gr.addColorStop(.45, 'rgba(255,140,40,.6)'); gr.addColorStop(.75, 'rgba(200,50,10,.2)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return (_fireSpr = s);
}
function flashSprite(col) { // lampo a stella della bocca di fuoco
  let s = SPR.flash.get(col); if (s) return s;
  s = mkCanvas(128, 128); const x = s.getContext('2d');
  x.translate(64, 64); x.globalCompositeOperation = 'lighter';
  const g0 = x.createRadialGradient(0, 0, 0, 0, 0, 30); g0.addColorStop(0, 'rgba(255,255,255,1)'); g0.addColorStop(.4, rgba(col, .9)); g0.addColorStop(1, rgba(col, 0));
  x.fillStyle = g0; x.beginPath(); x.arc(0, 0, 30, 0, TAU); x.fill();
  const spike = (a, L, w) => { x.save(); x.rotate(a); const g = x.createLinearGradient(0, 0, L, 0); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.5, rgba(col, .8)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(0, -w); x.lineTo(L, 0); x.lineTo(0, w); x.closePath(); x.fill(); x.restore(); };
  spike(0, 64, 9); spike(Math.PI, 26, 6); spike(.75, 38, 5); spike(-.75, 38, 5); spike(Math.PI / 2, 22, 4); spike(-Math.PI / 2, 22, 4);
  SPR.flash.set(col, s); return s;
}
function bandSprite(col) { // striscia orizzontale sfumata (bagliore dei raggi)
  const [r, g, b] = parseCol(col), key = 'band' + r + ',' + g + ',' + b; let s = SPR.glow.get(key); if (s) return s;
  s = mkCanvas(8, 64); const x = s.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64), c = a => `rgba(${r},${g},${b},${a})`;
  gr.addColorStop(0, c(0)); gr.addColorStop(.3, c(.25)); gr.addColorStop(.5, c(1)); gr.addColorStop(.7, c(.25)); gr.addColorStop(1, c(0));
  x.fillStyle = gr; x.fillRect(0, 0, 8, 64); SPR.glow.set(key, s); return s;
}
let _shadowSpr = null, _redVig = null;
function shadowSprite() { // ombra morbida ellittica sotto personaggi e oggetti
  if (_shadowSpr) return _shadowSpr;
  const s = mkCanvas(128, 128), x = s.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.5, 'rgba(0,0,0,.5)'); gr.addColorStop(.8, 'rgba(0,0,0,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return (_shadowSpr = s);
}
function redVignette() { // bordo rosso (vita bassa, colpi subiti, allarme boss)
  if (_redVig) return _redVig;
  const s = mkCanvas(320, 180), x = s.getContext('2d'), gr = x.createRadialGradient(160, 90, 60, 160, 90, 200);
  gr.addColorStop(0, 'rgba(255,0,20,0)'); gr.addColorStop(.6, 'rgba(200,0,20,.25)'); gr.addColorStop(1, 'rgba(150,0,10,.85)');
  x.fillStyle = gr; x.fillRect(0, 0, 320, 180); return (_redVig = s);
}
let _vigSpr = null, _grainSpr = null, _grainPat = null;
function vignetteSprite() {
  if (_vigSpr) return _vigSpr;
  const s = mkCanvas(320, 180), x = s.getContext('2d'), gr = x.createRadialGradient(160, 92, 40, 160, 92, 205);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.55, 'rgba(0,0,0,.08)'); gr.addColorStop(.8, 'rgba(0,0,0,.38)'); gr.addColorStop(1, 'rgba(0,0,0,.8)');
  x.fillStyle = gr; x.fillRect(0, 0, 320, 180); return (_vigSpr = s);
}
function grainPattern(ctx) {
  if (_grainPat) return _grainPat;
  if (!_grainSpr) {
    _grainSpr = mkCanvas(160, 160); const x = _grainSpr.getContext('2d'), d = x.createImageData(160, 160), rng = mulberry32(99);
    for (let i = 0; i < d.data.length; i += 4) { const v = rng() * 255 | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
  }
  return (_grainPat = ctx.createPattern(_grainSpr, 'repeat'));
}

// ---------------- luci e bagliori ----------------
// bloom: livello additivo a mezza risoluzione (bagliori di proiettili, fuoco, neon, occhi...)
// lightmap: luce ambiente moltiplicata sulla scena (livelli notturni) + luci dinamiche
const FX = {
  hi: true, on: false, amb: null, bloomK: 1,
  bc: null, bx: null, lc: null, lx: null,
  ensure() {
    if (this.bc) return;
    this.bc = mkCanvas(W / 2, H / 2); this.bx = this.bc.getContext('2d');
    this.lc = mkCanvas(W / 4, H / 4); this.lx = this.lc.getContext('2d');
  },
  // amb: { top, bot } colori della luce ambiente (null = nessun buio). sx, sy = scossa
  begin(amb, bloomK, sx = 0, sy = 0, rot = 0) {
    this.ensure(); this.on = true; this.amb = amb || null; this.bloomK = bloomK == null ? 1 : bloomK;
    const b = this.bx; b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1; b.clearRect(0, 0, this.bc.width, this.bc.height);
    b.setTransform(.5, 0, 0, .5, 0, 0); this._shake(b, sx, sy, rot); b.globalCompositeOperation = 'lighter';
    if (this.amb) {
      const l = this.lx; l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1;
      const g = l.createLinearGradient(0, 0, 0, this.lc.height); g.addColorStop(0, this.amb.top); g.addColorStop(.5, this.amb.top); g.addColorStop(.64, this.amb.bot); g.addColorStop(1, this.amb.bot);
      l.fillStyle = g; l.fillRect(0, 0, this.lc.width, this.lc.height);
      l.setTransform(.25, 0, 0, .25, 0, 0); this._shake(l, sx, sy, rot); l.globalCompositeOperation = 'lighter';
    }
  },
  _shake(c, sx, sy, rot) { if (sx || sy || rot) { c.translate(W / 2 + sx, H / 2 + sy); c.rotate(rot); c.translate(-W / 2, -H / 2); } },
  // bagliore additivo (illumina anche la scena nei livelli bui)
  glow(x, y, r, col, a = 1) {
    if (!this.on || r <= 0) return; const pa = parseCol(col)[3] * a; if (pa <= .01) return;
    const b = this.bx; b.globalAlpha = Math.min(1, pa); b.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
    if (this.amb) { const l = this.lx; l.globalAlpha = Math.min(1, pa * .9); l.drawImage(glowSprite(col), x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2); }
  },
  // bagliore in coordinate locali del disegno corrente (occhi, armi, motori): segue scala e rotazione
  glowAt(ctx, x, y, r, col, a = 1) {
    if (!this.on) return; const m = ctx.getTransform();
    const X = (m.a * x + m.c * y + m.e) / RS, Y = (m.b * x + m.d * y + m.f) / RS, sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) / RS;
    const pa = parseCol(col)[3] * a * ctx.globalAlpha; if (pa <= .01) return; const R = r * sc, spr = glowSprite(col);
    const b = this.bx; b.save(); b.setTransform(.5, 0, 0, .5, 0, 0); b.globalAlpha = Math.min(1, pa); b.drawImage(spr, X - R, Y - R, R * 2, R * 2); b.restore();
    if (this.amb) { const l = this.lx; l.save(); l.setTransform(.25, 0, 0, .25, 0, 0); l.globalAlpha = Math.min(1, pa * .9); l.drawImage(spr, X - R * 1.6, Y - R * 1.6, R * 3.2, R * 3.2); l.restore(); }
  },
  // fascia luminosa orizzontale da x0 a x1 (raggi laser)
  band(x0, x1, y, r, col, a = 1) {
    if (!this.on || x1 <= x0) return; const pa = parseCol(col)[3] * a; if (pa <= .01) return; const s = bandSprite(col);
    const b = this.bx; b.globalAlpha = Math.min(1, pa); b.drawImage(s, x0, y - r, x1 - x0, r * 2);
    if (this.amb) { const l = this.lx; l.globalAlpha = Math.min(1, pa * .8); l.drawImage(s, x0, y - r * 3, x1 - x0, r * 6); }
  },
  // illumina tutta la scena (lampi del temporale)
  fill(col, a = 1) {
    if (!this.on || !this.amb || a <= .01) return; const l = this.lx;
    l.save(); l.setTransform(1, 0, 0, 1, 0, 0); l.globalAlpha = Math.min(1, a); l.fillStyle = col; l.fillRect(0, 0, this.lc.width, this.lc.height); l.restore();
  },
  // sola illuminazione (senza bagliore visibile): pozze di luce dei lampioni, lava...
  light(x, y, r, col, a = 1) {
    if (!this.on || !this.amb || r <= 0) return; const pa = parseCol(col)[3] * a; if (pa <= .01) return;
    const l = this.lx; l.globalAlpha = Math.min(1, pa); l.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  },
  compose(ctx) {
    if (!this.on) return; this.on = false;
    ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.globalAlpha = 1;
    if (this.amb) { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(this.lc, 0, 0, W, H); }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = this.bloomK; ctx.drawImage(this.bc, 0, 0, W, H);
    ctx.restore();
  },
  // vignettatura, grana e tinta finale
  post(ctx, vig = .6, grade = null) {
    ctx.save(); ctx.setTransform(RS, 0, 0, RS, 0, 0);
    if (grade) { ctx.globalCompositeOperation = grade.mode || 'soft-light'; ctx.globalAlpha = grade.a; ctx.fillStyle = grade.col; ctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = vig; ctx.drawImage(vignetteSprite(), -8, -6, W + 16, H + 12);
    if (this.hi) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .07; ctx.fillStyle = grainPattern(ctx); ctx.translate(-randi(0, 150), -randi(0, 150)); ctx.fillRect(0, 0, W + 160, H + 160); }
    ctx.restore();
  }
};

// ---------------- primitive "a inchiostro" ----------------
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
function ink(ctx, fill, lw = 2) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
function fillP(ctx, fill, pts) { poly(ctx, pts); ctx.fillStyle = fill; ctx.fill(); }
// segmento spesso con contorno (arti, tubi, cavi)
function seg(ctx, x1, y1, x2, y2, w, col, lw = 2) {
  ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  if (lw > 0) { ctx.strokeStyle = INK; ctx.lineWidth = w + lw; ctx.stroke(); }
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
function circ(ctx, x, y, r, fill, lw = 2) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ink(ctx, fill, lw); }
// facilità di movimento (easing)
const ease = {
  out: k => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
  inOut: k => { k = clamp(k, 0, 1); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: k => { k = clamp(k, 0, 1); const c1 = 1.70158, c3 = c1 + 1, m = k - 1; return 1 + c3 * m * m * m + c1 * m * m; }
};
// due segmenti (braccio) dalla spalla alla mano: restituisce il gomito
function ik2(sx, sy, hx, hy, a, b, bend = 1) {
  const dx = hx - sx, dy = hy - sy; let d = Math.hypot(dx, dy) || .001; d = Math.min(d, (a + b) * .999);
  const th = Math.atan2(dy, dx), c = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), A = Math.acos(c) * bend;
  return [sx + Math.cos(th + A) * a, sy + Math.sin(th + A) * a];
}
