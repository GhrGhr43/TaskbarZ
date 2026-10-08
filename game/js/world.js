'use strict';
// Mundo: cielos, capas con parallax por zona, carretera, niebla y el garaje.
(function (Z) {
  const W = Z.W, H = Z.H, LW = Z.LW;

  // Perfil de alturas que se repite sin costura (suma de senos con frecuencia entera).
  function profile(rnd, base, amps) {
    const ph = amps.map(() => rnd() * Math.PI * 2);
    const out = new Float32Array(LW);
    for (let x = 0; x < LW; x++) {
      let v = base;
      amps.forEach((a, i) => { v += a[1] * Math.sin((x / LW) * Math.PI * 2 * a[0] + ph[i]); });
      out[x] = v;
    }
    return out;
  }
  function fillProfile(ctx, prof, fill, rim, rim2) {
    for (let x = 0; x < LW; x++) {
      const y = Math.round(prof[x]);
      Z.rect(ctx, x, y, 1, H - y, fill);
      if (rim) {
        const prev = Math.round(prof[(x + LW - 1) % LW]);
        Z.px(ctx, x, y, rim);
        if (rim2 && prev > y) for (let k = y + 1; k <= Math.min(prev, y + 2); k++) Z.px(ctx, x, k, rim2);
      }
    }
  }
  const wrapDraw = (fn, x, w) => { fn(x); if (x - w < 0) fn(x + LW); if (x + w > LW) fn(x - LW); };

  function pine(ctx, cx, baseY, h, fill, rim) {
    for (let i = 0; i < h; i++) {
      const y = baseY - h + i;
      const tier = i % 4;
      const half = Math.max(0, Math.round((i / h) * h * 0.3 - tier * 0.55));
      Z.rect(ctx, cx - half, y, half * 2 + 1, 1, fill);
      if (rim && half > 0 && i % 4 !== 3) Z.px(ctx, cx - half, y, rim);
    }
    Z.rect(ctx, cx, baseY, 1, 3, fill);
  }
  function stars(ctx, rnd, n, maxY) {
    const list = [];
    for (let i = 0; i < n; i++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * maxY), b = rnd();
      Z.px(ctx, x, y, b > 0.85 ? '#ffffff' : b > 0.5 ? '#a8b0d8' : '#5a6090');
      if (b > 0.93) list.push([x, y]);
    }
    return list;
  }
  function building(ctx, x, w, top, fill, rim, rnd, winLit, winDim) {
    Z.rect(ctx, x, top, w, H - top, fill);
    // remate roto
    for (let i = 0; i < w; i += 1 + Math.floor(rnd() * 3)) {
      const d = Math.floor(rnd() * 5);
      if (rnd() < 0.35) ctx.clearRect(x + i, top, 2, d);
    }
    Z.rect(ctx, x, top, 1, H - top, rim);
    for (let yy = top + 3; yy < H - 30; yy += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3) {
      const r = rnd();
      if (r < 0.05) Z.px(ctx, xx, yy, winLit); else if (r < 0.3) Z.px(ctx, xx, yy, winDim);
    }
  }
  function carcass(ctx, x, y, col, hi, flipped) {
    // coche abandonado (silueta)
    if (flipped) {
      Z.rect(ctx, x, y - 4, 22, 4, col); Z.rect(ctx, x + 5, y, 12, 3, col);
      Z.disc(ctx, x + 4, y - 5, 2, '#0a0808'); Z.disc(ctx, x + 18, y - 5, 2, '#0a0808');
    } else {
      Z.rect(ctx, x, y - 6, 24, 4, col); Z.rect(ctx, x + 6, y - 10, 12, 4, col);
      Z.rect(ctx, x + 8, y - 9, 4, 2, '#0a0a0e'); Z.rect(ctx, x + 13, y - 9, 4, 2, '#0a0a0e');
      Z.disc(ctx, x + 5, y - 2, 2.5, '#0a0808'); Z.disc(ctx, x + 19, y - 2, 2.5, '#0a0808');
    }
    Z.rect(ctx, x + 1, y - (flipped ? 4 : 10), 22, 1, hi);
  }

  // ---------------- Zonas ----------------
  const BUILD = [];

  BUILD[0] = function () { // Las Afueras: bosque nocturno (como la referencia)
    const rnd = Z.rng(11);
    const [sky, sx] = Z.canvas(W, H);
    Z.ditherV(sx, 0, 0, W, 96, ['#07081a', '#0c0f28', '#151a3c', '#22214a', '#3a2a52', '#6a3a52', '#a85a40']);
    const tw = stars(sx, rnd, 140, 70);
    const L = [];
    // montaña con antena
    let [c, x] = Z.canvas(LW, H);
    const mp = profile(rnd, 62, [[1, 10], [3, 6], [7, 3], [13, 1.5]]);
    fillProfile(x, mp, '#141630', '#2c2e52', '#22244a');
    let peak = 0; for (let i = 0; i < LW; i++) if (mp[i] < mp[peak]) peak = i;
    for (let i = 0; i < 6; i++) Z.px(x, peak, Math.round(mp[peak]) - 1 - i, '#2a2c48');
    L.push({ c, f: 0.06, lights: [{ x: peak, y: Math.round(mp[peak]) - 7, type: 'blink', color: '#ff3a2a' }] });
    // pinos lejanos
    [c, x] = Z.canvas(LW, H);
    const hp = profile(rnd, 86, [[2, 3], [5, 2]]);
    fillProfile(x, hp, '#0e1226', '#1c2440');
    for (let i = 0; i < 70; i++) { const px = Math.floor(rnd() * LW), h = 12 + rnd() * 16; wrapDraw(v => pine(x, v, Math.round(hp[px]) + 2, Math.round(h), '#0e1226', '#232c4c'), px, 8); }
    L.push({ c, f: 0.18 });
    // pinos cercanos
    [c, x] = Z.canvas(LW, H);
    const np = profile(rnd, 94, [[3, 2], [6, 1]]);
    fillProfile(x, np, '#080b18', '#141c32');
    for (let px = 0; px < LW; px += 6 + Math.floor(rnd() * 22)) {
      const h = 20 + rnd() * 30;
      wrapDraw(v => pine(x, v, Math.round(np[px]) + 2, Math.round(h), '#080b18', '#1a2440'), px, 14);
    }
    L.push({ c, f: 0.42 });
    return {
      sky, twinkle: tw, layers: L, fog: '#3a3a6a', fogA: 0.18,
      road: { base: '#1b1c28', noise: ['#202232', '#171824', '#25263a'], edge: '#2a2c3c', dash: '#8aa0d8', verge: ['#16301f', '#1f4229', '#0e2016'], vergeH: '#3f8a52' },
      ambient: '#000000',
    };
  };

  BUILD[1] = function () { // La Autopista Muerta: crepúsculo morado, pasos elevados, coches quemados
    const rnd = Z.rng(22);
    const [sky, sx] = Z.canvas(W, H);
    Z.ditherV(sx, 0, 0, W, 96, ['#0a0718', '#170c2c', '#2c1240', '#4e1a48', '#7a2c44', '#a8483c', '#d07a40']);
    stars(sx, rnd, 60, 40);
    Z.disc(sx, 380, 34, 13, '#e8dcc8'); Z.disc(sx, 384, 31, 11, '#d0c4b0'); Z.disc(sx, 376, 38, 2, '#b8aa98'); Z.disc(sx, 388, 28, 1.5, '#bcae9c');
    const L = [];
    let [c, x] = Z.canvas(LW, H);
    for (let i = 0; i < LW; i += 6 + Math.floor(rnd() * 20)) { const w = 6 + Math.floor(rnd() * 16), top = 58 + Math.floor(rnd() * 20); wrapDraw(v => building(x, v, w, top, '#1a1028', '#2a1a3a', rnd, '#c87838', '#2a1a30'), i, w); }
    L.push({ c, f: 0.07 });
    // paso elevado roto
    [c, x] = Z.canvas(LW, H);
    for (let i = 0; i < LW; i++) {
      const broken = (i > 300 && i < 360) || (i > 760 && i < 800);
      if (!broken) { Z.rect(x, i, 56, 1, 5, '#120a1c'); Z.px(x, i, 56, '#3a2448'); }
      if (i % 90 === 20) { Z.rect(x, i, 61, 7, 40, '#100818'); Z.rect(x, i, 61, 1, 40, '#2c1a3a'); }
    }
    for (let i = 300; i < 306; i++) Z.rect(x, i, 61 + (i - 300), 1, 1, '#120a1c');
    // vallas publicitarias
    for (const bx of [140, 520, 880]) {
      Z.rect(x, bx + 14, 72, 2, 22, '#0c0814');
      Z.rect(x, bx, 58, 32, 15, '#1c1426'); Z.rect(x, bx + 1, 59, 30, 13, '#3a2030');
      Z.rect(x, bx + 3, 61, 12, 4, '#8a3a30'); Z.rect(x, bx + 17, 61, 10, 9, '#2a3a5a'); Z.rect(x, bx + 20, 63, 4, 3, '#b8a080');
      x.clearRect(bx + 22, 66, 8, 6); Z.rect(x, bx + 1, 59, 30, 1, '#5a3a4a');
    }
    L.push({ c, f: 0.2 });
    // farolas + coches quemados
    [c, x] = Z.canvas(LW, H);
    const lights = [];
    for (let i = 30; i < LW; i += 128) {
      Z.rect(x, i, 52, 1, 46, '#0a0612'); Z.rect(x, i, 52, 9, 1, '#0a0612'); Z.rect(x, i + 7, 53, 3, 1, '#2a2030');
      lights.push({ x: i + 8, y: 54, type: 'lamp', color: '#ffb860', broken: rnd() < 0.4 });
    }
    for (let i = 0; i < 9; i++) { const px = Math.floor(rnd() * (LW - 40)); carcass(x, px, 97, '#1a0e14', '#3a2028', rnd() < 0.3); }
    for (let i = 0; i < LW; i += 2) Z.px(x, i, 95, i % 16 < 12 ? '#3a3040' : '#1a1420');
    Z.rect(x, 0, 96, LW, 1, '#1a1420');
    L.push({ c, f: 0.55, lights });
    return {
      sky, twinkle: [], layers: L, fog: '#5a2a5a', fogA: 0.16,
      road: { base: '#24212c', noise: ['#2a2733', '#1e1b26', '#302c3a'], edge: '#3a3646', dash: '#c8a860', verge: ['#1c1420', '#241a28', '#120c16'], vergeH: '#4a3a50' },
    };
  };

  BUILD[2] = function () { // Ciudad Ceniza: verde enfermizo, edificios en ruinas, fuegos
    const rnd = Z.rng(33);
    const [sky, sx] = Z.canvas(W, H);
    Z.ditherV(sx, 0, 0, W, 96, ['#060a08', '#0c1410', '#16201a', '#26301e', '#3e3a20', '#6a4420', '#a0581c']);
    const L = [];
    let [c, x] = Z.canvas(LW, H);
    for (let i = 0; i < LW; i += 4 + Math.floor(rnd() * 14)) { const w = 10 + Math.floor(rnd() * 22), top = 30 + Math.floor(rnd() * 40); wrapDraw(v => building(x, v, w, top, '#0e1612', '#1e2a20', rnd, '#d89040', '#1e2a1c'), i, w); }
    L.push({ c, f: 0.08 });
    [c, x] = Z.canvas(LW, H);
    const lights = [];
    for (let i = 0; i < LW; i += 30 + Math.floor(rnd() * 50)) {
      const w = 22 + Math.floor(rnd() * 30), top = 44 + Math.floor(rnd() * 26);
      wrapDraw(v => building(x, v, w, top, '#0a0f0c', '#24301e', rnd, '#f0a040', '#18201a'), i, w);
      if (rnd() < 0.5) lights.push({ x: i + Math.floor(w / 2), y: top + 2, type: 'fire', size: 3, color: '#ff8a30' });
    }
    L.push({ c, f: 0.26, lights });
    [c, x] = Z.canvas(LW, H);
    const l2 = [];
    for (let i = 0; i < LW; i += 3) { const h = Math.floor(rnd() * 4); Z.rect(x, i, 94 - h, 3, h + 4, '#141614'); Z.px(x, i, 94 - h, '#2c3028'); }
    for (let i = 40; i < LW; i += 150 + Math.floor(rnd() * 80)) {
      Z.rect(x, i, 89, 5, 7, '#3a2a1a'); Z.rect(x, i, 89, 5, 1, '#6a4a2a'); Z.rect(x, i, 92, 5, 1, '#2a1a10');
      l2.push({ x: i + 2, y: 88, type: 'fire', size: 2, color: '#ff9a3a' });
    }
    for (let i = 0; i < 5; i++) { const bx = Math.floor(rnd() * LW); for (let k = 0; k < 16; k++) Z.px(x, bx + k, 92 + (k % 4 === 0 ? -2 : 0), k % 2 ? '#b8a020' : '#1a1a1a'); Z.rect(x, bx, 93, 16, 3, '#2a2a20'); }
    L.push({ c, f: 0.6, lights: l2 });
    return {
      sky, twinkle: [], layers: L, fog: '#4a503a', fogA: 0.2, ash: true,
      road: { base: '#1e1f20', noise: ['#242526', '#18191a', '#2c2c2a'], edge: '#3a3a36', dash: '#a8a070', verge: ['#1a1a16', '#22221c', '#121210'], vergeH: '#3a3a2a' },
    };
  };

  BUILD[3] = function () { // El Páramo Rojo: estilo Mad Max
    const rnd = Z.rng(44);
    const [sky, sx] = Z.canvas(W, H);
    Z.ditherV(sx, 0, 0, W, 96, ['#1c0606', '#3a0c0a', '#6a1a10', '#a03418', '#d06424', '#e89840', '#f0c070']);
    for (let r = 30; r > 16; r -= 4) Z.disc(sx, 300, 74, r, Z.rgba('#ffd27a', 0.12));
    Z.disc(sx, 300, 74, 16, '#ffd890'); Z.disc(sx, 300, 74, 14, '#fff0c0');
    const L = [];
    let [c, x] = Z.canvas(LW, H);
    for (let i = 0; i < 6; i++) {
      const mx = Math.floor(rnd() * LW), w = 40 + Math.floor(rnd() * 80), h = 18 + Math.floor(rnd() * 22);
      wrapDraw(v => {
        for (let k = 0; k < w; k++) {
          const edge = Math.min(k, w - k);
          const yy = 86 - h + Math.max(0, 6 - edge);
          Z.rect(x, v + k, yy, 1, H - yy, '#4a1610');
          if (k > 2 && k < w - 2 && yy === 86 - h) Z.px(x, v + k, yy, '#a04a24');
        }
      }, mx, w);
    }
    L.push({ c, f: 0.07 });
    [c, x] = Z.canvas(LW, H);
    const dp = profile(rnd, 88, [[2, 4], [5, 2], [9, 1]]);
    fillProfile(x, dp, '#6a2a16', '#d0723a', '#a04a24');
    L.push({ c, f: 0.22 });
    [c, x] = Z.canvas(LW, H);
    for (let i = 20; i < LW; i += 70 + Math.floor(rnd() * 90)) {
      const kind = rnd();
      if (kind < 0.4) { // tótem de calaveras
        Z.rect(x, i, 76, 1, 20, '#2a140c');
        for (let k = 0; k < 3; k++) { Z.rect(x, i - 1, 76 + k * 5, 3, 3, '#d8c8a8'); Z.px(x, i - 1, 77 + k * 5, '#1a0c08'); Z.px(x, i + 1, 77 + k * 5, '#1a0c08'); }
      } else if (kind < 0.7) carcass(x, i, 96, '#3a1a10', '#8a4a24', rnd() < 0.5);
      else { // costillar gigante
        for (let k = 0; k < 5; k++) { Z.line(x, i + k * 4, 96, i + k * 4 + 3, 82 + k, 1, '#c8b898'); }
      }
    }
    L.push({ c, f: 0.55 });
    return {
      sky, twinkle: [], layers: L, fog: '#c0603a', fogA: 0.14, dust: true,
      road: { base: '#6a3e24', noise: ['#764a2c', '#5e3420', '#80522e'], edge: '#8a5a34', dash: null, verge: ['#7a4224', '#8a5030', '#5a2c18'], vergeH: '#b06a3a' },
    };
  };

  BUILD[4] = function () { // Zona Cero: catedral de los muertos
    const rnd = Z.rng(55);
    const [sky, sx] = Z.canvas(W, H);
    Z.ditherV(sx, 0, 0, W, 96, ['#030504', '#060c08', '#0a160e', '#122416', '#1c3a1e', '#2a5226', '#3a6a2a']);
    stars(sx, rnd, 50, 50);
    Z.disc(sx, 120, 30, 14, '#5aff8a'); Z.disc(sx, 120, 30, 12, '#020302');
    const L = [];
    let [c, x] = Z.canvas(LW, H);
    const cat = (v) => {
      const b = 92;
      Z.rect(x, v, b - 30, 80, 30, '#050807');
      for (const [tx, th] of [[v + 4, 40], [v + 62, 40], [v + 30, 58]]) {
        Z.rect(x, tx, b - th, 14, th, '#050807');
        for (let k = 0; k < 14; k++) Z.rect(x, tx + 7 - Math.floor(k / 2), b - th - 14 + k, 1 + k, 1, '#050807');
        Z.rect(x, tx + 7, b - th - 20, 1, 6, '#050807'); Z.rect(x, tx + 5, b - th - 18, 5, 1, '#050807');
        Z.px(x, tx + 7, b - th - 14, '#3a6a3a');
      }
      Z.disc(x, v + 37, b - 40, 6, '#5a0a0a'); Z.disc(x, v + 37, b - 40, 4, '#c02020');
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; Z.px(x, v + 37 + Math.cos(a) * 3, b - 40 + Math.sin(a) * 3, '#ff6a4a'); }
      for (let k = 0; k < 6; k++) Z.rect(x, v + 6 + k * 13, b - 24, 2, 6, '#3a0a0a');
    };
    wrapDraw(cat, 600, 90);
    const fp = profile(rnd, 90, [[3, 2], [8, 1]]);
    fillProfile(x, fp, '#060a08', '#1a3a1e');
    L.push({ c, f: 0.06, lights: [{ x: 637, y: 52, type: 'glow', color: '#ff2a2a', r: 16 }] });
    [c, x] = Z.canvas(LW, H);
    for (let i = 10; i < LW; i += 14 + Math.floor(rnd() * 30)) {
      const h = 6 + Math.floor(rnd() * 8);
      Z.rect(x, i, 92 - h, 1, h, '#0a120c'); Z.rect(x, i - 2, 92 - h + 2, 5, 1, '#0a120c');
    }
    const ip = profile(rnd, 92, [[4, 1.5]]);
    fillProfile(x, ip, '#08100a', '#1e3a20');
    L.push({ c, f: 0.24 });
    [c, x] = Z.canvas(LW, H);
    const lights = [];
    for (let i = 60; i < LW; i += 170 + Math.floor(rnd() * 60)) {
      Z.rect(x, i, 50, 2, 46, '#070a08'); Z.rect(x, i, 50, 16, 2, '#070a08'); Z.rect(x, i + 13, 52, 1, 8, '#2a2a20');
      Z.rect(x, i + 10, 60, 7, 9, '#141810'); for (let k = 0; k < 7; k += 2) Z.rect(x, i + 10 + k, 60, 1, 9, '#3a3a2a');
      Z.rect(x, i + 12, 64, 3, 4, '#3a3a30');
      lights.push({ x: i + 40, y: 94, type: 'glow', color: '#4aff6a', r: 10 });
    }
    L.push({ c, f: 0.58, lights });
    return {
      sky, twinkle: [], layers: L, fog: '#2a5a2a', fogA: 0.2, ash: true,
      road: { base: '#18181a', noise: ['#202024', '#121214', '#26262a'], edge: '#2a2a2e', dash: null, verge: ['#0e140e', '#142014', '#0a0e0a'], vergeH: '#2a4a2a' },
    };
  };

  const CACHE = [];
  Z.zoneArt = function (i) {
    i = Math.min(i, BUILD.length - 1);
    if (!CACHE[i]) {
      const a = BUILD[i]();
      // textura de carretera
      const [rt, rx] = Z.canvas(64, H - Z.ROAD_TOP);
      const rr = Z.rng(i * 7 + 3);
      Z.rect(rx, 0, 0, 64, H, a.road.base);
      for (let k = 0; k < 260; k++) Z.px(rx, Math.floor(rr() * 64), Math.floor(rr() * 30), Z.pick(a.road.noise, rr));
      for (let k = 0; k < 4; k++) { const cx = Math.floor(rr() * 60), cy = 4 + Math.floor(rr() * 22); for (let j = 0; j < 6; j++) Z.px(rx, cx + j, cy + (j % 3 === 0 ? 1 : 0), Z.mix(a.road.base, '#000', 0.4)); }
      a.roadTile = rt;
      // borde (hierba, arena...)
      const [vt, vx] = Z.canvas(64, 8);
      for (let xx = 0; xx < 64; xx++) {
        const h = 2 + Math.floor(rr() * 5);
        for (let yy = 8 - h; yy < 8; yy++) Z.px(vx, xx, yy, yy === 8 - h ? a.road.verge[1] : Z.pick([a.road.verge[0], a.road.verge[2]], rr));
      }
      a.vergeTile = vt;
      // niebla
      const [fc, fx] = Z.canvas(LW, 40);
      for (let k = 0; k < 160; k++) {
        const cx = rr() * LW, cy = 10 + rr() * 22, r = 6 + rr() * 16;
        fx.fillStyle = Z.rgba(a.fog, 0.05 + rr() * 0.07);
        for (const off of [0, -LW, LW]) { fx.beginPath(); fx.ellipse(cx + off, cy, r * 2.2, r * 0.6, 0, 0, Math.PI * 2); fx.fill(); }
      }
      a.fogTex = fc;
      CACHE[i] = a;
    }
    return CACHE[i];
  };

  // Luces dinámicas de las capas (farolas, fuegos, balizas).
  function layerLight(ctx, L, sx, t, lightsOut) {
    if (L.type === 'blink') {
      if ((t % 1.6) < 0.8) { Z.px(ctx, sx, L.y, L.color); lightsOut.push({ x: sx, y: L.y, r: 6, color: L.color, a: 0.5 }); }
    } else if (L.type === 'lamp') {
      const on = !L.broken || Math.sin(t * 23 + L.x) > 0.3 && Math.sin(t * 3.1 + L.x) > -0.2;
      if (on) {
        Z.rect(ctx, sx - 1, L.y, 3, 1, '#ffe0a0');
        ctx.fillStyle = Z.rgba(L.color, 0.07);
        ctx.beginPath(); ctx.moveTo(sx - 1, L.y + 1); ctx.lineTo(sx + 2, L.y + 1); ctx.lineTo(sx + 16, Z.ROAD_TOP + 2); ctx.lineTo(sx - 15, Z.ROAD_TOP + 2); ctx.fill();
        lightsOut.push({ x: sx, y: L.y + 2, r: 14, color: L.color, a: 0.35 });
      }
    } else if (L.type === 'fire') {
      const s = L.size;
      for (let k = 0; k < 6 * s; k++) {
        const fx = sx + Math.round((Math.sin(t * 9 + k * 1.7) * 0.5 + (k % 5) - 2) * s * 0.5);
        const fy = L.y - Math.floor(((t * 14 + k * 3.3) % (4 * s)));
        const life = (L.y - fy) / (4 * s);
        Z.px(ctx, fx, fy, life < 0.3 ? '#fff0a0' : life < 0.6 ? '#ffa030' : '#c03a10');
      }
      lightsOut.push({ x: sx, y: L.y - 2, r: 10 + s * 4 + Math.sin(t * 13 + L.x) * 2, color: L.color, a: 0.45 });
    } else if (L.type === 'glow') {
      lightsOut.push({ x: sx, y: L.y, r: L.r + Math.sin(t * 2 + L.x) * 2, color: L.color, a: 0.35 });
    }
  }

  // Dibuja el fondo de una zona. alpha permite el fundido entre zonas.
  Z.drawBackdrop = function (ctx, zi, camX, t, alpha, lightsOut, night) {
    const a = Z.zoneArt(zi);
    ctx.globalAlpha = alpha;
    ctx.drawImage(a.sky, 0, 0);
    for (const [x, y] of a.twinkle) if (Math.sin(t * 3 + x * 7) > 0.6) Z.px(ctx, x, y, '#ffffff');
    if (night && night.id === 'sangre') {
      Z.disc(ctx, 420, 26, 10, '#a01818'); Z.disc(ctx, 423, 24, 8, '#d02a20'); Z.px(ctx, 418, 28, '#801010');
      lightsOut.push({ x: 420, y: 26, r: 26, color: '#ff2020', a: 0.25 });
    }
    for (const L of a.layers) {
      const off = ((camX * L.f) % LW + LW) % LW;
      ctx.drawImage(L.c, -Math.floor(off), 0);
      ctx.drawImage(L.c, LW - Math.floor(off), 0);
      if (L.lights && alpha > 0.5) for (const li of L.lights) {
        let sx = li.x - Math.floor(off);
        if (sx < -30) sx += LW;
        if (sx > -30 && sx < W + 30) layerLight(ctx, li, sx, t, lightsOut);
      }
    }
    // niebla
    const fa = a.fogA * (night && night.id === 'niebla' ? 2.4 : 1);
    ctx.globalAlpha = alpha * Math.min(1, fa * 4);
    const foff = ((camX * 0.5 + t * 6) % LW + LW) % LW;
    ctx.drawImage(a.fogTex, -Math.floor(foff), 62); ctx.drawImage(a.fogTex, LW - Math.floor(foff), 62);
    ctx.globalAlpha = 1;
  };

  Z.drawRoad = function (ctx, zi, camX) {
    const a = Z.zoneArt(zi);
    const off = Math.floor(((camX % 64) + 64) % 64);
    for (let x = -off; x < W; x += 64) {
      ctx.drawImage(a.vergeTile, x, Z.ROAD_TOP - 7);
      ctx.drawImage(a.roadTile, x, Z.ROAD_TOP);
    }
    Z.rect(ctx, 0, Z.ROAD_TOP, W, 1, a.road.edge);
    if (a.road.dash) {
      const doff = Math.floor(((camX % 48) + 48) % 48);
      for (let x = -doff; x < W; x += 48) { Z.rect(ctx, x, 120, 18, 2, Z.mix(a.road.dash, a.road.base, 0.35)); Z.rect(ctx, x + 1, 120, 16, 1, a.road.dash); }
    }
    // sombra inferior para dar profundidad
    for (let y = 124; y < H; y++) { ctx.fillStyle = `rgba(0,0,0,${(y - 123) * 0.12})`; ctx.fillRect(0, y, W, 1); }
  };

  // ---------------- Garaje ----------------
  let GAR = null;
  function buildGarage() {
    const rnd = Z.rng(99);
    const [c, x] = Z.canvas(W, H);
    // pared de ladrillo
    Z.rect(x, 0, 0, W, H, '#140e12');
    for (let y = 0; y < 100; y += 4) for (let i = (y / 4) % 2 ? -4 : 0; i < W; i += 8) {
      const col = Z.pick(['#24161a', '#2a1a1c', '#1e1216', '#2e1c1a'], rnd);
      Z.rect(x, i, y, 7, 3, col); Z.rect(x, i, y, 7, 1, Z.mix(col, '#5a3a3a', 0.25));
    }
    // suelo de hormigón con manchas
    Z.ditherV(x, 0, 100, W, 28, ['#2a2628', '#1e1a1c', '#141012']);
    for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(rnd() * W, 106 + rnd() * 18, 8 + rnd() * 14, 2 + rnd() * 2, 0, 0, Math.PI * 2); x.fill(); }
    Z.rect(x, 0, 100, W, 1, '#3a3234');
    // panel de herramientas
    Z.rect(x, 30, 30, 70, 34, '#3a2a1e'); Z.rect(x, 30, 30, 70, 1, '#5a4430');
    for (let i = 0; i < 9; i++) { const tx = 34 + i * 7; Z.rect(x, tx, 34 + (i % 3) * 2, 1, 10 + (i % 4) * 3, '#8a8a96'); Z.rect(x, tx - 1, 34 + (i % 3) * 2, 3, 2, '#5a5a66'); }
    Z.rect(x, 36, 54, 22, 6, '#7a1a1a'); Z.rect(x, 62, 52, 30, 8, '#4a4a54');
    // neumáticos apilados
    for (let i = 0; i < 4; i++) { Z.rect(x, 116, 100 - (i + 1) * 6, 18, 6, '#141216'); Z.rect(x, 117, 100 - (i + 1) * 6, 16, 1, '#2a2830'); Z.rect(x, 122, 102 - (i + 1) * 6, 6, 2, '#0a090c'); }
    // altar con velas (toque gótico)
    Z.rect(x, 150, 70, 26, 30, '#1a1014'); Z.rect(x, 150, 70, 26, 1, '#3a2a2a');
    Z.rect(x, 160, 52, 6, 14, '#2a1a10'); Z.rect(x, 157, 56, 12, 2, '#2a1a10');
    Z.rect(x, 159, 62, 8, 6, '#c8b8a0'); Z.px(x, 160, 64, '#140a0a'); Z.px(x, 164, 64, '#140a0a');
    for (const cx of [153, 157, 168, 172]) Z.rect(x, cx, 66, 2, 4 + (cx % 3), '#d8c8a8');
    // puerta enrollable (salida)
    Z.rect(x, 440, 28, 72, 72, '#2a2c34');
    for (let y = 30; y < 100; y += 3) Z.rect(x, 440, y, 72, 1, '#1a1c22');
    Z.rect(x, 436, 24, 4, 76, '#0e0e12'); Z.rect(x, 436, 24, 76, 4, '#0e0e12');
    // cartel
    Z.rect(x, 230, 8, 60, 12, '#1a1012'); Z.rect(x, 231, 9, 58, 10, '#2a1418');
    // ascensor hidráulico
    Z.rect(x, 200, 104, 120, 3, '#4a4a52'); Z.rect(x, 200, 104, 120, 1, '#8a8a96');
    Z.rect(x, 214, 107, 4, 14, '#2a2a30'); Z.rect(x, 302, 107, 4, 14, '#2a2a30');
    GAR = { c };
  }
  Z.drawGarage = function (ctx, t, lightsOut, doorOpen) {
    if (!GAR) buildGarage();
    ctx.drawImage(GAR.c, 0, 0);
    // letrero de neón
    const on = Math.sin(t * 17) > -0.8 || Math.sin(t * 2.3) > 0;
    ctx.font = '8px monospace';
    if (on) { lightsOut.push({ x: 260, y: 14, r: 34, color: '#ff2a3a', a: 0.22 }); }
    // velas
    for (const cx of [154, 158, 169, 173]) {
      const fy = 64 - (cx % 3) - 1 + (Math.sin(t * 11 + cx) > 0 ? 0 : 1);
      Z.px(ctx, cx, fy, '#ffd070'); Z.px(ctx, cx, fy - 1, '#ff8a30');
      lightsOut.push({ x: cx, y: fy, r: 10 + Math.sin(t * 9 + cx) * 2, color: '#ff9a40', a: 0.12 });
    }
    // lámpara colgante que se balancea
    const sw = Math.sin(t * 1.3) * 0.12, lx = 260 + Math.sin(sw) * 34, ly = 2 + Math.cos(sw) * 34;
    Z.line(ctx, 260, 0, lx, ly, 1, '#0a0a0c');
    Z.rect(ctx, lx - 4, ly, 9, 3, '#2a2a30'); Z.rect(ctx, lx - 1, ly + 3, 3, 1, '#fff0c0');
    ctx.fillStyle = 'rgba(255,220,150,0.04)';
    ctx.beginPath(); ctx.moveTo(lx - 3, ly + 3); ctx.lineTo(lx + 3, ly + 3); ctx.lineTo(lx + 70, 104); ctx.lineTo(lx - 70, 104); ctx.fill();
    lightsOut.push({ x: lx, y: ly + 6, r: 90, color: '#ffd8a0', a: 0.28 });
    // puerta
    if (doorOpen > 0) {
      const hgt = Math.round(72 * doorOpen);
      Z.ditherV(ctx, 440, 28 + 72 - hgt, 72, hgt, ['#0c0f28', '#22214a', '#6a3a52']);
      Z.rect(ctx, 440, 28 + 72 - hgt - 1, 72, 1, '#4a4c58');
      lightsOut.push({ x: 476, y: 90, r: 40 * doorOpen, color: '#8a90ff', a: 0.25 });
    }
    // texto del cartel con fuente bitmap
    Z.pixText(ctx, on ? 'ZG' : '', 254, 11, '#ff4a5a');
  };
})(window.ZG);
