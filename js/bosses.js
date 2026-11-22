// ===== Boss di fine livello e MEGA BOSS =====
'use strict';
function bAim(b, ox, oz) { const p = G.player; const sx = b.x + ox; const dx = p.x - sx, dy = p.y - b.y; const L = Math.hypot(dx, dy) || 1; return { sx, dx: dx / L, dy: dy / L, L }; }
function bShoot(b, ox, oy, oz, spd, o = {}) { // proiettile mirato al giocatore (o.ang = deviazione)
  const p = G.player, sx = b.x + ox, sy = b.y + oy;
  let a = Math.atan2(p.y - sy, p.x - sx) + (o.ang || 0);
  const v = spd * G.D.bspd;
  eBullet(sx, sy, oz, Math.cos(a) * v, Math.sin(a) * v, o);
}
function bRadial(b, ox, oz, ang, spd, o = {}) { const v = spd * G.D.bspd; eBullet(b.x + ox, b.y, oz, Math.cos(ang) * v, Math.sin(ang) * v * .6, o); }
function bPick(b, list) { let a; do { a = pick(list); } while (list.length > 1 && a === b.lastAtk); b.lastAtk = a; return a; }
function bMinions(types, n) { for (let i = 0; i < n; i++) { const e = spawnEnemy(pick(types), G.camX + W + 40 + i * 30, rand(GT + 20, GB - 10)); if (e && G.diff >= 2) makeElite(e); } }
function arenaL() { return G.camX + 60; }
function arenaR() { return G.camX + W - 60; }

