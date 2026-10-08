'use strict';
// Núcleo: guardado, estadísticas del coche, carrera, director de hordas, muertes y garaje.
(function (Z) {
  const W = Z.W, H = Z.H, FX = Z.FX;
  const KEY = 'zombie-garage-v1';

  // ---------------- Guardado ----------------
  function fresh() {
    const owned = {}, eq = {};
    for (const s of Z.SLOTS) { const p = Z.PARTS[s.id][0]; owned[s.id] = { [p.id]: 0 }; eq[s.id] = p.id; }
    return {
      v: 1, money: 0, owned, eq, paint: 'medianoche', paints: ['medianoche', 'oxido'], decal: 'ninguna', decals: ['ninguna'],
      garage: { mecanico: 0, chatarrero: 0, reserva: 0, chapista: 0 },
      stats: { kills: 0, byType: {}, runs: 0, bestDist: 0, bestKills: 0, earned: 0, hordes: 0, partsBought: 0 },
      claimed: {}, rivals: {}, dir: 'ltr', auto: true, last: null, history: [],
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const s = JSON.parse(raw), f = fresh();
      for (const k in f) if (s[k] === undefined) s[k] = f[k];
      for (const k in f.stats) if (s.stats[k] === undefined) s.stats[k] = f.stats[k];
      for (const k in f.garage) if (s.garage[k] === undefined) s.garage[k] = 0;
      return s;
    } catch (e) { return fresh(); }
  }
  const S = Z.S = load();
  Z.save = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin almacenamiento: se juega igual */ } };
  Z.resetSave = function () { const f = fresh(); for (const k in S) delete S[k]; Object.assign(S, f); Z.save(); };

  // ---------------- Estadísticas ----------------
  Z.computeStats = function (eq, owned, garage) {
    const st = { hp: 0, speed: 0, accel: 0, dmg: 0, armor: 0, fuel: 0, fire: 0, rate: 0, pellets: 0, range: 0, flame: 0, grip: 0, mass: 1, money: 0, speedPct: 0 };
    for (const s of Z.SLOTS) {
      const part = Z.part(s.id, eq[s.id]);
      const lvl = (owned[s.id] && owned[s.id][part.id]) || 0, mul = 1 + 0.15 * lvl;
      for (const k in part.st) {
        const v = part.st[k];
        if (k === 'hp' || k === 'speed' || k === 'accel' || k === 'dmg' || k === 'fuel' || k === 'fire') st[k] += v * mul;
        else if (k === 'armor') st.armor += v + (v > 0 ? 0.015 * lvl : 0);
        else if (k === 'grip') st.grip += v + (v > 0 ? 0.02 * lvl : 0);
        else if (k === 'money' || k === 'speedPct') st[k] += v;
        else st[k] = v;
      }
    }
    st.speed *= 1 + st.speedPct;
    st.hp *= 1 + 0.08 * garage.chapista;
    st.fuel *= 1 + 0.1 * garage.reserva;
    st.money += 0.1 * garage.chatarrero;
    st.armor = Math.min(0.8, st.armor); st.grip = Math.min(0.8, st.grip);
    st.dps = st.flame ? st.fire : st.fire * st.rate * st.pellets;
    return st;
  };
  Z.statsNow = () => Z.computeStats(S.eq, S.owned, S.garage);
  Z.repairTime = () => Math.max(1.5, 7 * Math.pow(0.82, S.garage.mecanico));

  // ---------------- Estado de juego ----------------
  const G = Z.G = {
    mode: 'boot', t: 0, camX: 0, zombies: [], crates: [], floats: [], lights: [], shake: 0, flash: 0, flashCol: '#ffffff',
    hitstop: 0, fade: 0, car: null, art: null, run: null, night: Z.NIGHTS[0], zone: 0, prevZone: 0, zoneFade: 1,
    lastInteract: -99, actor: null, death: null, garage: null, enter: 0, events: [],
  };
  const emit = (type, data) => G.events.push({ type, data });
  Z.banner = (text, sub, kind) => emit('banner', { text, sub, kind });

  let artKey = '';
  function ensureArt() {
    const k = JSON.stringify(S.eq) + S.paint + S.decal;
    if (k !== artKey) { G.art = Z.buildCar(S.eq, S.paint, S.decal); artKey = k; }
    return G.art;
  }
  Z.ensureArt = ensureArt;

  function newCar() {
    const st = Z.statsNow();
    return { st, hp: st.hp, maxHp: st.hp, fuel: st.fuel, maxFuel: st.fuel, speed: 0, wheelRot: 0, bounce: 0, bump: 0, blood: 0,
      driverIn: true, hpFrac: 1, cool: 0, angle: 0, y: 0, vy: 0, va: 0, perks: {}, dead: false, burnt: false, flaming: false, smokeT: 0 };
  }
  const carFront = () => G.camX + carScreenX() + (G.art.front[0] - G.art.OX);
  const carBack = () => G.camX + carScreenX();
  const carScreenX = () => Z.CAR_X - Math.round(Math.pow(G.enter, 2) * 160);

  // ---------------- Carrera ----------------
  Z.startRun = function () {
    ensureArt();
    G.mode = 'run'; G.camX = 0; G.zombies = []; G.crates = []; G.floats = []; FX.reset();
    G.car = newCar(); G.enter = 1; G.actor = null; G.death = null;
    let nights = {}; Z.NIGHTS.forEach(n => nights[n.id] = n.w);
    const nightId = Z.wpick(nights);
    G.night = S.stats.runs < 2 ? Z.NIGHTS[0] : (Z.NIGHTS.find(n => n.id === nightId) || Z.NIGHTS[0]);
    G.zone = 0; G.prevZone = 0; G.zoneFade = 1;
    G.run = { dist: 0, kills: 0, money: 0, zone: 0, byType: {}, hordes: 0, passed: {}, hordeEndAt: -1 };
    G.dir = { cycle: 0, step: 0, next: 28, horde: null, warned: false };
    G.nextCrate = Z.rr(140, 260);
    Z.banner(Z.ZONES[0].name, G.night.id !== 'normal' ? G.night.name + ' · ' + G.night.desc : Z.ZONES[0].sub, 'zone');
    emit('mode');
  };

  const SEQ = [1, 2, 3, 5, 7, 10, 14, 19];
  function density() { return Z.ZONES[G.zone].density * G.night.spawn * (1 + 0.22 * G.dir.cycle); }

  function spawnZombie(type, wx, y, dir) {
    const zt = Z.ZTYPES[type], zone = Z.ZONES[G.zone];
    const hpMul = zone.hp * G.night.hp * (1 + 0.1 * G.dir.cycle) * (1 + Math.max(0, G.run.dist - 6000) / 4000);
    const z = {
      type, v: Z.ri(0, 3), wx, y, hp: zt.hp * hpMul, maxHp: zt.hp * hpMul, spd: zt.speed * Z.rr(0.8, 1.2), phase: Math.random(),
      m: zt.mass, impact: zt.impact * zone.dmg, dps: zt.dps * zone.dmg, reward: zt.reward * zone.money,
      pushed: false, hitT: 0, burn: 0, dir: dir || -1, atk: false, off: Z.rr(0, 3), half: type === 'brute' ? 7 : 4,
    };
    G.zombies.push(z);
    return z;
  }
  function spawnGroup(n, forceBrute) {
    const mix = Z.ZONES[G.zone].mix;
    let x = G.camX + W + 12;
    for (let i = 0; i < n; i++) {
      if (G.zombies.length > 90) break;
      const type = forceBrute && i === 0 ? 'brute' : Z.wpick(mix);
      spawnZombie(type, x, Z.ri(105, 123));
      x += Z.rr(3, 14);
    }
  }

  function director() {
    const d = G.dir, dist = G.run.dist;
    if (d.horde) {
      if (dist >= d.horde.next) {
        const n = Math.min(d.horde.left, Z.ri(1, 3));
        spawnGroup(n, G.zone >= 3 && d.horde.left === d.horde.total);
        d.horde.left -= n; d.horde.next = dist + Z.rr(2, 5);
        if (d.horde.left <= 0) {
          d.horde = null; d.cycle++; d.step = 0; d.next = dist + Z.rr(90, 140);
          G.run.hordeEndAt = dist + 40;
        }
      }
      return;
    }
    if (dist < d.next) return;
    if (d.step < SEQ.length) {
      const n = Math.max(1, Math.round(SEQ[d.step] * density() * Z.rr(0.8, 1.25)));
      spawnGroup(n);
      d.step++;
      d.next = dist + Z.rr(38, 62);
      if (d.step === SEQ.length) { Z.banner('LA HORDA SE ACERCA', 'Ruge el motor', 'horde'); d.next = dist + 45; }
    } else {
      const total = Math.round(26 * density());
      d.horde = { left: total, total, next: dist };
    }
  }

  function addFloat(wx, y, text, color) { G.floats.push({ wx, y, text, color, life: 1.1 }); }

  function killZombie(z, vx) {
    if (z.dead) return;
    z.dead = true;
    const car = G.car, st = car.st;
    const reward = z.reward * G.night.money * (1 + st.money) * (car.perks.furia > 0 ? 2 : 1);
    S.money += reward; S.stats.earned += reward; G.run.money += reward; G.run.kills++;
    G.run.byType[z.type] = (G.run.byType[z.type] || 0) + 1;
    S.stats.kills++; S.stats.byType[z.type] = (S.stats.byType[z.type] || 0) + 1;
    addFloat(z.wx, z.y - 22, '+$' + Z.fmt(Math.max(1, reward)), '#ffd25a');
    const col = Z.SPR[z.type][z.v].col;
    FX.gore(z, vx, col, z.type === 'brute');
    if (z.type === 'bloater') {
      FX.blood(z.wx, z.y - 10, 40, vx * 0.5, z.y, ['#6a8a1a', '#9ac02a', '#c8e050']);
      if (Math.abs(z.wx - carFront()) < 26 && !car.dead) { damageCar(Z.ZTYPES.bloater.acid * Z.ZONES[G.zone].dmg); addFloat(z.wx, z.y - 30, '-' + Math.round(Z.ZTYPES.bloater.acid * Z.ZONES[G.zone].dmg), '#9ac02a'); }
    }
    if (z.type === 'brute') { G.hitstop = 0.09; G.shake = Math.max(G.shake, 4); }
    else if (Math.random() < 0.3) G.shake = Math.max(G.shake, 1.2);
    car.blood = Math.min(car.blood + (vx > 0 ? 1.2 : 0.4), G.art.bodyPx.length * 0.3);
  }
  function damageCar(n) {
    const car = G.car;
    if (car.dead) return;
    car.hp -= n * (1 - car.st.armor);
    car.bump = 1.5;
    if (n > 3 && Math.random() < 0.5) FX.sparks(carFront(), Z.GROUND - 6, 3, -20);
  }

  function fireWeapons(dt) {
    const car = G.car, st = car.st, art = G.art;
    if (!art.muzzle || car.dead) return;
    const mwx = G.camX + carScreenX() + (art.muzzle[0] - art.OX);
    const my = Z.GROUND - art.contactY + art.muzzle[1] + car.bounce;
    const front = carFront();
    const inRange = G.zombies.filter(z => !z.dead && z.wx > front - 6 && z.wx < front + st.range);
    const mul = car.perks.filo > 0 ? 2 : 1;
    if (st.flame) {
      if (!inRange.length) return;
      for (let i = 0; i < 4; i++) FX.add({ k: 'fire', x: mwx + Z.rr(0, 4), y: my + Z.rr(-1, 1), vx: Z.rr(140, 220) + car.speed, vy: Z.rr(-10, 35), g: 0, life: Z.rr(0.25, 0.4), max: 0.4 });
      G.lights.push({ x: mwx - G.camX + 20, y: my + 6, r: 50, color: '#ff8a30', a: 0.45 });
      for (const z of inRange) { z.hp -= st.fire * mul * dt; z.burn = 2.5; if (z.hp <= 0) killZombie(z, 60); }
      return;
    }
    car.cool -= dt;
    if (car.cool > 0 || !inRange.length) return;
    car.cool = 1 / st.rate;
    inRange.sort((a, b) => a.wx - b.wx);
    for (let p = 0; p < st.pellets; p++) {
      const z = p === 0 ? inRange[0] : Z.pick(inRange.slice(0, 4));
      if (!z || z.dead) continue;
      const ty = z.y - Z.rr(8, 15);
      FX.add({ k: 'tracer', x: mwx, y: my, x2: z.wx, y2: ty, life: 0.06 });
      z.hp -= st.fire * mul; z.hitT = 0.08; if (!z.pushed) z.wx += 2;
      FX.blood(z.wx, ty, 4, 60, z.y);
      if (z.hp <= 0) killZombie(z, 90);
    }
    FX.add({ k: 'flash', x: mwx + 1, y: my, life: 0.05, s: st.pellets > 1 ? 2.5 : 1.6 });
  }

  function updateZombies(dt) {
    const car = G.car, front = carFront(), back = carBack();
    const dying = G.mode === 'dying';
    for (let i = G.zombies.length - 1; i >= 0; i--) {
      const z = G.zombies[i];
      if (z.dead) { G.zombies.splice(i, 1); continue; }
      z.hitT -= dt;
      const sp = z.type === 'runner' ? 2.4 : z.type === 'brute' ? 0.8 : 1.2;
      z.phase = (z.phase + dt * (z.atk ? 1.6 : sp)) % 1;
      if (z.burn > 0) {
        z.burn -= dt; z.hp -= car.st.fire * 0.25 * dt;
        if (Math.random() < 0.5) FX.fire(z.wx, z.y - 10, 1, 3);
        if (z.hp <= 0) { killZombie(z, 20); continue; }
      }
      // objetivo: el conductor si está fuera del coche, si no el coche
      const target = G.actor && G.actor.state !== 'gone' ? G.actor.wx : null;
      if (z.pushed) {
        z.wx = front + z.half + z.off;
        z.atk = true;
        z.hp -= (car.st.dmg * (car.perks.filo > 0 ? 2 : 1)) * 1.1 * dt;
        if (Math.random() < dt * 8) FX.blood(z.wx - 3, z.y - 9, 2, 40, z.y);
        if (!car.dead) car.hp -= z.dps * (1 - car.st.armor) * dt;
        if (z.hp <= 0) { killZombie(z, 40 + car.speed); continue; }
        if (car.dead && car.speed < 2) { z.pushed = false; }
        continue;
      }
      if (dying) z.spd = Math.max(z.spd, 26);
      if (target !== null && dying) {
        const dx = target - z.wx;
        if (Math.abs(dx) > 5 + z.off * 2) { z.dir = Math.sign(dx); z.wx += z.dir * z.spd * 1.3 * dt; z.atk = false; }
        else { z.atk = true; z.dir = Math.sign(dx) || -1; }
        continue;
      }
      if (z.dir < 0) {
        // viene de frente
        if (!car.dead && z.wx - z.half <= front && z.wx > back + 8) {
          const hit = car.st.dmg * (car.perks.filo > 0 ? 2 : 1) * (0.5 + car.speed / Math.max(1, car.st.speed)) * (0.8 + car.st.mass * 0.2);
          z.hp -= hit; z.hitT = 0.1;
          car.speed *= 1 - Math.min(0.6, z.m * 0.05 * (1 - car.st.grip) / car.st.mass);
          if (z.hp <= 0) { killZombie(z, 80 + car.speed * 1.4); car.bump = 1; damageCar(z.impact * 0.2); continue; }
          damageCar(z.impact); FX.blood(front, z.y - 10, 8, 50, z.y);
          z.pushed = true; z.atk = true;
          continue;
        }
        if (car.dead && z.wx - z.half <= front + 2 && z.wx > back) { z.atk = true; z.dir = -1; continue; }
        if (car.dead && z.wx < back + 4) { z.atk = true; continue; }
        z.wx -= z.spd * dt; z.atk = false;
      } else {
        // viene por detrás (solo en escenas de muerte)
        if (z.wx >= back - 2) { z.atk = true; continue; }
        z.wx += z.spd * 1.2 * dt; z.atk = false;
      }
      if (z.wx < G.camX - 50) G.zombies.splice(i, 1);
    }
  }

  function updateCrates() {
    const front = carFront();
    if (G.mode === 'run' && G.run.dist >= G.nextCrate) {
      G.crates.push({ wx: G.camX + W + 20, y: Z.ri(108, 120) });
      G.nextCrate = G.run.dist + Z.rr(180, 320);
    }
    for (let i = G.crates.length - 1; i >= 0; i--) {
      const c = G.crates[i];
      if (!G.car.dead && c.wx - 4 <= front) {
        G.crates.splice(i, 1);
        FX.debris(c.wx, c.y - 4, 12, ['#6a4a2a', '#8a6038', '#3a2818']);
        const p = Z.pick(Z.PERKS), car = G.car;
        if (p.id === 'kit') car.hp = Math.min(car.maxHp, car.hp + car.maxHp * 0.35);
        else if (p.id === 'bidon') car.fuel = Math.min(car.maxFuel * 1.3, car.fuel + car.maxFuel * 0.3);
        else car.perks[p.id] = p.dur;
        Z.banner(p.name, p.desc, 'perk');
      } else if (c.wx < G.camX - 20) G.crates.splice(i, 1);
    }
  }

  function checkMilestones() {
    const r = G.run, d = r.dist;
    const z = Z.zoneAt(d);
    if (z > G.zone) {
      G.prevZone = G.zone; G.zone = z; G.zoneFade = 0; r.zone = z;
      Z.banner(Z.ZONES[z].name, Z.ZONES[z].sub, 'zone');
    }
    for (const rv of Z.RIVALS) {
      if (d >= rv.dist && !r.passed[rv.name]) {
        r.passed[rv.name] = true;
        if (!S.rivals[rv.name]) {
          S.rivals[rv.name] = true; S.money += rv.reward;
          Z.banner('Has superado a ' + rv.name, '+$' + Z.fmt(rv.reward), 'rival');
        }
      }
    }
    if (r.hordeEndAt > 0 && d >= r.hordeEndAt) { r.hordeEndAt = -1; r.hordes++; S.stats.hordes++; Z.banner('HORDA SUPERADA', 'Respira. Vuelven poco a poco', 'perk'); }
  }

  function updateCar(dt) {
    const car = G.car, st = car.st;
    for (const k in car.perks) car.perks[k] -= dt;
    const nitro = car.perks.nitro > 0;
    let push = 0;
    for (const z of G.zombies) if (z.pushed) push += z.m;
    let target = st.speed * (nitro ? 1.5 : 1) / (1 + push / (st.mass * (1 + st.grip)) * 0.9);
    if (car.dead || car.fuel <= 0) target = 0;
    const acc = car.dead ? st.accel * 1.6 : st.accel;
    car.speed += Z.clamp(target - car.speed, -acc * 2 * dt, acc * dt);
    if (car.dead && G.death && G.death.kind === 'flip') car.speed = Math.max(0, car.speed);
    G.camX += car.speed * dt;
    const dm = car.speed * dt / Z.PXM;
    if (G.mode === 'run') { G.run.dist += dm; car.fuel -= dm / 10; }
    car.wheelRot += car.speed * dt / G.art.r;
    car.bump = Math.max(0, car.bump - dt * 8);
    car.bounce = Math.round(Math.sin(G.t * 31) * 0.5 * Math.min(1, car.speed / 40) + (car.bump > 0.5 ? -1 : 0));
    car.hpFrac = Z.clamp(car.hp / car.maxHp, 0, 1);
    // humo y fuego según el daño
    const hx = G.camX + carScreenX() + (G.art.hood[0] - G.art.OX), hy = Z.GROUND - G.art.contactY + G.art.hood[1] - 1;
    car.smokeT -= dt;
    if (car.smokeT <= 0 && !car.burnt) {
      if (car.hpFrac < 0.6) FX.smoke(hx, hy, 1, car.hpFrac < 0.3);
      if (car.hpFrac < 0.3) { FX.fire(hx, hy + 1, 2, 2); if (Math.random() < 0.2) FX.sparks(hx, hy, 2, -30); }
      car.smokeT = car.hpFrac < 0.3 ? 0.05 : 0.12;
    }
    if (nitro && !car.dead) FX.fire(G.camX + carScreenX() - 2, Z.GROUND - 5, 2, 1);
    if (G.art.eq.motor === 'v8' && !car.dead && Math.random() < 0.25) FX.fire(G.camX + carScreenX() + (G.art.rear[0] - G.art.OX) - 3, Z.GROUND - G.art.contactY + G.art.rear[1] + 2, 1, 0);
    if (G.art.eq.motor === 'turbina' && !car.dead) for (let i = 0; i < 2; i++) FX.add({ k: 'fire', x: G.camX + carScreenX() + (G.art.rear[0] - G.art.OX) - 8, y: Z.GROUND - G.art.contactY + G.art.rear[1] + Z.rr(-1, 1), vx: -Z.rr(60, 120), vy: 0, g: 0, life: 0.15, max: 0.5 });
  }

  // ---------------- Muertes ----------------
  function startDeath(cause) {
    const car = G.car;
    car.dead = true; G.mode = 'dying';
    const z = G.zone;
    let kind = ['eaten', 'flip', 'explode', 'flee', 'explode'][Math.min(z, 4)];
    if (cause === 'fuel') kind = z === 3 ? 'flee' : 'eaten';
    if (kind === 'flip' && car.speed < 15) kind = 'eaten';
    G.death = { kind, cause, t: 0, word: false, endAt: 5.5, step: 0 };
    for (const zz of G.zombies) zz.pushed = false;
    if (kind === 'flip') {
      const art = G.art; G.death.landY = -((art.contactY - art.OY) - 8) - 1;
      const a = 150, b = -95, c = -G.death.landY; const tl = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
      car.vy = -95; car.va = Math.PI / tl; car.y = 0; G.shake = 5; FX.sparks(carFront(), Z.GROUND - 4, 20, 40); FX.glass(carFront() - 10, Z.GROUND - 12, 10); }
    if (kind === 'eaten' || kind === 'flip') {
      for (let i = 0; i < 5; i++) spawnZombie('walker', G.camX + Z.CAR_X - 30 - i * Z.rr(8, 14), Z.ri(106, 122), 1);
      for (let i = 0; i < 4; i++) spawnZombie(Z.wpick(Z.ZONES[z].mix), G.camX + Z.CAR_X + 120 + i * 14, Z.ri(106, 122));
    }
  }

  function wordCard() {
    const d = G.death, r = G.run;
    if (d.word) return;
    d.word = true;
    emit('death', { word: Z.DEATHS[d.kind].word, zone: Z.ZONES[G.zone].name, dist: r.dist, kills: r.kills, money: r.money, cause: d.cause });
  }

  function updateDeath(dt) {
    const d = G.death, car = G.car, art = G.art;
    d.t += dt;
    const dx = G.camX + carScreenX() + (art.driver[0] - art.OX);
    if (d.kind === 'eaten') {
      if (d.t > 1.8 && d.step === 0) {
        d.step = 1; car.driverIn = false;
        FX.glass(dx, Z.GROUND - 12, 14);
        G.actor = { wx: dx - 4, y: Z.GROUND + 4, state: 'down', t: 0, face: -1 };
        G.shake = 2;
      }
      if (d.step === 1 && d.t < 4.6 && Math.random() < dt * 30) FX.blood(G.actor.wx, G.actor.y - 4, 3, Z.rr(-40, 40), G.actor.y + 2);
      if (d.t > 2.4) wordCard();
    } else if (d.kind === 'flip') {
      if (d.step === 0) {
        car.vy += 300 * dt; car.y += car.vy * dt; car.angle += car.va * dt;
        if (car.vy > 0 && car.y >= d.landY) {
          car.angle = Math.PI; car.y = d.landY; car.vy = 0; car.va = 0; d.step = 1; car.driverIn = false;
          G.shake = 6; FX.sparks(carFront() - 20, Z.GROUND - 2, 30, 30); FX.debris(carFront() - 20, Z.GROUND - 8, 10, ['#5d5a63', art.paint.base, '#2a2830']);
        }
      } else {
        if (car.speed > 3 && Math.random() < 0.6) FX.sparks(carBack() + Z.rr(0, 40), Z.GROUND - 1, 2, -40);
        if (d.t > 2.6 && d.step === 1) { d.step = 2; G.actor = { wx: dx, y: Z.GROUND + 2, state: 'hidden', t: 0 }; }
        if (d.step === 2 && d.t < 4.8 && Math.random() < dt * 25) FX.blood(G.actor.wx, Z.GROUND - 6, 3, Z.rr(-50, 50), Z.GROUND + 3);
        if (Math.random() < 0.3) FX.fire(G.camX + carScreenX() + 20, Z.GROUND - 4, 1, 4);
      }
      if (d.t > 2.2) wordCard();
    } else if (d.kind === 'explode') {
      if (d.step === 0) {
        FX.fire(dx + 10, Z.GROUND - 10, 3, 6); if (Math.random() < 0.4) FX.smoke(dx + 10, Z.GROUND - 14, 1, true);
        if (d.t > 1.4) {
          d.step = 1; car.burnt = true; car.driverIn = false;
          const cx = G.camX + carScreenX() + art.mw / 2;
          FX.explosion(cx, Z.GROUND - 8, 1.6);
          G.flash = 0.7; G.flashCol = '#fff2d0'; G.shake = 9; G.hitstop = 0.12;
          FX.debris(cx, Z.GROUND - 10, 18, ['#5d5a63', art.paint.base, '#2a2830', '#8a8692']);
          for (let i = 0; i < 2; i++) FX.add({ k: 'wheel', img: art.wheelFrames[0], x: cx + (i ? 18 : -18), y: Z.GROUND - 6, vx: i ? 90 : -40, vy: -170, g: 320, life: 4, gy: Z.GROUND + 2 });
          for (const z of G.zombies) if (Math.abs(z.wx - cx) < 75) killZombie(z, (z.wx - cx) * 4);
        }
      } else {
        if (Math.random() < 0.6) FX.fire(G.camX + carScreenX() + Z.rr(6, art.mw - 6), Z.GROUND - 8, 1, 2);
        if (Math.random() < 0.2) FX.smoke(G.camX + carScreenX() + art.mw / 2, Z.GROUND - 14, 1, true);
        G.lights.push({ x: carScreenX() + art.mw / 2, y: Z.GROUND - 8, r: 40 + Math.random() * 6, color: '#ff7a20', a: 0.35 });
      }
      if (d.t > 1.9) wordCard();
    } else if (d.kind === 'flee') {
      if (d.t > 1.0 && d.step === 0) {
        d.step = 1; car.driverIn = false;
        G.actor = { wx: dx + 4, y: Z.GROUND + 3, state: 'run', t: 0, face: 1, phase: 0 };
        for (let i = 0; i < 3; i++) spawnZombie('runner', G.camX - 10 - i * 14, Z.ri(108, 120), 1);
        for (let i = 0; i < 4; i++) spawnZombie(Z.wpick(Z.ZONES[G.zone].mix), G.camX + W + i * 12, Z.ri(108, 120));
      }
      const a = G.actor;
      if (a && a.state === 'run') {
        a.wx += 36 * dt; a.phase = (a.phase + dt * 2.6) % 1;
        const caught = G.zombies.some(z => Math.abs(z.wx - a.wx) < 4);
        if (caught || d.t > 3.4) { a.state = 'down'; d.tackle = d.t; G.shake = 2; d.endAt = d.t + 3; }
      }
      if (a && a.state === 'down' && d.t < d.tackle + 2.4 && Math.random() < dt * 30) FX.blood(a.wx, a.y - 3, 3, Z.rr(-40, 40), a.y + 2);
      if (d.tackle && d.t > d.tackle + 0.4) wordCard();
    }
    if (d.t > d.endAt && G.mode === 'dying') {
      G.mode = 'fadeout'; G.fade = 0;
    }
  }

  function finishRun() {
    const r = G.run;
    S.stats.runs++;
    S.stats.bestDist = Math.max(S.stats.bestDist, Math.floor(r.dist));
    S.stats.bestKills = Math.max(S.stats.bestKills, r.kills);
    S.last = { dist: Math.floor(r.dist), kills: r.kills, money: Math.floor(r.money), zone: G.zone, death: G.death.kind, night: G.night.id };
    S.history.push(S.last); if (S.history.length > 12) S.history.shift();
    Z.save();
  }

  // ---------------- Garaje ----------------
  Z.enterGarage = function (first) {
    ensureArt();
    G.mode = 'garage'; G.camX = 0; G.zombies = []; G.crates = []; G.floats = []; FX.reset(); G.actor = null;
    const prevCar = G.car;
    G.car = newCar();
    G.car.hp = first ? G.car.maxHp : 0; G.car.hpFrac = first ? 1 : 0;
    G.car.blood = first ? 0 : (prevCar ? prevCar.blood : 0);
    G.car.burnt = !first && prevCar && prevCar.burnt;
    G.garage = { t: 0, repair: first ? 1 : 0, dur: Z.repairTime(), countdown: 3, launching: 0, door: 0, mx: 0 };
    emit('mode');
  };
  Z.launch = function () {
    if (G.mode !== 'garage' || G.garage.repair < 1 || G.garage.launching) return;
    ensureArt();
    G.garage.launching = 0.001;
  };
  Z.refreshCar = function () {
    // Tras cambiar piezas en el garaje: reconstruye el sprite y las estadísticas.
    if (G.mode !== 'garage') return;
    ensureArt();
    const frac = G.car.hpFrac, blood = G.car.blood, burnt = G.car.burnt;
    G.car = newCar(); G.car.hpFrac = frac; G.car.hp = G.car.maxHp * frac; G.car.blood = blood; G.car.burnt = burnt;
  };

  function updateGarage(dt) {
    const g = G.garage, car = G.car;
    g.t += dt;
    if (g.repair < 1) {
      g.repair = Math.min(1, g.repair + dt / g.dur);
      car.hpFrac = g.repair; car.hp = car.maxHp * g.repair;
      car.blood = Math.max(0, car.blood - dt * 60);
      if (g.repair > 0.3) car.burnt = false;
      if (Math.random() < dt * 14) FX.sparks(garageCarX() + 10 + Math.abs(Math.sin(g.t * 0.6)) * (G.art.mw - 20), garageGround() - 6 - Math.random() * 6, 3, 0);
      if (g.repair >= 1) Z.banner('Coche reparado', S.auto ? 'Sale solo en unos segundos' : 'Pulsa A la carretera', 'perk');
    } else if (!g.launching && S.auto) {
      const idle = G.t - G.lastInteract > 4;
      if (idle) { g.countdown -= dt; if (g.countdown <= 0) Z.launch(); }
      else g.countdown = 3;
    }
    if (g.launching) {
      g.launching += dt;
      g.door = Math.min(1, g.door + dt * 1.5);
      if (g.door >= 1) { car.speed = Math.min(160, car.speed + 120 * dt); g.mx += car.speed * dt; car.wheelRot += car.speed * dt / G.art.r; }
      if (g.mx > 320 && G.mode === 'garage') { G.mode = 'fadein-run'; G.fade = 0; }
    }
    car.bounce = 0;
  }
  const garageCarX = () => 260 - Math.round(G.art.mw / 2) + Math.round(G.garage ? G.garage.mx : 0);
  const garageGround = () => 104;

  // ---------------- Bucle ----------------
  Z.update = function (dt) {
    G.t += dt;
    if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.1; }
    G.shake = Math.max(0, G.shake - dt * 14);
    G.flash = Math.max(0, G.flash - dt * 2.5);
    G.lights = [];
    for (const f of G.floats) { f.life -= dt; f.y -= dt * 14; }
    G.floats = G.floats.filter(f => f.life > 0);
    if (G.mode === 'run' || G.mode === 'dying' || G.mode === 'fadeout') {
      G.enter = Math.max(0, G.enter - dt * 0.9);
      if (G.zoneFade < 1) G.zoneFade = Math.min(1, G.zoneFade + dt * 0.5);
      updateCar(dt);
      if (G.mode === 'run') {
        director(); updateCrates(); checkMilestones(); fireWeapons(dt);
        if (G.car.hp <= 0) startDeath('hp');
        else if (G.car.fuel <= 0 && G.car.speed < 1) startDeath('fuel');
        else if (G.car.fuel <= 0 && !G.run.fuelWarn) { G.run.fuelWarn = true; Z.banner('SIN GASOLINA', 'El motor se apaga…', 'horde'); }
      } else if (G.mode === 'dying') updateDeath(dt);
      else if (G.mode === 'fadeout') {
        updateDeath(dt);
        G.fade = Math.min(1, G.fade + dt * 1.4);
        if (G.fade >= 1) { finishRun(); Z.enterGarage(false); G.mode = 'fadein-garage'; }
      }
      updateZombies(dt);
      const w = Z.Weather.update(dt, G.night.id, Z.zoneArt(G.zone), G.car.speed);
      if (w === 'flash') { G.flash = 0.35; G.flashCol = '#dfe6ff'; }
    } else if (G.mode === 'garage' || G.mode === 'fadein-garage' || G.mode === 'fadein-run') {
      if (G.mode === 'fadein-garage') { G.fade = Math.max(0, G.fade - dt * 1.4); if (G.fade <= 0) G.mode = 'garage'; }
      if (G.mode === 'fadein-run') { G.fade = Math.min(1, G.fade + dt * 2.5); if (G.fade >= 1) { Z.startRun(); G.fade = 1; G.fadingIn = true; } }
      updateGarage(dt);
      Z.Weather.update(dt, 'none', null, 0);
    }
    if (G.fadingIn && G.mode === 'run') { G.fade = Math.max(0, G.fade - dt * 2); if (G.fade <= 0) G.fadingIn = false; }
    FX.update(dt);
  };

  // ---------------- Render ----------------
  Z.render = function (out, wc, wctx) {
    const lights = G.lights;
    const ctx = wctx;
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (G.mode === 'garage' || G.mode === 'fadein-garage' || G.mode === 'fadein-run') renderGarage(ctx, lights);
    else renderRun(ctx, lights);
    Z.drawLights(ctx, lights);
    Z.vignette(ctx);
    if (G.night.id === 'sangre' && G.mode !== 'garage') { ctx.fillStyle = 'rgba(120,0,16,0.12)'; ctx.fillRect(0, 0, W, H); }
    if (G.flash > 0) { ctx.fillStyle = Z.rgba(G.flashCol, Math.min(0.8, G.flash)); ctx.fillRect(0, 0, W, H); }
    if (G.fade > 0) { ctx.fillStyle = `rgba(4,2,6,${G.fade})`; ctx.fillRect(0, 0, W, H); }

    // Volcado a pantalla (con espejo si la barra va de derecha a izquierda)
    const o = out.getContext('2d');
    o.imageSmoothingEnabled = false;
    o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
    const sx = G.shake > 0 ? Math.round(Z.rr(-G.shake, G.shake)) : 0, sy = G.shake > 0 ? Math.round(Z.rr(-G.shake, G.shake) * 0.6) : 0;
    const rtl = S.dir === 'rtl';
    o.save();
    if (rtl) o.setTransform(-1, 0, 0, 1, W, 0);
    o.drawImage(wc, sx, sy);
    o.restore();
    // Textos flotantes (sin espejo)
    const mirror = (x) => rtl ? W - x : x;
    for (const f of G.floats) {
      const x = mirror(f.wx - G.camX) - Z.pixTextW(f.text) / 2;
      o.globalAlpha = Math.min(1, f.life * 2);
      Z.pixText(o, f.text, x, f.y, f.color, '#1a0a08');
    }
    o.globalAlpha = 1;
    if (G.mode === 'run' || G.mode === 'dying') {
      o.font = '8px Silkscreen, monospace'; o.textBaseline = 'top';
      for (const m of G.markers || []) {
        const x = mirror(m.sx);
        o.fillStyle = '#07050c'; o.fillText(m.label, Math.round(x - o.measureText(m.label).width / 2) + 1, m.y + 1);
        o.fillStyle = m.color; o.fillText(m.label, Math.round(x - o.measureText(m.label).width / 2), m.y);
      }
    }
  };

  function drawZombie(ctx, z, camX) {
    const set = Z.SPR[z.type][z.v];
    const frames = z.atk ? set.attack : set.walk;
    const f = frames[Math.floor(z.phase * frames.length) % frames.length];
    const img = z.hitT > 0 ? f.flash : f.c;
    const sx = Math.round(z.wx - camX - set.cx), sy = Math.round(z.y - set.gy);
    if (z.dir > 0) { ctx.save(); ctx.translate(sx + set.w, sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
    else ctx.drawImage(img, sx, sy);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Math.round(z.wx - camX - 4), z.y + 1, 9, 1);
  }

  function drawActor(ctx, a, camX) {
    const set = Z.SPR.driver[0];
    const sx = Math.round(a.wx - camX);
    if (a.state === 'run') {
      const f = set.walk[Math.floor(a.phase * 8) % 8].c;
      ctx.save(); ctx.translate(sx - set.cx + set.w, a.y - set.gy); ctx.scale(-1, 1); ctx.drawImage(f, 0, 0); ctx.restore();
    } else if (a.state === 'down') {
      Z.drawCorpse(ctx, sx, a.y, set.col, false, true);
      Z.rect(ctx, sx - 2, a.y - 2, 3, 2, set.col.skin);
    }
  }

  function renderRun(ctx, lights) {
    const camX = G.camX, art = G.art, car = G.car;
    if (G.zoneFade < 1) {
      Z.drawBackdrop(ctx, G.prevZone, camX, G.t, 1, lights, G.night);
      Z.drawBackdrop(ctx, G.zone, camX, G.t, G.zoneFade, lights, G.night);
    } else Z.drawBackdrop(ctx, G.zone, camX, G.t, 1, lights, G.night);
    Z.drawRoad(ctx, G.zoneFade < 0.5 ? G.prevZone : G.zone, camX);
    FX.drawDecals(ctx, camX);

    // marcadores: récord y rivales (cruces al borde de la carretera)
    G.markers = [];
    const off = Z.CAR_X + (art.front[0] - art.OX);
    const mk = (dist, label, color, kind) => {
      const sx = Math.round(dist * Z.PXM + off - camX);
      if (sx < -20 || sx > W + 20) return;
      if (kind === 'cross') { Z.rect(ctx, sx, 82, 2, 17, '#3a2a1e'); Z.rect(ctx, sx - 3, 86, 8, 2, '#3a2a1e'); Z.px(ctx, sx, 82, '#6a5040'); }
      else { Z.rect(ctx, sx, 80, 1, 19, '#2a2a30'); Z.rect(ctx, sx - 2, 76, 5, 4, '#e8dcc0'); Z.px(ctx, sx - 1, 77, '#100808'); Z.px(ctx, sx + 1, 77, '#100808'); lights.push({ x: sx, y: 78, r: 14, color: '#ffd25a', a: 0.3 }); }
      G.markers.push({ sx, y: 66, label, color });
    };
    if (S.stats.bestDist > 50) mk(S.stats.bestDist, 'TU RECORD', '#ffd25a', 'skull');
    for (const rv of Z.RIVALS) mk(rv.dist, rv.name, S.rivals[rv.name] ? '#8a8690' : '#e8dcc0', 'cross');

    for (const c of G.crates) {
      const sx = Math.round(c.wx - camX);
      Z.rect(ctx, sx - 4, c.y - 7, 9, 7, '#6a4a2a'); Z.rect(ctx, sx - 4, c.y - 7, 9, 1, '#a07a48');
      Z.line(ctx, sx - 4, c.y - 7, sx + 4, c.y - 1, 1, '#3a2818'); Z.rect(ctx, sx - 1, c.y - 5, 3, 3, '#c02a2a');
      lights.push({ x: sx, y: c.y - 4, r: 10, color: '#ffd25a', a: 0.2 + Math.sin(G.t * 6) * 0.1 });
    }
    const zs = G.zombies.slice().sort((a, b) => a.y - b.y);
    for (const z of zs) if (z.y < Z.GROUND) drawZombie(ctx, z, camX);
    if (G.actor && G.actor.y < Z.GROUND) drawActor(ctx, G.actor, camX);

    // coche + faros
    const cx = carScreenX();
    const groundY = Z.GROUND + Math.round(car.y || 0);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(cx - 2, Z.GROUND, art.mw + 4, 2);
    Z.drawCar(ctx, art, car, cx, groundY, G.t);
    if (!car.dead) {
      const fx = cx + (art.front[0] - art.OX) - 2, fy = Z.GROUND - art.contactY + art.front[1] - 1;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(fx, 0, fx + 190, 0);
      const flick = car.hpFrac < 0.3 && Math.sin(G.t * 40) > 0.4 ? 0.3 : 1;
      g.addColorStop(0, `rgba(255,230,170,${0.26 * flick})`); g.addColorStop(1, 'rgba(255,230,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(fx, fy - 1); ctx.lineTo(fx + 190, fy - 18); ctx.lineTo(fx + 190, H); ctx.lineTo(fx + 60, H); ctx.lineTo(fx, fy + 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      lights.push({ x: fx + 2, y: fy, r: 9, color: '#fff0c0', a: 0.7 * flick });
      lights.push({ x: cx + 2, y: fy + 1, r: 6, color: '#ff2020', a: 0.45 });
    }
    for (const z of zs) if (z.y >= Z.GROUND) drawZombie(ctx, z, camX);
    if (G.actor && G.actor.y >= Z.GROUND) drawActor(ctx, G.actor, camX);
    FX.draw(ctx, camX, lights);
    Z.Weather.draw(ctx, Z.zoneArt(G.zone));
  }

  function renderGarage(ctx, lights) {
    const g = G.garage, art = G.art, car = G.car;
    Z.drawGarage(ctx, G.t, lights, g ? g.door : 0);
    const cx = garageCarX(), gy = garageGround();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 2, gy, art.mw + 4, 2);
    Z.drawCar(ctx, art, car, cx, gy, G.t);
    // mecánico trabajando
    if (g && g.repair < 1) {
      const set = Z.SPR.mech[0];
      const mx = cx - 10 + Math.abs(Math.sin(g.t * 0.6)) * (art.mw + 6);
      const f = set.attack[Math.floor(g.t * 6) % set.attack.length].c;
      ctx.save(); ctx.translate(Math.round(mx - set.cx + set.w), Math.round(gy + 10 - set.gy)); ctx.scale(-1, 1); ctx.drawImage(f, 0, 0); ctx.restore();
      if (Math.sin(g.t * 20) > 0) lights.push({ x: mx + 6, y: gy - 8, r: 18, color: '#9ad0ff', a: 0.5 });
      // barra de reparación
      Z.rect(ctx, cx, gy + 16, art.mw, 3, '#1a1014'); Z.rect(ctx, cx, gy + 16, Math.round(art.mw * g.repair), 3, '#c0302a'); Z.rect(ctx, cx, gy + 16, Math.round(art.mw * g.repair), 1, '#ff6a4a');
    }
    FX.draw(ctx, 0, lights);
  }

  Z.carScreenX = carScreenX;
})(window.ZG);
