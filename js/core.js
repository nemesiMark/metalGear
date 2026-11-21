// ===== METAL GEAR — base: costanti, utilità, salvataggi, input, audio =====
'use strict';
const W = 960, H = 540;
const GT = 330, GB = 522;           // fascia del terreno (profondità su/giù)
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const store = {
  get(k, d) { try { const v = localStorage.getItem('metalgear_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('metalgear_' + k, JSON.stringify(v)); } catch (e) { } }
};

// ---------------- INPUT ----------------
const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  fire: ['KeyJ', 'KeyX'], jump: ['KeyK', 'KeyZ', 'Space'], gren: ['KeyL', 'KeyC'],
  prev: ['KeyQ'], next: ['KeyE'], pause: ['KeyP', 'Escape'], ok: ['Enter', 'NumpadEnter'], mute: ['KeyM'], back: ['Escape', 'Backspace']
};
const Input = {
  keys: {}, pressed: {}, touch: {}, tpressed: {}, pad: {}, ppressed: {}, padPrev: {}, clicks: [], isTouch: false,
  touches: {}, stick: null,
  init(canvas) {
    addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true; Snd.init();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.touch = {}; });
    const toGame = (cx, cy) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left) / r.width * W, y: (cy - r.top) / r.height * H }; };
    canvas.addEventListener('mousedown', e => { Snd.init(); const p = toGame(e.clientX, e.clientY); this.clicks.push(p); });
    const tstart = e => {
      e.preventDefault(); Snd.init(); this.isTouch = true;
      for (const t of e.changedTouches) {
        const p = toGame(t.clientX, t.clientY);
        this.touches[t.identifier] = { x: p.x, y: p.y, sx: p.x, sy: p.y, role: null };
        const tt = this.touches[t.identifier];
        if (typeof G !== 'undefined' && G.state === 'play' && !G.paused) {
          const b = touchButtonAt(p.x, p.y);
          if (b) { tt.role = b; this.touch[b] = true; this.tpressed[b] = true; }
          else if (p.x < W * 0.45) { tt.role = 'stick'; this.stick = { ox: p.x, oy: p.y, x: p.x, y: p.y }; }
          else this.clicks.push(p);
        } else this.clicks.push(p);
      }
    };
    const tmove = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const tt = this.touches[t.identifier]; if (!tt) continue;
        const p = toGame(t.clientX, t.clientY); tt.x = p.x; tt.y = p.y;
        if (tt.role === 'stick' && this.stick) { this.stick.x = p.x; this.stick.y = p.y; }
      }
    };
    const tend = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const tt = this.touches[t.identifier]; if (!tt) continue;
        if (tt.role === 'stick') this.stick = null; else if (tt.role) this.touch[tt.role] = false;
        delete this.touches[t.identifier];
      }
    };
    canvas.addEventListener('touchstart', tstart, { passive: false });
    canvas.addEventListener('touchmove', tmove, { passive: false });
    canvas.addEventListener('touchend', tend, { passive: false });
    canvas.addEventListener('touchcancel', tend, { passive: false });
  },
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find(p => p);
    const now = {};
    if (gp) {
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, b = i => gp.buttons[i] && gp.buttons[i].pressed;
      now.left = ax < -0.35 || b(14); now.right = ax > 0.35 || b(15); now.up = ay < -0.35 || b(12); now.down = ay > 0.35 || b(13);
      now.fire = b(2) || b(7); now.jump = b(0); now.gren = b(1) || b(6); now.prev = b(4); now.next = b(5);
      now.pause = b(9); now.ok = b(0) || b(9); now.back = b(1);
    }
    this.ppressed = {};
    for (const k in now) if (now[k] && !this.padPrev[k]) this.ppressed[k] = true;
    this.pad = now; this.padPrev = now;
    // stick virtuale
    if (this.stick) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
      this.touch.left = dx < -14; this.touch.right = dx > 14; this.touch.up = dy < -14; this.touch.down = dy > 14;
    } else if (this.isTouch) { this.touch.left = this.touch.right = this.touch.up = this.touch.down = false; }
  },
  down(a) { return KEYMAP[a].some(c => this.keys[c]) || !!this.touch[a] || !!this.pad[a]; },
  hit(a) { return KEYMAP[a].some(c => this.pressed[c]) || !!this.tpressed[a] || !!this.ppressed[a]; },
  key(code) { return !!this.pressed[code]; },
  endFrame() { this.pressed = {}; this.tpressed = {}; this.clicks = []; }
};

// pulsanti touch (in coordinate di gioco)
const TOUCH_BTNS = [
  { id: 'fire', x: 860, y: 450, r: 52, label: 'FUOCO' },
  { id: 'jump', x: 760, y: 490, r: 38, label: 'SALTO' },
  { id: 'gren', x: 770, y: 385, r: 32, label: 'BOMBA' },
  { id: 'next', x: 880, y: 330, r: 28, label: 'ARMA' },
  { id: 'pause', x: 910, y: 70, r: 22, label: 'II' }
];
function touchButtonAt(x, y) { for (const b of TOUCH_BTNS) if (Math.hypot(x - b.x, y - b.y) < b.r + 10) return b.id; return null; }