const BOSSES = {
  // ============ 1. RINOCERONTE — carro armato ============
  tank: {
    name: 'RINOCERONTE', sub: "Carro d'assalto corazzato", hp: 1500, w: 230, d: 52, h: 130,
    init(b) { b.x = arenaR() - 110; b.y = 430; b.st = 1.6; b.atk = null; b.tx = b.x; b.calls = 0; b.tread = 0; },
    update(b, dt, S) {
      const p = G.player, ph2 = b.hp < b.maxhp * .5;
      if (b.atk !== 'ram') { b.y = lerp(b.y, clamp(p.y, GT + 30, GB - 20), dt * .8 * S); const ox = b.x; b.x = lerp(b.x, b.tx, dt * .8); b.tread += (b.x - ox) * .2; }
      if (b.calls === 0 && b.hp < b.maxhp * .6 || b.calls === 1 && b.hp < b.maxhp * .3) { b.calls++; bMinions(['grunt', 'grunt', 'grenadier'], G.diff >= 2 ? 3 : 2); }
      b.st -= dt * S;
      if (!b.atk && b.st <= 0) { b.atk = bPick(b, ph2 ? ['cannon', 'mg', 'mortar', 'ram'] : ['cannon', 'mg', 'cannon']); b.at = 0; b.n = 0; b.tx = rand(G.camX + W * .55, arenaR() - 110); }
      if (!b.atk) return; b.at += dt * S;
      if (b.atk === 'cannon') {
        if (b.at > .7 && b.n === 0) { b.n = 1; const k = ph2 ? 3 : 1; for (let i = 0; i < k; i++) { const tx = p.x + (i - (k - 1) / 2) * 90, ty = p.y; const d = Math.hypot(tx - (b.x - 130), ty - b.y); eBullet(b.x - 130, b.y, 86, (tx - (b.x - 130)) / d * 430 * G.D.bspd, (ty - b.y) / d * 430 * G.D.bspd, { r: 11, col: '#ffb347', dmg: 18, life: d / (430 * G.D.bspd), boom: { r: 85, dmg: 24 }, kind: 'shell' }); } Snd.play('explode'); G.shake = 8; b.recoil = 14; }
        if (b.at > 1.4) end(b, 1.1);
      } else if (b.atk === 'mg') {
        b.cd = (b.cd || 0) - dt; if (b.cd <= 0) { b.cd = .07 / S; bShoot(b, -90, -10, 70, 360, { ang: Math.sin(b.at * 5) * .35, r: 4, col: '#ffe066', dmg: 7 }); Snd.play('eshot'); }
        if (b.at > 2) end(b, 1);
      } else if (b.atk === 'mortar') {
        if (b.at > .4 && b.n === 0) { b.n = 1; for (let i = 0; i < 6; i++) lobGrenade(b.x, b.y, p.x + rand(-160, 160), clamp(p.y + rand(-80, 80), GT, GB), 1.2 + i * .12, 22, 75); Snd.play('rocket'); }
        if (b.at > 1.5) end(b, .9);
      } else if (b.atk === 'ram') {
        if (b.at < 1) { b.shakeMe = 3; if (Math.random() < .5) puff(b.x + 100, b.y, 110, '#555'); }
        else if (b.n === 0) { b.x -= 650 * dt * S; b.tread -= 650 * dt * .2; if (b.x < arenaL() + 90) b.n = 1; }
        else { b.x += 230 * dt; b.tread += 230 * dt * .2; if (b.x > arenaR() - 110) { b.tx = b.x; end(b, 1); } }
      }
      b.recoil = lerp(b.recoil || 0, 0, dt * 6);
      function end(b, w) { b.atk = null; b.st = w; }
    },
    touchDmg: 28,
    draw(ctx, b, x, y) {
      const fl = b.flash > 0, C = c => fl ? tone(c, .55) : c; if (b.shakeMe) { x += rand(-3, 3); b.shakeMe = 0; }
      const rec = b.recoil || 0, tr = b.tread || 0, hurt = b.hp < b.maxhp * .5;
      ctx.save(); ctx.translate(x, y);
      // cingoli
      rr(ctx, -124, -50, 248, 50, 25); ink(ctx, C('#1c1e1a'), 3);
      ctx.save(); rr(ctx, -124, -50, 248, 50, 25); ctx.clip();
      ctx.fillStyle = C('#2e312b'); const off = ((tr * 2) % 12 + 12) % 12;
      for (let i = -130; i < 130; i += 12) { ctx.fillRect(i + off, -50, 6, 5); ctx.fillRect(i - off + 6, -5, 6, 5); }
      ctx.restore();
      for (let i = 0; i < 7; i++) {
        const wx = -96 + i * 32; ctx.beginPath(); ctx.arc(wx, -23, 14.5, 0, TAU); ink(ctx, C('#3b3f37'), 2.2);
        ctx.beginPath(); ctx.arc(wx, -23, 7, 0, TAU); ink(ctx, C('#5c6152'), 1.5);
        const a = tr * .1 + i; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * 12, -23 + Math.sin(a) * 12); ctx.lineTo(wx - Math.cos(a) * 12, -23 - Math.sin(a) * 12); ctx.moveTo(wx + Math.cos(a + 1.57) * 12, -23 + Math.sin(a + 1.57) * 12); ctx.lineTo(wx - Math.cos(a + 1.57) * 12, -23 - Math.sin(a + 1.57) * 12); ctx.stroke();
      }
      poly(ctx, [-130, -52, 130, -52, 124, -41, -124, -41]); ink(ctx, C('#4a5530'), 2.4);
      // scafo
      const HULL = [-136, -50, -106, -90, 118, -90, 132, -50];
      poly(ctx, HULL); ctx.fillStyle = C('#5f6e3b'); ctx.fill();
      ctx.save(); poly(ctx, HULL); ctx.clip();
      ctx.fillStyle = C('#4b5730'); for (const [cx, cy, r] of [[-70, -70, 18], [-10, -62, 14], [50, -76, 20], [96, -60, 13]]) { ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.6, r * .7, .2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = C('#77874a'); ctx.fillRect(-110, -90, 230, 6);
      ctx.fillStyle = C('#3f4a28'); ctx.fillRect(-140, -60, 280, 10);
      ctx.restore();
      poly(ctx, HULL); ink(ctx, null, 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-118, -70); ctx.lineTo(124, -70); ctx.moveTo(-40, -90); ctx.lineTo(-46, -52); ctx.moveTo(60, -90); ctx.lineTo(64, -52); ctx.stroke();
      ctx.fillStyle = INK; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-100 + i * 26, -64, 1.6, 0, TAU); ctx.fill(); }
      ctx.font = `18px ${FONT_D}`; ctx.textAlign = 'center'; ctx.fillStyle = C('#d9dcc4'); ctx.globalAlpha *= .85; ctx.fillText('R-01', 0, -74); ctx.globalAlpha /= .85;
      // corno d'ariete
      poly(ctx, [-132, -80, -188, -64, -132, -52]); ink(ctx, C('#b9bec4'), 2.5);
      fillP(ctx, C('#eef1f4'), [-134, -76, -176, -65, -134, -70]);
      // fari
      circ(ctx, -120, -82, 4.5, C('#ffe9a6'), 1.6); FX.glow(x - 124, y - 82, 26, '#ffd27a', .8);
      // torretta
      const T = [-58, -88, -48, -126, 56, -128, 68, -88];
      poly(ctx, T); ctx.fillStyle = C('#6c7b45'); ctx.fill();
      fillP(ctx, C('#55623a'), [-58, -88, -54, -102, 66, -102, 68, -88]);
      fillP(ctx, C('#86975a'), [-47, -124, 55, -126, 56, -119, -45, -118]);
      poly(ctx, T); ink(ctx, null, 3);
      // cannone
      rr(ctx, -154 + rec, -108, 104, 12, 3); ink(ctx, C('#2c2f2a'), 2.5);
      ctx.fillStyle = C('#4d524a'); ctx.fillRect(-150 + rec, -106, 96, 2.4);
      rr(ctx, -168 + rec, -112, 18, 20, 3); ink(ctx, C('#232622'), 2.4);
      ctx.fillStyle = INK; ctx.fillRect(-166 + rec, -105, 14, 2); ctx.fillRect(-166 + rec, -100, 14, 2);
      rr(ctx, -66, -114, 20, 26, 5); ink(ctx, C('#4f5b32'), 2.2);
      // botola, mitragliatrice, antenna
      rr(ctx, 10, -138, 32, 11, 4); ink(ctx, C('#55623a'), 2);
      seg(ctx, 18, -140, -14, -143, 3, C('#24272b'), 2);
      const sw = Math.sin(G.t * 3) * 4; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, -126); ctx.quadraticCurveTo(62 + sw * .5, -150, 66 + sw, -176); ctx.stroke();
      ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(66 + sw, -177, 2.4, 0, TAU); ctx.fill();
      const blink = Math.sin(G.t * 6) > 0; circ(ctx, 30, -110, 5, blink ? '#ff4a3a' : '#5a1410', 1.6); if (blink) FX.glow(x + 30, y - 110, 18, '#ff3020', .9);
      // tubo di scarico
      rr(ctx, 98, -112, 10, 26, 3); ink(ctx, C('#2c2f2a'), 2);
      if (hurt) { // danneggiato: fiamme e scintille
        const f = .7 + .3 * Math.sin(G.t * 23); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = f; ctx.drawImage(fireSprite(), 20, -116, 26, 34); ctx.drawImage(fireSprite(), -80, -100, 20, 26); ctx.restore();
        FX.glow(x + 33, y - 100, 36, '#ff8a2a', f);
        if (Math.random() < .08) sparks(b.x + rand(-80, 80), b.y, rand(60, 120), '#ffd27a', 2);
      }
      ctx.restore();
      if (Math.random() < .3) puff(b.x + 103, b.y, 140, hurt ? '#2a2826' : '#4a4744');
    }
  },
  // ============ 2. SCORPIONE D'ACCIAIO ============
  scorpion: {
    name: "SCORPIONE D'ACCIAIO", sub: 'Mech da deserto', hp: 2100, w: 220, d: 50, h: 110,
    init(b) { b.x = arenaR() - 120; b.y = 430; b.st = 1.5; b.home = b.x; b.calls = 0; },
    update(b, dt, S) {
      const p = G.player, ph2 = b.hp < b.maxhp * .5; b.walk = (b.walk || 0) + dt * 4;
      if (b.atk !== 'dash') b.y = lerp(b.y, clamp(p.y, GT + 30, GB - 15), dt * 1.1 * S);
      if (b.calls === 0 && ph2) { b.calls = 1; bMinions(['dog', 'dog', 'scout'], 3); }
      b.st -= dt * S;
      if (!b.atk && b.st <= 0) { b.atk = bPick(b, ph2 ? ['tail', 'dash', 'spit', 'tail'] : ['tail', 'spit', 'dash']); b.at = 0; b.n = 0; }
      if (!b.atk) return; b.at += dt * S;
      const end = w => { b.atk = null; b.st = w; };
      if (b.atk === 'tail') {
        if (b.n === 0) { b.n = 1; const lanes = [p.y]; if (ph2) lanes.push(p.y < (GT + GB) / 2 ? p.y + rand(70, 110) : p.y - rand(70, 110)); lanes.forEach(ly => addHazard({ kind: 'beam', y: clamp(ly, GT + 10, GB - 5), x0: G.camX - 20, x1: b.x - 60, warn: .95 / S, active: .55, dmg: 28, w: 34, col: '#7dff4d' })); Snd.play('charge'); }
        if (b.at > 1.9) end(.8);
      } else if (b.atk === 'dash') {
        if (b.at < .7) b.shakeMe = 3;
        else if (b.n === 0) { b.x -= 760 * dt * S; if (b.x < arenaL() + 100) { b.n = 1; G.shake = 6; Snd.play('stomp'); } }
        else { b.x += 260 * dt; if (b.x >= b.home) { b.x = b.home; end(.9); } }
      } else if (b.atk === 'spit') {
        if (b.at > .5 && b.n < (ph2 ? 2 : 1) && b.at > .5 + b.n * .5) { b.n++; const k = ph2 ? 7 : 5; for (let i = 0; i < k; i++) bShoot(b, -60, -20, 120, 260, { ang: (i - (k - 1) / 2) * .2, r: 9, col: '#9dff3a', dmg: 10, life: 1.4, acid: true, kind: 'glob', vz: -40 }); Snd.play('plasma'); }
        if (b.at > 1.8) end(1);
      }
    },
    touchDmg: 26,
    draw(ctx, b, x, y) {
      const fl = b.flash > 0, C = c => fl ? tone(c, .55) : c; if (b.shakeMe) { x += rand(-3, 3); b.shakeMe = 0; }
      const w = b.walk || 0, cl = b.atk === 'dash' ? -20 : Math.sin(G.t * 3) * 4, tailA = b.atk === 'tail';
      ctx.save(); ctx.translate(x, y);
      // zampe articolate: le anteriori puntano avanti, le posteriori indietro
      const leg = (i, far) => {
        const fwd = i < 2 ? -1 : 1, lx = -54 + i * 36 + (far ? 10 : 0), ph = Math.sin(w + i * 1.7 + (far ? Math.PI : 0)) * 7;
        const kx = lx + fwd * 26, ky = -50 + ph, fx = lx + fwd * 40, fy = -Math.max(0, -ph) * .8, col = far ? '#4a3b26' : '#76603e';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(lx, -36); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy);
        ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.stroke(); ctx.strokeStyle = C(col); ctx.lineWidth = 7; ctx.stroke();
        ctx.strokeStyle = C(tone(col, .3)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(kx - fwd * 2, ky - 2); ctx.lineTo(fx - fwd, fy - 8); ctx.stroke();
        circ(ctx, kx, ky, 5.5, C(tone(col, .2)), 2);
        poly(ctx, [fx - 5, fy - 7, fx + 5, fy - 7, fx + fwd * 7, fy + 1, fx - fwd * 2, fy + 1]); ink(ctx, C(tone(col, -.35)), 1.6);
      };
      for (let i = 0; i < 4; i++) leg(i, true);
      // coda segmentata
      const sw = Math.sin(G.t * 2) * 10, aim = tailA ? -10 : 0;
      const P0 = [76, -62], P1 = [150, -80], P2 = [150 + sw, -190], P3 = [70 + aim, -204];
      const bz = k => { const u = 1 - k, a = u * u * u, bb = 3 * u * u * k, c = 3 * u * k * k, d = k * k * k; return [a * P0[0] + bb * P1[0] + c * P2[0] + d * P3[0], a * P0[1] + bb * P1[1] + c * P2[1] + d * P3[1]]; };
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.bezierCurveTo(P1[0], P1[1], P2[0], P2[1], P3[0], P3[1]);
      ctx.strokeStyle = INK; ctx.lineWidth = 22; ctx.stroke(); ctx.strokeStyle = C('#6e5432'); ctx.lineWidth = 17; ctx.stroke();
      for (let i = 0; i < 11; i++) {
        const k = i / 11, [px, py] = bz(k), [qx, qy] = bz(k + .03), a = Math.atan2(qy - py, qx - px), r = 14 - i * .6;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, r * .95, r, 0, 0, TAU); ink(ctx, C(i % 2 ? '#a8844e' : '#b8945c'), 2);
        ctx.fillStyle = C('#e6cc96'); ctx.beginPath(); ctx.ellipse(-r * .1, -r * .5, r * .5, r * .24, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      // pungiglione: ghiandola del veleno e uncino
      const [sx, sy] = P3, vk = tailA ? 1 : .55 + .2 * Math.sin(G.t * 4);
      ctx.beginPath(); ctx.ellipse(sx, sy, 16, 12, -.3, 0, TAU); ink(ctx, C('#c9a46a'), 2.4);
      ctx.fillStyle = C('#efd8a6'); ctx.beginPath(); ctx.ellipse(sx - 3, sy - 5, 7, 3.5, -.3, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#7dff4d', .7 * vk); ctx.beginPath(); ctx.ellipse(sx + 3, sy + 3, 6, 4, -.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - 9, sy - 8); ctx.quadraticCurveTo(sx - 32, sy - 10, sx - 42, sy + 13); ctx.quadraticCurveTo(sx - 27, sy + 2, sx - 9, sy + 8); ctx.closePath(); ink(ctx, C('#f1e2b8'), 2.2);
      ctx.fillStyle = '#d8ffb0'; ctx.beginPath(); ctx.arc(sx - 41, sy + 13, 2.6, 0, TAU); ctx.fill();
      FX.glowAt(ctx, sx - 41, sy + 13, tailA ? 48 : 18, '#7dff4d', vk); FX.glowAt(ctx, sx + 3, sy + 3, 16, '#7dff4d', .5 * vk);
      // corpo corazzato
      ctx.beginPath(); ctx.ellipse(0, -56, 94, 31, 0, 0, TAU);
      const g = ctx.createLinearGradient(0, -88, 0, -26); g.addColorStop(0, C('#d8b67a')); g.addColorStop(.5, C('#b08a52')); g.addColorStop(1, C('#6f5230'));
      ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, -56, 94, 31, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-48 + i * 28, -48, 14, 40, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.fillStyle = C('#efd59f'); ctx.beginPath(); ctx.ellipse(-6, -78, 60, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C('#5c4428'); ctx.fillRect(-100, -36, 200, 14);
      ctx.restore();
      for (let i = 0; i < 3; i++) { const vx = -20 + i * 26; rr(ctx, vx, -46, 14, 5, 2); ctx.fillStyle = '#9dff5a'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke(); FX.glowAt(ctx, vx + 7, -44, 12, '#7dff4d', .6 + .3 * Math.sin(G.t * 5 + i)); }
      // testa e occhi
      ctx.beginPath(); ctx.ellipse(-84, -58, 24, 18, -.1, 0, TAU); ink(ctx, C('#9a7748'), 2.6);
      ctx.fillStyle = C('#c9a46a'); ctx.beginPath(); ctx.ellipse(-86, -68, 14, 5, -.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b8ff6a'; ctx.fillRect(-98, -64, 9, 5); ctx.fillRect(-86, -67, 7, 4); FX.glowAt(ctx, -92, -63, 18, '#7dff4d', .9);
      for (let i = 0; i < 4; i++) leg(i, false);
      // chele
      seg(ctx, -66, -50, -100 + cl, -46, 11, C('#8c6b3e'), 3);
      circ(ctx, -100 + cl, -46, 7, C('#a8844e'), 2);
      ctx.beginPath(); ctx.moveTo(-104 + cl, -54); ctx.quadraticCurveTo(-140 + cl, -80, -178 + cl, -62); ctx.quadraticCurveTo(-148 + cl, -64, -112 + cl, -46); ctx.closePath(); ink(ctx, C('#b89058'), 2.4);
      ctx.beginPath(); ctx.moveTo(-106 + cl, -42); ctx.quadraticCurveTo(-140 + cl, -24, -170 + cl, -36); ctx.quadraticCurveTo(-142 + cl, -40, -112 + cl, -48); ctx.closePath(); ink(ctx, C('#9a7748'), 2.4);
      ctx.strokeStyle = C('#f1dcaa'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-112 + cl, -56); ctx.quadraticCurveTo(-138 + cl, -74, -164 + cl, -64); ctx.stroke();
      ctx.restore();
    }
  },
  // ============ 3. AVVOLTOIO — elicottero d'assalto ============
  heli: {
    name: 'AVVOLTOIO', sub: "Elicottero d'assalto", hp: 2500, w: 210, d: 55, h: 80, flying: true,
    init(b) { b.x = arenaR() - 100; b.y = 420; b.z = 175; b.st = 1.4; b.tx = b.x; b.calls = 0; b.face = -1; },
    update(b, dt, S) {
      const p = G.player, ph2 = b.hp < b.maxhp * .5; b.z = 170 + Math.sin(G.t * 2) * 10;
      if (b.atk !== 'bombs') { b.y = lerp(b.y, clamp(p.y, GT + 20, GB - 10), dt * .9 * S); b.x = lerp(b.x, b.tx, dt * 1.2 * S); }
      b.face = p.x < b.x ? -1 : 1;
      if (b.calls === 0 && ph2 || b.calls === 1 && b.hp < b.maxhp * .25) { b.calls++; for (let i = 0; i < (G.diff >= 2 ? 3 : 2); i++) { const e = spawnEnemy('grunt', clamp(b.x + rand(-100, 100), G.camX + 80, G.camX + W - 80), rand(GT + 20, GB - 10)); if (e) { e.z = 260; e.para = true; } } }
      b.st -= dt * S;
      if (!b.atk && b.st <= 0) { b.atk = bPick(b, ph2 ? ['strafe', 'bombs', 'missiles', 'strafe'] : ['strafe', 'missiles', 'bombs']); b.at = 0; b.n = 0; if (b.atk === 'bombs') { b.dir = b.x > G.camX + W / 2 ? -1 : 1; b.by = p.y; } }
      if (!b.atk) return; b.at += dt * S; const end = w => { b.atk = null; b.st = w; b.tx = rand(G.camX + W * .4, arenaR() - 80); };
      if (b.atk === 'strafe') {
        b.tx = G.camX + W * .5 + Math.sin(b.at * 1.2) * W * .35;
        b.cd = (b.cd || 0) - dt; if (b.cd <= 0) { b.cd = (ph2 ? .07 : .1) / S; bShoot(b, b.face * 80, 0, b.z - 20, 380, { ang: rand(-.1, .1), r: 4, col: '#ffe066', dmg: 7, vz: -260 }); Snd.play('eshot'); }
        if (b.at > 3) end(1);
      } else if (b.atk === 'bombs') {
        b.x += b.dir * 330 * dt * S; b.y = lerp(b.y, b.by, dt * 2);
        b.cd = (b.cd || 0) - dt; if (b.cd <= 0) { b.cd = .16; const bx = b.x, by = b.y + rand(-30, 30); addHazard({ kind: 'mark', x: bx, y: by, r: 62, t: .55, max: .55, boom: { r: 62, dmg: 22 }, drop: true }); }
        if (b.x < arenaL() + 20 || b.x > arenaR() - 20) end(.9);
      } else if (b.atk === 'missiles') {
        const k = ph2 ? 6 : 4;
        if (b.n < k && b.at > .3 + b.n * .22) { b.n++; eBullet(b.x, b.y, b.z - 30, rand(-120, 120), rand(-150, 150), { kind: 'missile', homing: true, turn: 2.2 * G.D.bspd, spd: 230 * G.D.bspd, r: 7, col: '#ff6b6b', dmg: 16, life: 4.5, shootable: true, hp: 1, boom: { r: 55, dmg: 18 }, vz: -60 }); Snd.play('rocket'); }
        if (b.at > 2.4) end(1.1);
      }
    },
    touchDmg: 0,
    draw(ctx, b, x, y) {
      const fl = b.flash > 0, C = c => fl ? tone(c, .55) : c, yy = y - b.z;
      // vento delle pale sul terreno + faro
      ctx.save(); ctx.strokeStyle = 'rgba(200,215,255,.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const k = (G.t * 1.6 + i / 3) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(x, y, 40 + k * 130, (40 + k * 130) * .22, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
      const lx = x + b.face * 70;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createLinearGradient(0, yy, 0, y); cg.addColorStop(0, 'rgba(255,245,200,.22)'); cg.addColorStop(1, 'rgba(255,245,200,.05)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(x + b.face * 80, yy + 8); ctx.lineTo(lx - 55, y + 6); ctx.lineTo(lx + 55, y + 6); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = .45; ctx.drawImage(glowSprite('#fff2c8'), lx - 66, y - 14, 132, 30);
      ctx.restore();
      FX.light(lx, y, 120, '#fff2c8', .9); FX.glow(lx, y, 60, '#fff2c8', .25);
      ctx.save(); ctx.translate(x, yy); ctx.scale(-b.face, 1); // disegnato rivolto a sinistra
      const body = '#36434b', dark = '#232c31', light = '#55656f';
      // coda
      poly(ctx, [36, -6, 192, -20, 196, -30, 36, -30]); ink(ctx, C(body), 2.6);
      ctx.fillStyle = C(light); ctx.fillRect(40, -29, 150, 3);
      poly(ctx, [178, -24, 196, -62, 208, -62, 202, -22]); ink(ctx, C(dark), 2.4);
      poly(ctx, [170, -18, 206, -14, 206, -9, 172, -12]); ink(ctx, C(dark), 2);
      ctx.save(); ctx.translate(204, -40); ctx.fillStyle = 'rgba(210,220,230,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 4, 22, 0, 0, TAU); ctx.fill(); ctx.rotate(G.t * 40); ctx.strokeStyle = 'rgba(30,30,30,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(0, 21); ctx.stroke(); ctx.restore();
      // fusoliera
      ctx.beginPath(); ctx.moveTo(-96, 2); ctx.quadraticCurveTo(-98, -18, -70, -28); ctx.lineTo(-10, -40); ctx.lineTo(48, -34); ctx.quadraticCurveTo(70, -20, 60, 6); ctx.quadraticCurveTo(10, 24, -60, 20); ctx.quadraticCurveTo(-90, 16, -96, 2); ctx.closePath();
      ctx.fillStyle = C(body); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = C(dark); ctx.fillRect(-100, 6, 170, 20); ctx.fillStyle = C(light); ctx.fillRect(-80, -34, 130, 5);
      ctx.fillStyle = C('#8a2b2b'); ctx.fillRect(-20, -4, 70, 5); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-20, -38); ctx.lineTo(-22, 18); ctx.moveTo(30, -36); ctx.lineTo(28, 14); ctx.stroke();
      // motore
      rr(ctx, -24, -54, 72, 18, 7); ink(ctx, C('#2c363c'), 2.4); ctx.fillStyle = C(light); ctx.fillRect(-18, -52, 56, 2.5);
      rr(ctx, 44, -50, 14, 12, 4); ink(ctx, C('#1b2125'), 2); FX.glowAt(ctx, 56, -44, 16, '#ff8a3a', .5 + .2 * Math.sin(G.t * 30));
      // abitacolo
      ctx.beginPath(); ctx.moveTo(-88, -6); ctx.quadraticCurveTo(-80, -34, -46, -38); ctx.lineTo(-30, -38); ctx.lineTo(-30, -8); ctx.closePath();
      ctx.fillStyle = fl ? '#fff' : 'rgba(120,220,255,.85)'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = 'rgba(20,40,60,.8)'; ctx.beginPath(); ctx.arc(-54, -18, 7, 0, TAU); ctx.fill(); ctx.fillRect(-60, -14, 14, 8);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-76, -18); ctx.quadraticCurveTo(-70, -30, -52, -33); ctx.stroke();
      // ali corte, lanciarazzi e mitragliera
      rr(ctx, -22, 2, 54, 7, 2); ink(ctx, C(dark), 2);
      for (const px of [-18, 14]) { rr(ctx, px, 9, 22, 10, 4); ink(ctx, C('#4b5a60'), 2); ctx.fillStyle = C('#c23a3a'); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 2, 12 + i * 2.6, 1.6, 0, TAU); ctx.fill(); } }
      circ(ctx, -84, 14, 7, C(dark), 2); seg(ctx, -86, 16, -104, 20, 3.5, C('#1d2226'), 1.8);
      // pattini
      seg(ctx, -36, 22, -40, 32, 3, C(dark), 1.8); seg(ctx, 32, 20, 34, 32, 3, C(dark), 1.8); seg(ctx, -56, 33, 54, 33, 3.6, C('#1d2226'), 2);
      // rotore principale
      seg(ctx, 10, -54, 10, -64, 5, C(dark), 2);
      ctx.fillStyle = 'rgba(190,200,210,.16)'; ctx.beginPath(); ctx.ellipse(10, -66, 176, 8, 0, 0, TAU); ctx.fill();
      const r = G.t * 26; ctx.fillStyle = 'rgba(20,22,26,.6)'; for (let i = 0; i < 4; i++) { const c = Math.cos(r + i * Math.PI / 2) * 172; ctx.fillRect(Math.min(10, 10 + c), -68, Math.abs(c), 3.6); }
      circ(ctx, 10, -66, 5, C('#4b5a60'), 2);
      // luci di navigazione
      const bl = Math.sin(G.t * 8) > 0; ctx.fillStyle = bl ? '#ff3030' : '#501010'; ctx.beginPath(); ctx.arc(200, -62, 3, 0, TAU); ctx.fill(); if (bl) FX.glowAt(ctx, 200, -62, 14, '#ff2020', 1);
      ctx.fillStyle = '#7dff8a'; ctx.beginPath(); ctx.arc(-20, 6, 2.4, 0, TAU); ctx.fill(); FX.glowAt(ctx, -20, 6, 9, '#5dff6a', .8);
      ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(-92, 4, 3, 0, TAU); ctx.fill(); FX.glowAt(ctx, -92, 4, 18, '#fff2c8', 1);
      ctx.restore();
    }
  },
  // ============ 4. TITANO DI GHIACCIO ============
  titan: {
    name: 'TITANO DI GHIACCIO', sub: 'Mech criogenico', hp: 3000, w: 170, d: 50, h: 220,
    init(b) { b.x = arenaR() - 110; b.y = 430; b.z = 0; b.st = 1.6; b.calls = 0; b.home = b.x; },
    update(b, dt, S) {
      const p = G.player, ph2 = b.hp < b.maxhp * .5; b.walk = (b.walk || 0) + dt * 2;
      if (!b.atk || b.atk !== 'stomp') b.y = lerp(b.y, clamp(p.y, GT + 30, GB - 15), dt * .6 * S);
      if (b.calls === 0 && ph2) { b.calls = 1; bMinions(['heavy', 'grunt', 'sniper'], 3); }
      b.st -= dt * S;
      if (!b.atk && b.st <= 0) { b.atk = bPick(b, ph2 ? ['stomp', 'shards', 'freeze', 'pillars'] : ['stomp', 'shards', 'freeze']); b.at = 0; b.n = 0; }
      if (!b.atk) return; b.at += dt * S; const end = w => { b.atk = null; b.st = w; };
      if (b.atk === 'stomp') {
        if (b.n === 0) { b.n = 1; b.sx = b.x; b.sy = b.y; b.tx = clamp(p.x + 80, G.camX + W * .35, arenaR() - 90); b.ty = clamp(p.y, GT + 30, GB - 15); addHazard({ kind: 'mark', x: b.tx, y: b.ty, r: 90, t: .8 / S, max: .8 / S }); }
        const k = clamp(b.at / .8, 0, 1); b.x = lerp(b.sx, b.tx, k); b.y = lerp(b.sy, b.ty, k); b.z = Math.sin(k * Math.PI) * 220;
        if (k >= 1 && b.n === 1) { b.n = 2; b.z = 0; G.shake = 16; Snd.play('stomp'); addHazard({ kind: 'ring', x: b.x, y: b.y, r: 40, spd: 400 * G.D.bspd, max: 900, dmg: 26 }); if (ph2) setTimeout(() => G.boss === b && addHazard({ kind: 'ring', x: b.x, y: b.y, r: 40, spd: 400 * G.D.bspd, max: 900, dmg: 26 }), 450); hurtIfNear(b.x, b.y, 85, 30); }
        if (b.at > 1.8) { b.home = b.x; end(.8); }
      } else if (b.atk === 'shards') {
        if (b.n < (ph2 ? 3 : 2) && b.at > .4 + b.n * .45) { b.n++; const k = ph2 ? 11 : 7; for (let i = 0; i < k; i++) bShoot(b, -60, -40, 140, 340, { ang: (i - (k - 1) / 2) * .16 + (b.n % 2) * .08, r: 6, col: '#bdf3ff', dmg: 10, kind: 'shard', vz: -70 }); Snd.play('laser'); }
        if (b.at > 2) end(.9);
      } else if (b.atk === 'freeze') {
        if (b.n === 0) { b.n = 1; addHazard({ kind: 'beam', y: p.y, x0: G.camX - 20, x1: b.x - 70, warn: .8 / S, active: .8, dmg: 16, w: 40, col: '#7fe8ff', slow: 2.5 }); if (ph2) addHazard({ kind: 'beam', y: clamp(p.y + (p.y > 420 ? -100 : 100), GT + 10, GB), x0: G.camX - 20, x1: b.x - 70, warn: 1.2 / S, active: .8, dmg: 16, w: 40, col: '#7fe8ff', slow: 2.5 }); Snd.play('charge'); }
        if (b.at > 2) end(.8);
      } else if (b.atk === 'pillars') {
        if (b.n === 0) { b.n = 1; for (let i = 0; i < 8; i++) { const x = i === 0 ? p.x : rand(G.camX + 60, b.x - 80), y = i === 0 ? p.y : rand(GT + 10, GB); addHazard({ kind: 'mark', x, y, r: 52, t: (.8 + i * .12) / S, max: (.8 + i * .12) / S, boom: { r: 52, dmg: 22 }, ice: true, drop: true }); } }
        if (b.at > 2.2) end(.8);
      }
    },
    touchDmg: 30,
    draw(ctx, b, x, y) {
      const fl = b.flash > 0, C = c => fl ? tone(c, .55) : c, yy = y - b.z, st = Math.sin(b.walk || 0) * 5;
      const ice = '#9cc9e8', iceD = '#5b88ab', iceL = '#d8f2ff', steel = '#41617d', steelD = '#2b4258';
      const arm = b.atk === 'shards' || b.atk === 'freeze' ? .9 : Math.sin(G.t * 1.5) * .1;
      ctx.save(); ctx.translate(x, yy);
      // braccio posteriore
      ctx.save(); ctx.translate(80, -186); ctx.rotate(-arm * .25);
      rr(ctx, -6, -4, 30, 52, 10); ink(ctx, C(steelD), 2.6); rr(ctx, -4, 44, 28, 46, 9); ink(ctx, C(tone(iceD, -.25)), 2.6);
      ctx.restore();
      // gambe
      const legT = (lx, s) => {
        poly(ctx, [lx - 20, -110 + s, lx + 20, -110 + s, lx + 24, -60, lx - 18, -58]); ink(ctx, C(steel), 2.8);
        circ(ctx, lx + 2, -60, 13, C(iceD), 2.6); ctx.fillStyle = C(iceL); ctx.beginPath(); ctx.arc(lx - 2, -64, 4, 0, TAU); ctx.fill();
        poly(ctx, [lx - 16, -58, lx + 18, -58, lx + 22, -18, lx - 18, -18]); ink(ctx, C(steelD), 2.8);
        poly(ctx, [lx - 30, -20, lx + 30, -20, lx + 34, 0, lx - 32, 0]); ink(ctx, C(ice), 2.8);
        ctx.fillStyle = C(iceL); ctx.fillRect(lx - 26, -18, 52, 3);
        poly(ctx, [lx - 30, -2, lx - 40, 2, lx - 30, 2]); ink(ctx, C(iceL), 1.6);
      };
      legT(36, -st); legT(-38, st);
      // busto
      const Tb = [-84, -96, -92, -170, -70, -208, 72, -208, 92, -170, 84, -96];
      poly(ctx, Tb); const g = ctx.createLinearGradient(0, -208, 0, -96); g.addColorStop(0, C(iceL)); g.addColorStop(.35, C(ice)); g.addColorStop(1, C(iceD)); ctx.fillStyle = g; ctx.fill();
      ctx.save(); poly(ctx, Tb); ctx.clip(); ctx.fillStyle = C(steel); ctx.fillRect(-100, -128, 200, 14); ctx.fillStyle = C(steelD); ctx.fillRect(-100, -114, 200, 20);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-50, -208); ctx.lineTo(-58, -128); ctx.moveTo(50, -208); ctx.lineTo(58, -128); ctx.stroke(); ctx.restore();
      poly(ctx, Tb); ink(ctx, null, 3);
      // nucleo criogenico
      const pc = .7 + .3 * Math.sin(G.t * 5);
      circ(ctx, 0, -162, 20, C(steelD), 2.6);
      ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.arc(0, -162, 13, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, -162, 16, G.t * 3, G.t * 3 + 4); ctx.stroke();
      FX.glow(x, yy - 162, 70, '#78f0ff', pc); FX.glow(x, yy - 162, 26, '#e6fbff', 1);
      // cristalli di ghiaccio sulle spalle
      const crystal = (cx, cy, h, a) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); poly(ctx, [-6, 0, 0, -h, 6, 0]); ink(ctx, C(iceL), 1.8); ctx.fillStyle = C('#ffffff'); ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(0, -h + 4); ctx.lineTo(2, -2); ctx.fill(); ctx.restore(); };
      crystal(-66, -206, 30, -.4); crystal(-50, -208, 42, -.1); crystal(-34, -207, 24, .2); crystal(52, -207, 34, .25); crystal(68, -204, 22, .5);
      // testa
      rr(ctx, -36, -248, 70, 44, 12); ink(ctx, C(iceL), 2.8);
      ctx.fillStyle = C(ice); ctx.fillRect(-34, -222, 66, 16);
      rr(ctx, -34, -238, 46, 10, 3); ctx.fillStyle = '#00e5ff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#e8ffff'; ctx.fillRect(-30, -235, 18, 3); FX.glowAt(ctx, -12, -233, 30, '#00e5ff', 1);
      rr(ctx, -36, -248, 70, 44, 12); ink(ctx, null, 2.8);
      // braccio anteriore (lama di ghiaccio)
      ctx.save(); ctx.translate(-84, -186); ctx.rotate(arm);
      rr(ctx, -28, -6, 32, 54, 10); ink(ctx, C(ice), 2.8); ctx.fillStyle = C(iceL); ctx.fillRect(-22, -2, 6, 44);
      rr(ctx, -30, 44, 34, 48, 9); ink(ctx, C(iceD), 2.8);
      poly(ctx, [-30, 88, -12, 150, 6, 88]); ink(ctx, C(iceL), 2.4); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-14, 92); ctx.lineTo(-12, 140); ctx.lineTo(-8, 92); ctx.fill();
      if (b.atk === 'freeze') FX.glowAt(ctx, -12, 120, 40, '#7fe8ff', .8);
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(-86, -190, 30, 24, -.3, 0, TAU); ink(ctx, C(ice), 2.8);
      ctx.fillStyle = C(iceL); ctx.beginPath(); ctx.ellipse(-92, -200, 16, 8, -.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(-86, -190, 30, 24, -.3, .3, 2.4); ctx.stroke();
      crystal(-104, -206, 22, -.7); crystal(-90, -212, 16, -.3);
      ctx.restore();
      if (Math.random() < .15) G.parts.push({ x: b.x + rand(-60, 60), y: b.y, z: rand(150, 220) + b.z, vx: rand(-20, 20), vy: 0, vz: rand(-10, 20), life: 1, max: 1, r: rand(6, 10), col: '#e8f6ff', kind: 'smoke' });
    }
  },
  // ============ 5. IDRA DI MAGMA ============
  hydra: {
    name: 'IDRA DI MAGMA', sub: 'Creatura del vulcano', hp: 3600, w: 200, d: 60, h: 220,
    init(b) { b.x = arenaR() - 100; b.y = 425; b.st = 1.6; b.calls = 0; b.rise = 0; },
    update(b, dt, S) {
      const p = G.player, ph2 = b.hp < b.maxhp * .5; b.rise = Math.min(1, b.rise + dt * .7);
      b.y = lerp(b.y, clamp(p.y, GT + 40, GB - 25), dt * .35 * S);
      if (b.calls === 0 && ph2 || b.calls === 1 && b.hp < b.maxhp * .25) { b.calls++; bMinions(['drone', 'drone', 'drone', 'ninja'], G.diff >= 2 ? 4 : 3); }
      b.st -= dt * S;
      if (!b.atk && b.st <= 0) { b.atk = bPick(b, ph2 ? ['fire', 'meteors', 'wave', 'breath'] : ['fire', 'meteors', 'wave']); b.at = 0; b.n = 0; }
      if (!b.atk) return; b.at += dt * S; const end = w => { b.atk = null; b.st = w; };
      if (b.atk === 'fire') {
        if (b.n < 3 && b.at > .3 + b.n * .35) { const hp = this.heads(b)[b.n]; b.n++; const k = ph2 ? 3 : 1; for (let i = 0; i < k; i++) bShoot({ x: b.x, y: b.y }, hp.x, 0, -hp.y, 330, { ang: (i - (k - 1) / 2) * .18, r: 10, col: '#ff7b00', dmg: 14, kind: 'fireball', vz: -120 }); Snd.play('rocket'); }
        if (b.at > 1.8) end(.9);
      } else if (b.atk === 'meteors') {
        if (b.n === 0) { b.n = 1; const k = ph2 ? 12 : 8; for (let i = 0; i < k; i++) { const x = i === 0 ? p.x : rand(G.camX + 40, b.x - 60), y = i === 0 ? p.y : rand(GT + 10, GB); addHazard({ kind: 'mark', x, y, r: 60, t: (1 + i * .1) / S, max: (1 + i * .1) / S, boom: { r: 60, dmg: 24 }, meteor: true, drop: true }); } Snd.play('alarm'); }
        if (b.at > 2.4) end(.8);
      } else if (b.atk === 'wave') {
        if (b.n < (ph2 ? 2 : 1) && b.at > .5 + b.n * .9) { b.n++; addHazard({ kind: 'wave', x: b.x - 90, dir: -1, spd: 360 * G.D.bspd, dmg: 24, col: '#ff5a00' }); Snd.play('stomp'); G.shake = 8; }
        if (b.at > 2.6) end(.8);
      } else if (b.atk === 'breath') {
        if (b.n === 0) { b.n = 1; addHazard({ kind: 'beam', y: p.y, x0: G.camX - 20, x1: b.x - 60, warn: .7 / S, active: 1, dmg: 26, w: 46, col: '#ff6a00', fire: true }); Snd.play('charge'); }
        if (b.at > 2.1) end(.8);
      }
    },
    heads(b) { const s = G.t; return [0, 1, 2].map(i => ({ x: -70 - i * 40 + Math.sin(s * 1.5 + i * 2) * 15, y: -150 - i * 35 + Math.cos(s * 1.2 + i) * 15 + (1 - b.rise) * 150 })); },
    touchDmg: 30,
    draw(ctx, b, x, y) {
      const fl = b.flash > 0, C = c => fl ? tone(c, .5) : c, R = b.rise;
      ctx.save(); ctx.translate(x, y);
      FX.glow(x, y - 10, 210, '#ff5a00', .55); FX.light(x, y, 260, '#ff8a3a', 1);
      // pozza di magma
      const pg = ctx.createRadialGradient(0, -4, 10, 0, -4, 152); pg.addColorStop(0, '#fff2a0'); pg.addColorStop(.35, '#ffb52a'); pg.addColorStop(.75, '#ff5a00'); pg.addColorStop(1, '#8a1a00');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(0, -4, 152, 30, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,230,120,.5)';
      for (let i = 0; i < 6; i++) { const k = (G.t * .7 + i * .37) % 1, bx = Math.sin(i * 7.3) * 110, by = -4 + Math.cos(i * 3.1) * 18; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(bx, by, 2 + k * 7, 0, TAU); ctx.fill(); }
      ctx.restore();
      const vein = .65 + .35 * Math.sin(G.t * 3), hs = this.heads(b);
      // colli (dietro al corpo: spuntano dalla roccia)
      const nk = i => { const h = hs[i], nx = -34 + i * 40, ny = -70 * R, c1x = nx + 28, c1y = ny - 80 - i * 30, c2x = h.x + 50 + i * 10, c2y = h.y + 10 - i * 5; return [nx, ny, c1x, c1y, c2x, c2y, h.x, h.y]; };
      const neck = n => { ctx.beginPath(); ctx.moveTo(n[0], n[1]); ctx.bezierCurveTo(n[2], n[3], n[4], n[5], n[6], n[7]); };
      for (let i = 2; i >= 0; i--) {
        const n = nk(i), nw = 27 - i * 3;
        const at = k => { const u = 1 - k, a = u * u * u, bb = 3 * u * u * k, c = 3 * u * k * k, d = k * k * k; return [a * n[0] + bb * n[2] + c * n[4] + d * n[6], a * n[1] + bb * n[3] + c * n[5] + d * n[7]]; };
        ctx.lineCap = 'round'; neck(n);
        ctx.strokeStyle = INK; ctx.lineWidth = nw + 5; ctx.stroke(); ctx.strokeStyle = C(['#5a1a0c', '#4f170a', '#441308'][i]); ctx.lineWidth = nw; ctx.stroke();
        ctx.save(); ctx.translate(-3, 5); neck(n); ctx.strokeStyle = C('#7a2a12'); ctx.lineWidth = nw * .3; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(2, -3); neck(n); ctx.strokeStyle = `rgba(255,110,20,${.3 + .25 * vein})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        for (let k = 3; k < 10; k++) { const q = k / 10.5, [px, py] = at(q), [qx, qy] = at(q + .02); let ux = qy - py, uy = -(qx - px); const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L; if (ux - uy < 0) { ux = -ux; uy = -uy; } const o = nw / 2 - 2, sl = 13 - k * .7; poly(ctx, [px + ux * o - uy * 4, py + uy * o + ux * 4, px + ux * (o + sl), py + uy * (o + sl), px + ux * o + uy * 4, py + uy * o - ux * 4]); ink(ctx, C('#2a0904'), 1.4); }
      }
      // corpo di roccia vulcanica
      const body = () => { ctx.beginPath(); ctx.moveTo(-100, -8); ctx.quadraticCurveTo(-66, -132 * R - 18, 30, -122 * R - 10); ctx.quadraticCurveTo(114, -92 * R, 104, -8); ctx.closePath(); };
      body(); const rg = ctx.createLinearGradient(0, -130, 0, 0); rg.addColorStop(0, C('#4a1a0e')); rg.addColorStop(1, C('#1e0804')); ctx.fillStyle = rg; ctx.fill();
      ctx.save(); body(); ctx.clip();
      for (const pl of [[-84, -10, -70, -46, -40, -56, -30, -14], [-26, -60, -4, -98, 30, -92, 20, -54], [30, -16, 44, -60, 80, -60, 92, -12], [-20, -10, -14, -40, 16, -44, 22, -10]]) {
        ctx.beginPath(); ctx.moveTo(pl[0], pl[1] * R); for (let k = 2; k < pl.length; k += 2) ctx.lineTo(pl[k], pl[k + 1] * R); ctx.closePath(); ctx.fillStyle = C('#3a1208'); ctx.fill();
        ctx.strokeStyle = C('#6a2a14'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl[2], pl[3] * R); ctx.lineTo(pl[4], pl[5] * R); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const cracks = [[-70, -10, -58, -34, -64, -52, -44, -76], [-20, -8, -12, -36, 6, -50, 2, -80, 18, -104], [6, -50, 30, -60], [40, -10, 50, -38, 72, -52, 66, -74]];
      for (const [lw, col] of [[7, `rgba(255,80,0,${.35 * vein})`], [2.4, `rgba(255,${170 + 60 * vein | 0},60,.95)`]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; for (const c of cracks) { ctx.beginPath(); ctx.moveTo(c[0], c[1] * R); for (let k = 2; k < c.length; k += 2) ctx.lineTo(c[k], c[k + 1] * R); ctx.stroke(); } }
      ctx.restore();
      body(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = C('#7a3418'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-86, -40 * R); ctx.quadraticCurveTo(-56, -118 * R - 12, 26, -112 * R - 8); ctx.stroke();
      FX.glowAt(ctx, -4, -50 * R, 60, '#ff6a00', .5 * vein);
      // teste (dalla più lontana alla più vicina)
      for (let i = 2; i >= 0; i--) {
        const h = hs[i];
        ctx.save(); ctx.translate(h.x, h.y); const open = b.atk === 'fire' || b.atk === 'breath' ? .5 : .15 + .1 * Math.sin(G.t * 4 + i);
        if (open > .3) { FX.glowAt(ctx, -38, 4, 40, '#ffb020', 1); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(fireSprite(), -56, -12, 30, 30); ctx.restore(); }
        poly(ctx, [12, 4, -44, 6 + open * 24, -36, 15, 12, 17]); ink(ctx, C('#4a140a'), 2.2);
        ctx.fillStyle = '#f4ead0'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-34 + k * 9, 7 + open * 18 - k * open * 4); ctx.lineTo(-31 + k * 9, 2 + open * 18 - k * open * 4); ctx.lineTo(-28 + k * 9, 7 + open * 18 - k * open * 4); ctx.fill(); }
        poly(ctx, [12, -16, -10, -18, -50, -10 - open * 20, -42, 2, 12, 8]); ink(ctx, C('#6a2410'), 2.4);
        ctx.fillStyle = C('#8a3418'); ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(-44, -9 - open * 18); ctx.lineTo(-40, -5 - open * 18); ctx.lineTo(-4, -12); ctx.fill();
        ctx.fillStyle = '#f4ead0'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-40 + k * 9, -2 - open * 6 + k * open * 4); ctx.lineTo(-37 + k * 9, 4 - open * 6 + k * open * 4); ctx.lineTo(-34 + k * 9, -2 - open * 6 + k * open * 4); ctx.fill(); }
        poly(ctx, [2, -16, 12, -40, 14, -14]); ink(ctx, C('#2a0904'), 1.8); poly(ctx, [-6, -17, -2, -34, 4, -16]); ink(ctx, C('#2a0904'), 1.6);
        ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(-18, -12); ctx.lineTo(-8, -13); ctx.lineTo(-10, -8); ctx.closePath(); ctx.fill(); FX.glowAt(ctx, -12, -11, 14, '#ffd000', 1);
        ctx.restore();
      }
      ctx.restore();
      if (Math.random() < .25) G.parts.push({ x: b.x + rand(-120, 120), y: b.y, z: rand(0, 20), vx: rand(-10, 10), vy: 0, vz: rand(40, 90), life: rand(.6, 1.2), max: 1.2, r: rand(1.5, 3), col: '#ffb347', kind: 'ember' });
    }
  },
  // ============ MEGA BOSS: OMEGA GEAR ============
  omega: {
    name: 'OMEGA GEAR', sub: 'Arma finale — quasi invincibile', hp: 10000, w: 250, d: 70, h: 280,
    init(b) { b.x = arenaR() - 130; b.y = 425; b.st = 2; b.phase = 1; b.trans = 0; b.shield = false; b.genT = 0; b.minT = 10; b.lastHit = 0; b.spin = 0; },
    update(b, dt, S) {
      const p = G.player, r = b.hp / b.maxhp; b.walk = (b.walk || 0) + dt * 1.5;
      const np = r > .66 ? 1 : r > .33 ? 2 : 3;
      if (np !== b.phase) { b.phase = np; b.trans = 2.2; b.atk = null; G.hazards = G.hazards.filter(h => h.kind !== 'beam'); banner(np === 2 ? 'FASE 2 — SCUDO ATTIVO' : 'FASE 3 — FURIA OMEGA', '#ff3d7f'); Snd.play('alarm'); G.shake = 20; if (np === 2) b.genT = 0; }
      if (b.trans > 0) { b.trans -= dt; b.inv = true; return; } b.inv = false;
      if (b.phase >= 3) S *= 1.35;
      b.y = lerp(b.y, clamp(p.y, GT + 40, GB - 25), dt * .5 * S);
      // scudo e generatori (fase 2+)
      if (b.phase >= 2) {
        const gens = G.enemies.filter(e => e.type === 'gen' && e.hp > 0);
        b.shield = gens.length > 0;
        if (!b.shield) { b.genT -= dt; if (b.genT <= 0) { const n = b.phase >= 3 ? 3 : 2; for (let i = 0; i < n; i++) { const e = spawnEnemy('gen', b.x, b.y); e.ang = i * TAU / n; e.hp = e.maxhp = 320 * G.D.ehp; } b.genT = b.phase >= 3 ? 11 : 15; } }
        b.minT -= dt; if (b.minT <= 0) { b.minT = (b.phase >= 3 ? 9 : 13) / G.D.efire; bMinions(['grunt', 'heavy', 'ninja', 'shield', 'drone', 'sniper'], G.diff >= 3 ? 3 : 2); }
      }
      // rigenerazione in fase 3 se non colpito
      if (b.phase >= 3 && G.t - b.lastHit > 3) b.hp = Math.min(b.maxhp * .33, b.hp + b.maxhp * .006 * dt * G.D.bspd);
      b.st -= dt * S;
      if (!b.atk && b.st <= 0) {
        const L = b.phase === 1 ? ['spiral', 'missiles', 'stomp', 'lanes'] : b.phase === 2 ? ['spiral', 'lanes', 'missiles', 'stomp', 'lanes'] : ['omega', 'spiral', 'lanes', 'stomp', 'missiles', 'omega'];
        b.atk = bPick(b, L); b.at = 0; b.n = 0;
      }
      if (!b.atk) return; b.at += dt * S; const end = w => { b.atk = null; b.st = w; };
      if (b.atk === 'spiral') {
        b.cd = (b.cd || 0) - dt; if (b.cd <= 0) { b.cd = (b.phase >= 3 ? .06 : .085) / S; b.spin += .23; const arms = b.phase === 1 ? 3 : b.phase === 2 ? 4 : 5; for (let i = 0; i < arms; i++) { const a = b.spin + i * TAU / arms; if (Math.cos(a) > .3) continue; bRadial(b, -70, 160, a, 210, { r: 6, col: '#ff3d7f', dmg: 11, life: 4, kind: 'orb', vz: -35 }); } if (b.phase >= 2 && Math.random() < .3) bShoot(b, -70, 0, 160, 300, { r: 5, col: '#ffd1e3', dmg: 10, vz: -35 }); }
        if (b.at > 3.6) end(.8);
      } else if (b.atk === 'missiles') {
        const k = b.phase === 1 ? 6 : b.phase === 2 ? 8 : 10;
        if (b.n < k && b.at > .2 + b.n * .16) { b.n++; eBullet(b.x + 60, b.y, 250, rand(-200, 100), rand(-200, 200), { kind: 'missile', homing: true, turn: 2.4 * G.D.bspd, spd: 250 * G.D.bspd, r: 7, col: '#ff6b6b', dmg: 16, life: 5, shootable: true, hp: 1, boom: { r: 55, dmg: 18 }, vz: -50 }); Snd.play('rocket'); }
        if (b.at > 2.6) end(.9);
      } else if (b.atk === 'stomp') {
        const k = b.phase === 1 ? 2 : 3;
        if (b.n < k && b.at > .6 + b.n * .7) { b.n++; G.shake = 18; Snd.play('stomp'); addHazard({ kind: 'ring', x: b.x - 40, y: b.y, r: 50, spd: 430 * G.D.bspd, max: 1100, dmg: 28 }); }
        if (b.at > .6 + k * .7 + .5) end(.6);
      } else if (b.atk === 'lanes') {
        if (b.n === 0) { b.n = 1; const N = 4, lh = (GB - GT) / N, safe = randi(0, N - 1), safe2 = b.phase === 1 ? (safe + 2) % N : -1; for (let i = 0; i < N; i++) { if (i === safe || i === safe2) continue; addHazard({ kind: 'beam', y: GT + lh * (i + .5), x0: G.camX - 20, x1: b.x - 80, warn: (b.phase >= 3 ? .75 : 1) / S * (G.diff === 0 ? 1.4 : 1), active: .6, dmg: 30, w: lh - 6, col: '#ff2a6d' }); } Snd.play('charge'); }
        if (b.at > 2) end(.7);
      } else if (b.atk === 'omega') {
        if (b.n === 0) { b.n = 1; b.charge = true; Snd.play('charge'); const lh = 52, sy = rand(GT + lh, GB - lh / 2); b.safeY = sy; addHazard({ kind: 'beam', y: (GT + sy - lh / 2) / 2, x0: G.camX - 20, x1: b.x - 80, warn: 1.8 / S, active: .9, dmg: 55, w: (sy - lh / 2) - GT + 10, col: '#ffffff', big: true }); addHazard({ kind: 'beam', y: (sy + lh / 2 + GB + 10) / 2, x0: G.camX - 20, x1: b.x - 80, warn: 1.8 / S, active: .9, dmg: 55, w: GB + 10 - (sy + lh / 2), col: '#ffffff', big: true }); }
        if (b.at > 1.8 && b.n === 1) { b.n = 2; Snd.play('beam'); G.shake = 24; }
        if (b.at > 3) { b.charge = false; end(.9); }
      }
    },
    touchDmg: 40,
    draw(ctx, b, x, y) {
      const fl = b.flash > 0, C = c => fl ? tone(c, .5) : c, st = Math.sin(b.walk || 0) * 6, red = b.phase >= 3 ? '#ff1a1a' : '#ff3d7f';
      const A = '#2b2e3c', A2 = '#3d4256', A3 = '#565c76', D = '#181a23';
      ctx.save(); ctx.translate(x, y);
      // gamba (pistoni e piede ad artiglio)
      const legD = (lx, s, far) => {
        const c1 = far ? tone(A, -.3) : A, c2 = far ? tone(A2, -.3) : A2;
        poly(ctx, [lx - 24, -152, lx + 24, -152, lx + 32 + s, -78, lx + 12 + s, -76]); ink(ctx, C(c1), 2.8);
        seg(ctx, lx - 14, -140, lx + 6 + s, -86, 5, C('#8a90a6'), 2);
        circ(ctx, lx + 22 + s, -78, 19, C(c2), 2.8); circ(ctx, lx + 22 + s, -78, 8, C(D), 2); ctx.fillStyle = red; ctx.beginPath(); ctx.arc(lx + 22 + s, -78, 3.5, 0, TAU); ctx.fill();
        poly(ctx, [lx + 6 + s, -78, lx + 38 + s, -78, lx + 28, -12, lx - 4, -12]); ink(ctx, C(c1), 2.8);
        poly(ctx, [lx - 34, -16, lx + 46, -16, lx + 50, 0, lx - 38, 0]); ink(ctx, C(c2), 2.8);
        poly(ctx, [lx - 38, -6, lx - 54, 2, lx - 36, 2]); ink(ctx, C('#9aa0b8'), 1.8);
        ctx.fillStyle = red; ctx.fillRect(lx - 4 + s * .5, -124, 4, 30); if (!far) FX.glowAt(ctx, lx - 2 + s * .5, -109, 18, red, .7);
      };
      legD(50, -st, true); legD(-70, st, false);
      // spalla posteriore con lanciamissili
      rr(ctx, 120, -302, 76, 64, 14); ink(ctx, C(A2), 2.8);
      ctx.fillStyle = C(D); rr(ctx, 130, -296, 58, 46, 6); ctx.fill();
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { circ(ctx, 141 + i * 18, -284 + j * 21, 6.5, C('#5a1020'), 1.6); ctx.fillStyle = '#ff5a6a'; ctx.beginPath(); ctx.arc(141 + i * 18, -284 + j * 21, 2.4, 0, TAU); ctx.fill(); }
      // busto
      const Tb = [-132, -158, -152, -250, -92, -302, 92, -302, 142, -250, 122, -158];
      poly(ctx, Tb); const g = ctx.createLinearGradient(0, -302, 0, -158); g.addColorStop(0, C(A3)); g.addColorStop(.45, C(A2)); g.addColorStop(1, C(D)); ctx.fillStyle = g; ctx.fill();
      ctx.save(); poly(ctx, Tb); ctx.clip();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-100, -302); ctx.lineTo(-112, -170); ctx.moveTo(96, -302); ctx.lineTo(104, -170); ctx.moveTo(-150, -200); ctx.lineTo(150, -200); ctx.stroke();
      ctx.fillStyle = C('#7a819e'); ctx.fillRect(-90, -300, 180, 4);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#1a0810'; ctx.fillRect(60, -196 + i * 9, 40, 4); ctx.fillStyle = rgba(red, .8); ctx.fillRect(62, -195 + i * 9, 36 * (.5 + .5 * Math.sin(G.t * 6 + i)), 2); }
      ctx.restore();
      poly(ctx, Tb); ink(ctx, null, 3.2);
      // linee al neon
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = red; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-122, -175); ctx.lineTo(-137, -248); ctx.lineTo(-87, -290); ctx.moveTo(112, -175); ctx.lineTo(127, -248); ctx.lineTo(82, -290); ctx.stroke(); ctx.restore();
      FX.glow(x - 128, y - 230, 40, red, .5); FX.glow(x + 118, y - 230, 40, red, .5);
      // nucleo
      const pc = b.charge ? 1 : .6 + .4 * Math.sin(G.t * 6);
      circ(ctx, -10, -225, 34, C(D), 3);
      ctx.save(); ctx.translate(-10, -225); ctx.rotate(G.t * 1.5); ctx.strokeStyle = rgba(red, .9); ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 28, i * 2.09, i * 2.09 + 1.3); ctx.stroke(); } ctx.restore();
      ctx.fillStyle = '#fff0f5'; ctx.beginPath(); ctx.arc(-10, -225, 18 + pc * 6, 0, TAU); ctx.fill();
      FX.glow(x - 10, y - 225, b.charge ? 170 : 90, b.phase >= 3 ? '#ff2020' : '#ff3d7f', pc); FX.glow(x - 10, y - 225, 40, '#ffffff', .9);
      if (b.charge) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,200,230,.7)'; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + G.t * 2, k = (G.t * 2.4 + i / 8) % 1, r1 = 120 * (1 - k); ctx.beginPath(); ctx.moveTo(-10 + Math.cos(a) * r1, -225 + Math.sin(a) * r1); ctx.lineTo(-10 + Math.cos(a) * (r1 + 18), -225 + Math.sin(a) * (r1 + 18)); ctx.stroke(); } ctx.restore(); }
      // testa
      poly(ctx, [-54, -300, -42, -344, 42, -344, 58, -300]); ink(ctx, C(A2), 3);
      poly(ctx, [-42, -344, -30, -362, -18, -344]); ink(ctx, C(A), 2.4); poly(ctx, [24, -344, 38, -360, 44, -344]); ink(ctx, C(A), 2.4);
      rr(ctx, -40, -330, 64, 11, 3); ctx.fillStyle = D; ctx.fill();
      ctx.fillStyle = red; ctx.fillRect(-38, -328, 60 * (b.phase >= 3 ? 1 : .85), 7); FX.glowAt(ctx, -8, -325, 40, red, 1);
      // spalla anteriore con doppio cannone
      rr(ctx, -198, -302, 74, 62, 14); ink(ctx, C(A2), 2.8);
      ctx.fillStyle = C(A3); ctx.fillRect(-190, -298, 58, 4);
      rr(ctx, -268, -286, 84, 15, 4); ink(ctx, C(D), 2.4); rr(ctx, -268, -264, 84, 12, 4); ink(ctx, C(D), 2.4);
      ctx.fillStyle = rgba(red, .9); ctx.fillRect(-270, -281, 5, 6); ctx.fillRect(-270, -261, 5, 6);
      // braccio cannone
      rr(ctx, -178, -244, 42, 76, 10); ink(ctx, C(A), 2.8);
      rr(ctx, -246, -206, 118, 34, 8); ink(ctx, C(D), 2.8);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = rgba(red, .6 + .4 * Math.sin(G.t * 8 - i)); ctx.fillRect(-226 + i * 22, -198, 10, 18); }
      ctx.fillStyle = red; ctx.fillRect(-252, -196, 8, 14); FX.glowAt(ctx, -250, -189, 26, red, .9);
      if (b.phase >= 3) { // danni: scintille
        if (Math.random() < .2) sparks(b.x + rand(-120, 120), b.y, rand(150, 300), '#ffcf7a', 3);
        if (Math.random() < .2) puff(b.x + rand(-100, 100), b.y, rand(160, 300), '#2b2224');
      }
      // scudo energetico esagonale
      if (b.shield) {
        const sa = .55 + .2 * Math.sin(G.t * 8);
        ctx.save(); ctx.beginPath(); ctx.ellipse(-10, -170, 205, 195, 0, 0, TAU); ctx.clip();
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(90,230,255,${.08 * sa})`; ctx.fillRect(-220, -370, 420, 400);
        ctx.strokeStyle = `rgba(125,249,255,${.35 * sa})`; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) { const hx = -220 + c * 36 + (r % 2) * 18, hy = -370 + r * 31; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6, px = hx + Math.cos(a) * 18, py = hy + Math.sin(a) * 18; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
        ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(160,252,255,${.8 * sa})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(-10, -170, 205, 195, 0, 0, TAU); ctx.stroke(); ctx.restore();
        FX.glow(x - 10, y - 170, 230, '#5ae6ff', .25 * sa);
      }
      ctx.restore();
    }
  }
};
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
