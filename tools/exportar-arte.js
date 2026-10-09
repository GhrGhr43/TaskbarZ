// Exporta todo el arte de código a un pack de PNG (por defecto game/art/plantilla/), con su pack.js listo.
// Sirve de plantilla para dibujar encima: mismo tamaño, mismos cuadros y mismos puntos de anclaje.
//   npm run exportar-arte                 -> game/art/plantilla/
//   npm run exportar-arte -- mi-pack      -> game/art/mi-pack/  (si ya existe no hace nada, para no pisar dibujos)
// Guía: docs/ARTE.md
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const name = (process.argv.slice(2).find(a => /^\w[\w-]*$/.test(a))) || 'plantilla';
const OUT = path.join(ROOT, 'game', 'art', name);

// Números en una línea para que el pack.js se lea bien.
function pretty(v, ind = '') {
  if (Array.isArray(v) && v.every(x => typeof x !== 'object' || x === null)) return JSON.stringify(v).replace(/,/g, ', ');
  if (Array.isArray(v) && v.every(x => Array.isArray(x) && x.every(y => typeof y === 'number'))) return '[' + v.map(x => pretty(x)).join(', ') + ']';
  if (v && typeof v === 'object') {
    const i2 = ind + '  ', arr = Array.isArray(v);
    const items = arr ? v.map(x => i2 + pretty(x, i2)) : Object.keys(v).map(k => i2 + (/^[a-zA-Z_]\w*$/.test(k) ? k : JSON.stringify(k)) + ': ' + pretty(v[k], i2));
    const flat = arr ? '[' + v.map(x => pretty(x, i2)).join(', ') + ']' : '{ ' + Object.keys(v).map(k => (/^[a-zA-Z_]\w*$/.test(k) ? k : JSON.stringify(k)) + ': ' + pretty(v[k], i2)).join(', ') + ' }';
    if (flat.length < 160 && !flat.includes('\n')) return flat;
    return (arr ? '[\n' : '{\n') + items.join(',\n') + ',\n' + ind + (arr ? ']' : '}');
  }
  return JSON.stringify(v);
}

if (name !== 'plantilla' && fs.existsSync(OUT)) {
  console.error(`Ya existe ${path.relative(ROOT, OUT)}: no lo toco para no pisar dibujos. Usa otro nombre o bórrala antes.`);
  process.exit(1);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 640, height: 480, webPreferences: { contextIsolation: true, partition: 'exportar-arte' } });
  win.webContents.setAudioMuted(true);
  await win.loadFile(path.join(ROOT, 'game', 'index.html'), { query: { arte: 'ninguno' } });
  for (let i = 0; i < 100; i++) {
    if (await win.webContents.executeJavaScript('!!(window.ZG && ZG.SPR && ZG.G && ZG.G.art)')) break;
    await new Promise(r => setTimeout(r, 100));
  }
  const res = await win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, 'exportar-arte-pagina.js'), 'utf8'));
  let n = 0;
  for (const rel in res.files) {
    const f = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(res.files[rel], 'base64'));
    n++;
  }
  res.def.nombre = name === 'plantilla' ? res.def.nombre : name;
  fs.writeFileSync(path.join(OUT, 'pack.js'),
    '// Pack de arte exportado del arte de código (npm run exportar-arte). Formato: docs/ARTE.md\n' +
    '// Puedes borrar las ranuras que no vayas a cambiar: lo que falte se dibuja con código.\n' +
    'ZG.Art.pack(' + pretty(res.def) + ');\n');
  console.log(`Pack "${name}": ${n} imágenes y pack.js en ${path.relative(ROOT, OUT)}`);
  app.quit();
}).catch((e) => { console.error(e); app.exit(1); });