// ---------------- AUDIO (sintetizzato) ----------------
const Snd = {
  ctx: null, muted: store.get('muted', false), last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.55; this.master.connect(this.ctx.destination);
      const comp = this.ctx.createDynamicsCompressor(); comp.connect(this.master);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = 0.55; this.sfx.connect(comp);
      this.mus = this.ctx.createGain(); this.mus.gain.value = 0.2; this.mus.connect(comp);
      const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pendingTheme != null) this.music(this.pendingTheme);
    } catch (e) { this.ctx = null; }
  },
  toggle() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.55; store.set('muted', this.muted); },
  tone(f, dur, type = 'square', vol = .3, slide = 0, when = 0, dest) {
    if (!this.ctx) return; const t = this.ctx.currentTime + Math.max(0, when);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol = .3, freq = 1000, type = 'lowpass', when = 0, dest, slide) {
    if (!this.ctx) return; const t = this.ctx.currentTime + Math.max(0, when);
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  play(name) {
    if (!this.ctx) return;
    const now = performance.now(), gap = { laser: 70, flame: 60, smg: 45, ehit: 40, eshot: 50, hit: 35, spark: 50 }[name] || 25;
    if (this.last[name] && now - this.last[name] < gap) return; this.last[name] = now;
    switch (name) {
      case 'pistol': this.tone(880, .08, 'square', .12, .35); this.noise(.06, .2, 3500); break;
      case 'shotgun': this.noise(.3, .55, 1800, 'lowpass', 0, null, .15); this.tone(140, .18, 'sawtooth', .3, .4); break;
      case 'smg': this.noise(.045, .22, 4200); this.tone(620, .04, 'square', .07, .5); break;
      case 'laser': this.tone(1500, .07, 'sawtooth', .045, .7); break;
      case 'rocket': this.noise(.45, .28, 900, 'bandpass', 0, null, .3); this.tone(220, .3, 'triangle', .15, .5); break;
      case 'plasma': this.tone(420, .14, 'sine', .2, 2.2); break;
      case 'tesla': this.noise(.14, .32, 6000, 'highpass'); this.tone(2200, .1, 'square', .05, .2); break;
      case 'flame': this.noise(.12, .14, 1100, 'bandpass'); break;
      case 'eshot': this.tone(380, .09, 'square', .06, .5); break;
      case 'ehit': this.tone(240, .05, 'square', .07, .6); break;
      case 'spark': this.tone(2400, .04, 'square', .05, .5); break;
      case 'hit': this.tone(180, .06, 'square', .1, .5); break;
      case 'explode': this.noise(.7, .6, 1300, 'lowpass', 0, null, .08); this.tone(90, .45, 'sine', .5, .3); break;
      case 'bigexplode': this.noise(1.4, .9, 1100, 'lowpass', 0, null, .05); this.tone(60, 1, 'sine', .7, .3); break;
      case 'pickup': [660, 880, 1320].forEach((f, i) => this.tone(f, .09, 'square', .12, 0, i * .06)); break;
      case 'weapon': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, .12, 'square', .13, 0, i * .07)); break;
      case 'hurt': this.tone(160, .25, 'sawtooth', .3, .45); break;
      case 'die': this.tone(400, .9, 'sawtooth', .3, .1); this.noise(.8, .4, 800); break;
      case 'jump': this.tone(300, .14, 'square', .07, 2); break;
      case 'alarm': for (let i = 0; i < 6; i++) this.tone(i % 2 ? 520 : 390, .25, 'square', .14, 0, i * .28); break;
      case 'charge': this.tone(200, .9, 'sawtooth', .12, 6); break;
      case 'aim': this.tone(1300, .05, 'sine', .05); break;
      case 'select': this.tone(660, .06, 'square', .1); break;
      case 'confirm': this.tone(523, .08, 'square', .12); this.tone(1046, .14, 'square', .12, 0, .08); break;
      case 'stomp': this.noise(.5, .7, 400, 'lowpass', 0, null, .3); this.tone(55, .5, 'sine', .7, .5); break;
      case 'beam': this.tone(90, .6, 'sawtooth', .25, 1.5); this.noise(.6, .3, 3000, 'bandpass'); break;
      case 'clear': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, .2, 'square', .13, 0, i * .12)); break;
      case 'block': this.tone(1800, .05, 'triangle', .1, .4); break;
    }
  },
  // ---- musica a passi ----
  music(theme) {
    this.pendingTheme = theme; if (!this.ctx) return;
    if (this.musTheme === theme && this.musTimer) return;
    this.stopMusic(); this.musTheme = theme;
    const th = THEMES[theme]; if (!th) return;
    this.m = { th, step: 0, next: this.ctx.currentTime + 0.12 };
    this.musTimer = setInterval(() => this.schedule(), 40);
  },
  stopMusic() { clearInterval(this.musTimer); this.musTimer = null; this.m = null; this.musTheme = null; },
  schedule() {
    const m = this.m; if (!m || !this.ctx) return;
    const spb = 60 / m.th.tempo / 4;
    while (m.next < this.ctx.currentTime + 0.25) {
      const s = m.step % 16, bar = Math.floor(m.step / 16) % m.th.prog.length, w = m.next - this.ctx.currentTime, d = this.mus, th = m.th;
      if (th.kick.includes(s)) this.tone(130, .2, 'sine', .9, .3, w, d);
      if (th.snare.includes(s)) this.noise(.14, .45, 2200, 'bandpass', w, d);
      if (th.hat && s % 2 === 0) this.noise(.03, .14, 8000, 'highpass', w, d);
      const root = th.prog[bar];
      const bn = th.bass[s]; if (bn != null) this.tone(th.base * Math.pow(2, (root + bn) / 12), spb * 1.7, th.bassType || 'sawtooth', .32, 0, w, d);
      if (th.lead) { const ln = th.lead[(bar * 16 + s) % th.lead.length]; if (ln != null) this.tone(th.base * 4 * Math.pow(2, (root + ln) / 12), spb * 1.6, 'square', .09, 0, w, d); }
      if (th.pad && s === 0) [0, 3, 7].forEach(iv => this.tone(th.base * 2 * Math.pow(2, (root + iv) / 12), spb * 15, 'triangle', .06, 0, w, d));
      m.next += spb; m.step++;
    }
  }
};
const _ = null;
const THEMES = {
  title: { tempo: 96, base: 55, prog: [0, -4, -2, -5], kick: [0, 8], snare: [12], hat: false, pad: true, bass: [0, _, _, _, _, _, 0, _, 12, _, _, _, 7, _, _, _], lead: null },
  jungle: { tempo: 132, base: 55, prog: [0, 0, -4, -2], kick: [0, 4, 8, 12], snare: [4, 12], hat: true, bass: [0, _, 0, 12, _, 0, _, 10, 0, _, 0, 12, _, 7, _, 10], lead: [12, _, _, 15, _, _, 17, _, 19, _, 17, _, 15, _, 12, _, 10, _, _, 12, _, _, 15, _, 12, _, _, _, _, _, _, _] },
  desert: { tempo: 124, base: 49, prog: [0, 1, 0, -2], kick: [0, 6, 8, 14], snare: [4, 12], hat: true, bass: [0, _, 1, _, 4, _, 0, _, 7, _, 6, _, 4, _, 1, _], lead: [12, _, 13, _, 16, _, _, _, 19, _, 16, _, 13, _, _, _, 12, _, _, _, 11, _, 12, _, 13, _, _, _, _, _, _, _] },
  city: { tempo: 140, base: 46, prog: [0, -2, -4, -5], kick: [0, 3, 8, 11], snare: [4, 12], hat: true, bassType: 'square', bass: [0, 0, 12, 0, 0, 12, 0, 10, 0, 0, 12, 0, 7, 0, 10, 0], lead: [_, _, 24, _, 22, _, 19, _, _, _, 22, _, 19, _, 17, _] },
  arctic: { tempo: 118, base: 52, prog: [0, -3, -5, -7], kick: [0, 10], snare: [8], hat: true, pad: true, bassType: 'triangle', bass: [0, _, _, 7, _, _, 12, _, _, 7, _, _, 3, _, _, _], lead: [19, _, _, _, 15, _, _, _, 14, _, _, _, 12, _, _, _, 10, _, _, _, 12, _, _, _, 14, _, _, _, _, _, _, _] },
  volcano: { tempo: 150, base: 41, prog: [0, 1, 0, 3], kick: [0, 2, 4, 8, 10, 12], snare: [4, 12], hat: true, bass: [0, 0, 0, 12, 0, 0, 1, 0, 0, 0, 0, 12, 0, 3, 1, 0], lead: [12, 13, 12, _, 15, _, 13, _, 12, _, _, _, 10, _, 12, _] },
  boss: { tempo: 160, base: 44, prog: [0, 0, 1, -1], kick: [0, 4, 6, 8, 12, 14], snare: [4, 12], hat: true, bass: [0, 12, 0, 12, 0, 12, 1, 13, 0, 12, 0, 12, 3, 15, 1, 13], lead: [24, _, 23, _, 24, _, 27, _, 24, _, 22, _, 19, _, _, _] },
  omega: { tempo: 172, base: 41, prog: [0, -1, -4, -5], kick: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12], hat: true, pad: true, bass: [0, 12, 0, 0, 12, 0, 1, 0, 0, 12, 0, 0, 13, 0, 12, 1], lead: [24, 25, 24, _, 31, _, 30, _, 27, _, 25, _, 24, _, 19, _, 20, _, 19, _, 24, _, _, _, 25, _, 24, _, 22, _, 20, _] },
  victory: { tempo: 110, base: 55, prog: [0, 5, 7, 0], kick: [0, 8], snare: [4, 12], hat: true, pad: true, bassType: 'triangle', bass: [0, _, _, _, 7, _, _, _, 12, _, _, _, 7, _, _, _], lead: [12, _, 16, _, 19, _, 24, _, _, _, 19, _, 16, _, _, _] }
};
