'use strict';
// Arte intercambiable.
// Todo lo que se ve tiene un nombre de ranura ('zombi.walker', 'coche.sedan', 'zona.afueras', 'icono.llave'...).
// Por defecto se dibuja con código (sprites.js, world.js, icons.js). Un pack de arte (carpeta game/art/<pack>/
// con su pack.js y sus PNG) puede sustituir cualquier ranura sin tocar el juego: lo que el pack no trae
// se sigue dibujando con código. Guía completa: docs/ARTE.md.
//
// Packs activos: game/art/packs.js (ZG.ART_PACKS) o, para probar, ?arte=pack1,pack2 en la URL (?arte=ninguno los apaga).
// Todo se carga y se recorta una sola vez al arrancar; durante la partida no cuesta nada.
(function (Z) {
  const SLOTS = {};        // ranura -> definición (la del último pack que la trae), con las imágenes ya cargadas
  const LOADED = [];       // packs cargados
  const waiting = [];
  let ready = false, current = null;

  const IMG_RE = /\.(png|webp|gif|jpe?g)$/i;

  const A = Z.Art = {
    // Lo llama cada art/<pack>/pack.js.
    pack(def) {
      if (!current) { console.warn('[arte] pack() fuera de la carga de un pack'); return; }
      current.def = def;
    },
    // Avisa cuando los packs están listos (o no hay ninguno).
    ready(cb) { if (ready) cb(); else waiting.push(cb); },
    // Definición de una ranura en el pack, o null si se dibuja con código.
    get(key) { return SLOTS[key] || null; },
    has(key) { return !!SLOTS[key]; },
    // Primera ranura que exista de la lista (para variantes: 'pieza.techo.escopeta@sedan', 'pieza.techo.escopeta').
    first(...keys) { for (const k of keys) if (SLOTS[k]) return SLOTS[k]; return null; },
    packs: () => LOADED.map(p => p.id),
    slots: () => Object.keys(SLOTS),

    // Imagen suelta lista para drawImage (lienzo), o null. La ranura puede ser 'ruta.png' o { imagen: 'ruta.png' }.
    image(key) {
      const d = SLOTS[key];
      if (!d) return null;
      return toCanvas(d.imagen || d);
    },

    // Juego de animaciones de un personaje. base es el de código (contrato en sprites.js:
    // { w, h, cx, gy, col, hip, neck, walk, attack, idle, stage(n) }); se devuelve uno con la misma forma.
    actor(key, v, base) {
      const d = SLOTS[key];
      if (!d) return base;
      try { return actorSet(d, v, base); } catch (e) { console.warn('[arte] ' + key + ': ' + e.message); return base; }
    },

    // Tira de cuadros en una fila: { imagen, cuadro: [w, h], cuadros: n, fila: 0 } -> [lienzo, ...]
    strip(key) {
      const d = SLOTS[key];
      if (!d) return null;
      const img = d.imagen || d;
      const [fw, fh] = d.cuadro || [img.height, img.height];
      const n = d.cuadros || Math.max(1, Math.floor(img.width / fw));
      const out = [];
      for (let i = 0; i < n; i++) out.push(crop(img, i * fw, (d.fila || 0) * fh, fw, fh));
      return out;
    },

    // Recorta una imagen del pack a un lienzo (para los módulos que montan su propio arte).
    crop: (img, x, y, w, h) => crop(img, x, y, w, h),
    canvas: (img) => toCanvas(img),
  };

  function toCanvas(img) {
    if (!img || typeof img === 'string') return null;
    if (img instanceof HTMLCanvasElement) return img;
    if (img._cv) return img._cv;
    const [c, x] = Z.canvas(img.width, img.height);
    x.drawImage(img, 0, 0);
    return (img._cv = c);
  }
  function crop(img, sx, sy, w, h) {
    const [c, x] = Z.canvas(w, h);
    x.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    return c;
  }
  const isFrames = (v) => Array.isArray(v) && v.length > 0 && v[0] && v[0].c instanceof HTMLCanvasElement;

  // Hoja de personaje: cada fila es una animación y cada columna un cuadro.
  // Por cada variante hay un bloque de filas; dentro, una tanda de filas por etapa de heridas (sano, tocado,
  // destrozado...). anims: { walk: 8, attack: 6, idle: 1 }  o  { walk: { fila: 0, cuadros: 8 } }
  // Devuelve la misma forma que sprites.js: { w, h, cx, gy, col, hip, neck, walk, attack, idle, stage(n) }.
  function actorSet(d, v, base) {
    const [w, h] = d.cuadro;
    const [cx, gy] = d.pie || [Math.floor(w / 2), h - 3];
    const perVariant = Array.isArray(d.imagen);
    const nv = perVariant ? d.imagen.length : (d.variantes || 1);
    const vi = v % nv;
    const img = perVariant ? d.imagen[vi] : d.imagen;
    const names = Object.keys(d.anims);
    const nst = Math.max(1, d.etapas || 1);
    const pal = Array.isArray(d.paleta) ? d.paleta[vi % d.paleta.length] : d.paleta;
    const bst = (n) => (base && base.stage ? base.stage(n) : base) || {};
    // Filas de la cadera y los hombros (cortes al morir): del pack o a la misma altura sobre los pies que el de código.
    const fromFeet = (k) => (base && base[k] != null ? gy - (base.gy - base[k]) : Math.round(gy * 0.6));
    const stages = [];
    const set = {
      w, h, cx, gy, art: true,
      col: pal ? Object.assign({}, base && base.col, pal) : base && base.col,
      hip: d.cadera != null ? d.cadera : fromFeet('hip'),
      neck: d.cuello != null ? d.cuello : fromFeet('neck'),
      loseArm: d.pierdeBrazo != null ? !!(Array.isArray(d.pierdeBrazo) ? d.pierdeBrazo[vi % d.pierdeBrazo.length] : d.pierdeBrazo) : !!(base && base.loseArm),
      stage(n) {
        n = Math.max(0, Math.min((Z.WOUNDS || 1) - 1, n | 0));
        if (!stages[n]) stages[n] = buildStage(n);
        return stages[n];
      },
    };
    function buildStage(n) {
      const s = Math.min(n, nst - 1);   // si el pack trae menos etapas, se usa la más dañada que tenga
      const block = (perVariant ? 0 : vi * nst * names.length) + s * names.length;
      const st = {};
      names.forEach((name, i) => {
        const a = d.anims[name], k = typeof a === 'number' ? a : a.cuadros, row = block + (typeof a === 'number' ? i : a.fila);
        st[name] = [];
        for (let j = 0; j < k; j++) st[name].push({ c: crop(img, j * w, row * h, w, h) });
      });
      // Animaciones que el juego tiene y el pack no trae: se reaprovecha el dibujo de código, encajado por los pies.
      const b = bst(n);
      for (const name in b) {
        if (st[name] || !isFrames(b[name])) continue;
        st[name] = b[name].map(f => {
          const [c, x] = Z.canvas(w, h);
          x.drawImage(f.c, cx - base.cx, gy - base.gy);
          return { c };
        });
      }
      return st;
    }
    return Object.assign(set, set.stage(0));
  }

  // ---------- Carga ----------
  function packList() {
    const q = new URLSearchParams(location.search).get('arte');
    if (q !== null) return q === 'ninguno' || q === '' ? [] : q.split(',').map(s => s.trim()).filter(Boolean);
    return Array.isArray(Z.ART_PACKS) ? Z.ART_PACKS : [];
  }
  function loadScript(src) {
    return new Promise((res) => {
      const s = document.createElement('script');
      s.src = src; s.onload = () => res(true); s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  }
  function loadImage(src) {
    return new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = () => { console.warn('[arte] no se pudo cargar ' + src); res(null); };
      i.src = src;
    });
  }
  // Recorre la definición y cambia cada 'algo.png' por la imagen cargada.
  async function resolve(node, dir) {
    if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) node[i] = await resolveVal(node[i], dir); return node; }
    for (const k in node) node[k] = await resolveVal(node[k], dir);
    return node;
  }
  async function resolveVal(v, dir) {
    if (typeof v === 'string' && IMG_RE.test(v)) return loadImage(dir + v);
    if (v && typeof v === 'object') return resolve(v, dir);
    return v;
  }
  // Una ranura con alguna imagen que no cargó se descarta entera (se queda el arte de código).
  function broken(node) {
    if (node === null) return true;
    if (Array.isArray(node)) return node.some(broken);
    if (node && typeof node === 'object' && !(node instanceof HTMLImageElement)) return Object.values(node).some(broken);
    return false;
  }
  // Abierto como archivo en un navegador normal, las imágenes "manchan" el lienzo y el juego no podría leer píxeles.
  function tainted(img) {
    try { const [, x] = Z.canvas(1, 1); x.drawImage(img, 0, 0); x.getImageData(0, 0, 1, 1); return false; } catch (e) { return true; }
  }

  async function start() {
    for (const id of packList()) {
      if (!/^[\w-]+$/.test(id)) { console.warn('[arte] nombre de pack no válido: ' + id); continue; }
      const dir = 'art/' + id + '/';
      current = { id };
      const ok = await loadScript(dir + 'pack.js');
      const pk = current; current = null;
      if (!ok || !pk.def) { console.warn('[arte] no encuentro ' + dir + 'pack.js'); continue; }
      const sprites = await resolve(pk.def.sprites || {}, dir);
      let first = null, n = 0;
      for (const key in sprites) {
        if (broken(sprites[key])) { console.warn('[arte] ' + key + ': falta alguna imagen, se usa el arte de código'); continue; }
        SLOTS[key] = sprites[key]; n++;
        if (!first) first = findImage(sprites[key]);
      }
      if (first && tainted(first)) {
        console.warn('[arte] el navegador bloquea las imágenes abiertas como archivo: usa la app (npm start) o un servidor local. Se usa el arte de código.');
        for (const k in SLOTS) delete SLOTS[k];
        LOADED.length = 0;
        break;
      }
      LOADED.push({ id, name: pk.def.nombre || id, slots: n });
    }
    if (LOADED.length) console.info('[arte] packs: ' + LOADED.map(p => p.id + ' (' + p.slots + ')').join(', '));
    ready = true;
    while (waiting.length) waiting.shift()();
  }
  function findImage(node) {
    if (node instanceof HTMLImageElement) return node;
    if (node && typeof node === 'object') for (const k in node) { const r = findImage(node[k]); if (r) return r; }
    return null;
  }
  start();
})(window.ZG);
