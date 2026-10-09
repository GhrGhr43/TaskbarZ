// Envoltorio de escritorio (Electron).
// Modo «barra»: capa transparente encima de la barra de tareas, a lo ancho de la pantalla y un poco
// más alta que la barra; los clics la atraviesan salvo en sus botones (como Taskbar Hero).
// Modo «garaje»: ventana normal con la tienda.
const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');

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
  const scale = Math.max(1, Math.round(bar / 24));      // píxeles de pantalla por píxel del juego
  const height = VIEW_H * scale;
  return { x: b.x, y: b.y + b.height - height, width: b.width, height, scale, bar, internalW: Math.ceil(b.width / scale), d };
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

app.whenReady().then(() => {
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
  win.loadFile(path.join(__dirname, '..', 'game', 'index.html'), {
    query: { modo: 'barra', w: String(geo.internalW), h: String(VIEW_H), tb: String(Math.round(geo.bar / geo.scale)) },
  });
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
// Captura el trozo de pantalla que hay bajo el juego (el icono al que disparas) para hacerlo pedazos.
// Solo se lee la imagen; la barra y los programas no reciben nada.
ipcMain.handle('taskbarz:grab', async (_e, rect, size) => {
  if (!win || !geo) return null;
  const sf = geo.d.scaleFactor || 1;
  win.setOpacity(0);
  await new Promise(r => setTimeout(r, 40));
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(geo.d.bounds.width * sf), height: Math.round(geo.d.bounds.height * sf) } });
    const src = sources.find(s => s.display_id === String(geo.d.id)) || sources[0];
    if (!src) return null;
    const crop = { x: Math.round((rect.x + geo.x - geo.d.bounds.x) * sf), y: Math.round((rect.y + geo.y - geo.d.bounds.y) * sf), width: Math.round(rect.width * sf), height: Math.round(rect.height * sf) };
    return src.thumbnail.crop(crop).resize({ width: size, height: size, quality: 'good' }).toDataURL();
  } catch (err) {
    return null;
  } finally {
    win.setOpacity(1);
  }
});
ipcMain.on('taskbarz:quit', () => app.quit());
app.on('window-all-closed', () => app.quit());
