'use strict';
// Utilidades compartidas: resolución, aleatoriedad, color, dithering y contorno de sprites.
window.ZG = window.ZG || {};
(function (Z) {
  // Parámetros de la URL: ?modo=barra&w=960&h=56 (los pone la app de escritorio).
  let qs = null;
  try { qs = new URLSearchParams(location.search); } catch (e) { qs = new URLSearchParams(''); }
  const qw = parseInt(qs.get('w'), 10), qh = parseInt(qs.get('h'), 10);
  Z.TASKBAR = qs.get('modo') === 'barra';   // la app arrancó sobre la barra de tareas
  Z.W = qw >= 320 && qw <= 2000 ? qw : 512;  // resolución interna (ancho)
  Z.H = 128;
  Z.VIEW_H = qh >= 40 && qh <= 128 ? qh : 56; // filas visibles en modo barra (la parte baja del mundo)
  Z.VIEW_TOP = Z.H - Z.VIEW_H;
  Z.TB_ROWS = parseInt(qs.get('tb'), 10) || 24;   // filas del juego que tapan la barra de tareas real
  Z.overlay = false;  // true mientras se dibuja como capa transparente sobre la barra
  Z.PXM = 4;          // píxeles por metro
  Z.ROAD_TOP = 98;
  Z.GROUND = 114;     // línea donde apoyan las ruedas del coche
  Z.CAR_X = 96;       // posición en pantalla del coche
  Z.LW = Z.W > 900 ? 2048 : 1024; // ancho de las capas de fondo (se repiten); siempre >= W

  Z.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };
  Z.rr = (a, b) => a + Math.random() * (b - a);
  Z.ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  Z.pick = (arr, r) => arr[Math.floor((r ? r() : Math.random()) * arr.length)];
  Z.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  Z.lerp = (a, b, t) => a + (b - a) * t;
  Z.wpick = function (weights) { // {clave: peso}
    let tot = 0; for (const k in weights) tot += weights[k];
    let r = Math.random() * tot;
    for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
    return Object.keys(weights)[0];
  };

  Z.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return [c, x];
  };

  Z.rgb = function (hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  Z.hex = function (r, g, b) {
    return '#' + ((1 << 24) | (Z.clamp(r | 0, 0, 255) << 16) | (Z.clamp(g | 0, 0, 255) << 8) | Z.clamp(b | 0, 0, 255)).toString(16).slice(1);
  };
  Z.mix = function (a, b, t) {
    const A = Z.rgb(a), B = Z.rgb(b);
    return Z.hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  Z.rgba = function (hex, a) { const c = Z.rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  Z.BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  // Degradado vertical con tramado ordenado (sin colores intermedios, estilo pixel art).
  Z.ditherV = function (ctx, x0, y0, w, h, stops) {
    const id = ctx.getImageData(x0, y0, w, h), d = id.data;
    const cols = stops.map(Z.rgb), n = cols.length - 1;
    for (let y = 0; y < h; y++) {
      const t = (y / Math.max(1, h - 1)) * n;
      const i = Math.min(n - 1, Math.floor(t)), f = t - i;
      for (let x = 0; x < w; x++) {
        const c = (f * 16 > Z.BAYER[y & 3][x & 3] + 0.5) ? cols[i + 1] : cols[i];
        const k = (y * w + x) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
    }
    ctx.putImageData(id, x0, y0);
  };

  // Contorno oscuro de 1px + luz de borde en el lado izquierdo (los faros del coche).
  Z.outline = function (c, rimHex, rimAmt, outHex) {
    const x = c.getContext('2d'), w = c.width, h = c.height;
    const id = x.getImageData(0, 0, w, h), d = id.data, src = new Uint8ClampedArray(d);
    const out = Z.rgb(outHex || '#07050c');
    const rim = rimHex ? Z.rgb(rimHex) : null;
    const A = (i, j) => (i < 0 || j < 0 || i >= w || j >= h) ? 0 : src[(j * w + i) * 4 + 3];
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
      const k = (y * w + i) * 4;
      if (src[k + 3] === 0) {
        if (A(i - 1, y) || A(i + 1, y) || A(i, y - 1) || A(i, y + 1)) { d[k] = out[0]; d[k + 1] = out[1]; d[k + 2] = out[2]; d[k + 3] = 255; }
      } else if (rim && (!A(i - 1, y) || !A(i, y - 1))) {
        const t = !A(i - 1, y) ? rimAmt : rimAmt * 0.5;
        d[k] += (rim[0] - d[k]) * t; d[k + 1] += (rim[1] - d[k + 1]) * t; d[k + 2] += (rim[2] - d[k + 2]) * t;
      }
    }
    x.putImageData(id, 0, 0);
  };

  // Silueta de un color (para destello al recibir golpe).
  Z.silhouette = function (c, color) {
    const [s, x] = Z.canvas(c.width, c.height);
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return s;
  };

  // Primitivas de píxel.
  Z.px = function (ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  Z.rect = function (ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  Z.line = function (ctx, x0, y0, x1, y1, w, c) {
    ctx.fillStyle = c;
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 1.4));
    const o = (w - 1) / 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      ctx.fillRect(Math.round(x0 + dx * t - o), Math.round(y0 + dy * t - o), w, w);
    }
  };
  Z.disc = function (ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) {
      if (x * x + y * y <= r * r) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  };

  Z.fmt = function (n) {
    n = Math.floor(n);
    if (n < 1000) return '' + n;
    const u = ['K', 'M', 'B', 'T'];
    let i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
  };

  // Fuente bitmap 3x5 para números flotantes (+$12, x2...).
  const GLYPH = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001111', '+': '000010111010000', '$': '011110010011110',
    'K': '101110100110101', 'M': '101111111101101', 'B': '110101110101110', 'x': '000101010101000',
    '.': '000000000000010', '-': '000000111000000', '!': '010010010000010', 'm': '000110111101101',
    '%': '101001010100101',
  };
  Z.pixText = function (ctx, str, x, y, color, shadow) {
    let cx = Math.round(x);
    y = Math.round(y);
    for (const ch of str) {
      const g = GLYPH[ch];
      if (g) {
        for (let i = 0; i < 15; i++) if (g[i] === '1') {
          const gx = cx + (i % 3), gy = y + ((i / 3) | 0);
          if (shadow) { ctx.fillStyle = shadow; ctx.fillRect(gx + 1, gy + 1, 1, 1); }
          ctx.fillStyle = color; ctx.fillRect(gx, gy, 1, 1);
        }
      }
      cx += 4;
    }
  };
  Z.pixTextW = (str) => str.length * 4 - 1;
})(window.ZG);
