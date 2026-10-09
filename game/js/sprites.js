'use strict';
// Sprites procedurales: zombis y conductor (marionetas pixeladas), ruedas y coches compuestos.
(function (Z) {
  const RIM = '#9aa8e8';

  // ---------- Marioneta humanoide (mira a la izquierda) ----------
  function humanoid(ctx, o) {
    const s = o.s || 1, p = o.phase * Math.PI * 2, C = o.col;
    const legL = o.leg * s, T = legL / 2, SH = legL / 2;
    const lw = Math.max(1, Math.round(o.limbW * s)), aw = Math.max(1, Math.round(o.armW * s));
    const moving = o.mode === 'walk' || o.mode === 'run';
    const bob = moving ? Math.abs(Math.cos(p)) * (o.mode === 'run' ? 1.2 : 0.8) * s : (o.mode === 'attack' ? Math.abs(Math.sin(p * 2)) * 0.6 : 0);
    const lean = o.lean + (o.mode === 'attack' ? 0.15 : 0);
    const hipX = o.cx, hipY = o.gy - legL * 0.95 + bob;

    function leg(off, colB, boot) {
      let a, bend;
      if (o.mode === 'attack') { a = off ? 0.32 : -0.22; bend = 0.25; }
      else if (o.mode === 'idle') { a = off ? 0.08 : -0.06; bend = 0.05; }
      else { a = Math.sin(p + off) * o.stride; bend = Math.max(0, Math.sin(p + off + Math.PI / 2)) * o.stride * 1.5; }
      const kx = hipX - Math.sin(a) * T, ky = hipY + Math.cos(a) * T;
      const b = a - bend;
      const fx = kx - Math.sin(b) * SH, fy = Math.min(o.gy, ky + Math.cos(b) * SH);
      Z.line(ctx, hipX, hipY, kx, ky, lw, colB);
      Z.line(ctx, kx, ky, fx, fy, lw, colB);
      Z.rect(ctx, fx - 1 - (lw > 1 ? 1 : 0), fy, lw + 1, 1, boot);
    }
    const TL = o.torso * s;
    const shX = hipX - Math.sin(lean) * TL, shY = hipY - Math.cos(lean) * TL;
    const UA = o.UA * s, FA = o.FA * s;

    function arm(k, col, back) {
      let ex, ey, hx, hy;
      if (o.arms === 'swing' && o.mode !== 'attack') {
        const a = Math.sin(p + k) * 1.1;
        ex = shX - Math.sin(a) * UA; ey = shY + 1 + Math.cos(a) * UA;
        const b = a + 1.1;
        hx = ex - Math.sin(b) * FA; hy = ey + Math.cos(b) * FA;
      } else if (o.arms === 'hang' && o.mode !== 'attack') {
        const a = 0.2 + Math.sin(p + k) * 0.3;
        ex = shX - Math.sin(a) * UA; ey = shY + 1 + Math.cos(a) * UA;
        const b = a + 0.25;
        hx = ex - Math.sin(b) * FA; hy = ey + Math.cos(b) * FA;
      } else {
        let a;
        if (o.mode === 'attack') a = -0.55 + Math.sin(p * 2 + k * 1.7) * 0.75;
        else if (o.mode === 'idle') a = 1.2;
        else a = -0.05 + Math.sin(p + k) * 0.18;
        ex = shX - Math.cos(a) * UA; ey = shY + 1 + Math.sin(a) * UA;
        const b = a + 0.2 + Math.sin(p * 0.5 + k) * 0.12;
        hx = ex - Math.cos(b) * FA; hy = ey + Math.sin(b) * FA;
      }
      Z.line(ctx, shX, shY + 1, ex, ey, aw, col);
      Z.line(ctx, ex, ey, hx, hy, aw, back ? C.skinD : C.skin);
      if (!back && o.claws) Z.px(ctx, hx - 1, hy, C.skinD);
    }

    // Brazo y pierna del fondo (más oscuros), torso, pierna, cabeza y brazo delanteros.
    if (!o.noBackArm) arm(Math.PI, C.topD, true);
    leg(Math.PI, C.bottomD, '#0e0c10');
    Z.line(ctx, hipX, hipY, shX, shY, Math.max(1, Math.round(o.torsoW * s)), C.top);
    const tw = Math.max(1, Math.round(o.torsoW * s));
    Z.line(ctx, hipX + Math.floor(tw / 2), hipY - 1, shX + Math.floor(tw / 2), shY + 1, 1, C.topD);
    if (o.belly) {
      const mx = (hipX + shX) / 2 - 1.5 * s, my = (hipY + shY) / 2 + 0.5;
      Z.disc(ctx, mx, my, o.belly * s, C.skin);
      Z.disc(ctx, mx + 1, my + 1.5, o.belly * s * 0.6, C.skinD);
      Z.px(ctx, mx - 2, my - 1, C.pus || C.skin); Z.px(ctx, mx + 1, my - 2, C.pus || C.skin);
    }
    if (o.stains) for (const st of o.stains) Z.px(ctx, shX + st[0], shY + st[1], st[2]);
    // cinturón / cadera
    Z.rect(ctx, hipX - Math.floor(tw / 2), hipY - 1, tw, 2, C.bottom);
    leg(0, C.bottom, '#16121a');

    // cabeza
    const hw = Math.round(o.headW * s), hh = Math.round(o.headH * s);
    const hx = Math.round(shX - hw / 2 - 1 - lean * 2), hy = Math.round(shY - hh + (o.mode === 'attack' ? 1 : 0));
    Z.rect(ctx, hx + 1, hy + hh - 1, Math.max(1, hw - 2), 2, C.skinD); // cuello
    Z.rect(ctx, hx, hy, hw, hh, o.helmet ? C.helmet : C.skin);
    if (o.helmet) {
      Z.rect(ctx, hx, hy + 1, Math.ceil(hw / 2) + 1, 2, C.visor);
      Z.px(ctx, hx, hy + 1, '#e0ecff');
      Z.rect(ctx, hx - 1, hy - 1 + hh, hw + 2, 1, C.helmet);
    } else {
      Z.rect(ctx, hx, hy, hw, 1, C.hair);
      Z.rect(ctx, hx + hw - 1, hy, 1, Math.max(1, hh - 2), C.hair);
      Z.rect(ctx, hx + 1, hy + hh - 1, Math.max(1, hw - 2), 1, C.skinD);
      if (C.eye) { Z.px(ctx, hx, hy + 1, C.eye); if (s > 1.2) Z.px(ctx, hx + 1, hy + 1, C.eye); }
      Z.px(ctx, hx, hy + hh - 1, C.mouth || '#2a0a0e');
      if (o.drool) Z.px(ctx, hx, hy + hh, '#8a1420');
    }
    // Heridas (1: tocado, 2: destrozado). Se pintan encima del cuerpo con los puntos de la marioneta.
    const wd = o.wound || 0;
    if (wd >= 1) {
      const BL = '#8a1420', BD = '#5a0a12', tx = Math.round(shX), ty = Math.round(shY);
      Z.rect(ctx, tx - 1, ty + 2, 2, 2, BL); Z.px(ctx, tx, ty + 4, BD); Z.px(ctx, tx + 1, ty + 1, BD);   // mancha en el pecho
      Z.px(ctx, hx, hy + hh, BL); Z.px(ctx, hx, hy + hh + 1, BD);                                     // sangre por la boca
      Z.px(ctx, hipX - 1, hipY + 2, BD);                                                               // gotea por la pierna
    }
    if (wd >= 2) {
      const tx = Math.round(shX), ty = Math.round(shY);
      if (!o.helmet) { Z.rect(ctx, hx + 1, hy, 2, 1, '#c01c2c'); Z.px(ctx, hx + 2, hy, '#e0d4b8'); }  // brecha en la cabeza
      else { Z.px(ctx, hx + 1, hy + 1, '#1a2238'); Z.px(ctx, hx + 2, hy + 2, '#e0ecff'); }              // visera rota
      for (let i = 0; i < 3; i++) Z.px(ctx, tx + (i & 1), ty + 2 + i, '#d8cbb0');                       // costillas al aire
      Z.rect(ctx, hipX - 1, hipY + 1, 1, Math.round(legL * 0.6), '#6a0e16');
      if (o.belly) { Z.disc(ctx, (hipX + shX) / 2 - 1.5 * s, (hipY + shY) / 2 + 1, o.belly * s * 0.45, '#5a0a12'); Z.px(ctx, (hipX + shX) / 2 - 2, (hipY + shY) / 2, '#9ac02a'); }
    }
    const armless = o.missingArm || (wd >= 2 && o.loseArm);
    if (!armless) arm(0, C.top, false);
    else if (wd >= 2 && o.loseArm) { Z.px(ctx, shX - 1, shY + 1, '#c01c2c'); Z.px(ctx, shX - 1, shY + 2, '#6a0e16'); }   // muñón
    if (o.shield && wd < 2) {
      const sx = Math.round(shX - UA - 2), sy = Math.round(shY - 2);
      Z.rect(ctx, sx, sy, 2, Math.round(12 * s), C.shield);
      Z.rect(ctx, sx, sy, 1, Math.round(12 * s), '#7a88aa');
      Z.rect(ctx, sx, sy + 5, 2, 1, '#c8b860');
    }
    return { shX, shY, hx, hy };
  }
  Z.humanoid = humanoid;

  const BODY = {
    walker: { leg: 8, torso: 7, torsoW: 3, limbW: 2, armW: 1, headW: 4, headH: 4, UA: 3.5, FA: 3.5, lean: 0.2, stride: 0.5, arms: 'reach', claws: 1, drool: 1 },
    runner: { leg: 8.5, torso: 6.5, torsoW: 3, limbW: 2, armW: 1, headW: 4, headH: 4, UA: 3.5, FA: 3, lean: 0.55, stride: 0.95, arms: 'swing' },
    bloater: { leg: 7, torso: 7, torsoW: 5, limbW: 2, armW: 2, headW: 4, headH: 4, UA: 3.5, FA: 3, lean: 0.05, stride: 0.32, arms: 'reach', belly: 4.5 },
    riot: { leg: 8, torso: 7, torsoW: 4, limbW: 2, armW: 2, headW: 5, headH: 4, UA: 3, FA: 3, lean: 0.12, stride: 0.45, arms: 'reach', helmet: 1, shield: 1 },
    brute: { s: 1.55, leg: 8, torso: 8, torsoW: 5, limbW: 2.2, armW: 2, headW: 4, headH: 4, UA: 5, FA: 5, lean: 0.4, stride: 0.4, arms: 'hang', claws: 1 },
    mech: { leg: 8, torso: 7, torsoW: 3, limbW: 2, armW: 1, headW: 4, headH: 4, UA: 3.5, FA: 3.5, lean: 0.1, stride: 0.5, arms: 'reach' },
    driver: { leg: 8, torso: 7, torsoW: 3, limbW: 2, armW: 1, headW: 4, headH: 4, UA: 3.5, FA: 3.5, lean: 0.08, stride: 0.6, arms: 'swing' },
  };
  const PAL = {
    walker: () => ({ skin: '#7d8c6a', skinD: '#56604a', top: Z.pick(['#4a3b52', '#5a4632', '#2f4048', '#6b2a2a', '#5a5a60']), bottom: Z.pick(['#2b2a3a', '#3a3226', '#25303a', '#2e2a24']), hair: Z.pick(['#1d1a16', '#3a2a1a', '#56504a']), eye: '#e8d27a' }),
    runner: () => ({ skin: '#8a8f78', skinD: '#64695a', top: Z.pick(['#7a2f2f', '#3d4a5f', '#5f5a3a']), bottom: Z.pick(['#22222c', '#3a2e2e']), hair: Z.pick(['#14100c', '#4a3222']), eye: '#ff5a3c' }),
    bloater: () => ({ skin: '#7f8f4a', skinD: '#55652c', top: Z.pick(['#a09a80', '#7f8f4a']), bottom: '#3a3428', hair: '#2a2a1a', eye: '#d8e070', pus: '#c9c060' }),
    riot: () => ({ skin: '#7a8270', skinD: '#596050', top: '#1f2433', bottom: '#1a1e2a', hair: '#111', helmet: '#2a3044', visor: '#5a78a8', shield: '#3a4560' }),
    brute: () => ({ skin: '#6b6f5e', skinD: '#4a4e40', top: Z.pick(['#3b2f2a', '#2a2f3b']), bottom: '#2a2620', hair: '#141210', eye: '#ff2a2a' }),
    mech: () => ({ skin: '#b88a64', skinD: '#8a6444', top: '#2a3a5a', bottom: '#24324e', hair: '#8a8a8a', eye: '#1a1010', mouth: '#6a3a2a' }),
    driver: () => ({ skin: '#c49a74', skinD: '#94704e', top: '#5b3a24', bottom: '#2a2a35', hair: '#2a1a12', eye: '#1a1010', mouth: '#6a3a2a' }),
  };
  function finishPal(c) { c.topD = Z.mix(c.top, '#05030a', 0.4); c.bottomD = Z.mix(c.bottom, '#05030a', 0.45); return c; }

  // ---------- Juegos de sprites de personajes ----------
  // Contrato (para poder cambiar el arte por dibujos hechos a mano sin tocar el resto del juego):
  //   Z.SPR[tipo][variante] = { w, h, cx, gy, col, hip, neck, walk, attack, idle, stage(n) }
  //   · w, h: tamaño de cada cuadro; (cx, gy): punto de apoyo (entre los pies) dentro del cuadro.
  //   · hip, neck: filas de la cadera y de los hombros (cortes al morir).
  //   · col: colores principales (los usan cadáveres y trozos: top, bottom, skin, hair, helmet…).
  //   · walk / attack / idle: listas de cuadros { c } con c = canvas o imagen, mirando a la izquierda.
  //   · stage(n): los mismos cuadros con heridas; n = 0 sano, 1 tocado, 2 destrozado (Z.WOUNDS).
  // Un juego dibujado a mano solo tiene que devolver esa misma forma: js/art.js lo hace con las hojas de
  // los packs de game/art/ (ranuras 'zombi.<tipo>' y 'humano.<tipo>', ver docs/ARTE.md).
  Z.WOUNDS = 3;
  const SPR = {};
  function makeSet(type, variant) {
    const b = BODY[type], big = (b.s || 1) > 1.2;
    const w = big ? 46 : 30, h = big ? 46 : 30, cx = Math.floor(w / 2), gy = h - 3;
    const r = Z.rng(variant * 977 + type.length * 131);
    const col = finishPal(PAL[type]());
    const stains = [];
    if (type !== 'driver' && type !== 'mech') {
      const n = 2 + Math.floor(r() * 4);
      for (let i = 0; i < n; i++) stains.push([Math.floor(r() * 3) - 1, 1 + Math.floor(r() * 6), r() < 0.5 ? '#6a0e16' : '#8a1a20']);
    }
    const missingArm = type === 'walker' && r() < 0.25;
    const loseArm = type !== 'riot' && type !== 'bloater' && r() < 0.6;
    function frame(mode, phase, wound) {
      const [c, x] = Z.canvas(w, h);
      humanoid(x, Object.assign({}, b, { cx, gy, phase, mode, col, stains, missingArm, loseArm, wound }));
      Z.outline(c, RIM, 0.22);
      return { c };
    }
    // Las heridas se dibujan la primera vez que hacen falta (así arrancar cuesta lo mismo que antes).
    const stages = [];
    // Filas de los hombros y de la cadera en el cuadro (para descabezar o partir por la mitad al morir).
    const sc = b.s || 1, hip = Math.round(gy - b.leg * 0.95 * sc), neck = Math.round(hip - b.torso * sc);
    const set = { w, h, cx, gy, col, loseArm, hip, neck, stage(n) {
      n = Math.max(0, Math.min(Z.WOUNDS - 1, n | 0));
      if (!stages[n]) {
        const st = { walk: [], attack: [], idle: [] };
        for (let i = 0; i < 8; i++) st.walk.push(frame(type === 'runner' || type === 'driver' ? 'run' : 'walk', i / 8, n));
        for (let i = 0; i < 6; i++) st.attack.push(frame('attack', i / 6, n));
        st.idle.push(frame('idle', 0, n));
        stages[n] = st;
      }
      return stages[n];
    } };
    Object.assign(set, set.stage(0));
    return set;
  }
  Z.zombieSprites = function () {
    for (const t of ['walker', 'runner', 'bloater', 'riot', 'brute']) {
      SPR[t] = [];
      for (let v = 0; v < 4; v++) SPR[t].push(makeSet(t, v + 1));
    }
    SPR.driver = [makeSet('driver', 1)];
    SPR.mech = [makeSet('mech', 1)];
    // Un pack de arte puede sustituir cualquiera de estos juegos (ranuras 'zombi.walker', 'humano.driver'...).
    for (const t in SPR) SPR[t] = SPR[t].map((set, v) => Z.Art.actor(Z.actorSlot(t), v, set));
    Z.SPR = SPR;
  };
  Z.actorSlot = (t) => (t === 'driver' || t === 'mech' ? 'humano.' : 'zombi.') + t;

  // Cadáver tumbado (se pinta en la capa de restos de la carretera).
  Z.drawCorpse = function (ctx, x, y, col, big, flip) {
    const s = big ? 1.5 : 1, L = Math.round(14 * s), d = flip ? -1 : 1;
    const X = (v) => Math.round(x + v * d);
    for (let i = 0; i < L; i++) {
      const c = i < L * 0.45 ? col.bottom : i < L * 0.85 ? col.top : col.skin;
      ctx.fillStyle = Z.mix(c, '#07050c', 0.35);
      ctx.fillRect(X(i - L / 2), y - (i > L * 0.4 ? 2 : 1), 1, i > L * 0.4 ? 2 : 1);
    }
    ctx.fillStyle = '#5a0a12';
    ctx.fillRect(X(-L / 2 - 2), y, L + 5, 1);
  };

  // ---------- Ruedas ----------
  const WHEELS = {};
  function makeWheel(r, style, rot) {
    const ext = style === 'clavos' ? 2 : style === 'todoterreno' ? 1 : 0;
    const size = Math.ceil(2 * (r + ext)) + 4, c = size / 2;
    const [cv, x] = Z.canvas(size, size);
    const id = x.getImageData(0, 0, size, size), d = id.data;
    const tire = style === 'militares' ? 2.6 : style === 'gastadas' ? 1.3 : 1.8;
    const rimCol = Z.rgb(style === 'militares' ? '#5a6048' : style === 'gastadas' ? '#6e6266' : '#7a7684');
    const dark = Z.rgb('#3a3640'), spoke = Z.rgb('#a8a4b2'), hub = Z.rgb('#c8c4d0');
    const tc = Z.rgb('#18161c'), tcl = Z.rgb('#34303c'), stud = Z.rgb('#c8ccd6');
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const dx = px + 0.5 - c, dy = py + 0.5 - c, dd = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      let col = null;
      if (dd <= r) {
        if (dd > r - tire) col = (dy < -dd * 0.55 || dx < -dd * 0.7) ? tcl : tc;
        else if (dd <= 1.2) col = hub;
        else {
          col = dd > r - tire - 1 ? rimCol : dark;
          for (let k = 0; k < 5; k++) if (Math.abs(Math.sin(ang - rot - k * Math.PI * 2 / 5)) * dd < 0.55 && Math.cos(ang - rot - k * Math.PI * 2 / 5) > 0) col = spoke;
        }
      } else if (style === 'todoterreno' && dd <= r + 1 && Math.floor(((ang + rot) / (Math.PI * 2)) * 16 + 16) % 2 === 0) col = tc;
      else if (style === 'clavos' && dd <= r + 2) {
        for (let k = 0; k < 8; k++) if (Math.abs(Math.sin(ang - rot - k * Math.PI / 4)) * dd < 0.6 && Math.cos(ang - rot - k * Math.PI / 4) > 0) col = stud;
      }
      if (col) { const k = (py * size + px) * 4; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; }
    }
    x.putImageData(id, 0, 0);
    Z.outline(cv, RIM, 0.2);
    return cv;
  }
  // Cuadros de la rueda girando. Un pack puede traer 'rueda.<estilo>@<chasis>' o 'rueda.<estilo>'.
  Z.wheelFrames = function (r, style, chasis) {
    const own = Z.Art.has('rueda.' + style + '@' + chasis) ? 'rueda.' + style + '@' + chasis : Z.Art.has('rueda.' + style) ? 'rueda.' + style : null;
    const key = own || r + style;
    if (!WHEELS[key]) {
      WHEELS[key] = own ? Z.Art.strip(own) : [];
      if (!own) for (let i = 0; i < 8; i++) WHEELS[key].push(makeWheel(r, style, (i / 8) * (Math.PI * 2 / 5)));
    }
    return WHEELS[key];
  };

  // ---------- Coches ----------
  // Leyenda: B carrocería, M panel mate, Y franja, W cristal, U cortinas, C cromo, S junta, L faro, R piloto.
  Z.CHASSIS_ART = {
    sedan: {
      map: [
        '..............BBBBBBBBBBBBBBBBB',
        '.............BWWWWWWWWBBWWWWWWWB',
        '............BWWWWWWWWWBBWWWWWWWWB',
        '...........BWWWWWWWWWWBBWWWWWWWWWB',
        '..........BBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        '..BBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBB',
        '.RBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBLL',
        '.RBBBBBBBBBBBBSBBBBBBBBBSBBBBBBBBBBBBBBBBB',
        '.BBBBBBBBBBBBBSBBBBBBBBBSBBBBBBBBBBBBBBBBB',
        '.CCBBBBBBBBBBBSBBBBBBBBBSBBBBBBBBBBBBBBBCC',
        '..CCCBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBCCC',
      ],
      wheels: [[9, 10], [34, 10]], r: 4, front: [42, 7], roof: [22, 0], hood: [35, 4], rear: [1, 8], driver: [28, 1],
      windows: [[13, 1, 9, 3], [24, 1, 9, 3]], plate: [3, 5, 36, 4],
    },
    pickup: {
      map: [
        '........................BBBBBBBBB',
        '.......................BWWWWWWWWBB',
        '......................BWWWWWWWWWWBB',
        '......................BWWWWWWWWWWWBB',
        '.CCCCCCCCCCCCCCCCCCCCBBBBBBBBBBBBBBBBBBB',
        'RBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBLL',
        'RBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBSBBBBBBBBB',
        'BBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBSBBBBBBBBB',
        'BBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBSBBBBBBBBB',
        'CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBCC',
        'CCCBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBCCC',
      ],
      wheels: [[9, 10], [34, 10]], r: 5, front: [42, 6], roof: [28, 0], hood: [37, 4], rear: [0, 7], driver: [28, 1],
      windows: [[23, 1, 10, 3]], plate: [2, 5, 38, 4],
    },
    funebre: {
      matte: '#18141c',
      map: [
        '...BBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        '..BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        '..BMMMMMMMMUUUUUUUUUUUUUUUBBWWWWWB',
        '..BMMMMMMMMUUUUUUUUUUUUUUUBBWWWWWWB',
        '..BMMMCCMMMUUUUUUUUUUUUUUUBBWWWWWWWBB',
        '..BMMCMMMMMUUUUUUUUUUUUUUUBBWWWWWWWWWBBBBBBBBBBB',
        '.RCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCBBB',
        '.RBBBBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBBBBLL',
        '.BBBBBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBBBBBB',
        '.BBBBBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBBBBBB',
        '.BBBBBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBBBBBB',
        '..CCBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBCC',
      ],
      wheels: [[10, 11], [41, 11]], r: 4, front: [51, 8], roof: [18, 0], hood: [44, 5], rear: [1, 8], driver: [31, 2],
      windows: [[28, 2, 7, 4]], plate: [3, 7, 45, 4],
    },
    interceptor: {
      map: [
        '..................BBBBBBBBBBBB',
        '................BBWWWWWWWBWWWWBB',
        '..............BBWWWWWWWWWBWWWWWWBB',
        '.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        'RBBBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBBBBBBB',
        'RBYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYBLL',
        'BBBBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBBBBBBB',
        'CBBBBBBBBBBBBBBBBBBBBBBBBSBBBBBBBBBBBBBBBBBBBBBBCC',
        'CCCBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBCCC',
      ],
      wheels: [[10, 8], [40, 8]], r: 5, front: [50, 5], roof: [23, 0], hood: [40, 3], rear: [0, 5], driver: [27, 1],
      windows: [[16, 1, 9, 2], [26, 1, 6, 2]], plate: [2, 4, 45, 3],
    },
    camion: {
      matte: '#5c5a5e',
      map: [
        '................................................BBBBBBBBBB',
        '...............................................BBWWWWWWWBB',
        '...............................................BWWWWWWWWWB',
        '..MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM....BWWWWWWWWWBB',
        '.MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM...BBBBBBBBBBBBBBBB',
        '.MMCMMMMMMMMMMCMMMMMMMMMMMMMCMMMMMMMMMMMMCMM...BBBBBBBBBBBBBBBBB',
        '.MMCMMMMMMMMMMCMMMMMMMMMMMMMCMMMMMMMMMMMMCMM...BBBBBBBSBBBBBBBLL',
        '.MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM...BBBBBBBSBBBBBBBBB',
        '..MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM....BBBBBBBSBBBBBBBBB',
        'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCBBBBBBBBBBBBBBBCC',
        'RCBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBC',
      ],
      wheels: [[8, 11], [19, 11], [38, 11], [55, 11]], r: 5, front: [64, 7], roof: [52, 0], hood: [60, 4], rear: [0, 9], driver: [52, 1],
      windows: [[48, 1, 9, 3]], plate: [47, 5, 16, 4],
    },
  };

  const isBody = ch => ch !== undefined && 'BMYCSRLU'.indexOf(ch) >= 0;

  // Construye el sprite compuesto del coche con sus piezas estáticas.
  // Un pack de arte puede traer la carrocería ('coche.<chasis>'), cada pieza ('pieza.<hueco>.<id>[@<chasis>]')
  // y cada pegatina ('pegatina.<id>[@<chasis>]'); lo que no traiga se dibuja con código.
  const PART_SLOTS = ['blindaje', 'motor', 'deposito', 'techo', 'frontal'];
  Z.CAR_PART_SLOTS = PART_SLOTS;
  Z.buildCar = function (eq, paintId, decalId) {
    const A = Z.CHASSIS_ART[eq.chasis];
    const paint = Z.PAINTS.find(p => p.id === paintId) || Z.PAINTS[0];
    const P = Z.Art.get('coche.' + eq.chasis);
    const over = {};
    for (const slot of PART_SLOTS) {
      const d = Z.Art.first('pieza.' + slot + '.' + eq[slot] + '@' + eq.chasis, 'pieza.' + slot + '.' + eq[slot]);
      if (d) over[slot] = d;
    }
    let art = procBody(A, eq, paint);
    if (P) art = packBody(P, art, eq, paint);
    const ctx = art.canvas.getContext('2d');
    const dec = Z.Art.first('pegatina.' + decalId + '@' + eq.chasis, 'pegatina.' + decalId);
    if (dec) placeArt(ctx, art, dec, 'pegatina');
    else if (!P || P.pegatinas !== false) drawDecal(ctx, art, decalId, paint);
    drawParts(ctx, art, eq, over);
    for (const slot of PART_SLOTS) if (over[slot]) {
      const d = over[slot], at = placeArt(ctx, art, d, PART_AT[slot]);
      if (d.boca) art.muzzle = [at[0] + d.boca[0], at[1] + d.boca[1]];
      if (d.sierra) art.saw = [at[0] + d.sierra[0], at[1] + d.sierra[1]];
    }
    if (!P) Z.outline(art.canvas, RIM, 0.3);
    finishCar(art, eq);
    return art;
  };
  // Cuerpo del coche sin pegatina ni piezas (el exportador de plantillas también lo usa).
  Z.carBody = function (eq, paintId) {
    const paint = Z.PAINTS.find(p => p.id === paintId) || Z.PAINTS[0];
    const art = procBody(Z.CHASSIS_ART[eq.chasis], eq, paint);
    Z.outline(art.canvas, RIM, 0.3);
    return art;
  };
  // Piezas de código sueltas sobre un lienzo vacío del tamaño del coche (para el exportador).
  Z.carParts = function (art, eq) {
    const [c, x] = Z.canvas(art.W, art.H);
    const a = Object.assign({}, art, { canvas: c, muzzle: null, saw: null });
    drawParts(x, a, eq, {});
    Z.outline(c, RIM, 0.3);
    return { canvas: c, muzzle: a.muzzle, saw: a.saw };
  };

  function procBody(A, eq, paint) {
    const map = A.map, mh = map.length, mw = Math.max(...map.map(r => r.length));
    const cell = (x, y) => (y < 0 || y >= mh) ? '.' : (map[y][x] || '.');
    const OX = 16, OY = 14;
    const W = mw + OX + 30, H = mh + A.r + OY + 4;
    const [cv, ctx] = Z.canvas(W, H);
    const base = paint.base, matte = A.matte || Z.mix(base, '#100c14', 0.6);
    const tone = (c) => ({ L2: Z.mix(c, '#f4ecff', 0.45), L1: Z.mix(c, '#b8c0ff', 0.18), B: c, D1: Z.mix(c, '#1a0c28', 0.35), D2: Z.mix(c, '#0a0410', 0.6) });
    const TB = tone(base), TM = tone(matte), TY = tone(paint.accent);
    const top = [], bot = [];
    for (let x = 0; x < mw; x++) {
      top[x] = -1; bot[x] = -1;
      for (let y = 0; y < mh; y++) if (isBody(cell(x, y)) || cell(x, y) === 'W') { if (top[x] < 0) top[x] = y; bot[x] = y; }
    }
    const bodyPx = [], glassPx = [];
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const ch = cell(x, y); if (ch === '.') continue;
      const above = cell(x, y - 1), below = cell(x, y + 1);
      let col;
      if (ch === 'B' || ch === 'M' || ch === 'Y') {
        const T = ch === 'B' ? TB : ch === 'M' ? TM : TY;
        const f = (y - top[x]) / Math.max(1, bot[x] - top[x] + 1);
        const dz = (x + y) & 1;
        if (!isBody(above) && above !== 'W') col = T.L2;
        else if (above === 'W') col = T.L1;
        else if (f < 0.28) col = T.L1;
        else if (f < 0.4) col = dz ? T.L1 : T.B;
        else if (f < 0.6) col = T.B;
        else if (f < 0.72) col = dz ? T.B : T.D1;
        else if (f < 0.88) col = T.D1;
        else col = T.D2;
        bodyPx.push([x + OX, y + OY]);
      } else if (ch === 'S') col = Z.mix(base, '#05030a', 0.55);
      else if (ch === 'C') col = above !== 'C' ? '#dcd8e4' : below !== 'C' ? '#4a4655' : '#8a8696';
      else if (ch === 'L') col = '#fff4c8';
      else if (ch === 'R') col = (x + y) & 1 ? '#c01c2c' : '#ff5050';
      else if (ch === 'W') {
        col = above !== 'W' ? '#2e3a5c' : ((x + y) % 8 < 2 ? '#3e4c78' : '#141a30');
        glassPx.push([x + OX, y + OY]);
      } else if (ch === 'U') col = above !== 'U' ? '#b08a3a' : (x % 3 === 0 ? '#2a0810' : '#5a1424');
      if (col) Z.rect(ctx, x + OX, y + OY, 1, 1, col);
    }
    // Pasos de rueda.
    for (const [wx, wy] of A.wheels) {
      for (let y = wy - A.r - 3; y < mh; y++) for (let x = wx - A.r - 3; x <= wx + A.r + 3; x++) {
        const dd = Math.hypot(x - wx, y - wy);
        if (dd <= A.r + 1.4 && isBody(cell(x, y))) Z.rect(ctx, x + OX, y + OY, 1, 1, dd > A.r + 0.6 ? '#2a2230' : '#0c0910');
      }
    }
    const P = (p) => [p[0] + OX, p[1] + OY];
    const art = {
      canvas: cv, W, H, OX, OY, mw, mh, r: A.r, paint,
      wheels: A.wheels.map(P), front: P(A.front), roof: P(A.roof), hood: P(A.hood), rear: P(A.rear), driver: P(A.driver),
      windows: A.windows.map(w => [w[0] + OX, w[1] + OY, w[2], w[3]]), contactY: A.wheels[0][1] + OY + A.r,
      plate: [A.plate[0] + OX, A.plate[1] + OY, A.plate[2], A.plate[3]], bodyPx, glassPx, eq,
    };
    return art;
  }

  // Carrocería de un pack. Los puntos de anclaje que no traiga salen de la plantilla de código,
  // así que una imagen del mismo tamaño que la plantilla encaja sin escribir ningún número.
  const PT = { frontal: 'front', techo: 'roof', capo: 'hood', trasera: 'rear', conductor: 'driver' };
  const PART_AT = { blindaje: 'origen', motor: 'capo', deposito: 'techo', techo: 'techo', frontal: 'frontal' };
  function packBody(P, proc, eq, paint) {
    let img = P.imagen;
    if (!(img instanceof HTMLImageElement)) img = img[paint.id] || img._ || Object.values(img)[0];
    const W = Math.max(img.width, proc.W), H = Math.max(img.height, proc.H);
    const [cv, ctx] = Z.canvas(W, H);
    ctx.drawImage(img, 0, 0);
    if (P.pintura) ctx.drawImage(tint(P.pintura, paint.base), 0, 0);
    if (P.acento) ctx.drawImage(tint(P.acento, paint.accent), 0, 0);
    const pts = P.puntos || {};
    const pt = (k) => (pts[k] || proc[PT[k]]).slice();
    const r = P.radio || proc.r;
    const wheels = (P.ruedas || proc.wheels).map(w => w.slice());
    const [OX, OY] = P.origen || [proc.OX, proc.OY];
    const art = {
      canvas: cv, W, H, OX, OY, mw: P.largo || proc.mw, mh: P.alto || proc.mh, r, paint,
      wheels, front: pt('frontal'), roof: pt('techo'), hood: pt('capo'), rear: pt('trasera'), driver: pt('conductor'),
      windows: (P.ventanas || proc.windows).map(w => w.slice()), contactY: wheels[0][1] + r,
      bodyPx: null, glassPx: [], eq, plate: P.placa || proc.plate, decalAt: pts.pegatina || null, fromPack: true,
    };
    art.bodyPx = opaquePx(ctx, W, H) || proc.bodyPx;
    return art;
  }
  // Máscara en gris teñida con el color de la pintura elegida (multiplicar), conservando su transparencia.
  function tint(mask, color) {
    const [c, x] = Z.canvas(mask.width, mask.height);
    x.drawImage(mask, 0, 0);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(mask, 0, 0);
    return c;
  }
  // Píxeles de chapa para abolladuras y sangre: lo opaco sin el borde exterior (el contorno).
  function opaquePx(ctx, W, H) {
    try {
      const d = ctx.getImageData(0, 0, W, H).data, out = [];
      const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (op(x, y) && op(x - 1, y) && op(x + 1, y) && op(x, y - 1) && op(x, y + 1)) out.push([x, y]);
      return out.length ? out : null;
    } catch (e) { return null; }
  }
  function decalPoint(art) {
    if (art.decalAt) return art.decalAt;
    const pl = art.windows.length ? art.windows[art.windows.length - 1] : [art.W / 2, art.OY + 2, 4, 2];
    return [Math.round(pl[0] + 1), Math.round(art.contactY - art.r - 8)];
  }
  // Coloca una imagen del pack sobre el coche: en 'pos' exacta, o con su 'ancla' sobre un punto ('en').
  function placeArt(ctx, art, d, en) {
    const img = d.imagen || d;
    let at;
    if (d.pos) at = d.pos.slice();
    else {
      const name = d.en || en;
      const p = name === 'origen' ? [0, 0] : name === 'pegatina' ? decalPoint(art) : art[PT[name]];
      const a = d.ancla || [0, 0];
      at = [p[0] - a[0], p[1] - a[1]];
    }
    ctx.drawImage(img, at[0], at[1]);
    return at;
  }
  // Listas para daño, sangre y grietas (orden determinista).
  function finishCar(art, eq) {
    const rnd = Z.rng(art.mw * 31 + art.mh);
    art.dentPx = art.bodyPx.slice().sort(() => rnd() - 0.5);
    art.bloodPx = art.bodyPx.slice().sort((a, b) => (b[0] - a[0]) + (b[1] - a[1]) * 0.5 + (rnd() - 0.5) * 12);
    art.cracks = [];
    for (const w of art.windows) {
      let x = w[0] + Math.floor(rnd() * w[2]), y = w[1];
      for (let i = 0; i < w[2] + w[3]; i++) {
        art.cracks.push([x, y]);
        x += rnd() < 0.5 ? 1 : -1; y += rnd() < 0.6 ? 1 : 0;
        if (y >= w[1] + w[3] || x < w[0] || x >= w[0] + w[2]) { x = w[0] + Math.floor(rnd() * w[2]); y = w[1]; }
      }
    }
    art.wheelFrames = Z.wheelFrames(art.r + (eq.ruedas === 'militares' ? 1 : 0), eq.ruedas, eq.chasis);
  }

  function drawDecal(ctx, art, id, paint) {
    const pl = art.windows.length ? art.windows[art.windows.length - 1] : [art.W / 2, art.OY + 2, 4, 2];
    const cx = Math.round(pl[0] + 1), cy = Math.round(art.contactY - art.r - 4);
    const ac = paint.accent;
    if (id === 'rayas') {
      for (const [x, y] of art.bodyPx) if (y === cy - 2 || y === cy) Z.px(ctx, x, y, ac);
    } else if (id === 'calavera') {
      const sk = ['01110', '11111', '10101', '11111', '01010'];
      sk.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') Z.px(ctx, cx + i, cy - 4 + j, ac); }));
    } else if (id === 'cruz') {
      Z.rect(ctx, cx + 2, cy - 5, 1, 6, ac); Z.rect(ctx, cx, cy - 3, 5, 1, ac);
      Z.px(ctx, cx + 2, cy - 6, '#e8c860');
    }
  }

  // Los huecos que trae el pack (skip) se pintan en un lienzo de descarte: así la boca del arma
  // y la sierra se siguen calculando aunque el dibujo venga del pack.
  const SINK = Z.canvas(1, 1)[1];
  function drawParts(ctx, art, eq, skip) {
    const real = ctx;
    const [fx, fy] = art.front, [rx, ry] = art.roof, [hx, hy] = art.hood, [bx, by] = art.rear;
    const steel = '#7d8091', steelL = '#cfd2dc', steelD = '#3c3f4c', iron = '#4a3c36', rust = '#8a4a2a';
    // Blindaje
    ctx = skip.blindaje ? SINK : real;
    if (eq.blindaje === 'chapas' || eq.blindaje === 'placas') {
      for (const [x, y, w, h] of art.windows) {
        const yy = y + Math.max(1, Math.floor(h / 3));
        Z.rect(ctx, x, yy, w, y + h - yy, '#5d5a63');
        Z.rect(ctx, x, yy, w, 1, '#8a8792');
        Z.px(ctx, x + 1, yy + 1, '#2a282e'); Z.px(ctx, x + w - 2, yy + 1, '#2a282e');
        Z.px(ctx, x + Math.floor(w / 2), y + h - 1, '#7a3e22');
      }
    }
    if (eq.blindaje === 'rejas') {
      for (const [x, y, w, h] of art.windows) for (let i = x; i < x + w; i += 2) Z.rect(ctx, i, y, 1, h, i % 4 ? '#3a3740' : '#6a6772');
      for (const [x, y, w] of art.windows) Z.rect(ctx, x, y + 1, w, 1, '#55525c');
    }
    if (eq.blindaje === 'placas') {
      const [px0, py0, pw, ph] = art.plate;
      for (let y = py0 + Math.floor(ph / 2); y < py0 + ph; y++) for (let x = px0; x < px0 + pw; x++) {
        if (art.wheels.some(w => Math.hypot(x - w[0], y - w[1]) < art.r + 1.6)) continue;
        Z.px(ctx, x, y, (x + y) & 1 ? '#4b4d57' : '#575a65');
      }
      const ty = py0 + Math.floor(ph / 2);
      for (let x = px0; x < px0 + pw; x++) if (!art.wheels.some(w => Math.hypot(x - w[0], ty - w[1]) < art.r + 1.6)) Z.px(ctx, x, ty, '#8a8c98');
      for (let x = px0 + 2; x < px0 + pw; x += 6) if (!art.wheels.some(w => Math.abs(x - w[0]) < art.r + 2)) Z.px(ctx, x, ty + 1, '#23242c');
    }
    // Motor: escape / compresor / turbina
    ctx = skip.motor ? SINK : real;
    if (eq.motor === 'v6') Z.rect(ctx, bx - 3, by + 1, 3, 1, '#9a96a4');
    if (eq.motor === 'v8') {
      Z.rect(ctx, hx - 2, hy - 3, 5, 3, '#8a8a96'); Z.rect(ctx, hx - 2, hy - 3, 5, 1, '#cfd0d8');
      Z.rect(ctx, hx - 1, hy - 5, 3, 2, '#1e1e24'); Z.px(ctx, hx, hy - 6, '#3a3a44');
      Z.rect(ctx, bx - 4, by + 2, 5, 1, '#b8b4c4');
    }
    if (eq.motor === 'turbina') {
      Z.rect(ctx, bx - 7, by - 3, 8, 5, '#5a5c68'); Z.rect(ctx, bx - 7, by - 3, 8, 1, '#a8aab8');
      Z.rect(ctx, bx - 8, by - 2, 1, 3, '#1a1a22'); Z.rect(ctx, bx - 3, by - 2, 1, 3, '#8a4a2a');
    }
    // Depósito
    ctx = skip.deposito ? SINK : real;
    if (eq.deposito === 'bidones') {
      for (let i = 0; i < 2; i++) { Z.rect(ctx, rx - 9 + i * 4, ry - 4, 3, 4, '#8a2a20'); Z.rect(ctx, rx - 9 + i * 4, ry - 4, 3, 1, '#c04a30'); Z.px(ctx, rx - 8 + i * 4, ry - 5, '#3a3a40'); }
    }
    if (eq.deposito === 'doble') {
      for (let i = 0; i < 2; i++) { Z.rect(ctx, bx - 4 - i * 4, by - 5, 3, 7, '#4a5a3a'); Z.rect(ctx, bx - 4 - i * 4, by - 3, 3, 1, '#2a3020'); Z.rect(ctx, bx - 4 - i * 4, by - 5, 3, 1, '#7a8a5a'); }
    }
    if (eq.deposito === 'cisterna') {
      Z.rect(ctx, rx - 14, ry - 4, 14, 4, '#9a9aa6'); Z.rect(ctx, rx - 14, ry - 4, 14, 1, '#d8d8e2');
      for (let x = rx - 13; x < rx - 1; x += 3) Z.px(ctx, x, ry - 2, '#d8b020');
    }
    // Arma de techo (montura; el fogonazo se dibuja en tiempo real)
    ctx = skip.techo ? SINK : real;
    if (eq.techo === 'escopeta') {
      Z.rect(ctx, rx - 2, ry - 2, 4, 2, '#2a2830'); Z.rect(ctx, rx + 1, ry - 4, 8, 1, '#5a5a66'); Z.rect(ctx, rx - 1, ry - 3, 3, 1, '#6a4a2a');
      art.muzzle = [rx + 9, ry - 4];
    } else if (eq.techo === 'ametralladora') {
      Z.rect(ctx, rx - 3, ry - 4, 7, 4, '#3e4048'); Z.rect(ctx, rx - 3, ry - 4, 7, 1, '#7a7c88');
      Z.rect(ctx, rx + 3, ry - 7, 1, 6, '#5a5c66'); Z.rect(ctx, rx + 4, ry - 3, 10, 1, '#2a2a30'); Z.rect(ctx, rx + 4, ry - 4, 6, 1, '#5a5c66');
      Z.rect(ctx, rx - 5, ry - 2, 2, 2, '#4a5a2a');
      art.muzzle = [rx + 14, ry - 3];
    } else if (eq.techo === 'lanzallamas') {
      Z.rect(ctx, rx - 6, ry - 4, 7, 3, '#8a1f1f'); Z.rect(ctx, rx - 6, ry - 4, 7, 1, '#d04a3a'); Z.rect(ctx, rx - 7, ry - 3, 1, 1, '#3a3a40');
      Z.rect(ctx, rx + 1, ry - 3, 7, 1, '#4a4a54'); Z.rect(ctx, rx + 8, ry - 4, 1, 3, '#2a2a30');
      art.muzzle = [rx + 9, ry - 3];
    }
    // Frontal
    ctx = skip.frontal ? SINK : real;
    if (eq.frontal === 'pinchos') {
      Z.rect(ctx, fx - 1, fy - 4, 2, 9, '#2a2830');
      for (let i = 0; i < 3; i++) {
        const y0 = fy - 3 + i * 3;
        for (let k = 0; k <= 6; k++) {
          const half = Math.round((1 - k / 6) * 1.2);
          for (let j = -half; j <= half; j++) Z.px(ctx, fx + 1 + k, y0 + j, j < 0 ? steelL : j > 0 ? steelD : steel);
        }
      }
    } else if (eq.frontal === 'ariete') {
      for (let k = 0; k <= 8; k++) {
        const yTop = fy - 6 + Math.round(k * 0.2), yBot = fy + 2 + Math.round(k * 0.15);
        const xx = fx + k;
        const topY = fy - 6 + Math.round(k * 1.1);
        if (k % 2 === 0) Z.rect(ctx, xx, topY, 1, Math.max(1, yBot - topY + 1), k % 4 ? iron : rust);
        Z.px(ctx, xx, topY, '#a06a3a');
        void yTop;
      }
      Z.rect(ctx, fx, fy - 6, 2, 9, '#2a2420');
    } else if (eq.frontal === 'sierra') {
      Z.rect(ctx, fx - 1, fy - 1, 5, 2, '#2a2830');
      art.saw = [fx + 5, fy + 1];
    }
    if (eq.ruedas === 'militares') art.bigWheels = true;
  }

  // Dibuja el coche en ctx (coordenadas del mundo/pantalla). car: estado dinámico.
  Z.drawCar = function (ctx, art, car, x, groundY, t) {
    const ox = Math.round(x - art.OX), oy = Math.round(groundY - art.contactY + (car.bounce || 0));
    const ang = car.angle || 0;
    if (ang) {
      ctx.save();
      const pcx = ox + art.OX + art.mw / 2, pcy = oy + art.contactY - 4;
      ctx.translate(Math.round(pcx), Math.round(pcy)); ctx.rotate(ang); ctx.translate(-Math.round(pcx), -Math.round(pcy));
    }
    if (car.burnt) {
      if (!art.burnt) {
        art.burnt = Z.silhouette(art.canvas, '#120c0c');
        const bx = art.burnt.getContext('2d');
        for (let i = 0; i < 40; i++) { const p = art.bodyPx[(i * 37) % art.bodyPx.length]; Z.px(bx, p[0], p[1], i % 3 ? '#2a1a14' : '#6a2a10'); }
      }
      ctx.drawImage(art.burnt, ox, oy);
    } else {
      ctx.drawImage(art.canvas, ox, oy);
    }
    // conductor
    if (car.driverIn && !car.burnt) {
      const [dx, dy] = art.driver;
      Z.rect(ctx, ox + dx, oy + dy, 3, 3, '#0c0a12'); Z.px(ctx, ox + dx + 2, oy + dy + 1, '#5a4438');
      Z.rect(ctx, ox + dx - 1, oy + dy + 3, 5, 1, '#0c0a12');
    }
    // grietas, abolladuras y sangre
    const dmg = 1 - car.hpFrac;
    if (!car.burnt) {
      if (dmg > 0.35) {
        const n = Math.floor(art.cracks.length * Math.min(1, (dmg - 0.35) * 2));
        for (let i = 0; i < n; i++) Z.px(ctx, ox + art.cracks[i][0], oy + art.cracks[i][1], '#a8b4d8');
      }
      const dn = Math.floor(art.dentPx.length * 0.3 * dmg);
      for (let i = 0; i < dn; i++) Z.px(ctx, ox + art.dentPx[i][0], oy + art.dentPx[i][1], i % 3 === 0 ? '#6a3020' : '#0d0812');
      const bn = Math.min(art.bloodPx.length, Math.floor(car.blood || 0));
      for (let i = 0; i < bn; i++) Z.px(ctx, ox + art.bloodPx[i][0], oy + art.bloodPx[i][1], i % 4 === 0 ? '#c0202c' : '#6a0c16');
    }
    // sierra giratoria
    if (art.saw) {
      const [sx, sy] = art.saw, R = 6, rot = (car.wheelRot || 0) * 3;
      Z.disc(ctx, ox + sx, oy + sy, R, '#7d8091');
      Z.disc(ctx, ox + sx, oy + sy, R - 2, '#a8acb8');
      Z.disc(ctx, ox + sx, oy + sy, 1.2, '#2a2830');
      for (let k = 0; k < 10; k++) {
        const a = rot + k * Math.PI / 5;
        Z.px(ctx, ox + sx + Math.cos(a) * (R + 1), oy + sy + Math.sin(a) * (R + 1), '#dfe2ea');
      }
      if (car.blood > 10) for (let k = 0; k < 4; k++) { const a = rot * 0.7 + k * 1.6; Z.px(ctx, ox + sx + Math.cos(a) * (R - 1), oy + sy + Math.sin(a) * (R - 1), '#8a1420'); }
    }
    // ruedas
    if (!car.lostWheels) {
      const fr = art.wheelFrames, n = fr.length;
      const idx = ((Math.floor((car.wheelRot || 0) * 6.366) % n) + n) % n;
      for (const [wx, wy] of art.wheels) {
        const c = car.burnt ? null : fr[idx];
        if (c) ctx.drawImage(c, Math.round(ox + wx - c.width / 2), Math.round(oy + wy - c.height / 2));
        else Z.disc(ctx, ox + wx, oy + wy, art.r, '#140e0e');
      }
    }
    if (ang) ctx.restore();
    return { ox, oy };
  };
})(window.ZG);
