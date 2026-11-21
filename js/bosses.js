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
      const fl = b.flash > 0, C = c => fl ? '#fff' : c; if (b.shakeMe) { x += rand(-3, 3); b.shakeMe = 0; }
      ctx.save(); ctx.translate(x, y);
      // cingoli
      ctx.fillStyle = C('#1d1f1b'); roundRect(ctx, -118, -46, 236, 46, 22); ctx.fill();
      ctx.fillStyle = C('#3a3d36'); for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(-96 + i * 32, -22, 13, 0, TAU); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; const a = b.tread * .1 + i; ctx.beginPath(); ctx.moveTo(-96 + i * 32 + Math.cos(a) * 12, -22 + Math.sin(a) * 12); ctx.lineTo(-96 + i * 32 - Math.cos(a) * 12, -22 - Math.sin(a) * 12); ctx.stroke(); }
      // scafo
      ctx.fillStyle = C('#5d6b3a'); ctx.beginPath(); ctx.moveTo(-130, -46); ctx.lineTo(-100, -84); ctx.lineTo(115, -84); ctx.lineTo(128, -46); ctx.fill();
      ctx.fillStyle = C('#4a5530'); ctx.fillRect(-100, -60, 215, 8);
      // corno da ariete
      ctx.fillStyle = C('#c9c9c9'); ctx.beginPath(); ctx.moveTo(-128, -70); ctx.lineTo(-175, -58); ctx.lineTo(-128, -50); ctx.fill();
      // torretta
      ctx.fillStyle = C('#6b7a44'); roundRect(ctx, -50, -122, 110, 42, 12); ctx.fill();
      ctx.fillStyle = C('#2b2b2b'); ctx.fillRect(-150 + (b.recoil || 0), -108, 105, 13); ctx.fillRect(-158 + (b.recoil || 0), -111, 14, 19);
      ctx.fillStyle = C('#333'); ctx.fillRect(-90, -94, 40, 6);
      ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(30, -104, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = C('#2a2a2a'); ctx.fillRect(70, -132, 12, 50);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = 'bold 13px monospace'; ctx.fillText('R-01', 0, -66);
      ctx.restore();
      if (Math.random() < .3) puff(b.x + 76, b.y, 140, '#444');
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
      const fl = b.flash > 0, C = c => fl ? '#fff' : c; if (b.shakeMe) { x += rand(-3, 3); b.shakeMe = 0; }
      ctx.save(); ctx.translate(x, y);
      // zampe
      ctx.strokeStyle = C('#6e5a3a'); ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const lx = -50 + i * 35, ph = Math.sin(b.walk + i * 1.6) * 8; ctx.beginPath(); ctx.moveTo(lx, -45); ctx.lineTo(lx - 20, -70 + ph); ctx.lineTo(lx - 34, -2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(lx + 8, -45); ctx.lineTo(lx + 26, -66 - ph); ctx.lineTo(lx + 38, -2); ctx.stroke(); }
      // corpo
      const g = ctx.createLinearGradient(0, -80, 0, -30); g.addColorStop(0, C('#c9a46a')); g.addColorStop(1, C('#7a5c34'));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -55, 95, 30, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C('#5d4527'); for (let i = 0; i < 5; i++) ctx.fillRect(-60 + i * 28, -82, 4, 50);
      // chele
      const cl = b.atk === 'dash' ? -20 : Math.sin(G.t * 3) * 4;
      ctx.fillStyle = C('#a8844e'); ctx.beginPath(); ctx.ellipse(-120 + cl, -50, 32, 14, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-145 + cl, -58); ctx.lineTo(-175 + cl, -70); ctx.lineTo(-150 + cl, -48); ctx.fill(); ctx.beginPath(); ctx.moveTo(-145 + cl, -44); ctx.lineTo(-172 + cl, -36); ctx.lineTo(-150 + cl, -52); ctx.fill();
      ctx.strokeStyle = C('#8c6b3e'); ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-80, -55); ctx.lineTo(-100 + cl, -50); ctx.stroke();
      // occhi
      ctx.fillStyle = '#7dff4d'; ctx.shadowColor = '#7dff4d'; ctx.shadowBlur = 10; ctx.fillRect(-88, -66, 8, 5); ctx.fillRect(-76, -70, 6, 4); ctx.shadowBlur = 0;
      // coda
      ctx.strokeStyle = C('#9a7748'); ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(80, -60); const sw = Math.sin(G.t * 2) * 10, aim = b.atk === 'tail' ? -10 : 0;
      ctx.bezierCurveTo(150, -80, 150 + sw, -190, 70 + aim, -200); ctx.stroke();
      ctx.fillStyle = C('#d9c08a'); ctx.beginPath(); ctx.moveTo(70 + aim, -215); ctx.lineTo(30 + aim, -195); ctx.lineTo(70 + aim, -185); ctx.fill();
      glow(ctx, 40 + aim, -198, b.atk === 'tail' ? 40 : 18, 'rgba(125,255,77,.9)');
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
      const fl = b.flash > 0, C = c => fl ? '#fff' : c, yy = y - b.z;
      ctx.save(); ctx.translate(x, yy); ctx.scale(-b.face, 1); // disegnato rivolto a sinistra
      ctx.fillStyle = C('#2f3a40'); ctx.beginPath(); ctx.moveTo(40, -10); ctx.lineTo(190, -18); ctx.lineTo(200, -40); ctx.lineTo(186, -40); ctx.lineTo(176, -24); ctx.lineTo(40, -24); ctx.fill();
      ctx.save(); ctx.translate(196, -30); ctx.rotate(G.t * 40); ctx.fillStyle = 'rgba(200,200,200,.6)'; ctx.fillRect(-2, -20, 4, 40); ctx.restore();
      ctx.fillStyle = C('#3c4a52'); ctx.beginPath(); ctx.ellipse(0, -10, 80, 32, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C('#1c2328'); ctx.fillRect(-40, 22, 110, 5); ctx.fillRect(-20, 12, 5, 12); ctx.fillRect(40, 12, 5, 12);
      ctx.fillStyle = fl ? '#fff' : 'rgba(120,220,255,.75)'; ctx.beginPath(); ctx.moveTo(-78, -6); ctx.quadraticCurveTo(-70, -36, -30, -38); ctx.lineTo(-30, -8); ctx.fill();
      ctx.fillStyle = C('#4b5a60'); ctx.fillRect(-20, 6, 60, 12); ctx.fillStyle = C('#a33'); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-14 + i * 18, 18, 5, 0, TAU); ctx.fill(); }
      ctx.fillStyle = C('#222'); ctx.fillRect(-100, 4, 30, 7);
      ctx.fillStyle = C('#1a1a1a'); ctx.fillRect(-4, -48, 8, 14);
      ctx.fillStyle = 'rgba(30,30,30,.55)'; const r = Math.sin(G.t * 30); ctx.fillRect(-160 * Math.abs(r), -50, 320 * Math.abs(r), 4);
      ctx.fillStyle = Math.sin(G.t * 8) > 0 ? '#ff2020' : '#400'; ctx.beginPath(); ctx.arc(60, -30, 3, 0, TAU); ctx.fill();
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
      const fl = b.flash > 0, C = c => fl ? '#fff' : c, yy = y - b.z, st = Math.sin(b.walk) * 5;
      ctx.save(); ctx.translate(x, yy);
      ctx.fillStyle = C('#41617d'); ctx.fillRect(-55, -95 + st, 34, 95 - st); ctx.fillRect(22, -95 - st, 34, 95 + st);
      ctx.fillStyle = C('#cfeeff'); ctx.fillRect(-62, -18, 46, 18); ctx.fillRect(16, -18, 46, 18);
      ctx.fillStyle = C('#9cc9e8'); roundRect(ctx, -80, -205, 160, 115, 24); ctx.fill();
      ctx.fillStyle = C('#5b88ab'); ctx.fillRect(-80, -130, 160, 12);
      glow(ctx, 0, -160, 50, 'rgba(120,240,255,.9)', .7 + .3 * Math.sin(G.t * 5)); ctx.fillStyle = '#e6fbff'; ctx.beginPath(); ctx.arc(0, -160, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = C('#cfeeff'); roundRect(ctx, -34, -245, 68, 42, 12); ctx.fill(); ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12; ctx.fillRect(-26, -230, 34, 8); ctx.shadowBlur = 0;
      const arm = b.atk === 'shards' || b.atk === 'freeze' ? -.5 : Math.sin(G.t * 1.5) * .1;
      ctx.save(); ctx.translate(-82, -185); ctx.rotate(arm); ctx.fillStyle = C('#7aa6c8'); ctx.fillRect(-26, 0, 30, 90); ctx.fillStyle = C('#e2f6ff'); ctx.beginPath(); ctx.moveTo(-30, 90); ctx.lineTo(-12, 140); ctx.lineTo(8, 90); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(82, -185); ctx.rotate(-arm * .5); ctx.fillStyle = C('#7aa6c8'); ctx.fillRect(-4, 0, 30, 90); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 5; i++) ctx.fillRect(-70 + i * 32, -207, 14, 6);
      ctx.restore();
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
      const fl = b.flash > 0, C = c => fl ? '#fff' : c;
      ctx.save(); ctx.translate(x, y);
      glow(ctx, 0, -10, 170, 'rgba(255,90,0,.6)');
      ctx.fillStyle = '#ff6a00'; ctx.beginPath(); ctx.ellipse(0, -5, 150, 30, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.ellipse(0, -5, 110, 18, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C('#3a0f08'); ctx.beginPath(); ctx.moveTo(-95, -10); ctx.quadraticCurveTo(-60, -130 * b.rise - 20, 30, -120 * b.rise - 10); ctx.quadraticCurveTo(110, -90 * b.rise, 100, -10); ctx.fill();
      ctx.strokeStyle = `rgba(255,${120 + 60 * Math.sin(G.t * 3) | 0},0,.9)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-50, -20); ctx.lineTo(-20, -70 * b.rise); ctx.lineTo(10, -40); ctx.lineTo(40, -90 * b.rise); ctx.stroke();
      const hs = this.heads(b);
      hs.forEach((h, i) => {
        ctx.strokeStyle = C(i === 1 ? '#4a140a' : '#3f1209'); ctx.lineWidth = 26 - i * 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10 + i * 20, -60 * b.rise - 10); ctx.quadraticCurveTo(h.x + 60, h.y + 70, h.x, h.y); ctx.stroke();
        ctx.save(); ctx.translate(h.x, h.y); const open = b.atk === 'fire' || b.atk === 'breath' ? .5 : .15 + .1 * Math.sin(G.t * 4 + i);
        ctx.fillStyle = C('#5a1a0c'); ctx.beginPath(); ctx.moveTo(10, -14); ctx.lineTo(-48, -10 - open * 20); ctx.lineTo(-40, 0); ctx.lineTo(10, 8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(-44, 6 + open * 24); ctx.lineTo(-36, 14); ctx.lineTo(12, 16); ctx.fill();
        ctx.fillStyle = '#ffdd00'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 10; ctx.fillRect(-14, -12, 8, 5); ctx.shadowBlur = 0;
        if (open > .3) glow(ctx, -40, 2, 30, 'rgba(255,160,0,.9)');
        ctx.fillStyle = C('#2a0904'); ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(16, -32); ctx.lineTo(12, -12); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
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
      const fl = b.flash > 0, C = c => fl ? '#fff' : c, st = Math.sin(b.walk) * 6, red = b.phase >= 3 ? '#ff1a1a' : '#ff3d7f';
      ctx.save(); ctx.translate(x, y);
      // gambe
      const legD = (lx, s) => { ctx.fillStyle = C('#2a2d3a'); ctx.beginPath(); ctx.moveTo(lx - 22, -150); ctx.lineTo(lx + 22, -150); ctx.lineTo(lx + 30 + s, -75); ctx.lineTo(lx + 14 + s, -75); ctx.fill(); ctx.fillStyle = C('#3c4153'); ctx.beginPath(); ctx.arc(lx + 22 + s, -78, 18, 0, TAU); ctx.fill(); ctx.fillStyle = C('#2a2d3a'); ctx.beginPath(); ctx.moveTo(lx + 8 + s, -78); ctx.lineTo(lx + 36 + s, -78); ctx.lineTo(lx + 26, -10); ctx.lineTo(lx - 4, -10); ctx.fill(); ctx.fillStyle = C('#1a1c25'); ctx.fillRect(lx - 30, -14, 74, 14); ctx.fillStyle = red; ctx.fillRect(lx - 4 + s * .5, -120, 4, 30); };
      legD(-70, st); legD(50, -st);
      // busto
      const g = ctx.createLinearGradient(0, -300, 0, -140); g.addColorStop(0, C('#4a4f63')); g.addColorStop(1, C('#20222d'));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-130, -160); ctx.lineTo(-150, -250); ctx.lineTo(-90, -300); ctx.lineTo(90, -300); ctx.lineTo(140, -250); ctx.lineTo(120, -160); ctx.fill();
      ctx.strokeStyle = red; ctx.lineWidth = 2; ctx.shadowColor = red; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(-120, -175); ctx.lineTo(-135, -248); ctx.lineTo(-85, -288); ctx.moveTo(110, -175); ctx.lineTo(125, -248); ctx.lineTo(80, -288); ctx.stroke(); ctx.shadowBlur = 0;
      // nucleo
      const pc = b.charge ? 1 : .6 + .4 * Math.sin(G.t * 6);
      glow(ctx, -10, -225, b.charge ? 130 : 70, b.phase >= 3 ? 'rgba(255,30,30,.9)' : 'rgba(255,61,127,.9)', pc);
      ctx.fillStyle = '#fff0f5'; ctx.beginPath(); ctx.arc(-10, -225, 20 + pc * 6, 0, TAU); ctx.fill();
      // testa
      ctx.fillStyle = C('#33374a'); ctx.beginPath(); ctx.moveTo(-50, -300); ctx.lineTo(-40, -340); ctx.lineTo(40, -340); ctx.lineTo(55, -300); ctx.fill();
      ctx.fillStyle = red; ctx.shadowColor = red; ctx.shadowBlur = 16; ctx.fillRect(-38, -326, 60, 9); ctx.shadowBlur = 0;
      // spalle e cannoni
      ctx.fillStyle = C('#3c4153'); roundRect(ctx, -195, -300, 70, 60, 14); ctx.fill(); roundRect(ctx, 125, -300, 70, 60, 14); ctx.fill();
      ctx.fillStyle = C('#15161d'); ctx.fillRect(-260, -282, 80, 14); ctx.fillRect(-260, -262, 80, 10);
      ctx.fillStyle = C('#5a1020'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(140 + i * 18, -285 + j * 20, 6, 0, TAU); ctx.fill(); }
      // braccio cannone
      ctx.fillStyle = C('#2a2d3a'); ctx.fillRect(-175, -240, 40, 70); ctx.fillStyle = C('#1a1c25'); ctx.fillRect(-235, -200, 110, 30); ctx.fillStyle = red; ctx.fillRect(-240, -192, 8, 14);
      if (b.shield) { ctx.globalAlpha = .25 + .15 * Math.sin(G.t * 8); ctx.strokeStyle = '#7df9ff'; ctx.fillStyle = 'rgba(125,249,255,.15)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(-10, -170, 200, 190, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.restore();
    }
  }
};
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
