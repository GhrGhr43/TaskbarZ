'use strict';
// Servicio del garaje: reparar y repostar el coche entre carrera y carrera.
// Se hace solo (al principio muy despacio) o a golpe de clic: cada clic en el coche es un golpe de llave
// y cada clic en el surtidor es un bombeo. Los clics seguidos hacen racha y llenan más.
// Las mejoras «Herramientas» y «Surtidor» aceleran lo automático y lo que da cada clic.
(function (Z) {
  const S = Z.S, G = Z.G, FX = Z.FX;
  const sfx = (n, o) => { if (Z.Audio) Z.Audio.play(n, o); };
  const FUEL_COLS = ['#d9a441', '#f6d47a', '#8a5a24'];
  const MIN_HP = 0.25, MIN_FUEL = 0.1;      // lo mínimo para poder salir a mano
  const RACHA = 0.5;                         // segundos entre clics para mantener la racha

  // Ritmos. *Time = segundos para llenar del todo sin tocar nada. *Click = fracción por clic.
  Z.repairTime = () => Math.max(4, 60 * Math.pow(0.76, S.garage.mecanico));
  Z.refuelTime = () => Math.max(3, 45 * Math.pow(0.76, S.garage.surtidor));
  Z.repairClick = () => 0.05 + 0.006 * S.garage.mecanico;
  Z.refuelClick = () => 0.06 + 0.007 * S.garage.surtidor;

  const SV = Z.Service = {
    combo: { hp: 0, fuel: 0 }, comboT: { hp: 0, fuel: 0 },
    hover: null, pump: 0, jolt: 0, glug: [], swings: [], was: { hp: true, fuel: true },
    MIN_HP, MIN_FUEL,
  };
  const st = () => S.svc;
  SV.full = () => st().hp >= 1 && st().fuel >= 1;
  SV.canLaunch = () => st().hp >= MIN_HP && st().fuel >= MIN_FUEL;
  SV.mult = (k) => 1 + Math.min(10, SV.combo[k]) * 0.1;   // racha: hasta x2

  // Al volver al garaje (o al cargar la partida) el coche trae lo que le quedaba.
  SV.arrive = function (prevCar) {
    const v = st();
    if (prevCar) {
      v.hp = Z.clamp(prevCar.hpFrac, 0, 1);
      v.fuel = Z.clamp(prevCar.fuel / Math.max(1, prevCar.maxFuel), 0, 1);
    }
    SV.was = { hp: v.hp >= 1, fuel: v.fuel >= 1 };
    SV.combo = { hp: 0, fuel: 0 }; SV.glug = []; SV.swings = [];
    apply();
  };
  // Al salir: el coche nuevo arranca con la vida y la gasolina del garaje.
  SV.depart = function (car) {
    const v = st();
    car.hp = car.maxHp * v.hp; car.hpFrac = v.hp;
    car.fuel = car.maxFuel * v.fuel;
  };

  function apply() {
    const car = G.car, v = st(), g = G.garage;
    if (!car) return;
    car.hpFrac = v.hp; car.hp = car.maxHp * v.hp; car.fuel = car.maxFuel * v.fuel;
    if (v.hp > 0.3) car.burnt = false;
    car.blood = Math.min(car.blood, (1 - v.hp) * 400);
    if (g) { g.repair = v.hp; g.fuel = v.fuel; }
  }

  function checkDone() {
    const v = st(), now = { hp: v.hp >= 1, fuel: v.fuel >= 1 };
    const fin = (now.hp && !SV.was.hp) || (now.fuel && !SV.was.fuel);
    if (now.hp && !SV.was.hp) sfx('llave', { pitch: 1.5 });
    if (now.fuel && !SV.was.fuel) sfx('gasolina', { pitch: 1.4 });
    if (fin) {
      if (now.hp && now.fuel) { sfx('compra'); Z.banner('Coche a punto', S.auto ? 'Sale solo en unos segundos' : 'Pulsa A la carretera', 'perk'); }
      else if (now.hp) Z.banner('Coche reparado', 'Falta gasolina: pulsa el surtidor', 'perk');
      else Z.banner('Depósito lleno', 'Falta reparar: pulsa el coche', 'perk');
    }
    SV.was = now;
  }

  // Posiciones (coordenadas del mundo) del coche y del surtidor en el garaje.
  SV.layout = function () {
    const art = G.art, cx = Z.garageCarX(), gy = Z.garageGround();
    const base = Z.overlay ? Z.GROUND + 1 : 115;
    const home = Z.overlay ? Z.CAR_X : Z.GOX + 260 - Math.round(art.mw / 2);   // sitio del coche sin contar la salida
    const px = home - (Z.overlay ? 30 : 36);
    const carTop = gy - art.contactY + art.OY;
    return {
      cx, gy, base, px,
      cap: [cx + (art.rear[0] - art.OX) + 3, gy - art.contactY + art.rear[1] - 3],
      car: { x: cx - 3, y: carTop - 6, w: art.mw + 6, h: gy - carTop + 9 },
      pump: { x: px - 4, y: base - 34, w: 20, h: 36 },
    };
  };

  SV.update = function (dt) {
    dt = Math.max(0, dt);
    const g = G.garage, car = G.car, v = st();
    for (const k of ['hp', 'fuel']) { SV.comboT[k] -= dt; if (SV.comboT[k] <= 0) SV.combo[k] = 0; }
    SV.pump = Math.max(0, SV.pump - dt * 5);
    SV.jolt = Math.max(0, SV.jolt - dt);
    for (const b of SV.glug) b.t += dt * 3;
    SV.glug = SV.glug.filter(b => b.t < 1);
    for (const s of SV.swings) s.t += dt;
    SV.swings = SV.swings.filter(s => s.t < 0.22);
    if (G.mode === 'garage' && !g.launching) {
      v.hp = Math.min(1, v.hp + dt / Z.repairTime());
      v.fuel = Math.min(1, v.fuel + dt / Z.refuelTime());
      const L = SV.layout();
      if (v.hp < 1 && Math.random() < dt * 5) FX.sparks(L.cx + 6 + Math.abs(Math.sin(g.t * 0.6)) * (G.art.mw - 12), L.gy - 6 - Math.random() * 6, 2, 0);
      if (v.fuel < 1 && Math.random() < dt * 2) drip(L, 1);
      apply(); checkDone();
    }
    car.bounce = SV.jolt > 0.06 ? -1 : 0;
  };

  function drip(L, n) {
    const [nx, ny] = L.cap;
    for (let i = 0; i < n; i++) FX.add({ k: 'drop', x: nx + Z.rr(-1, 1), y: ny + 1, vx: Z.rr(-25, 25), vy: Z.rr(-40, 0), g: 300, life: 1.2, c: Z.pick(FUEL_COLS), gy: L.gy + Z.rr(0, 4) });
  }

  // Un clic de servicio. kind: 'hp' (reparar) o 'fuel' (repostar). wx/wy: dónde se hizo, en el mundo.
  SV.click = function (kind, wx, wy) {
    if (G.mode !== 'garage' || !G.garage || G.garage.launching) return false;
    G.lastInteract = G.t;
    const v = st(), L = SV.layout();
    if (v[kind] >= 1) { sfx('clic', { pitch: 0.6 }); return false; }
    SV.combo[kind] = SV.comboT[kind] > 0 ? SV.combo[kind] + 1 : 0;
    SV.comboT[kind] = RACHA;
    const n = SV.combo[kind], mult = SV.mult(kind);
    const amt = (kind === 'hp' ? Z.repairClick() : Z.refuelClick()) * mult;
    const before = v[kind];
    v[kind] = Math.min(1, v[kind] + amt);
    const got = Math.max(1, Math.round((v[kind] - before) * 100));
    if (kind === 'hp') {
      if (wx === undefined) { wx = L.cx + Z.rr(6, G.art.mw - 6); wy = L.gy - Z.rr(5, 12); }
      sfx('llave', { pitch: 0.85 + Math.min(10, n) * 0.06, gap: 0.01 });
      sfx('golpe', { vol: 0.3, pitch: 1.8, gap: 0.01 });
      FX.sparks(wx, wy, 8 + Math.min(10, n), 0);
      SV.swings.push({ x: wx, y: wy, t: 0 });
      SV.jolt = 0.12;
      G.car.blood = Math.max(0, G.car.blood - 25);
      G.floats.push({ wx, y: wy - 8, text: '+' + got + '%', color: '#ff8a7a', life: 0.9 });
    } else {
      sfx('gasolina', { pitch: 0.8 + Math.min(10, n) * 0.05, gap: 0.01 });
      SV.pump = 1;
      SV.glug.push({ t: 0 });
      drip(L, 3 + Math.min(6, n));
      G.floats.push({ wx: L.px + 6, y: L.base - (Z.overlay ? 32 : 40), text: '+' + got + '%', color: '#ffd25a', life: 0.9 });
    }
    if (n > 0 && n % 5 === 0) {
      sfx('moneda', { pitch: 1 + n * 0.02 });
      G.floats.push({ wx: kind === 'hp' ? wx : L.px + 6, y: (kind === 'hp' ? wy : L.base - (Z.overlay ? 32 : 40)) - (Z.overlay ? 6 : 10), text: 'x' + mult.toFixed(1), color: '#ffffff', life: 1.1 });
      if (n >= 10) G.shake = Math.max(G.shake, 1);
    }
    apply(); checkDone();
    return true;
  };

  // ---------- Dibujo (dentro del mundo, antes de las luces) ----------
  SV.draw = function (ctx, lights) {
    const g = G.garage, car = G.car, v = st(), L = SV.layout(), t = G.t;
    drawPump(ctx, lights, L, v, t);
    // mecánico: solo mientras repara en automático
    if (v.hp < 1 && !g.launching) {
      const set = Z.SPR.mech[0];
      const mx = L.cx - 8 + Math.abs(Math.sin(g.t * 0.6)) * (G.art.mw + 4);
      const f = set.attack[Math.floor(Math.max(0, g.t) * 6) % set.attack.length].c;
      ctx.save(); ctx.translate(Math.round(mx - set.cx + set.w), Math.round(L.gy + 10 - set.gy)); ctx.scale(-1, 1); ctx.drawImage(f, 0, 0); ctx.restore();
      if (Math.sin(g.t * 20) > 0) lights.push({ x: mx + 6, y: L.gy - 8, r: 18, color: '#9ad0ff', a: 0.4 });
    }
    // golpes de llave
    const wr = Z.iconCanvas('llave');
    for (const s of SV.swings) {
      const a = -0.9 + (s.t / 0.22) * 1.6;
      ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y)); ctx.rotate(a); ctx.drawImage(wr, -2, -wr.height + 2); ctx.restore();
      if (s.t < 0.06) { Z.rect(ctx, s.x - 2, s.y, 5, 1, '#fff6d0'); Z.rect(ctx, s.x, s.y - 2, 1, 5, '#fff6d0'); lights.push({ x: s.x, y: s.y, r: 16, color: '#fff0c0', a: 0.6 }); }
    }
    // indicaciones: un icono que bota encima de lo que hay que pulsar
    if (!g.launching && G.mode === 'garage') {
      const bob = Math.round(Math.sin(t * 5) * 1.5);
      if (v.hp < 1) hint(ctx, lights, 'llave', L.car.x + L.car.w / 2, L.car.y - 2 + bob, SV.hover === 'hp');
      if (v.fuel < 1 && !Z.overlay) hint(ctx, lights, 'bidon', L.px + 6, L.base - 40 + bob, SV.hover === 'fuel');
    }
    if (SV.hover === 'hp' && v.hp < 1) lights.push({ x: L.cx + G.art.mw / 2, y: L.gy - 8, r: 44, color: '#ff9a7a', a: 0.22 });
    if (SV.hover === 'fuel' && v.fuel < 1) lights.push({ x: L.px + 6, y: L.base - 16, r: 30, color: '#ffd25a', a: 0.25 });
  };

  function hint(ctx, lights, name, x, y, hot) {
    const c = Z.iconCanvas(name);
    ctx.globalAlpha = hot ? 1 : 0.55 + Math.sin(G.t * 5) * 0.25;
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height));
    ctx.globalAlpha = 1;
    if (hot) lights.push({ x, y: y - c.height / 2, r: 12, color: '#fff0c0', a: 0.35 });
  }

  function drawPump(ctx, lights, L, v, t) {
    const x = L.px, b = L.base, top = b - 26;
    // manguera: de la boca del surtidor a la tapa del depósito (si está llenando) o colgada en su soporte
    const plugged = v.fuel < 1 && !G.garage.launching;
    const hx = x + 12, hy = top + 8;
    const [ex, ey] = plugged ? L.cap : [x + 13, top + 14];
    const sag = plugged ? 7 : 3;
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, mx = (hx + ex) / 2, my = Math.max(hy, ey) + sag;
      const qx = (1 - u) * (1 - u) * hx + 2 * u * (1 - u) * mx + u * u * ex;
      const qy = (1 - u) * (1 - u) * hy + 2 * u * (1 - u) * my + u * u * ey;
      pts.push([Math.round(qx), Math.round(qy)]);
    }
    for (const [px, py] of pts) Z.rect(ctx, px, py - 1, 1, 3, '#0a080c');
    for (const [px, py] of pts) Z.px(ctx, px, py, '#4a4252');
    for (let i = 0; i < pts.length; i += 3) Z.px(ctx, pts[i][0], pts[i][1], '#6a6074');
    // bultos de gasolina que corren por la manguera al bombear
    for (const bl of SV.glug) {
      const p = pts[Math.min(pts.length - 1, Math.floor(bl.t * pts.length))];
      Z.rect(ctx, p[0] - 1, p[1] - 1, 3, 3, '#3a3440'); Z.px(ctx, p[0], p[1] - 1, '#d9a441');
    }
    // boquerel
    if (plugged) { Z.rect(ctx, ex - 2, ey - 1, 4, 2, '#8a8a96'); Z.px(ctx, ex - 2, ey - 1, '#d0d0dc'); }
    else { Z.rect(ctx, ex - 1, ey, 3, 4, '#8a8a96'); Z.px(ctx, ex - 1, ey, '#d0d0dc'); }
    // cuerpo
    Z.rect(ctx, x - 1, b - 2, 14, 3, '#1a1618'); Z.rect(ctx, x - 1, b - 2, 14, 1, '#3a3438');
    Z.rect(ctx, x, top, 12, 24, '#7a1a1a');
    Z.rect(ctx, x, top, 1, 24, '#a83030'); Z.rect(ctx, x + 11, top, 1, 24, '#3e0a10');
    Z.rect(ctx, x - 1, top - 3, 14, 3, '#2a2a30'); Z.rect(ctx, x - 1, top - 3, 14, 1, '#5a5a66');
    // pantalla con el nivel del depósito
    Z.rect(ctx, x + 2, top + 2, 8, 7, '#0c0a0c');
    const lv = Math.round(5 * v.fuel);
    Z.rect(ctx, x + 3, top + 8 - lv, 6, lv, v.fuel < 0.25 ? '#c0302a' : '#d9a441');
    if (lv > 0) Z.rect(ctx, x + 3, top + 8 - lv, 6, 1, v.fuel < 0.25 ? '#ff6a4a' : '#f6d47a');
    // franja hueso con una cruz
    Z.rect(ctx, x + 1, top + 12, 10, 4, '#d8c8a8'); Z.rect(ctx, x + 5, top + 12, 2, 4, '#7a1a1a'); Z.rect(ctx, x + 3, top + 13, 6, 2, '#7a1a1a');
    // palanca: baja al bombear
    const lev = Math.round(SV.pump * 3);
    Z.rect(ctx, x - 3, top + 4 + lev, 3, 1, '#5a5a66'); Z.rect(ctx, x - 4, top + 3 + lev, 1, 3, '#2a2a30');
    // piloto: verde si está lleno, ámbar parpadeando si está llenando
    const on = v.fuel >= 1 || Math.sin(t * 8) > 0;
    Z.px(ctx, x + 9, top + 18, on ? (v.fuel >= 1 ? '#7fd05a' : '#ffb040') : '#3a1a10');
    if (on) lights.push({ x: x + 9, y: top + 18, r: 6, color: v.fuel >= 1 ? '#7fd05a' : '#ffb040', a: 0.4 });
    if (SV.pump > 0) lights.push({ x: x + 6, y: top + 5, r: 14, color: '#ffd25a', a: 0.3 * SV.pump });
  }
})(window.ZG);
