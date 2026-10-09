// Envoltorio de escritorio (Electron).
// Modo «barra»: capa transparente encima de la barra de tareas, a lo ancho de la pantalla y un poco
// más alta que la barra; los clics la atraviesan salvo en sus botones (como Taskbar Hero).
// Modo «garaje»: ventana normal con la tienda.
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Tamaño de la franja, elegido por el jugador: alto (0 = según la barra), ancho en % y posición.
// «Compacto» la deja baja (1x) y estrecha (30%) sin perder la elección normal.
const PREFS_FILE = () => path.join(app.getPath('userData'), 'barra.json');
let layout = { scale: 0, width: 100, pos: 'center', compact: false };
function loadLayout() { try { Object.assign(layout, JSON.parse(fs.readFileSync(PREFS_FILE(), 'utf8'))); } catch (e) { /* primera vez */ } }
function saveLayout() { try { fs.writeFileSync(PREFS_FILE(), JSON.stringify(layout)); } catch (e) { /* sin disco: se usa en memoria */ } }

const VIEW_H = 56;        // filas internas visibles en la barra (coche, zombis y carretera)
const FULL = { w: 1200, h: 880 };
let win = null;
let geo = null;
let mode = 'taskbar';

// Calcula la franja: ocupa la barra de tareas inferior y sobresale por arriba lo necesario.
function taskbarGeometry() {
  const d = screen.getPrimaryDisplay();
  const b = d.bounds, wa = d.workArea;
  let bar = (b.y + b.height) - (wa.y + wa.height);   // alto de la barra si está abajo
  if (bar < 24) bar = 48;                               // barra oculta, lateral o arriba: se asume 48 px
  let scale = layout.scale || Math.max(1, Math.round(bar / 24));   // píxeles de pantalla por píxel del juego
  let pct = layout.width;
  if (layout.compact) { scale = 1; pct = Math.min(pct, 30); }
  const height = VIEW_H * scale;
  const width = Math.max(320 * scale, Math.round(b.width * pct / 100));
  const x = layout.pos === 'left' ? b.x : layout.pos === 'right' ? b.x + b.width - width : b.x + Math.round((b.width - width) / 2);
  return { x, y: b.y + b.height - height, width, height, scale, bar, internalW: Math.ceil(width / scale), d };
}

function setMode(m) {
  if (!win) return;
  mode = m;
  if (m === 'full') {
    const wa = screen.getPrimaryDisplay().workArea;
    const w = Math.min(FULL.w, wa.width), h = Math.min(FULL.h, wa.height);
    win.setIgnoreMouseEvents(false);
    win.setAlwaysOnTop(false);
    win.setSkipTaskbar(false);
    win.setBounds({ x: wa.x + Math.round((wa.width - w) / 2), y: wa.y + Math.round((wa.height - h) / 2), width: w, height: h });
    win.focus();
  } else {
    win.setBounds({ x: geo.x, y: geo.y, width: geo.width, height: geo.height });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setSkipTaskbar(true);
    win.setIgnoreMouseEvents(true, { forward: true });
  }
}

function load() {
  win.loadFile(path.join(__dirname, '..', 'game', 'index.html'), {
    query: { modo: 'barra', w: String(geo.internalW), h: String(VIEW_H), tb: String(Math.round(geo.bar / geo.scale)) },
  });
}

app.whenReady().then(() => {
  loadLayout();
  geo = taskbarGeometry();
  win = new BrowserWindow({
    x: geo.x, y: geo.y, width: geo.width, height: geo.height,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    show: false,
    title: 'Zombie Garage',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // El juego es idle: tiene que seguir corriendo aunque la ventana no tenga el foco.
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',   // el sonido suena aunque los clics atraviesen la barra
    },
  });
  win.removeMenu();
  load();
  win.once('ready-to-show', () => { setMode('taskbar'); win.showInactive(); });

  // Al pulsar un icono, Windows sube la barra de tareas por encima de todo: volvemos a ponernos delante.
  const raise = () => { if (win && mode === 'taskbar' && win.isVisible()) { win.setAlwaysOnTop(true, 'screen-saver'); win.moveTop(); } };
  win.on('blur', () => setTimeout(raise, 50));
  setInterval(raise, 750);

  // Prueba automática: TASKBARZ_SMOKE=carpeta guarda capturas y prueba el botón de salida.
  if (process.env.TASKBARZ_SMOKE) require('./smoke')(win, setMode, process.env.TASKBARZ_SMOKE, app);
});

ipcMain.on('taskbarz:mode', (_e, mode) => setMode(mode === 'full' ? 'full' : 'taskbar'));
ipcMain.on('taskbarz:through', (_e, on) => { if (win && on !== undefined) win.setIgnoreMouseEvents(!!on, { forward: true }); });
ipcMain.handle('taskbarz:get-layout', () => layout);
ipcMain.on('taskbarz:set-layout', (_e, l) => {
  if (!win || !l) return;
  layout = {
    scale: [0, 1, 2, 3].includes(l.scale) ? l.scale : 0,
    width: [100, 75, 50, 30].includes(l.width) ? l.width : 100,
    pos: ['left', 'center', 'right'].includes(l.pos) ? l.pos : 'center',
    compact: !!l.compact,
  };
  saveLayout();
  geo = taskbarGeometry();
  setMode('taskbar');
  // Se recarga con el nuevo ancho interno (la partida ya se guardó antes de pedir el cambio).
  load();
});
ipcMain.on('taskbarz:quit', () => app.quit());
app.on('window-all-closed', () => app.quit());
