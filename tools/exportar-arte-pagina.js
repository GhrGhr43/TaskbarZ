// Se ejecuta dentro del juego (lo inyecta tools/exportar-arte.js). Convierte todo el arte de código
// en un pack de PNG con el mismo formato que leen los packs de arte, para pintar encima.
// Devuelve { files: { 'ruta.png': base64 }, def } y el script de Electron lo escribe en disco.
(() => {
  const Z = window.ZG, files = {}, S = {};
  const png = (c) => c.toDataURL('image/png').split(',')[1];
  const put = (path, c) => { files[path] = png(c); return path; };
  const isFrames = (v) => Array.isArray(v) && v.length && v[0] && v[0].c;

  // Recorta lo que no es transparente; devuelve null si está vacío.
  function trim(c) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return null;
    const [o, x] = Z.canvas(x1 - x0 + 1, y1 - y0 + 1);
    x.drawImage(c, -x0, -y0);
    return { c: o, x: x0, y: y0 };
  }

  // ---- Personajes: una fila por animación; por variante, una tanda de filas por etapa de heridas ----
  for (const t in Z.SPR) {
    const sets = Z.SPR[t], s0 = sets[0];
    const nst = s0.stage ? (Z.WOUNDS || 1) : 1;
    const stage = (set, n) => (set.stage ? set.stage(n) : set);
    const st0 = stage(s0, 0);
    const names = Object.keys(st0).filter(k => isFrames(st0[k]));
    const cols = Math.max(...names.map(n => st0[n].length));
    const [c, x] = Z.canvas(cols * s0.w, sets.length * nst * names.length * s0.h);
    sets.forEach((set, v) => { for (let n = 0; n < nst; n++) { const st = stage(set, n); names.forEach((nm, i) => st[nm].forEach((f, k) => x.drawImage(f.c, k * s0.w, ((v * nst + n) * names.length + i) * s0.h))); } });
    const anims = {}; names.forEach(n => { anims[n] = st0[n].length; });
    const slot = Z.actorSlot(t);
    S[slot] = {
      imagen: put('personajes/' + slot.replace('.', '-') + '.png', c),
      cuadro: [s0.w, s0.h], pie: [s0.cx, s0.gy], variantes: sets.length, etapas: nst, anims,
      cadera: s0.hip, cuello: s0.neck, pierdeBrazo: sets.map(s => !!s.loseArm),
      paleta: sets.map(s => s.col),
    };
  }

  // ---- Coches: carrocería por pintura, piezas por chasis y ruedas ----
  const EMPTY = { motor: 'm4', ruedas: 'gastadas', frontal: 'parachoques', blindaje: 'ninguno', techo: 'nada', deposito: 'lata' };
  const wheelR = {};
  for (const ch of Object.keys(Z.CHASSIS_ART)) {
    const eq = Object.assign({ chasis: ch }, EMPTY);
    let ref = null;
    const imgs = {};
    for (const p of Z.PAINTS) {
      const a = Z.carBody(eq, p.id);
      ref = ref || a;
      imgs[p.id] = put('coches/' + ch + '-' + p.id + '.png', a.canvas);
    }
    S['coche.' + ch] = {
      imagen: imgs,
      origen: [ref.OX, ref.OY], largo: ref.mw, radio: ref.r, ruedas: ref.wheels,
      puntos: { frontal: ref.front, techo: ref.roof, capo: ref.hood, trasera: ref.rear, conductor: ref.driver },
      ventanas: ref.windows, placa: ref.plate,
    };
    for (const slot of Z.CAR_PART_SLOTS) for (const part of Z.PARTS[slot]) {
      if (part.id === EMPTY[slot]) continue;
      const pe = Object.assign({}, eq, { [slot]: part.id });
      const r = Z.carParts(ref, pe), tr = trim(r.canvas);
      if (!tr) continue;
      const d = { imagen: put('piezas/' + ch + '/' + slot + '-' + part.id + '.png', tr.c), pos: [tr.x, tr.y] };
      if (slot === 'techo' && r.muzzle) d.boca = [r.muzzle[0] - tr.x, r.muzzle[1] - tr.y];
      if (slot === 'frontal' && r.saw) d.sierra = [r.saw[0] - tr.x, r.saw[1] - tr.y];
      S['pieza.' + slot + '.' + part.id + '@' + ch] = d;
    }
    for (const w of Z.PARTS.ruedas) (wheelR[w.id] = wheelR[w.id] || {})[ch] = ref.r + (w.id === 'militares' ? 1 : 0);
  }
  for (const style in wheelR) {
    // El radio más repetido va como rueda general; los chasis con otro radio llevan la suya (@chasis).
    const count = {}; for (const ch in wheelR[style]) count[wheelR[style][ch]] = (count[wheelR[style][ch]] || 0) + 1;
    const main = +Object.keys(count).sort((a, b) => count[b] - count[a])[0];
    const strip = (r, name) => {
      const fr = Z.wheelFrames(r, style), w = fr[0].width;
      const [c, x] = Z.canvas(w * fr.length, fr[0].height);
      fr.forEach((f, i) => x.drawImage(f, i * w, 0));
      return { imagen: put('ruedas/' + name + '.png', c), cuadro: [w, fr[0].height], cuadros: fr.length };
    };
    S['rueda.' + style] = strip(main, style);
    for (const ch in wheelR[style]) if (wheelR[style][ch] !== main) S['rueda.' + style + '@' + ch] = strip(wheelR[style][ch], style + '@' + ch);
  }

  // ---- Fondos de cada zona ----
  Z.ZONES.forEach((zone, i) => {
    const a = Z.zoneArt(i), dir = 'fondos/' + zone.id + '/';
    S['zona.' + zone.id] = {
      cielo: put(dir + 'cielo.png', a.sky), estrellas: a.twinkle,
      capas: a.layers.map((L, k) => {
        const d = { imagen: put(dir + 'capa' + (k + 1) + '.png', L.c), paralaje: L.f };
        if (L.lights) d.luces = L.lights;
        return d;
      }),
      carretera: put(dir + 'carretera.png', a.roadTile), arcen: put(dir + 'arcen.png', a.vergeTile), niebla: put(dir + 'niebla.png', a.fogTex),
    };
  });

  // ---- Garaje (solo el interior de 512 de ancho) ----
  {
    const [c, x] = Z.canvas(512, Z.H);
    // Fondo estático: las velas, la lámpara, el neón y la puerta se animan aparte (adornos / puerta).
    x.drawImage(Z.garageBackdrop(), -Z.GOX, 0);
    S.garaje = { imagen: put('garaje/fondo.png', c), adornos: true, puerta: [440, 28, 72, 72] };
  }

  // ---- Iconos de la interfaz ----
  for (const n in Z.ICONS) {
    const c = Z.iconCanvas(n);
    if (c && !S['icono.' + n]) S['icono.' + n] = put('iconos/' + n + '.png', c);
  }

  return { files, def: { nombre: 'Plantilla (arte de código exportado)', sprites: S } };
})();
