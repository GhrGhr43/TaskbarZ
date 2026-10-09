'use strict';
// Iconos pixel-art de la interfaz, dibujados con código (sin archivos). Cada letra es un color.
// Uso: ZG.icon('llave')  → <img> listo para meter en el HTML (escala 2 por defecto).
//      ZG.iconCanvas('llave') → lienzo con contorno, para dibujarlo dentro del juego.
(function (Z) {
  const PAL = {
    r: '#b3202a', R: '#e85a50', d: '#6a1018',
    g: '#d9a441', G: '#f6d47a', o: '#8a5a24',
    s: '#8a8a96', S: '#d0d0dc', t: '#4a4a56', h: '#4a4450',
    b: '#e6d9bf', B: '#a39682', n: '#5a3a26', w: '#fff6e0',
    p: '#6a5ad0', P: '#a89cf0', k: '#1a1418',
  };
  const ICONS = Z.ICONS = {
    corazon: [
      '.rrr.rrr.',
      'rRRrrrrrr',
      'rRrrrrrrr',
      'rrrrrrrrd',
      '.rrrrrrd.',
      '..rrrrd..',
      '...rrd...',
      '....d....',
    ],
    bidon: [
      '..tt.tttt.',
      '..ts.t..t.',
      '.ggggggggo',
      '.gGGGGGGgo',
      '.gGoGGoGgo',
      '.gGGooGGgo',
      '.gGGooGGgo',
      '.gGoGGoGgo',
      '.gGGGGGGgo',
      '.ggggggggo',
      '..oooooooo',
    ],
    llave: [
      '.......SS..',
      '......SS..S',
      '......Ss.SS',
      '.......sSSs',
      '......sSss.',
      '.....sSs...',
      '....sSs....',
      '...sSs.....',
      '..sSs......',
      '.sSs.......',
      'ss.........',
    ],
    surtidor: [
      '.rrrrrr...',
      '.rGGGGr...',
      '.rkggkr.t.',
      '.rrrrrr.t.',
      '.rRrrrd..t',
      '.rRbbbd..t',
      '.rRrrrd..t',
      '.rRrrrdt.t',
      '.rRrrrd.tt',
      '.rrrrrd...',
      'ttttttttt.',
    ],
    moneda: [
      '..gggg..',
      '.gGGGGo.',
      'gGGoGGgo',
      'gGGoGggo',
      'gGGoGggo',
      'gGGoGggo',
      '.gggggo.',
      '..oooo..',
    ],
    chasis: [
      '....ppppp.....',
      '...pSSpSSp....',
      '.pppppppppppp.',
      'pPPPPPPPPPPPPp',
      'pppppppppppppp',
      '.tSt......tSt.',
      '..t........t..',
    ],
    motor: [
      '..t..t..t..',
      '.sssssssss.',
      '.sSSSSSSSs.',
      'tssssssssst',
      'tsSsSsSsSst',
      'tssssssssst',
      '.ttttttttt.',
      '..r.....r..',
    ],
    rueda: [
      '...hhhh...',
      '.hhhhhhhh.',
      '.hhSssShh.',
      'hhsSttSshh',
      'hhstSStshh',
      'hhstSStshh',
      'hhsSttSshh',
      '.hhSssShh.',
      '.hhhhhhhh.',
      '...hhhh...',
    ],
    frontal: [
      'tt..........',
      'tsSSSSss....',
      'tssSSSSSSsw.',
      'tsSSSSss....',
      'ts..........',
      'tsSSSSss....',
      'tssSSSSSSsw.',
      'tsSSSSss....',
      'tt..........',
    ],
    blindaje: [
      'ssssssssss',
      'sSSSSSSSSs',
      'sStSSSStSs',
      'sSSSrrSSSs',
      'sSrrrrrrSs',
      'sSSSrrSSSs',
      '.sSSrrSSs.',
      '.sSSrrSSs.',
      '..sSSSSs..',
      '...sSSs...',
      '....ss....',
    ],
    techo: [
      '...ttttt.....',
      '..tsssssttttt',
      '..tSSSSSsssss',
      '..tsssssttttt',
      '....t.t......',
      '...ttttt.....',
      '.ttttttttt...',
    ],
    velocidad: [
      'bb...bb.....',
      '.bb...bb....',
      '..bb...bb...',
      '...bb...bb..',
      '....bb...bb.',
      '...bb...bb..',
      '..bb...bb...',
      '.bb...bb....',
      'bb...bb.....',
    ],
    calavera: [
      '.bbbbbbb.',
      'bbbbbbbbb',
      'bbbbbbbbb',
      'bkkbbbkkb',
      'bkkbbbkkb',
      'bbbbkbbbb',
      '.bbbbbbb.',
      '..bkbkb..',
      '..bbbbb..',
    ],
    bala: [
      '..G..',
      '.GGg.',
      '.GGg.',
      '.Ggg.',
      'ooooo',
      '.ggo.',
      '.ggo.',
      '.ggo.',
      '.ggo.',
      '.ggo.',
      'ooooo',
    ],
    martillo: [
      '.ssssss....',
      'sSSSSSSs...',
      'sssssssst..',
      '....oo.....',
      '....oo.....',
      '....oo.....',
      '....oo.....',
      '....oo.....',
      '....nn.....',
      '....nn.....',
    ],
    mejora: [
      '....g....',
      '...gGg...',
      '..gGGGg..',
      '.gGGGGGg.',
      'gggGGGggg',
      '...gGg...',
      '...gGg...',
      '...gGg...',
      '...ggg...',
    ],
    pintura: [
      '..ss...r',
      '..tt.r..',
      '.ssss..r',
      'rrrrrr..',
      'rRrrrd..',
      'rRrrrd..',
      'rbbbbd..',
      'rbbbbd..',
      'rRrrrd..',
      'rRrrrd..',
      'dddddd..',
    ],
    diana: [
      '...rrrrr...',
      '.rr.....rr.',
      '.r..bbb..r.',
      'r..b...b..r',
      'r.b..r..b.r',
      'r.b.rrr.b.r',
      'r.b..r..b.r',
      'r..b...b..r',
      '.r..bbb..r.',
      '.rr.....rr.',
      '...rrrrr...',
    ],
    corona: [
      'g....g....g',
      'gg..ggg..gg',
      'gGg.gGg.gGg',
      'gGGgGGGgGGg',
      'gGGGGGGGGGg',
      'gGrGGbGGrGg',
      'gGGGGGGGGGg',
      'ooooooooooo',
    ],
    pistola: [
      '..ssssssssss',
      '..sSSSSSSSSs',
      '..ssssssssss',
      '..tttt.t....',
      '.tttt.tt....',
      '.nnn........',
      'nnnn........',
      'nnn.........',
    ],
    escopeta: [
      'nnn.............',
      'nnnnossssssssssS',
      '.nnnosssssssssss',
      '...nn.t...tttt..',
      '......tt........',
    ],
    rayo: [
      '....GGg',
      '...GGg.',
      '..GGg..',
      '.GGGGGg',
      '....Gg.',
      '...Gg..',
      '..Gg...',
      '.g.....',
    ],
  };
  ICONS.armas = ICONS.pistola;
  ICONS.deposito = ICONS.bidon;
  ICONS.ruedas = ICONS.rueda;

  const cache = {}, urls = {};
  Z.iconCanvas = function (name) {
    if (cache[name]) return cache[name];
    const rows = ICONS[name];
    if (!rows) return null;
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const [c, x] = Z.canvas(w + 2, h + 2);
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const col = PAL[row[i]]; if (col) Z.px(x, i + 1, j + 1, col); } });
    Z.outline(c, null, 0, '#07050c');
    return (cache[name] = c);
  };
  Z.iconURL = function (name, scale) {
    const k = scale || 1, key = name + '@' + k;
    if (urls[key]) return urls[key];
    const c = Z.iconCanvas(name);
    if (!c) return '';
    if (k === 1) return (urls[key] = c.toDataURL());
    const [big, x] = Z.canvas(c.width * k, c.height * k);
    x.drawImage(c, 0, 0, big.width, big.height);
    return (urls[key] = big.toDataURL());
  };
  // Escala entera para que los píxeles queden nítidos.
  Z.icon = function (name, scale, cls) {
    const c = Z.iconCanvas(name);
    if (!c) return '';
    const k = scale || 2;
    return `<img class="ico ${cls || ''}" src="${Z.iconURL(name)}" width="${c.width * k}" height="${c.height * k}" alt="" draggable="false">`;
  };
  // Rellena los huecos <span data-icon="nombre" data-scale="2"> que haya en la página.
  Z.fillIcons = function (root) {
    // Los iconos también quedan como variables CSS (--ico-llave…) para cursores y fondos.
    if (!root) {
      const st = document.documentElement.style;
      for (const n in ICONS) st.setProperty('--ico-' + n, `url("${Z.iconURL(n)}")`);
      for (const n of ['llave', 'surtidor']) st.setProperty('--cur-' + n, `url("${Z.iconURL(n, 2)}")`);
    }
    for (const el of (root || document).querySelectorAll('[data-icon]')) {
      if (el.dataset.iconDone === el.dataset.icon) continue;
      el.innerHTML = Z.icon(el.dataset.icon, +el.dataset.scale || 2);
      el.dataset.iconDone = el.dataset.icon;
    }
  };
})(window.ZG);
