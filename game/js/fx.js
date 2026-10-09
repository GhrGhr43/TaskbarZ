'use strict';
// Partículas, restos en la carretera, luces y clima.
(function (Z) {
  const BLOOD = ['#5a0812', '#7a0e18', '#9a1420', '#c0202c', '#4a0610'];
  const ACID = ['#6a8a1a', '#9ac02a', '#c8e050', '#4a6a10'];
  Z.BLOOD = BLOOD;

  Z.FX = {
    parts: [], decals: [],
    reset() { this.parts.length = 0; this.decals.length = 0; },
    add(p) { if (this.parts.length < 1400) this.parts.push(p); return p; },

    blood(x, y, n, vx, ground, palette) {
      const pal = palette || BLOOD;
      for (let i = 0; i < n; i++) this.add({ k: 'drop', x: x + Z.rr(-3, 3), y: y + Z.rr(-4, 4), vx: vx * Z.rr(0.2, 1.1) + Z.rr(-35, 35), vy: Z.rr(-110, -10), g: 300, life: 2, c: Z.pick(pal), gy: ground + Z.rr(-3, 3), stick: Math.random() < 0.8 });
    },
    sparks(x, y, n, vx) {
      for (let i = 0; i < n; i++) this.add({ k: 'spark', x, y, vx: (vx || 0) + Z.rr(-60, 60), vy: Z.rr(-90, -10), g: 260, life: Z.rr(0.15, 0.45), max: 0.45 });
    },
    smoke(x, y, n, dark) {
      for (let i = 0; i < n; i++) this.add({ k: 'smoke', x: x + Z.rr(-2, 2), y, vx: Z.rr(-14, 4), vy: Z.rr(-22, -10), g: 0, life: Z.rr(0.8, 1.6), max: 1.6, s: Z.rr(1, 2), c: dark ? '#141016' : '#4a4652' });
    },
    fire(x, y, n, spread) {
      for (let i = 0; i < n; i++) this.add({ k: 'fire', x: x + Z.rr(-spread, spread), y: y + Z.rr(-1, 1), vx: Z.rr(-12, 8), vy: Z.rr(-40, -16), g: 0, life: Z.rr(0.2, 0.5), max: 0.5 });
    },
    embers(x, y, n) {
      for (let i = 0; i < n; i++) this.add({ k: 'ember', x, y, vx: Z.rr(-20, 20), vy: Z.rr(-50, -15), g: -4, life: Z.rr(0.8, 2), max: 2 });
    },
    glass(x, y, n) {
      for (let i = 0; i < n; i++) this.add({ k: 'drop', x, y, vx: Z.rr(-40, 60), vy: Z.rr(-80, -20), g: 300, life: 2, c: Z.pick(['#a8c0f0', '#e0ecff', '#6a80b8']), gy: Z.GROUND + Z.rr(-2, 6), stick: true });
    },
    debris(x, y, n, cols) {
      for (let i = 0; i < n; i++) this.add({ k: 'chunk', x, y, vx: Z.rr(-80, 120), vy: Z.rr(-150, -40), g: 320, life: 3, c: Z.pick(cols), s: Z.ri(1, 3), gy: Z.GROUND + Z.rr(-3, 8), bounce: 1 });
    },
    // Destripar a un zombi: sangre, trozos, cabeza que sale volando y cuerpo que cae.
    gore(z, vx, col, big) {
      const y = z.y - (big ? 16 : 11);
      this.blood(z.wx, y, big ? 50 : 26, vx, z.y, z.type === 'bloater' ? ACID.concat(BLOOD) : null);
      for (let i = 0; i < (big ? 8 : 4); i++) this.add({ k: 'chunk', x: z.wx, y: y + Z.rr(-3, 4), vx: vx * Z.rr(0.4, 1) + Z.rr(-30, 30), vy: Z.rr(-130, -40), g: 300, life: 3, c: Z.pick([col.top, col.skin, col.bottom, '#7a0e18']), s: big ? 3 : 2, gy: z.y + Z.rr(-2, 2), bounce: 1 });
      if (Math.random() < 0.7) this.add({ k: 'head', x: z.wx, y: y - 6, vx: vx * Z.rr(0.5, 1.1) + Z.rr(-10, 30), vy: Z.rr(-150, -70), g: 300, life: 3, c: col.helmet || col.skin, h: col.hair, s: big ? 4 : 3, gy: z.y + Z.rr(-2, 2), bounce: 1 });
      this.add({ k: 'body', x: z.wx, y: y, vx: vx * Z.rr(0.35, 0.7), vy: Z.rr(-80, -30), g: 300, life: 3, col, big, gy: z.y, spin: Z.rr(8, 16) });
    },
    explosion(x, y, scale) {
      for (let i = 0; i < 14 * scale; i++) this.add({ k: 'ball', x: x + Z.rr(-10, 10) * scale, y: y + Z.rr(-8, 4) * scale, vx: Z.rr(-30, 30), vy: Z.rr(-40, -5), g: -10, life: Z.rr(0.5, 1.1), max: 1.1, s: Z.rr(4, 9) * scale });
      this.add({ k: 'ring', x, y, life: 0.45, max: 0.45, s: 60 * scale });
      this.sparks(x, y, 40, 0);
      this.embers(x, y, 30);
    },

    update(dt) {
      const P = this.parts;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.life -= dt;
        if (p.step) { if (!p.step(p, dt)) P.splice(i, 1); continue; }   // partículas con su propio movimiento (js/gore.js)
        if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; }
        if (p.k === 'smoke') { p.s += dt * 3; p.vx *= 0.98; }
        if (p.gy !== undefined && p.y >= p.gy && p.vy > 0) {
          if (p.bounce && Math.abs(p.vy) > 60) { p.vy *= -0.35; p.vx *= 0.5; p.y = p.gy; p.bounce--; continue; }
          if (p.k === 'drop') { if (p.stick) this.decals.push({ x: p.x, y: Math.round(p.gy), c: p.c, w: Math.random() < 0.3 ? 2 : 1 }); }
          else if (p.k === 'chunk') this.decals.push({ x: p.x, y: Math.round(p.gy), c: p.c, w: p.s });
          else if (p.k === 'head') this.decals.push({ x: p.x, y: Math.round(p.gy) - 1, c: p.c, w: 3, h: 2, hair: p.h });
          else if (p.k === 'body') { this.decals.push({ x: p.x, y: Math.round(p.gy), corpse: p.col, big: p.big }); for (let k = 0; k < 6; k++) this.decals.push({ x: p.x + Z.rr(-8, 8), y: Math.round(p.gy) + Z.ri(-1, 1), c: Z.pick(BLOOD), w: 2 }); }
          else if (p.k === 'wheel') { p.vy *= -0.4; p.vx *= 0.6; p.y = p.gy; if (Math.abs(p.vy) < 20) p.life = Math.min(p.life, 1.5); continue; }
          P.splice(i, 1); continue;
        }
        if (p.life <= 0) P.splice(i, 1);
      }
      if (this.decals.length > 2400) this.decals.splice(0, this.decals.length - 2400);
    },

    drawDecals(ctx, camX) {
      const D = this.decals;
      for (let i = D.length - 1; i >= 0; i--) {
        const d = D[i], sx = Math.round(d.x - camX);
        if (sx < -40) { if (camX > 0) D.splice(i, 1); continue; }
        if (sx > Z.W + 40) continue;
        if (d.img) ctx.drawImage(d.img, sx - d.ox, d.y - d.oy);
        else if (d.corpse) Z.drawCorpse(ctx, sx, d.y, d.corpse, d.big, d.flip);
        else { Z.rect(ctx, sx, d.y, d.w, d.h || 1, d.c); if (d.hair) Z.px(ctx, sx + 2, d.y, d.hair); }
      }
    },

    draw(ctx, camX, lights) {
      for (const p of this.parts) {
        const sx = p.x - camX, sy = p.y;
        if (sx < -60 || sx > Z.W + 60) continue;
        if (p.draw) { p.draw(ctx, sx, sy, lights); continue; }
        switch (p.k) {
          case 'drop': Z.px(ctx, sx, sy, p.c); break;
          case 'chunk': Z.rect(ctx, sx, sy, p.s, p.s, p.c); break;
          case 'head': Z.rect(ctx, sx, sy, p.s, p.s, p.c); Z.rect(ctx, sx, sy, p.s, 1, p.h || '#111'); Z.px(ctx, sx, sy + p.s, '#9a1420'); break;
          case 'body': {
            const a = (p.life * p.spin) % Math.PI;
            const len = p.big ? 12 : 8, dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
            Z.line(ctx, sx - dx, sy - dy, sx, sy, 2, p.col.bottom); Z.line(ctx, sx, sy, sx + dx, sy + dy, 2, p.col.top);
            Z.px(ctx, sx + dx, sy + dy, p.col.skin);
            break;
          }
          case 'spark': Z.px(ctx, sx, sy, p.life > 0.25 ? '#fff4b0' : p.life > 0.12 ? '#ffb040' : '#c04a10'); break;
          case 'smoke': ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.5; Z.rect(ctx, sx - p.s / 2, sy - p.s / 2, p.s, p.s, p.c); ctx.globalAlpha = 1; break;
          case 'fire': {
            const f = p.life / p.max;
            Z.rect(ctx, sx, sy, f > 0.5 ? 2 : 1, f > 0.5 ? 2 : 1, f > 0.7 ? '#fff0a0' : f > 0.4 ? '#ffa030' : '#c03a10');
            break;
          }
          case 'ember': Z.px(ctx, sx, sy, Math.sin(p.life * 20) > 0 ? '#ffb040' : '#ff6020'); break;
          case 'ball': {
            const f = p.life / p.max, r = p.s * (1.2 - f * 0.5);
            Z.disc(ctx, sx, sy, r, f > 0.75 ? '#fff6c8' : f > 0.5 ? '#ffb040' : f > 0.3 ? '#c84a18' : '#3a2a2a');
            if (f > 0.4) lights.push({ x: sx, y: sy, r: r * 4, color: '#ff8a30', a: 0.4 * f });
            break;
          }
          case 'ring': {
            const f = 1 - p.life / p.max, r = p.s * f;
            ctx.strokeStyle = Z.rgba('#ffe0a0', 0.6 * (1 - f)); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(Math.round(sx), Math.round(sy), r, 0, Math.PI * 2); ctx.stroke();
            break;
          }
          case 'tracer': {
            ctx.strokeStyle = Z.rgba('#ffe8a0', Math.min(1, p.life / 0.05)); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(Math.round(sx) + 0.5, Math.round(sy) + 0.5); ctx.lineTo(Math.round(p.x2 - camX) + 0.5, Math.round(p.y2) + 0.5); ctx.stroke();
            break;
          }
          case 'flash': {
            Z.disc(ctx, sx, sy, p.s, '#fff4c0'); Z.disc(ctx, sx + 1, sy, p.s * 0.5, '#ffffff');
            lights.push({ x: sx, y: sy, r: 30, color: '#ffd080', a: 0.6 });
            break;
          }
          case 'wheel': {
            ctx.drawImage(p.img, Math.round(sx - p.img.width / 2), Math.round(sy - p.img.height / 2));
            break;
          }
        }
      }
    },
  };

  // Luces aditivas (faros, fogonazos, fuegos).
  Z.drawLights = function (ctx, lights) {
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (l.r <= 0) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, Z.rgba(l.color, l.a));
      g.addColorStop(1, Z.rgba(l.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  let VIG = null;
  Z.vignette = function (ctx) {
    if (!VIG) {
      const [c, x] = Z.canvas(Z.W, Z.H);
      const g = x.createRadialGradient(Z.W / 2, Z.H * 0.55, Z.H * 0.4, Z.W / 2, Z.H * 0.55, Z.W * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,2,8,0.75)');
      x.fillStyle = g; x.fillRect(0, 0, Z.W, Z.H);
      VIG = c;
    }
    ctx.drawImage(VIG, 0, 0);
  };

  // Clima en espacio de pantalla.
  Z.Weather = {
    drops: [], motes: [], bolt: null, boltT: 0, nextBolt: 8,
    update(dt, kind, zoneArt, speed) {
      if (kind === 'tormenta') {
        while (this.drops.length < 140) this.drops.push({ x: Math.random() * (Z.W + 60), y: Math.random() * Z.H, v: Z.rr(180, 260) });
        for (const d of this.drops) { d.y += d.v * dt; d.x -= (d.v * 0.25 + speed * 0.5) * dt; if (d.y > Z.H || d.x < -4) { d.y = -4; d.x = Math.random() * (Z.W + 60); } }
        this.nextBolt -= dt; this.boltT -= dt;
        if (this.nextBolt <= 0) {
          this.nextBolt = Z.rr(5, 13); this.boltT = 0.35;
          const pts = []; let x = Z.rr(160, 480), y = 0;
          while (y < 70) { pts.push([x, y]); x += Z.rr(-8, 8); y += Z.rr(4, 9); }
          this.bolt = pts;
          return 'flash';
        }
      } else this.drops.length = 0;
      const wantMotes = zoneArt && (zoneArt.ash || zoneArt.dust) ? 60 : 0;
      while (this.motes.length < wantMotes) this.motes.push({ x: Math.random() * Z.W, y: Math.random() * Z.H, v: Z.rr(6, 16), ph: Math.random() * 6 });
      if (this.motes.length > wantMotes) this.motes.length = wantMotes;
      for (const m of this.motes) {
        m.ph += dt; m.y += m.v * dt * (zoneArt.dust ? 0.3 : 1); m.x -= (speed * 0.4 + (zoneArt.dust ? 30 : 4)) * dt + Math.sin(m.ph) * 0.1;
        if (m.y > Z.H) m.y = 0; if (m.x < 0) m.x += Z.W;
      }
      return null;
    },
    draw(ctx, zoneArt) {
      for (const d of this.drops) { Z.rect(ctx, d.x, d.y, 1, 3, 'rgba(150,170,220,0.45)'); if (d.y > Z.ROAD_TOP + 6 && Math.random() < 0.05) Z.px(ctx, d.x, d.y + 2, '#a8b8e0'); }
      if (zoneArt) for (const m of this.motes) Z.px(ctx, m.x, m.y, zoneArt.dust ? 'rgba(230,170,110,0.6)' : 'rgba(170,170,160,0.55)');
      if (this.boltT > 0 && this.bolt) {
        ctx.strokeStyle = this.boltT > 0.2 ? '#ffffff' : '#a8b8ff'; ctx.lineWidth = 1;
        ctx.beginPath(); this.bolt.forEach(([x, y], i) => i ? ctx.lineTo(x + 0.5, y + 0.5) : ctx.moveTo(x + 0.5, y + 0.5)); ctx.stroke();
      }
    },
  };
})(window.ZG);
