// Envoltorio de escritorio (Electron): tira siempre visible sobre la barra de tareas y ventana grande para el garaje.
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

const STRIP = { w: 720, h: 224 };
const FULL = { w: 1200, h: 880 };
let win = null;

function place(mode) {
  const wa = screen.getPrimaryDisplay().workArea; // área sin la barra de tareas
  if (mode === 'strip') {
    win.setBounds({ x: wa.x + wa.width - STRIP.w - 8, y: wa.y + wa.height - STRIP.h, width: STRIP.w, height: STRIP.h });
    win.setAlwaysOnTop(true, 'screen-saver');
  } else {
    const w = Math.min(FULL.w, wa.width), h = Math.min(FULL.h, wa.height);
    win.setBounds({ x: wa.x + Math.round((wa.width - w) / 2), y: wa.y + Math.round((wa.height - h) / 2), width: w, height: h });
    win.setAlwaysOnTop(false);
  }
}

app.whenReady().then(() => {
  win = new BrowserWindow({
    frame: false,
    show: false,
    backgroundColor: '#0b080c',
    title: 'Zombie Garage',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      // El juego es idle: tiene que seguir corriendo aunque la ventana no tenga el foco.
      backgroundThrottling: false,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'game', 'index.html'));
  win.once('ready-to-show', () => { place('strip'); win.show(); });
  // Prueba de humo: TASKBARZ_SMOKE=captura.png guarda una captura a los 8 s y cierra.
  if (process.env.TASKBARZ_SMOKE) {
    setTimeout(async () => {
      require('fs').writeFileSync(process.env.TASKBARZ_SMOKE, (await win.webContents.capturePage()).toPNG());
      app.quit();
    }, 8000);
  }
});

ipcMain.on('taskbarz:mode', (_e, mode) => { if (win) place(mode === 'full' ? 'full' : 'strip'); });
ipcMain.on('taskbarz:quit', () => app.quit());
app.on('window-all-closed', () => app.quit());
