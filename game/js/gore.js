'use strict';
// Impactos, heridas y muertes de los zombis.
// · Al recibir daño el zombi no parpadea en blanco: sangra, se echa atrás un píxel y su sprite pasa a
//   «tocado» y luego a «destrozado» (sprites.js → set.stage(n)), soltando trozos al cambiar.
// · Cada muerte se elige según cómo muere (bala, tiro a la cabeza, perdigones, atropello, sierra,
//   explosión, fuego) entre varias animaciones: se desploma, cae de rodillas, sale despedido, lo
//   aplastas, revienta, se parte en dos, pierde la cabeza o se quema.
// Todo reutiliza los cuadros del juego de sprites (rotados o recortados), así que funciona igual con
// sprites dibujados a mano. Coste: una drawImage por cuerpo en movimiento; al quedar quieto pasa a ser
// una mancha de la carretera ya rotada (una drawImage sin transformaciones).
(function (Z) {
  const FX = Z.FX, BLOOD = Z.BLOOD;   // Z.G aún no existe al cargar este archivo
  const snd = (name, o) => { if (Z.Audio) Z.Audio.play(name, o); };

  // Muertes posibles según la causa (pesos). Las claves de cada lista son funciones de DEATH.
  const TABLE = {
    bullet: { collapse: 4, kneel: 3, blown: 1 },
    head: { headpop: 1 },
    pellet: { blown: 3, gore: 2, collapse: 1 },
    pierce: { blown: 2, collapse: 2, split: 1 },
    ramFast: { flung: 3, gore: 2, crushed: 1 },
    ramSlow: { crushed: 3, flung: 1, kneel: 1 },
    grind: { split: 2, gore: 2, crushed: 1 },
    blast: { gore: 3, flung: 2 },
    fire: { burn: 1 },
  };
  // Umbrales de vida para las heridas: por encima del 66% sano, por encima del 33% tocado, si no destrozado.
  const woundOf = (z) => { const f = z.hp / z.maxHp; return f > 0.66 ? 0 : f > 0.33 ? 1 : 2; };

  // ---------------- Heridas ----------------
  // Cuadros que tocan según el daño; al empeorar la herida salta sangre y algún trozo.
  function frames(z) {
    const set = Z.SPR[z.type][z.v], w = Math.min(Z.WOUNDS - 1, woundOf(z));
    if (w > (z.wound || 0)) {
      z.wound = w;
      const y = z.y - (z.type === 'brute' ? 20 : 13);
      FX.blood(z.wx, y, w === 2 ? 14 : 8, 50, z.y);
      FX.add({ k: 'chunk', x: z.wx, y, vx: Z.rr(10, 70), vy: Z.rr(-120, -60), g: 300, life: 3, c: Z.pick([set.col.top, set.col.skin]), s: 2, gy: z.y + Z.rr(-2, 2), bounce: 1 });
      if (w === 2 && set.loseArm) FX.add({ k: 'chunk', x: z.wx - 2, y: y - 2, vx: Z.rr(30, 90), vy: Z.rr(-150, -90), g: 300, life: 3, c: set.col.skin, s: 2, gy: z.y + 1, bounce: 2 });
    }
    return set.stage(z.wound || 0);
  }

  // Impacto de bala o perdigón: chorro de sangre en el sentido del disparo y gotas que manchan el suelo.
  function hit(z, y, vx, big) {
    const n = big ? 9 : 5;
    for (let i = 0; i < n; i++) FX.add({ k: 'drop', x: z.wx + Z.rr(-1, 1), y: y + Z.rr(-1, 1), vx: vx * Z.rr(0.6, 1.6) + Z.rr(-20, 20), vy: Z.rr(-70, 10), g: 300, life: 2, c: Z.pick(BLOOD), gy: z.y + Z.rr(-2, 3), stick: true });
    for (let i = 0; i < 3; i++) FX.add({ k: 'drop', x: z.wx, y, vx: -vx * Z.rr(0.2, 0.5), vy: Z.rr(-60, -20), g: 300, life: 2, c: '#c0202c', gy: z.y + Z.rr(-1, 2), stick: true });
    if (big) FX.add(mist(z.wx + 2, y, vx));
  }
  // Nube de sangre pulverizada (dura un instante).
  function mist(x, y, vx) {
    const pts = [];
    for (let i = 0; i < 10; i++) pts.push([Z.rr(-2, 2), Z.rr(-2, 2), vx * Z.rr(0.1, 0.5) + Z.rr(-25, 25), Z.rr(-30, 15)]);
    return { x, y, life: 0.35, pts,
      step(p, dt) { for (const q of p.pts) { q[0] += q[2] * dt; q[1] += q[3] * dt; q[2] *= 0.9; q[3] *= 0.9; } return p.life > 0; },
      draw(ctx, sx, sy) { ctx.globalAlpha = Math.max(0, this.life / 0.35) * 0.7; for (const q of this.pts) Z.px(ctx, sx + q[0], sy + q[1], '#c0202c'); ctx.globalAlpha = 1; },
    };
  }

  // ---------------- Cuerpos ----------------
  // Cuadro del zombi tumbado, ya rotado y oscurecido, para dejarlo en la carretera. Se pinta con la misma
  // transformación que la caída (girar θ sobre los pies, espejo si mira a la derecha), con los pies en el
  // centro del lienzo. cut: filas que se quitan por arriba (sin cabeza o sin torso).
  const LYING = new Map(), DARK = new Map();
  let ids = 0;
  const idOf = (img) => img.__gid || (img.__gid = ++ids);
  function cached(map, k, make) {
    let c = map.get(k);
    if (!c) { c = make(); map.set(k, c); if (map.size > 300) map.delete(map.keys().next().value); }
    return c;
  }
  // Versión calcinada de un cuadro (para los que mueren quemados).
  const dark = (img) => cached(DARK, idOf(img), () => {
    const [c, x] = Z.canvas(img.width, img.height);
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(22,12,10,0.88)'; x.fillRect(0, 0, c.width, c.height);
    return c;
  });
  function lying(img, set, th, flip, cut) {
    return cached(LYING, idOf(img) + '|' + th + '|' + flip + '|' + cut, () => {
      const C = Math.max(set.w, set.h), [cv, x] = Z.canvas(C * 2, C * 2);
      x.translate(C, C); x.rotate(th); x.scale(flip, 1);
      x.drawImage(img, 0, cut, set.w, set.h - cut, -set.cx, -set.gy + cut, set.w, set.h - cut);
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(7,5,12,0.3)'; x.fillRect(0, 0, cv.width, cv.height);
      return cv;
    });
  }
  // Deja el cuerpo tumbado en la carretera (dir: 1 de espaldas, -1 de bruces) con su charco.
  function rest(z, set, img, dir, cut, flip, burnt) {
    const C = Math.max(set.w, set.h);
    FX.decals.push({ x: z.wx, y: z.y - LIFT, img: lying(burnt ? dark(img) : img, set, dir * flip * Math.PI / 2, flip, cut), ox: C, oy: C });
    if (!burnt) for (let k = 0; k < 5; k++) FX.decals.push({ x: z.wx + dir * flip * Z.rr(0, 12), y: z.y + Z.ri(-1, 1), c: Z.pick(BLOOD), w: Z.ri(1, 3) });
  }
  const LIFT = 2;   // tumbado, el cuerpo queda un poco por encima de la línea de los pies

  // Cuerpo que cae girando sobre los pies (o volando). opts: rot final, tiempo, retraso, salto, recorte.
  function body(z, set, img, o) {
    const flip = z.dir > 0 ? -1 : 1;
    const p = {
      x: z.wx, y: z.y, vx: o.vx || 0, vy: o.vy || 0, g: o.vy ? 300 : 0, life: 6, t: 0, a: 0, spin: o.spin || 0,
      dir: o.dir, delay: o.delay || 0, dur: o.dur || 0.35, cut: o.cut || 0, drop: 0, kneel: o.kneel || 0, burnt: o.burnt, flip,
      step(p, dt) {
        p.t += dt;
        if (p.vy || p.g) {   // en el aire
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.a += p.spin * dt;
          if (p.y >= z.y && p.vy > 0) {
            if (p.vy > 90) { p.vy *= -0.3; p.vx *= 0.5; p.y = z.y; FX.blood(p.x, p.y - 3, 4, p.vx, z.y); snd('golpe', { vol: 0.25, pitch: 1.4, gap: 0.05 }); return true; }
            p.vy = 0; p.g = 0; p.y = z.y;
            z.wx = p.x; rest(z, set, img, p.dir, p.cut, flip, p.burnt); return false;
          }
          return p.life > 0;
        }
        if (p.t < p.delay) return true;
        const t = (p.t - p.delay) / p.dur;
        if (p.kneel && t < 0.4) { p.drop = Math.round(p.kneel * t / 0.4); return true; }
        const f = Math.min(1, (t - (p.kneel ? 0.4 : 0)) / (p.kneel ? 0.6 : 1));
        p.a = p.dir * Math.PI / 2 * f * f;
        if (f >= 1) { z.wx = p.x; rest(z, set, img, p.dir, p.cut, flip, p.burnt); FX.blood(p.x + p.dir * flip * 8, z.y - 2, 3, 0, z.y); return false; }
        return true;
      },
      draw(ctx, sx, sy) {
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy + this.drop - LIFT * Math.abs(Math.sin(this.a))));
        ctx.rotate(this.a * this.flip);
        ctx.scale(this.flip, 1);
        const c = this.cut, hBottom = this.kneel ? set.h - this.drop : set.h;
        ctx.drawImage(this.burnt ? dark(img) : img, 0, c, set.w, hBottom - c, -set.cx, -set.gy + c, set.w, hBottom - c);
        ctx.restore();
      },
    };
    return FX.add(p);
  }

  // Trozo de cuerpo recortado (la mitad de arriba al partirlo) que sale volando girando.
  function half(z, set, img, top, vx, vy) {
    const flip = z.dir > 0 ? -1 : 1, rows = top ? set.hip : set.h - set.hip, y0 = top ? 0 : set.hip;
    return FX.add({ x: z.wx, y: z.y - (top ? set.gy - set.hip : 0), vx, vy, g: 300, a: 0, spin: Z.rr(8, 14), life: 4,
      step(p, dt) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.a += p.spin * dt;
        if (Math.random() < dt * 30) FX.add({ k: 'drop', x: p.x, y: p.y, vx: Z.rr(-20, 20), vy: Z.rr(-20, 10), g: 300, life: 2, c: Z.pick(BLOOD), gy: z.y + Z.rr(-2, 2), stick: true });
        if (p.y >= z.y - 2 && p.vy > 0) { FX.decals.push({ x: p.x, y: z.y, corpse: set.col, big: false, flip: flip < 0 }); FX.blood(p.x, z.y - 3, 6, p.vx * 0.3, z.y); return false; }
        return p.life > 0;
      },
      draw(ctx, sx, sy) {
        ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.rotate(this.a); ctx.scale(flip, 1);
        ctx.drawImage(img, 0, y0, set.w, rows, -set.cx, -rows / 2, set.w, rows);
        ctx.restore();
      },
    });
  }

  // Sangre a chorros desde el cuello o el tronco durante un rato.
  function fountain(x, y, gy, dur, up) {
    return FX.add({ x, y, life: dur, step(p, dt) {
      if (Math.random() < dt * 40) FX.add({ k: 'drop', x: p.x + Z.rr(-1, 1), y: p.y, vx: Z.rr(-25, 25), vy: -Z.rr(up * 0.6, up), g: 300, life: 2, c: Z.pick(BLOOD), gy: gy + Z.rr(-2, 2), stick: true });
      return p.life > 0;
    }, draw() {} });
  }

  const DEATH = {
    collapse(z, set, img, vx) { body(z, set, img, { dir: 1, dur: Z.rr(0.3, 0.45) }); FX.blood(z.wx, z.y - 12, 8, vx * 0.5, z.y); },
    kneel(z, set, img) { body(z, set, img, { dir: -1, dur: 0.7, kneel: 5 }); FX.blood(z.wx, z.y - 10, 6, 10, z.y); },
    blown(z, set, img, vx) { body(z, set, img, { dir: 1, vx: Math.min(140, vx * 0.8), vy: -Z.rr(50, 90), spin: Z.rr(5, 8) }); FX.blood(z.wx, z.y - 12, 14, vx, z.y); },
    flung(z, set, img, vx) {
      body(z, set, img, { dir: Math.random() < 0.5 ? 1 : -1, vx: vx * Z.rr(0.9, 1.4), vy: -Z.rr(120, 190), spin: Z.rr(10, 18) * (Math.random() < 0.5 ? 1 : -1) });
      FX.blood(z.wx, z.y - 12, 16, vx, z.y); snd('golpe', { vol: 0.4, pitch: 0.8, gap: 0.05 });
    },
    crushed(z, set, img, vx) {
      rest(z, set, img, Math.random() < 0.5 ? 1 : -1, 0, z.dir > 0 ? -1 : 1, false);
      FX.blood(z.wx, z.y - 3, 22, vx * 0.6, z.y);
      for (let i = 0; i < 3; i++) FX.add({ k: 'chunk', x: z.wx, y: z.y - 2, vx: Z.rr(-40, 80), vy: Z.rr(-90, -30), g: 300, life: 3, c: '#e0d4b8', s: 1, gy: z.y + Z.rr(-2, 2), bounce: 1 });
      snd('chof', { vol: 0.5, pitch: 0.7, gap: 0.05 });
      const car = Z.G.car; if (car && !car.dead) car.bump = Math.max(car.bump, 1);
    },
    headpop(z, set, img, vx) {
      const cut = Math.max(0, set.neck - 1), ny = z.y - (set.gy - set.neck);
      for (let i = 0; i < 6; i++) FX.add({ k: 'chunk', x: z.wx, y: ny - 3, vx: vx * Z.rr(0.3, 0.9) + Z.rr(-40, 40), vy: Z.rr(-140, -50), g: 300, life: 3, c: Z.pick([set.col.skin, '#e0d4b8', '#9a1420', set.col.hair || '#111']), s: Z.ri(1, 2), gy: z.y + Z.rr(-2, 2), bounce: 1 });
      FX.add(mist(z.wx, ny - 2, vx));
      fountain(z.wx, ny, z.y, 0.6, 110);
      body(z, set, img, { dir: 1, delay: 0.3, dur: 0.4, cut });
      snd('chof', { vol: 0.5, pitch: 1.6, gap: 0.05 });
    },
    split(z, set, img, vx) {
      half(z, set, img, true, vx * 0.7 + Z.rr(-10, 30), -Z.rr(90, 140));
      body(z, set, img, { dir: Math.random() < 0.5 ? 1 : -1, delay: 0.35, dur: 0.3, cut: set.hip });
      fountain(z.wx, z.y - (set.gy - set.hip), z.y, 0.5, 70);
      FX.blood(z.wx, z.y - 10, 16, vx, z.y);
    },
    burn(z, set, img) {
      body(z, set, img, { dir: -1, dur: 0.9, kneel: 4, burnt: true });
      FX.embers(z.wx, z.y - 8, 10); FX.smoke(z.wx, z.y - 12, 3, true);
    },
    gore(z, set, img, vx) { FX.gore(z, vx, set.col, z.type === 'brute'); },
  };

  // Mata a un zombi con la animación que toque. how: bullet, head, pellet, pierce, ram, grind, blast, fire.
  function kill(z, vx, how) {
    const set = Z.SPR[z.type][z.v];
    const st = set.stage(z.wound || 0);
    const frs = z.atk ? st.attack : st.walk;
    const img = frs[Math.floor(z.phase * frs.length) % frs.length].c;
    let key = how || 'ram';
    if (key === 'ram') key = Math.abs(vx) > 110 ? 'ramFast' : 'ramSlow';
    let kind = TABLE[key] ? Z.wpick(TABLE[key]) : 'gore';
    if (z.type === 'bloater' && kind !== 'burn') kind = 'gore';              // los gordos siempre revientan
    if (z.type === 'brute' && (kind === 'flung' || kind === 'blown')) kind = 'collapse';   // demasiado pesado para volar
    DEATH[kind](z, set, img, vx || 60);
    return kind;
  }

  Z.Gore = { frames, hit, kill, TABLE, DEATH };
})(window.ZG);
