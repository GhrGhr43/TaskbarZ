'use strict';
// Armas del tirador: un superviviente asomado por una ventanilla dispara a donde hagas clic.
// Se puede cambiar por qué ventanilla se asoma o cerrarla (sigue disparando desde la ventanilla del
// otro lado, que no se ve). El autodisparo es una compra tardía: al principio todo va a mano.
(function (Z) {
  const S = Z.S, G = Z.G, FX = Z.FX;
  const snd = (name, o) => { if (Z.Audio) Z.Audio.play(name, o); };

  // len: largo del cañón en el sprite. two: a dos manos. hold: dispara mientras mantienes pulsado.
  Z.GUNS = [
    { id: 'pistola', name: 'Pistola 9 mm', desc: 'La que llevabas encima cuando empezó todo. Hacen falta varios tiros por zombi.', cost: 0,
      dmg: 3, rate: 4, mag: 8, reload: 1.3, len: 3, sfx: 'disparo', pitch: 1.25, vol: 0.4, push: 1, flash: 1.2 },
    { id: 'revolver', name: 'Revólver Magnum', desc: 'Seis balas que pesan. Apunta a la cabeza.', cost: 250,
      dmg: 8, rate: 2.2, mag: 6, reload: 1.8, len: 4, sfx: 'disparo', pitch: 0.75, vol: 0.65, push: 2, flash: 1.6 },
    { id: 'recortada', name: 'Escopeta recortada', desc: 'Dos cañones y un abanico de perdigones. Para los grupos.', cost: 1200,
      dmg: 4, pellets: 6, spread: 9, rate: 1.6, mag: 2, reload: 1.5, len: 6, two: true, sfx: 'escopeta', vol: 0.55, push: 1, flash: 2.4 },
    { id: 'subfusil', name: 'Subfusil', desc: 'Mantén pulsado y no sueltes hasta vaciarlo.', cost: 5000,
      dmg: 4.5, rate: 10, hold: true, mag: 30, reload: 2, len: 5, sfx: 'metralla', vol: 0.5, push: 1, flash: 1.3 },
    { id: 'rifle', name: 'Rifle de caza', desc: 'Atraviesa a tres zombis en fila.', cost: 16000,
      dmg: 55, pierce: 3, rate: 1.1, mag: 5, reload: 2.2, len: 9, two: true, scope: true, sfx: 'disparo', pitch: 0.55, vol: 0.85, push: 4, flash: 2 },
    { id: 'granadas', name: 'Lanzagranadas', desc: 'Lo que toca, vuela por los aires.', cost: 50000,
      dmg: 110, aoe: 20, rate: 0.8, mag: 4, reload: 2.6, len: 6, two: true, thick: true, sfx: 'golpe', pitch: 0.7, vol: 0.7, push: 0, flash: 1.8 },
  ];
  Z.gun = (id) => Z.GUNS.find(g => g.id === id) || Z.GUNS[0];
  // Autodisparo: se desbloquea al llegar a Ciudad Ceniza. Empieza lento y se mejora con «Pulso firme».
  const AUTO = { cost: 12000, needDist: 1800, base: 4000, growth: 1.7, max: 10 };
  const autoMul = () => 0.3 + 0.07 * S.gun.autoLvl;
  const autoCost = () => Math.ceil(AUTO.base * Math.pow(AUTO.growth, S.gun.autoLvl));

  function norm() {
    const d = { owned: { pistola: 0 }, eq: 'pistola', view: 'front', auto: false, autoOn: true, autoLvl: 0 };
    if (!S.gun) S.gun = {};
    for (const k in d) if (S.gun[k] === undefined) S.gun[k] = d[k];
    if (S.gun.owned[S.gun.eq] === undefined) S.gun.eq = 'pistola';
  }
  norm();

  // Estadísticas con el nivel de mejora: +15% daño, +4% cadencia y recarga un 3% más rápida por nivel.
  function stats(id) {
    const g = Z.gun(id || S.gun.eq), lvl = S.gun.owned[g.id] || 0;
    return Object.assign({}, g, { lvl, dmg: g.dmg * (1 + 0.15 * lvl), rate: g.rate * (1 + 0.04 * lvl), reload: g.reload * (1 - 0.03 * lvl), pellets: g.pellets || 1 });
  }

  // ---------------- Estado en vivo ----------------
  const R = {
    k: 0, side: 'front', aim: 0.3, recoil: 0, cool: 0, ammo: 8, reload: 0, gunId: null, run: null,
    press: null, holding: false, mx: -1, my: -1, inStage: false, lastManual: -99, lastShot: -99, dry: false, nades: [], over: false,
  };

  // Ventanillas del chasis: la delantera es la del conductor; la trasera, otra si la hay.
  function sides(art) {
    const ws = art.windows, dx = art.driver[0];
    let f = ws.findIndex(w => dx >= w[0] && dx < w[0] + w[2]);
    if (f < 0) f = ws.length - 1;
    const r = ws.findIndex((w, i) => i !== f);
    return { front: ws[f], rear: r >= 0 ? ws[r] : null };
  }
  const VIEWS = ['front', 'rear', 'closed'];
  function nextView() {
    const sd = sides(G.art);
    let i = VIEWS.indexOf(S.gun.view);
    do i = (i + 1) % VIEWS.length; while (VIEWS[i] === 'rear' && !sd.rear);
    S.gun.view = VIEWS[i];
  }
  const winOf = (art, side) => { const sd = sides(art); return sd[side] || sd.front; };

  // Origen del coche en pantalla (igual que lo calcula Z.drawCar).
  function carOrigin() {
    const art = G.art, car = G.car;
    return [Math.round(Z.carScreenX() - art.OX), Math.round(Z.GROUND + Math.round(car.y || 0) - art.contactY + (car.bounce || 0))];
  }

  // Postura del tirador asomado: hombros, mano y boca del cañón (coordenadas de pantalla).
  function pose(ox, oy, win, g) {
    const [wx, wy, ww, wh] = win;
    const ax = ox + wx + (ww >> 1), top = oy + wy, sill = top + wh;
    const k = R.k * R.k * (3 - 2 * R.k);
    const hipY = Math.round(sill + 6 - k * (sill + 6 - top));
    const sy = hipY - 5, shx = ax + 1, shy = sy + 1;
    const a = R.aim - R.recoil * 0.35, reach = 4.5 - R.recoil * 1.5;
    const dx = Math.cos(a), dy = Math.sin(a);
    const hx = shx + dx * reach, hy = shy + dy * reach;
    return { ax, top, sill, hipY, sy, shx, shy, dx, dy, hx, hy, mx: hx + dx * (g.len + 1), my: hy + dy * (g.len + 1) };
  }
  // Boca del cañón en pantalla. Con la ventanilla cerrada el fogonazo asoma por encima del techo.
  function muzzle(g) {
    const [ox, oy] = carOrigin();
    const win = winOf(G.art, R.side);
    if (S.gun.view === 'closed' || R.k < 0.5) return [ox + win[0] + (win[2] >> 1) + 3, oy + win[1] - 2];
    const p = pose(ox, oy, win, g);
    return [p.mx, p.my];
  }
  function shoulder() {
    const [ox, oy] = carOrigin();
    const win = winOf(G.art, R.side);
    return [ox + win[0] + (win[2] >> 1) + 1, oy + win[1] - 4];
  }
  const aimAt = (sx, sy) => { const [x, y] = shoulder(); return Z.clamp(Math.atan2(sy - y, sx - x), -1, 1.25); };

  // ---------------- Coordenadas y zombis bajo el ratón ----------------
  const out = document.getElementById('screen');
  function toOut(e) {
    const r = out.getBoundingClientRect();
    return [(e.clientX - r.left) * out.width / r.width, (e.clientY - r.top) * out.height / r.height, e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom];
  }
  // Píxel de la salida → píxel de pantalla del mundo (deshace el espejo y el recorte de la barra).
  function toScreen(px, py) {
    return [S.dir === 'rtl' ? Z.W - px : px, py + (Z.overlay ? Z.VIEW_TOP : 0)];
  }
  const tall = (z) => z.type === 'brute' ? 30 : 20;
  // Zombi en un punto de pantalla; slack amplía la caja (ayuda a apuntar en una tira tan pequeña).
  function zombieAt(sx, sy, slack) {
    let best = null, bd = 1e9;
    for (const z of G.zombies) {
      if (z.dead) continue;
      const zx = z.wx - G.camX, h = tall(z);
      const ddx = Math.max(0, Math.abs(sx - zx) - z.half), ddy = Math.max(0, z.y - h - sy, sy - z.y - 1);
      const d = Math.hypot(ddx, ddy);
      if (d <= slack && d + Math.abs(sx - zx) * 0.01 < bd) { bd = d + Math.abs(sx - zx) * 0.01; best = z; }
    }
    return best;
  }
  const canShoot = () => G.mode === 'run' && G.car && !G.car.dead;

  // ---------------- Disparo ----------------
  function hit(z, dmg, vx, sy, headshot) {
    if (headshot) { dmg *= 2; G.floats.push({ wx: z.wx, y: z.y - tall(z) - 6, text: 'x2!', color: '#ff5a4a', life: 0.8 }); }
    z.hp -= dmg; z.hitT = 0.08;
    if (!z.pushed) z.wx += Math.min(4, vx / 40);
    FX.blood(z.wx, sy, headshot ? 10 : 4, vx, z.y);
    snd('chof', { vol: 0.22, pitch: headshot ? 1.8 : 1.4, gap: 0.04 });
    if (z.hp <= 0) Z.killZombie(z, vx);
  }

  function explode(wx, wy, g) {
    FX.explosion(wx, wy, 0.45);
    snd('explosion', { vol: 0.55 });
    G.shake = Math.max(G.shake, 3);
    for (const z of G.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.wx - wx, (z.y - 10) - wy);
      if (d < g.aoe) { z.hp -= g.dmg * (1 - d / g.aoe * 0.5); z.hitT = 0.1; if (z.hp <= 0) Z.killZombie(z, (z.wx - wx) * 5 + 40); }
    }
  }

  // Dispara hacia un punto de pantalla. manual: lo has disparado tú (ayuda a apuntar y tiros a la cabeza).
  function shoot(sx, sy, manual) {
    const g = stats();
    if (R.reload > 0) return;
    if (R.ammo <= 0) { startReload(g); return; }
    R.ammo--; R.cool = 1 / (manual ? g.rate : g.rate * autoMul()); R.lastShot = G.t;
    R.aim = aimAt(sx, sy); R.recoil = 1;
    const [mx, my] = muzzle(g), camX = G.camX;
    snd(g.sfx, { vol: g.vol, pitch: g.pitch || 1, gap: 0.02 });
    FX.add({ k: 'flash', x: mx + camX, y: my, life: 0.05, s: S.gun.view === 'closed' ? g.flash * 0.6 : g.flash });
    // casquillo que cae a la carretera
    if (!g.aoe) FX.add({ k: 'chunk', x: mx - 3 + camX, y: my, vx: Z.rr(-60, -25), vy: Z.rr(-90, -50), g: 320, life: 1.5, c: '#d9a441', s: 1, gy: Z.GROUND + Z.rr(-3, 6), bounce: 1 });
    if (g.aoe) {
      R.nades.push({ x0: mx + camX, y0: my, x1: sx + camX, y1: sy, t: 0, dur: Math.max(0.12, Math.hypot(sx - mx, sy - my) / 380), g });
      return;
    }
    const vx = 90 + g.push * 30;
    for (let p = 0; p < g.pellets; p++) {
      let tx = sx, ty = sy;
      if (g.spread) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * g.spread; tx += Math.cos(a) * r; ty += Math.sin(a) * r * 0.6; }
      const direct = zombieAt(tx, ty, 1);
      const z = direct || zombieAt(tx, ty, manual ? 7 : 40);
      if (!z) {
        FX.add({ k: 'tracer', x: mx + camX, y: my, x2: tx + camX, y2: ty, life: 0.05 });
        if (ty >= Z.ROAD_TOP) FX.debris(tx + camX, ty, 2, ['#5a4e48', '#3a3236', '#7a6a5a']);
        continue;
      }
      const zx = z.wx - camX;
      const hy = direct ? Z.clamp(ty, z.y - tall(z), z.y - 2) : z.y - tall(z) * 0.55;
      const head = manual && direct && hy <= z.y - tall(z) + 5;
      FX.add({ k: 'tracer', x: mx + camX, y: my, x2: z.wx, y2: hy, life: 0.06 });
      hit(z, g.dmg, vx, hy, head);
      // el rifle sigue de largo y atraviesa a los que vienen detrás
      if (g.pierce) {
        const hitSet = [z];
        for (let d = 6; d < 220 && hitSet.length < g.pierce; d += 2) {
          const nx = zx + d, n = zombieAt(nx, hy, 0);
          if (n && !hitSet.includes(n)) { hitSet.push(n); hit(n, g.dmg * 0.8, vx, hy, false); }
        }
        FX.add({ k: 'tracer', x: z.wx, y: hy, x2: z.wx + 160, y2: hy, life: 0.04 });
      }
    }
    if (R.ammo <= 0) startReload(g);
  }
  function startReload(g) {
    if (R.reload > 0 || R.ammo >= g.mag) return;
    R.reload = g.reload;
    snd('llave', { vol: 0.5, pitch: 0.8 });
  }

  // Disparo de adorno: el tirador apunta y dispara a un icono de la barra (lo llama js/shot.js).
  function fxShot(px, py) {
    if (!G.car || G.car.dead || !G.art || G.mode === 'dying' || G.mode === 'fadeout') return;
    const g = stats(), [sx, sy] = toScreen(px, py);
    R.aim = aimAt(sx, sy); R.recoil = 1; R.lastShot = G.t;
    const [mx, my] = G.mode === 'run' ? muzzle(g) : [sx, sy];
    snd(g.sfx, { vol: g.vol, pitch: g.pitch || 1 });
    if (G.mode !== 'run') return;
    FX.add({ k: 'flash', x: mx + G.camX, y: my, life: 0.05, s: g.flash });
    FX.add({ k: 'tracer', x: mx + G.camX, y: my, x2: sx + G.camX, y2: sy, life: 0.07 });
  }

  // ---------------- Bucle ----------------
  function update(dt) {
    norm(); syncCtl();
    document.getElementById('stage').classList.toggle('gun-live', canShoot());
    const car = G.car, art = G.art;
    if (!car || !art) return;
    const g = stats();
    if (G.run !== R.run || g.id !== R.gunId) { R.run = G.run; R.gunId = g.id; R.ammo = g.mag; R.reload = 0; R.cool = 0; }
    const shown = !car.dead && !car.burnt && G.mode !== 'dying' && G.mode !== 'fadeout' && (G.mode !== 'garage' || G.garage.repair >= 0.3);
    const want = S.gun.view === 'closed' ? null : (sides(art)[S.gun.view] ? S.gun.view : 'front');
    if (want && want === R.side && shown) R.k = Math.min(1, R.k + dt * 5);
    else { R.k = Math.max(0, R.k - dt * (shown ? 6 : 12)); if (R.k === 0 && want) R.side = want; }
    R.recoil = Math.max(0, R.recoil - dt * 9);
    R.cool -= dt;
    if (R.press) { R.press.t -= dt; if (R.press.t <= 0) R.press = null; }
    if (R.reload > 0) { R.reload -= dt; if (R.reload <= 0) { R.reload = 0; R.ammo = g.mag; R.dry = false; snd('llave', { vol: 0.5, pitch: 1.3 }); } }
    for (let i = R.nades.length - 1; i >= 0; i--) {
      const n = R.nades[i]; n.t += dt;
      if (n.t >= n.dur) { R.nades.splice(i, 1); explode(n.x1, n.y1, n.g); }
    }
    let aimT = G.mode === 'garage' ? 0.9 + Math.sin(G.t * 0.7) * 0.15 : 0.25;
    if (canShoot()) {
      const [msx, msy] = toScreen(R.mx, R.my);
      R.over = Z.overlay && R.mx >= 0 && !!zombieAt(msx, msy, 3);
      // a mano: cada clic es un tiro (se guarda un momento si el arma aún no está lista)
      if (R.press && R.cool <= 0) {
        const [sx, sy] = toScreen(R.press.x, R.press.y);
        if (R.reload > 0 || R.ammo <= 0) { if (!R.dry) { snd('clic', { vol: 0.6 }); R.dry = true; } R.press = null; }
        else { shoot(sx, sy, true); R.press = null; }
      } else if (R.holding && g.hold && R.cool <= 0 && R.reload <= 0) shoot(msx, msy, true);
      // autodisparo: solo si lo has comprado y no estás disparando tú
      const front = Z.carScreenX() + (art.front[0] - art.OX);
      let target = null;
      for (const z of G.zombies) {
        const zx = z.wx - G.camX;
        if (!z.dead && zx > front - 30 && zx < front + 200 && (!target || zx < target.wx - G.camX)) target = z;
      }
      if (target) aimT = aimAt(target.wx - G.camX, target.y - tall(target) * 0.55);
      if (target && S.gun.auto && S.gun.autoOn && G.t - R.lastManual > 2 && R.cool <= 0 && R.reload <= 0) shoot(target.wx - G.camX, target.y - tall(target) * 0.55, false);
      // si no queda nadie cerca, recarga sola
      if (!target && R.ammo < g.mag && R.reload <= 0 && G.t - R.lastShot > 2.5) startReload(g);
    } else { R.press = null; R.holding = false; R.over = false; }
    if (R.reload > 0) aimT = 1.05;
    if (G.t - R.lastShot > 0.35) R.aim += (aimT - R.aim) * Math.min(1, dt * 6);
    document.body.classList.toggle('gun-aim', R.over || (R.holding && canShoot()));
  }

  // ---------------- Dibujo ----------------
  const C = { jacket: '#5b3a24', jacketD: '#3a2416', skin: '#c49a74', skinD: '#94704e', hair: '#2a1a12', eye: '#1a1010', scarf: '#b3202a', scarfD: '#6a1018',
    metal: '#2a2a32', metalL: '#7a7c88', wood: '#6a4a2a' };

  function drawGun(ctx, p, g) {
    const { hx, hy, dx, dy } = p, L = g.len;
    if (g.two) Z.line(ctx, hx - dx * 2, hy - dy * 2, hx, hy, 1, C.wood);
    Z.line(ctx, hx, hy, hx + dx * L, hy + dy * L, g.thick ? 2 : 1, C.metal);
    Z.px(ctx, hx + dx * (L - 1), hy + dy * (L - 1) - 1, C.metalL);
    if (g.scope) Z.rect(ctx, hx + dx * 3, hy + dy * 3 - 2, 3, 1, C.metal);
    if (g.hold) Z.px(ctx, hx + dx * 2, hy + dy * 2 + 1, C.metal);
  }

  // Se pinta en un lienzo aparte para darle el mismo contorno y luz de borde que a los zombis.
  const [GC, gx] = Z.canvas(56, 50), GOX = 20, GOY = 34;   // la ventanilla queda en (GOX, GOY)
  function drawGunner(ctx, art, car, ox, oy) {
    if (R.k <= 0.02 || car.dead || car.burnt) return;
    const g = stats(), p0 = pose(ox, oy, winOf(art, R.side), g);
    // mismas cuentas, pero en coordenadas del lienzo pequeño
    const dx0 = GOX - p0.ax, dy0 = GOY - p0.sill;
    const p = Object.assign({}, p0, { ax: GOX, sill: GOY, top: p0.top + dy0, hipY: p0.hipY + dy0, sy: p0.sy + dy0, shx: p0.shx + dx0, shy: p0.shy + dy0, hx: p0.hx + dx0, hy: p0.hy + dy0 });
    gx.clearRect(0, 0, GC.width, GC.height);
    gx.save();
    gx.beginPath(); gx.rect(0, 0, GC.width, GOY); gx.clip();                 // el cuerpo no baja del marco de la ventanilla
    Z.rect(gx, p.ax - 1, p.hipY, 3, p.sill - p.hipY, '#0c0a12');               // piernas dentro del coche
    if (g.two) Z.line(gx, p.ax, p.shy, p.hx + p.dx * g.len * 0.55, p.hy + p.dy * g.len * 0.55, 1, C.jacketD);
    // torso con la espalda en sombra
    Z.rect(gx, p.ax - 1, p.sy, 3, p.hipY - p.sy, C.jacket);
    Z.rect(gx, p.ax - 1, p.sy, 1, p.hipY - p.sy, C.jacketD);
    // cabeza: pelo atrás, ojo mirando al frente; cabecea con el retroceso y baja la vista al recargar
    const hx = p.ax - 1, hy = p.sy - 4 + (R.recoil > 0.6 ? -1 : 0) + (R.reload > 0 ? 1 : 0);
    Z.rect(gx, hx, hy, 4, 4, C.skin);
    Z.rect(gx, hx, hy, 4, 1, C.hair); Z.rect(gx, hx, hy, 1, 3, C.hair);
    Z.px(gx, hx + 3, hy + (R.aim > 0.6 ? 2 : 1), C.eye);
    Z.px(gx, hx + 2, hy + 3, C.skinD);
    if (G.t % 0.3 < 0.15 && car.speed > 20) Z.px(gx, hx - 1, hy, C.hair);
    // pañuelo al cuello ondeando con el viento
    Z.rect(gx, hx, p.sy, 3, 1, C.scarf);
    const wind = Z.clamp(car.speed / 40, 0.3, 1.6);
    for (let i = 1; i <= Math.round(1 + wind * 2); i++) Z.px(gx, hx - i, p.sy + Math.round(Math.sin(G.t * 18 - i * 1.3) * 0.7 + i * 0.25), i > 2 ? C.scarfD : C.scarf);
    if (R.k > 0.98) gx.restore();   // asomado del todo: el brazo y el arma pueden bajar por delante de la puerta
    drawGun(gx, p, g);
    Z.line(gx, p.shx, p.shy, p.hx, p.hy, 1, C.jacket);
    Z.px(gx, p.hx, p.hy, C.skin);
    if (R.k <= 0.98) gx.restore();
    Z.outline(GC, '#9aa8e8', 0.22);
    ctx.drawImage(GC, p0.ax - GOX, p0.sill - GOY);
  }

  // Munición encima del coche: balas (o una barra si el cargador es grande) y la recarga.
  function drawAmmo(ctx, art, ox, oy) {
    const g = stats();
    if (G.mode !== 'run' || G.car.dead) return;
    if (R.ammo >= g.mag && R.reload <= 0 && G.t - R.lastShot > 2) return;
    const win = winOf(art, R.side), cx = ox + win[0] + (win[2] >> 1), y = oy + win[1] - 14;
    if (R.reload > 0) {
      const w = 14, f = 1 - R.reload / g.reload;
      Z.rect(ctx, cx - w / 2 - 1, y - 1, w + 2, 4, '#07050c'); Z.rect(ctx, cx - w / 2, y, Math.round(w * f), 2, '#e6d9bf');
      return;
    }
    if (g.mag <= 10) {
      const w = g.mag * 2 - 1, x0 = Math.round(cx - w / 2);
      Z.rect(ctx, x0 - 1, y - 1, w + 2, 5, 'rgba(7,5,12,0.75)');
      for (let i = 0; i < g.mag; i++) Z.rect(ctx, x0 + i * 2, y, 1, 3, i < R.ammo ? (i === R.ammo - 1 ? '#ffe08a' : '#d9a441') : '#3a2a2c');
    } else {
      const w = 16, x0 = Math.round(cx - w / 2);
      Z.rect(ctx, x0 - 1, y - 1, w + 2, 4, '#07050c'); Z.rect(ctx, x0, y, Math.round(w * R.ammo / g.mag), 2, '#d9a441');
    }
  }

  function draw(ctx, art, car, ox, oy) {
    drawGunner(ctx, art, car, ox, oy);
    drawAmmo(ctx, art, ox, oy);
    for (const n of R.nades) {
      const f = n.t / n.dur, x = Z.lerp(n.x0, n.x1, f) - G.camX, y = Z.lerp(n.y0, n.y1, f) - Math.sin(f * Math.PI) * 10;
      Z.rect(ctx, x - 1, y - 1, 2, 2, '#3a4030'); Z.px(ctx, x - 2, y, '#ffb040');
    }
  }

  // ---------------- Ratón ----------------
  const onButton = (e) => !!(e.target && e.target.closest && e.target.closest('button'));
  document.addEventListener('mousemove', (e) => {
    const [x, y, inside] = toOut(e);
    R.mx = inside ? x : -1; R.my = y;
  });
  document.addEventListener('mousedown', (e) => {
    // el disparo a los iconos de la barra (js/shot.js) tiene prioridad y marca el evento
    if (e.button !== 0 || e.defaultPrevented || onButton(e)) return;
    const [x, y, inside] = toOut(e);
    if (!inside || !canShoot()) return;
    if (!Z.overlay && !e.target.closest('#stage')) return;
    e.preventDefault();
    R.mx = x; R.my = y;
    R.press = { x, y, t: 0.2 }; R.holding = true; R.lastManual = G.t;
  });
  const release = () => { R.holding = false; };
  document.addEventListener('mouseup', release);
  window.addEventListener('blur', release);

  // ---------------- Botones del escenario ----------------
  // Iconos pixelados: ventanilla con el tirador asomado (delante o detrás) o cerrada.
  function icon(view) {
    const m = [
      '..............',
      '..............',
      '..............',
      '..############',
      '.#.....#.....#',
      '#......#.....#',
      '##############',
    ].map(r => r.split(''));
    if (view === 'closed') { m[4][3] = m[5][2] = m[4][10] = m[5][9] = '#'; }
    else {
      const x = view === 'rear' ? 3 : 10;
      for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [0, 4], [1, 4], [0, 5], [1, 5]]) if (m[j] && x + i < 14) m[j][x + i] = i >= 2 && j === 2 ? '=' : '#';
    }
    let r = '';
    m.forEach((row, j) => row.forEach((c, i) => { if (c !== '.') r += `<rect x="${i}" y="${j}" width="1" height="1"${c === '=' ? ' fill="#d9a441"' : ''}/>`; }));
    return `<svg viewBox="0 0 14 7" width="28" height="14" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  }
  const VIEW_NAME = { front: 'asomado por la ventanilla delantera', rear: 'asomado por la ventanilla trasera', closed: 'ventanilla cerrada (dispara desde el otro lado)' };
  const ctl = document.createElement('div');
  ctl.className = 'gun-ctl';
  ctl.innerHTML = '<button class="tb-btn gun-view" type="button"></button><button class="tb-btn gun-auto" type="button" hidden>Auto</button>';
  const bView = ctl.querySelector('.gun-view'), bAuto = ctl.querySelector('.gun-auto');
  let ctlSig = '';
  function syncCtl() {
    const s = [S.gun.view, S.gun.auto, S.gun.autoOn, Z.overlay].join('|');
    if (s === ctlSig) return;
    ctlSig = s;
    bView.innerHTML = icon(S.gun.view);
    bView.title = 'Tirador: ' + VIEW_NAME[S.gun.view] + '. Pulsa para cambiar.';
    bView.setAttribute('aria-label', bView.title);
    bAuto.hidden = !S.gun.auto;
    bAuto.setAttribute('aria-pressed', S.gun.autoOn ? 'true' : 'false');
    bAuto.title = S.gun.autoOn ? 'Autodisparo activado' : 'Autodisparo apagado';
    // En la barra va junto a sus botones; en la ventana, en una esquina del escenario.
    const home = Z.overlay ? document.getElementById('bar-ctl') : document.getElementById('stage');
    if (ctl.parentNode !== home) home.insertBefore(ctl, Z.overlay ? home.firstChild : null);
  }
  bView.addEventListener('click', () => { nextView(); snd('clic'); Z.save(); syncCtl(); });
  bAuto.addEventListener('click', () => { S.gun.autoOn = !S.gun.autoOn; snd('clic'); Z.save(); syncCtl(); if (Z.UI) Z.UI.refresh(); });

  // ---------------- Tienda ----------------
  const ICONS = {
    pistola: ['.KKKKKKKKK.', 'KLLLLLLLLLK', 'KGGGGGGGGGK', 'KDDDKKKKKK.', 'KWWK.K.....', 'KWWKK......', 'KWWK.......', 'KKKK.......'],
    revolver: ['...........KK.', '.KKKKKKKKKKKKK', 'KLLLKLLLLLLLLK', 'KGGGKGGKKKKKK.', 'KDGGKGK.......', 'KWWKKK........', 'KWWK..........', 'KKKK..........'],
    recortada: ['.......KKKKKKKKKK', 'KKKKKKKLLLLLLLLLK', 'KWWWWWKGGGGGGGGGK', 'KwWWWWKDDDDDDDDDK', '.KKwWWKKKKKKKKKK.', '...KKKK..........'],
    subfusil: ['..KKKKKKKKKKK...', '.KLLLLLLLLLLLKKK', 'KGGGGGGGGGGGGGGK', 'KDDKKDDKKKKKKKK.', 'KWWK.KDK........', 'KWWK.KDK........', 'KKKK.KKK........'],
    rifle: ['........KKKKKK........', '.......KLLLLLLK.......', '.KKKKKKKKKKKKKKKKKKKKK', 'KWWWWWWKGGGGGGGGGGGGGK', 'KwWWWWWWKDDDDDDDDDDDDK', '.KKKwWWWKKKKKKKKKKKKK.', '....KKKK..............'],
    granadas: ['...KKKKKKKKKKKKKK.', '..KLLLLLLLLLLLLLLK', 'KKKGGGGGGGGGGGGGGK', 'KWKGGGGGGGGGGGGGGK', 'KWKDDDDDDDDDDDDDDK', 'KWWKKKKKKDKKKKKKK.', 'KKKK....KDK.......', '........KKK.......'],
  };
  const PAL = { K: '#07050c', L: '#9a9cab', G: '#565866', D: '#2e2e38', W: '#7a4a2a', w: '#4a2a18' };
  const iconCache = {};
  function gunIcon(id) {
    if (iconCache[id]) return iconCache[id];
    const m = ICONS[id], h = m.length, w = Math.max(...m.map(r => r.length));
    const [c, x] = Z.canvas(w, h);
    m.forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) Z.px(x, i, j, PAL[ch]); }));
    return (iconCache[id] = { src: c.toDataURL(), w, h });
  }

  const chip = (t) => `<span class="chip">${t}</span>`;
  const pips = (lvl, max) => `<div class="pips" aria-label="Nivel ${lvl}">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>`;
  function shopHTML(inGarage) {
    const cards = Z.GUNS.map(base => {
      const owned = S.gun.owned[base.id] !== undefined, eq = S.gun.eq === base.id, g = stats(base.id), lvl = g.lvl;
      const ic = gunIcon(base.id);
      const chips = [chip('Daño ' + Math.round(g.dmg * 10) / 10 + (g.pellets > 1 ? ' x' + g.pellets : '')), chip(g.rate.toFixed(1).replace('.', ',') + ' tiros/s'), chip('Cargador ' + g.mag), chip('Recarga ' + g.reload.toFixed(1).replace('.', ',') + ' s')];
      if (g.hold) chips.push(chip('Mantén pulsado'));
      if (g.pierce) chips.push(chip('Atraviesa ' + g.pierce));
      if (g.aoe) chips.push(chip('Explota'));
      let actions = '';
      if (!owned) actions = `<button class="btn buy" type="button" data-act="gunbuy" data-id="${base.id}" ${!inGarage || S.money < base.cost ? 'disabled' : ''}>Comprar $${Z.fmt(base.cost)}</button>`;
      else {
        actions = eq ? '<span class="tag">En la mano</span>' : `<button class="btn" type="button" data-act="gunequip" data-id="${base.id}" ${!inGarage ? 'disabled' : ''}>Empuñar</button>`;
        if (lvl < Z.MAX_LVL) { const c = Z.upgradeCost(base, lvl); actions += `<button class="btn" type="button" data-act="gunup" data-id="${base.id}" ${!inGarage || S.money < c ? 'disabled' : ''}>Mejorar $${Z.fmt(c)}</button>`; }
      }
      return `<div class="part gun ${eq ? 'equipped' : ''}"><div class="ph"><img class="gun-ico" src="${ic.src}" width="${ic.w * 3}" height="${ic.h * 3}" alt=""><h4>${base.name}</h4></div><p>${base.desc}</p><div class="chips">${chips.join('')}</div>${owned ? pips(lvl, Z.MAX_LVL) : ''}<div class="row">${actions}</div></div>`;
    }).join('');
    let auto;
    if (!S.gun.auto) {
      const locked = S.stats.bestDist < AUTO.needDist;
      auto = `<div class="part"><h4>Autodisparo</h4><p>El tirador dispara solo al zombi más cercano, aunque tengas la ventanilla cerrada. Empieza lento.</p><div class="chips">${chip(locked ? 'Llega a Ciudad Ceniza (1.800 m)' : 'Desbloqueado')}</div><div class="row"><button class="btn buy" type="button" data-act="autobuy" ${locked || !inGarage || S.money < AUTO.cost ? 'disabled' : ''}>Comprar $${Z.fmt(AUTO.cost)}</button></div></div>`;
    } else {
      const lvl = S.gun.autoLvl, c = autoCost();
      auto = `<div class="part ${S.gun.autoOn ? 'equipped' : ''}"><h4>Autodisparo</h4><p>Dispara solo cuando dejas de hacer clic. «Pulso firme» le da más ritmo.</p><div class="chips">${chip('Ritmo ' + Math.round(autoMul() * 100) + '% de la cadencia')}</div>${pips(lvl, AUTO.max)}<div class="row"><button class="btn" type="button" data-act="autotoggle" aria-pressed="${S.gun.autoOn}">${S.gun.autoOn ? 'Activado' : 'Apagado'}</button>${lvl < AUTO.max ? `<button class="btn" type="button" data-act="autoup" ${!inGarage || S.money < c ? 'disabled' : ''}>Pulso firme $${Z.fmt(c)}</button>` : '<span class="tag">Al máximo</span>'}</div></div>`;
    }
    return `<p class="hint">Haz clic sobre los zombis para disparar; a la cabeza hace el doble. El botón de la ventanilla, en el escenario, cambia por dónde se asoma el tirador.</p>
      <div class="parts" style="margin-top:8px">${cards}</div><h3 style="margin-top:14px">Automático</h3><div class="parts">${auto}</div>`;
  }
  function act(a, id) {
    const g = id && Z.gun(id);
    if (a === 'gunbuy' && S.gun.owned[id] === undefined && S.money >= g.cost) { S.money -= g.cost; S.gun.owned[id] = 0; S.gun.eq = id; snd('compra'); }
    else if (a === 'gunequip' && S.gun.owned[id] !== undefined) { S.gun.eq = id; snd('llave'); }
    else if (a === 'gunup') { const l = S.gun.owned[id], c = Z.upgradeCost(g, l); if (l < Z.MAX_LVL && S.money >= c) { S.money -= c; S.gun.owned[id]++; snd('compra'); } }
    else if (a === 'autobuy' && !S.gun.auto && S.stats.bestDist >= AUTO.needDist && S.money >= AUTO.cost) { S.money -= AUTO.cost; S.gun.auto = true; S.gun.autoOn = true; snd('compra'); }
    else if (a === 'autoup' && S.gun.auto) { const c = autoCost(); if (S.gun.autoLvl < AUTO.max && S.money >= c) { S.money -= c; S.gun.autoLvl++; snd('compra'); } }
    else if (a === 'autotoggle') S.gun.autoOn = !S.gun.autoOn;
    syncCtl();
  }
  // Cuántas compras de armas puedes pagar (para refrescar la tienda cuando cambia).
  function affordable() {
    let n = 0;
    for (const g of Z.GUNS) { const l = S.gun.owned[g.id]; if (l === undefined ? S.money >= g.cost : l < Z.MAX_LVL && S.money >= Z.upgradeCost(g, l)) n++; }
    return n;
  }

  // Pestaña «Armas» del garaje, justo después de «Taller».
  Z.UI.addTab({
    id: 'armas', name: 'Armas', icon: 'armas', after: 'taller',
    render(body, ctx) { body.innerHTML = shopHTML(ctx.inGarage); },
    onClick(e, ctx) {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return false;
      act(b.dataset.act, b.dataset.id); Z.save(); ctx.refresh();
      return true;
    },
    sig: () => [affordable(), S.gun.eq, S.gun.auto, S.gun.autoOn, S.gun.autoLvl, S.stats.bestDist >= AUTO.needDist].join(','),
  });

  Z.Gun = {
    update, draw, fxShot,
    // En la barra de tareas: el juego se queda el clic cuando el ratón está encima de un zombi.
    claims: (px, py) => { if (!canShoot()) return false; if (R.holding) return true; const [sx, sy] = toScreen(px, py); return !!zombieAt(sx, sy, 3); },
  };
})(window.ZG);
