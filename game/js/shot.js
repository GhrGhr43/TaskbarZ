'use strict';
// Disparo a la barra de tareas: si dejas el ratón quieto 1 s sobre un icono de la barra, aparece una mira;
// al hacer clic, el icono revienta en sangre y trozos de píxeles. Es solo un efecto visual dibujado encima:
// mientras la mira está activa, el clic lo recibe el juego y nunca llega a la barra ni a tus programas.
(function (Z) {
  const desk = window.taskbarz;
  const HOLD = 1;            // segundos quieto para armar la mira
  const CROP = 20;           // lado del trozo de barra que revienta (píxeles del juego)
  const BLOOD = Z.BLOOD;
  const HI = ['#e0404a', '#ff6a5a'];

  const S = Z.Shot = { armed: false, parts: [], stains: [], holes: [], flashes: [] };
  let spent = false, px = -1, py = -1, ax = -99, ay = -99, inside = false, hold = 0, through = null, t = 0;

  const out = document.getElementById('screen');
  const toGame = (e) => [e.clientX * out.width / window.innerWidth, e.clientY * out.height / window.innerHeight];
  const barTop = () => out.height - Math.max(8, Math.round(Z.TB_ROWS || 24));
  const overButton = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return !!(el && el.closest('button')); };
  const setThrough = (on) => { if (on !== through) { through = on; if (desk) desk.setClickThrough(on); } };
  const disarm = () => { S.armed = false; hold = 0; };
  // El arma del tirador también se queda el clic cuando el ratón está encima de un zombi (js/weapons.js).
  let overBtn = false;
  const claimed = () => !!(Z.Gun && Z.Gun.claims(px, py));

  document.addEventListener('mousemove', (e) => {
    if (!Z.overlay) return;
    [px, py] = toGame(e);
    inside = true;
    const btn = overBtn = overButton(e);
    if (Math.abs(px - ax) > 2 || Math.abs(py - ay) > 2) {
      if (!S.armed || Math.abs(px - ax) > 5 || Math.abs(py - ay) > 5) { disarm(); ax = px; ay = py; spent = false; }
    }
    if (btn || py < barTop()) disarm();
    setThrough(!(btn || S.armed || claimed()));
  });
  document.addEventListener('mouseleave', () => { inside = false; disarm(); setThrough(true); });

  document.addEventListener('mousedown', (e) => {
    if (!Z.overlay || !S.armed || e.button !== 0) return;
    e.preventDefault();
    fire(ax, ay);
    disarm(); spent = true;   // para volver a disparar hay que mover el ratón
    setThrough(true);
  });

  // Copia de lo que hay debajo (el icono real), si la app de escritorio puede capturar la pantalla.
  async function grab(cx, cy) {
    if (!desk || !desk.grab) return null;
    const r = window.innerWidth / out.width;
    const rect = { x: Math.round((cx - CROP / 2) * r), y: Math.round((cy - CROP / 2) * r), width: Math.round(CROP * r), height: Math.round(CROP * r) };
    try {
      const url = await desk.grab(rect, CROP);
      if (!url) return null;
      const img = new Image(); img.src = url; await img.decode();
      const [c, x] = Z.canvas(CROP, CROP); x.drawImage(img, 0, 0, CROP, CROP);
      return x.getImageData(0, 0, CROP, CROP);
    } catch (err) { return null; }
  }

  async function fire(cx, cy) {
    cx = Math.round(cx); cy = Math.round(cy);
    if (Z.Gun) Z.Gun.fxShot(cx, cy);   // el tirador apunta y dispara al icono
    const floor = out.height - 1;
    S.flashes.push({ x: cx, y: cy, life: 0.12 });
    const data = await (S.pending || Promise.resolve(null));
    S.pending = null;
    const x0 = cx - CROP / 2, y0 = cy - CROP / 2;
    if (data) {
      // Color de fondo de la barra (media de los bordes) para tapar el hueco del icono.
      let r = 0, g = 0, b = 0, n = 0;
      const at = (i, j) => (j * CROP + i) * 4;
      for (let i = 0; i < CROP; i++) for (const j of [0, CROP - 1]) { const k = at(i, j); r += data.data[k]; g += data.data[k + 1]; b += data.data[k + 2]; n++; }
      r /= n; g /= n; b /= n;
      // Hueco irregular del color de la barra, con borde de sangre: el icono parece arrancado.
      const mask = [];
      for (let j = 0; j < CROP; j++) for (let i = 0; i < CROP; i++) {
        const d = Math.hypot(i - CROP / 2 + 0.5, j - CROP / 2 + 0.5), R = CROP / 2 - 1 - Math.random() * 1.6;
        if (d < R - 1.5) mask.push([i, j, 0]); else if (d < R) mask.push([i, j, 1]);
      }
      S.holes.push({ x: x0, y: y0, c: `rgb(${r | 0},${g | 0},${b | 0})`, edge: Z.pick(BLOOD), mask, life: 3.5 });
      // Cada píxel distinto del fondo sale despedido como un trozo, cada vez más manchado de sangre.
      for (let j = 0; j < CROP; j++) for (let i = 0; i < CROP; i++) {
        const k = at(i, j), d = data.data;
        if (Math.abs(d[k] - r) + Math.abs(d[k + 1] - g) + Math.abs(d[k + 2] - b) < 40) continue;
        const dx = x0 + i - cx, dy = y0 + j - cy, dist = Math.hypot(dx, dy) + 0.5;
        const pow = Z.rr(40, 130) / Math.sqrt(dist);
        S.parts.push({ k: 'chunk', x: x0 + i, y: y0 + j, vx: dx / dist * pow * 6 + Z.rr(-20, 20), vy: dy / dist * pow * 4 - Z.rr(30, 90), g: 240,
          c: `rgb(${d[k]},${d[k + 1]},${d[k + 2]})`, stain: Z.pick(BLOOD), tint: 0, life: Z.rr(1.2, 2.4), floor });
      }
    }
    // Chorro de sangre: niebla roja, gotas gordas y algún coágulo.
    for (let i = 0; i < 26; i++) S.parts.push({ k: 'mist', x: cx + Z.rr(-2, 2), y: cy + Z.rr(-2, 2), vx: Z.rr(-60, 60), vy: Z.rr(-60, 20), g: 30, life: Z.rr(0.25, 0.6), max: 0.6, c: Z.pick(HI) });
    for (let i = 0; i < 70; i++) {
      const a = Z.rr(0, Math.PI * 2), sp = Z.rr(20, 150);
      S.parts.push({ k: 'drop', x: cx, y: cy, vx: Math.cos(a) * sp * 1.4, vy: Math.sin(a) * sp - 50, g: 300, life: 3, c: Z.pick(BLOOD), s: Math.random() < 0.2 ? 2 : 1, floor });
    }
    for (let i = 0; i < 4; i++) S.stains.push({ x: cx + Z.ri(-5, 5), y: cy + Z.ri(-5, 5), w: Z.ri(2, 4), h: Z.ri(1, 3), c: Z.pick(BLOOD), life: 6, drip: 0, len: Z.ri(3, 9) });
  }

  // Dibuja encima del juego (en píxeles del juego, sobre el lienzo de salida).
  S.frame = function (o, dt) {
    t += dt;
    if (Z.overlay && inside && !spent && !S.armed && py >= barTop()) {
      hold += dt;
      if (hold >= HOLD) { S.armed = true; setThrough(false); S.pending = grab(ax, ay); }   // la copia se hace al fijar la mira
    }
    if (Z.overlay && inside) setThrough(!(overBtn || S.armed || claimed()));   // los zombis pasan bajo el ratón quieto
    if (!Z.overlay) { disarm(); S.parts.length = 0; S.holes.length = 0; S.stains.length = 0; return; }
    for (const h of S.holes) {
      h.life -= dt;
      o.globalAlpha = Math.min(1, h.life / 0.5);
      for (const [i, j, e] of h.mask) Z.rect(o, h.x + i, h.y + j, 1, 1, e ? h.edge : h.c);
    }
    o.globalAlpha = 1;
    S.holes = S.holes.filter(h => h.life > 0);
    for (const s of S.stains) {
      s.life -= dt; s.drip = Math.min(s.len, s.drip + dt * 6);
      o.globalAlpha = Math.min(1, s.life / 1.5);
      Z.rect(o, s.x, s.y, s.w, s.h, s.c);
      Z.rect(o, s.x + (s.w >> 1), s.y + s.h, 1, Math.round(s.drip), s.c);
      Z.rect(o, s.x + (s.w >> 1), s.y + s.h + Math.round(s.drip), 1, 1, '#c0202c');
    }
    o.globalAlpha = 1;
    S.stains = S.stains.filter(s => s.life > 0);
    for (const p of S.parts) {
      p.life -= dt;
      if (p.k === 'mist') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9;
        o.globalAlpha = Math.max(0, p.life / p.max) * 0.7; Z.rect(o, Math.round(p.x), Math.round(p.y), 1, 1, p.c); continue;
      }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y >= p.floor) {
        p.y = p.floor;
        if (p.k === 'drop') { p.vx *= 0.3; p.vy = 0; p.g = 0; if (!p.landed) { p.landed = true; if (Math.random() < 0.3) S.stains.push({ x: Math.round(p.x) - 1, y: p.floor - 1, w: Z.ri(2, 4), h: 1, c: p.c, life: 5, drip: 0, len: 0 }); } }
        else { p.vy *= -0.35; p.vx *= 0.6; }
      }
      if (p.k === 'chunk') p.tint = Math.min(0.75, p.tint + dt * 0.8);
      o.globalAlpha = Math.min(1, p.life / 0.4);
      const c = p.k === 'chunk' ? (p.tint > 0.4 ? p.stain : p.c) : p.c;
      Z.rect(o, Math.round(p.x), Math.round(p.y), p.s || 1, p.s || 1, c);
    }
    o.globalAlpha = 1;
    S.parts = S.parts.filter(p => p.life > 0 && p.x > -10 && p.x < out.width + 10);
    for (const f of S.flashes) {
      f.life -= dt;
      Z.rect(o, f.x - 3, f.y, 7, 1, '#fff6d0'); Z.rect(o, f.x, f.y - 3, 1, 7, '#fff6d0'); Z.rect(o, f.x - 1, f.y - 1, 3, 3, '#ffffff');
    }
    S.flashes = S.flashes.filter(f => f.life > 0);
    // Mira: se va cerrando mientras apuntas y late en rojo cuando está lista.
    if (inside && !spent && py >= barTop() && (S.armed || hold > 0.25)) {
      const x = Math.round(ax), y = Math.round(ay);
      const k = S.armed ? 2 : Math.round(2 + (1 - hold / HOLD) * 5);
      const c = S.armed ? (Math.sin(t * 14) > 0 ? '#ff3040' : '#c0202c') : 'rgba(230,220,200,0.8)';
      Z.rect(o, x - k - 3, y, 3, 1, c); Z.rect(o, x + k + 1, y, 3, 1, c);
      Z.rect(o, x, y - k - 3, 1, 3, c); Z.rect(o, x, y + k + 1, 1, 3, c);
      if (S.armed) Z.rect(o, x, y, 1, 1, c);
    }
  };
})(window.ZG);
